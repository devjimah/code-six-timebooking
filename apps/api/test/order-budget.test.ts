// Ticket #18: the project manager sees what bookings do to the budget of their order.
// Seed data (src/persistence/seed.ts): "Customer portal relaunch" PO-2026-001, 120 h at 95 €/h,
// 15.5 h already booked by Carl Consultant; project manager Paula (pm@demo.local).
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import bcrypt from "bcryptjs"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { orderRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-budget-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
let portalId: number

beforeAll(async () => {
  await setupDatabase(db)
  portalId = (await orderRepository(db).findAll()).find((o) => o.code === "PO-2026-001")!.id
  // A second project manager who is responsible for no order in the seed.
  await userRepository(db).create({
    email: "other-pm@demo.local",
    name: "Otto Otherpm",
    role: "project_manager",
    supplierId: null,
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
  })
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
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

const budgetOf = (orderId: number | string, cookie: string | null) =>
  fetch(`${baseUrl}/api/orders/${orderId}/budget`, { headers: cookie ? { Cookie: cookie } : {} })

describe("order budget for the project manager", () => {
  it("shows ordered, booked and remaining budget in hours, person-days and cents", async () => {
    const res = await budgetOf(portalId, await sessionCookieFor("pm@demo.local"))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      orderId: portalId,
      code: "PO-2026-001",
      title: "Customer portal relaunch",
      budgetHours: 120,
      bookedHours: 15.5,
      remainingHours: 104.5,
      budgetPersonDays: 15,
      bookedPersonDays: 1.94,
      remainingPersonDays: 13.06,
      budgetCents: 1_140_000,
      bookedCents: 147_250,
      remainingCents: 992_750,
      usedPercent: 12.9,
      overBudget: false,
    })
  })

  it("core flow: a consultant books 3.5 h and the project manager sees the budget change at once", async () => {
    const pm = await sessionCookieFor("pm@demo.local")
    const before = await (await budgetOf(portalId, pm)).json()

    const booking = await fetch(`${baseUrl}/api/time-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: await sessionCookieFor("consultant@demo.local") },
      body: JSON.stringify({
        orderId: portalId,
        workDate: "2026-10-23",
        startTime: "09:00",
        endTime: "12:30",
        description: "Legacy data reconciliation",
      }),
    })
    expect(booking.status).toBe(201)

    const after = await (await budgetOf(portalId, pm)).json()
    expect(after.bookedHours).toBe(before.bookedHours + 3.5)
    expect(after.remainingHours).toBe(before.remainingHours - 3.5)
    expect(after.bookedCents).toBe(before.bookedCents + 33_250) // 3.5 h × 95 €
  })
})

describe("who may see an order's budget", () => {
  it("forbids a project manager who is not responsible for the order with 403", async () => {
    const res = await budgetOf(portalId, await sessionCookieFor("other-pm@demo.local"))

    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe("NOT_YOUR_ORDER")
  })

  it("forbids a consultant with 403", async () => {
    const res = await budgetOf(portalId, await sessionCookieFor("consultant@demo.local"))

    expect(res.status).toBe(403)
  })

  it("forbids an admin with 403", async () => {
    const res = await budgetOf(portalId, await sessionCookieFor("admin@demo.local"))

    expect(res.status).toBe(403)
  })

  it("answers 401 without a session", async () => {
    expect((await budgetOf(portalId, null)).status).toBe(401)
  })

  it("answers 404 for an order that does not exist", async () => {
    const res = await budgetOf(9999, await sessionCookieFor("pm@demo.local"))

    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe("ORDER_NOT_FOUND")
  })

  it("answers 400 for an order id that is not a number", async () => {
    const res = await budgetOf("abc", await sessionCookieFor("pm@demo.local"))

    expect(res.status).toBe(400)
  })
})
