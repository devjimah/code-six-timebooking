// Ticket #77: the employer sees the bookings of their own consultants, with times. No money, no other supplier.
// Seed data: supplier@demo.local manages Nordic Dev, with Anna and Ben on PO-2026-004. Carl works for Acme.
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { supplierRepository, timeEntryRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-supplier-manager-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
const cookie: Record<string, string> = {}
let month: string
let nordicId: number

beforeAll(async () => {
  await setupDatabase(db)
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  for (const who of ["supplier", "pm", "purchasing", "consultant", "admin"]) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `${who}@demo.local`, password: DEMO_PASSWORD }),
    })
    cookie[who] = res.headers.getSetCookie()[0]!.split(";")[0]!
  }
  const anna = (await userRepository(db).findByEmail("anna@demo.local"))!
  nordicId = anna.supplierId!
  // A month well inside the seeded bookings, so both consultants have worked in it whatever day the tests run.
  month = (await timeEntryRepository(db).findByUser(anna.id))[20]!.workDate.slice(0, 7)
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

const send = (method: string, path: string, who: string, body?: object) =>
  fetch(`${baseUrl}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie[who]! },
    body: body ? JSON.stringify(body) : undefined,
  })
const bookings = async (query = `month=${month}`, who = "supplier") => send("GET", `/supplier/bookings?${query}`, who)

describe("the supplier manager's view", () => {
  it("shows the bookings of their own consultants, with the times", async () => {
    const res = await bookings()
    const rows = await res.json()

    expect(res.status).toBe(200)
    expect(rows.length).toBeGreaterThan(0)
    expect(new Set(rows.map((r: { consultantName: string }) => r.consultantName))).toEqual(new Set(["Anna Analyst", "Ben Builder"]))
    expect(rows[0]).toMatchObject({ orderCode: "PO-2026-004", startTime: "09:00", endTime: "17:30", breakMinutes: 30, durationMinutes: 480 })
  })

  it("shows nothing of another supplier", async () => {
    const october = await (await bookings("month=2026-10")).text()

    expect(october).not.toContain("Carl")
    expect(october).not.toContain("PO-2026-001")
  })

  it("contains no money", async () => {
    expect(await (await bookings()).text()).not.toMatch(/Cents|budget|hourly/i)
  })

  it("gives only one month, and rejects a bad one with 400", async () => {
    const rows = await (await bookings()).json()

    expect(rows.every((r: { workDate: string }) => r.workDate.startsWith(month))).toBe(true)
    expect((await bookings("month=soon")).status).toBe(400)
  })
})

describe("who may do what", () => {
  it("is refused for every other role", async () => {
    for (const who of ["pm", "purchasing", "consultant", "admin"]) expect((await bookings(`month=${month}`, who)).status).toBe(403)
  })

  it("gives the supplier manager nothing of the client's: no orders, budgets or users", async () => {
    for (const path of ["/orders", "/orders/managed", "/orders/1/budget", "/users", "/audit-events", "/suppliers/overview", "/framework-agreements"]) {
      expect((await send("GET", path, "supplier")).status).toBe(403)
    }
  })

  it("does not let them book", async () => {
    const res = await send("POST", "/time-entries", "supplier", {
      orderId: 1, workDate: "2026-09-07", startTime: "09:00", endTime: "10:00", breakMinutes: 0, description: "Trying to book time",
    })

    expect(res.status).toBe(403)
  })
})

describe("the account", () => {
  const account = (overrides: object) => ({
    name: "New Manager", email: `manager${Math.random()}@demo.local`, role: "supplier_manager", password: "initial-pass-123", ...overrides,
  })

  it("needs a supplier", async () => {
    const res = await send("POST", "/users", "admin", account({ supplierId: null }))

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("SUPPLIER_MANAGER_NEEDS_SUPPLIER")
  })

  it("is created by the admin with a supplier", async () => {
    const res = await send("POST", "/users", "admin", account({ supplierId: nordicId }))

    expect(res.status).toBe(201)
    expect((await res.json()).supplierId).toBe(nordicId)
  })

  it("still refuses a supplier on a client-side role", async () => {
    const acme = (await supplierRepository(db).findAll())[0]!
    const res = await send("POST", "/users", "admin", account({ role: "purchasing", supplierId: acme.id }))

    expect((await res.json()).code).toBe("SUPPLIER_ONLY_FOR_SUPPLIER_SIDE")
  })
})
