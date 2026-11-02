// Ticket #61: an order names the cost centre or project element that pays for it.
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { orderRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-accounting-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
let purchasing: string
let pm: string
let consultant: string
let order: { id: number; supplierId: number; projectManagerId: number }

beforeAll(async () => {
  await setupDatabase(db)
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  purchasing = await sessionCookieFor("purchasing@demo.local")
  pm = await sessionCookieFor("pm@demo.local")
  consultant = await sessionCookieFor("consultant@demo.local")
  order = (await orderRepository(db).findAll()).find((o) => o.code === "PO-2026-001")!
  expect(await userRepository(db).findByEmail("pm@demo.local")).not.toBeNull()
})

afterAll(() => {
  server.close()
  client.close()
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  } catch {
    /* Windows may keep the file locked briefly; leftover temp files are harmless */
  }
})

async function sessionCookieFor(email: string): Promise<string> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: DEMO_PASSWORD }),
  })
  return res.headers.getSetCookie()[0]!.split(";")[0]!
}

const newOrder = (code: string, overrides: object = {}) => ({
  code, title: "With a cost centre", supplierId: order.supplierId, projectManagerId: order.projectManagerId,
  budgetHours: 10, hourlyRateCents: 9500, startDate: "2026-11-01", endDate: "2027-03-31", ...overrides,
})
const place = (body: object) =>
  fetch(`${baseUrl}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: purchasing },
    body: JSON.stringify(body),
  })

describe("the accounting object of an order", () => {
  it("is stored and returned when purchasing places an order", async () => {
    const res = await place(newOrder("PO-CC-1", { accountingObject: " CC-4100 " }))

    expect(res.status).toBe(201)
    expect((await res.json()).accountingObject).toBe("CC-4100")
  })

  it("is optional, and empty means none", async () => {
    expect((await (await place(newOrder("PO-CC-2"))).json()).accountingObject).toBeNull()
    expect((await (await place(newOrder("PO-CC-3", { accountingObject: "  " }))).json()).accountingObject).toBeNull()
  })

  it("rejects a code that is too long with 400", async () => {
    expect((await place(newOrder("PO-CC-4", { accountingObject: "x".repeat(41) }))).status).toBe(400)
  })

  it("is shown to the order's project manager and to purchasing", async () => {
    const detail = await (await fetch(`${baseUrl}/api/orders/${order.id}/budget`, { headers: { Cookie: pm } })).json()
    const all = await (await fetch(`${baseUrl}/api/orders`, { headers: { Cookie: purchasing } })).json()

    expect(detail.accountingObject).toBe("P-2026-0815.03")
    expect(all.find((o: { orderId: number }) => o.orderId === order.id).accountingObject).toBe("P-2026-0815.03")
  })

  it("stays hidden from the consultant", async () => {
    const res = await fetch(`${baseUrl}/api/orders/bookable`, { headers: { Cookie: consultant } })

    expect(await res.text()).not.toContain("P-2026-0815.03")
  })
})
