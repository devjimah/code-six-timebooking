// Ticket #50: project managers approve or return the bookings on their own orders.
// Seed data (src/persistence/seed.ts): pm@demo.local manages all seeded orders; PO-2026-001 has 8 h and 7.5 h booked.
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
import { auditEventRepository, orderRepository, timeEntryRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-review-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
let pm: string
let otherPm: string
let consultant: string
let purchasing: string
let orderId: number
let consultantId: number

beforeAll(async () => {
  await setupDatabase(db)
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  orderId = (await orderRepository(db).findAll()).find((o) => o.code === "PO-2026-001")!.id
  consultantId = (await userRepository(db).findByEmail("consultant@demo.local"))!.id
  await userRepository(db).create({
    email: "other-pm@demo.local", name: "Other PM", role: "project_manager", supplierId: null,
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 4),
  })
  pm = await sessionCookieFor("pm@demo.local")
  otherPm = await sessionCookieFor("other-pm@demo.local")
  consultant = await sessionCookieFor("consultant@demo.local")
  purchasing = await sessionCookieFor("purchasing@demo.local")
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

const post = (path: string, cookie: string, body?: object) =>
  fetch(`${baseUrl}/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  })
const get = async (path: string, cookie: string) => (await fetch(`${baseUrl}/api${path}`, { headers: { Cookie: cookie } })).json()

// A fresh open booking for each test, on a date no other test uses, so the tests do not depend on each other.
let nextDay = 1
const newBooking = () =>
  timeEntryRepository(db).create({
    userId: consultantId, orderId, workDate: `2026-09-${String(nextDay++).padStart(2, "0")}`,
    startTime: "09:00", endTime: "10:00", breakMinutes: 0, durationMinutes: 60, description: "Work to be checked",
  })

describe("approving a booking", () => {
  it("starts every new booking as open, and the consultant sees that", async () => {
    const entry = await newBooking()
    const mine = await get("/time-entries/mine", consultant)

    expect(mine.find((e: { id: number }) => e.id === entry.id)).toMatchObject({ status: "open", returnReason: null })
  })

  it("lets the order's project manager approve an open booking", async () => {
    const entry = await newBooking()
    const res = await post(`/time-entries/${entry.id}/approve`, pm)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: entry.id, status: "approved", returnReason: null })
  })

  it("rejects approving twice with 422", async () => {
    const entry = await newBooking()
    await post(`/time-entries/${entry.id}/approve`, pm)
    const res = await post(`/time-entries/${entry.id}/approve`, pm)

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("BOOKING_NOT_OPEN")
  })

  it("answers 404 for a booking that does not exist", async () => {
    const res = await post("/time-entries/99999/approve", pm)

    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe("TIME_ENTRY_NOT_FOUND")
  })
})

describe("returning a booking", () => {
  it("shows the reason to the consultant and to the project manager", async () => {
    const entry = await newBooking()
    const res = await post(`/time-entries/${entry.id}/return`, pm, { reason: "  Wrong order, please correct  " })

    expect(res.status).toBe(200)
    const mine = await get("/time-entries/mine", consultant)
    expect(mine.find((e: { id: number }) => e.id === entry.id)).toMatchObject({
      status: "returned", returnReason: "Wrong order, please correct",
    })
    const list = await get(`/orders/${orderId}/time-entries`, pm)
    expect(list.find((e: { id: number }) => e.id === entry.id)).toMatchObject({
      status: "returned", returnReason: "Wrong order, please correct",
    })
  })

  it("rejects an empty reason with 422", async () => {
    const entry = await newBooking()
    const res = await post(`/time-entries/${entry.id}/return`, pm, { reason: "   " })

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("RETURN_REASON_REQUIRED")
  })

  it("rejects a missing reason with 400", async () => {
    const entry = await newBooking()

    expect((await post(`/time-entries/${entry.id}/return`, pm, {})).status).toBe(400)
  })

  it("does not let a returned booking be approved before it is corrected", async () => {
    const entry = await newBooking()
    await post(`/time-entries/${entry.id}/return`, pm, { reason: "Wrong order" })
    const res = await post(`/time-entries/${entry.id}/approve`, pm)

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("BOOKING_NOT_OPEN")
  })
})

describe("approve all", () => {
  it("approves the open bookings of the order and leaves returned ones alone", async () => {
    const open = await newBooking()
    const returned = await newBooking()
    await post(`/time-entries/${returned.id}/return`, pm, { reason: "Wrong order" })

    const res = await post(`/orders/${orderId}/time-entries/approve-open`, pm)

    expect(res.status).toBe(200)
    expect((await res.json()).approved).toBeGreaterThanOrEqual(1)
    expect((await timeEntryRepository(db).findById(open.id))!.status).toBe("approved")
    expect((await timeEntryRepository(db).findById(returned.id))!.status).toBe("returned")
  })
})

describe("who may review", () => {
  it("forbids another project manager with 403 NOT_YOUR_ORDER", async () => {
    const entry = await newBooking()

    for (const res of [
      await post(`/time-entries/${entry.id}/approve`, otherPm),
      await post(`/time-entries/${entry.id}/return`, otherPm, { reason: "Not mine" }),
      await post(`/orders/${orderId}/time-entries/approve-open`, otherPm),
    ]) {
      expect(res.status).toBe(403)
      expect((await res.json()).code).toBe("NOT_YOUR_ORDER")
    }
    expect((await timeEntryRepository(db).findById(entry.id))!.status).toBe("open")
  })

  it("forbids the consultant and purchasing with 403", async () => {
    const entry = await newBooking()

    for (const cookie of [consultant, purchasing]) {
      expect((await post(`/time-entries/${entry.id}/approve`, cookie)).status).toBe(403)
      expect((await post(`/orders/${orderId}/time-entries/approve-open`, cookie)).status).toBe(403)
    }
  })
})

describe("what purchasing and the audit log see", () => {
  it("gives purchasing approved and not approved hours per order, not single bookings", async () => {
    const approved = await newBooking()
    await post(`/time-entries/${approved.id}/approve`, pm)
    await newBooking() // stays open

    const orders = await get("/orders", purchasing)
    const order = orders.find((o: { orderId: number }) => o.orderId === orderId)

    expect(order.approvedHours).toBeGreaterThanOrEqual(1)
    expect(order.notApprovedHours).toBeGreaterThanOrEqual(1)
    expect(order.approvedHours + order.notApprovedHours).toBe(order.bookedHours)
  })

  it("logs approvals and returns, without the free-text reason", async () => {
    const entry = await newBooking()
    await post(`/time-entries/${entry.id}/return`, pm, { reason: "Secret free text" })

    const events = await auditEventRepository(db).findLatest({ limit: 50, action: "time_entry.return" })

    expect(events[0]).toMatchObject({ targetType: "time_entry", targetId: entry.id, outcome: "success" })
    expect(JSON.stringify(events)).not.toContain("Secret free text")
  })
})
