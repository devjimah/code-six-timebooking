// Ticket #10: consultants mark days as unavailable, without a reason. Dates are relative to today where the route
// uses the real clock.
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
import { todayInCompanyTimeZone } from "../src/application/clock.js"
import { addDays } from "../src/domain/public-holidays.js"
import { auditEventRepository, orderRepository, timeEntryRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-unavailable-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
const today = todayInCompanyTimeZone()
let server: Server
let baseUrl: string
let consultant: string
let colleague: string
let pm: string
let otherPm: string
let orderId: number
let consultantId: number

beforeAll(async () => {
  await setupDatabase(db)
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  const carl = (await userRepository(db).findByEmail("consultant@demo.local"))!
  consultantId = carl.id
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 4)
  await userRepository(db).create({ email: "colleague@demo.local", name: "Colleague", role: "consultant", supplierId: carl.supplierId, passwordHash })
  await userRepository(db).create({ email: "other-pm@demo.local", name: "Other PM", role: "project_manager", supplierId: null, passwordHash })
  orderId = (await orderRepository(db).findAll()).find((o) => o.code === "PO-2026-001")!.id
  consultant = await sessionCookieFor("consultant@demo.local")
  colleague = await sessionCookieFor("colleague@demo.local")
  pm = await sessionCookieFor("pm@demo.local")
  otherPm = await sessionCookieFor("other-pm@demo.local")
  // Carl worked on the order recently, so he counts as being on it.
  await timeEntryRepository(db).create({
    userId: carl.id, orderId, workDate: addDays(today, -2), startTime: "09:00", endTime: "17:00", breakMinutes: 0,
    durationMinutes: 480, description: "Recent work on the order",
  })
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

const send = (method: string, path: string, cookie: string, body?: object) =>
  fetch(`${baseUrl}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  })
const mine = async (cookie: string) => (await send("GET", "/unavailable-days/mine", cookie)).json()

describe("the consultant's own days", () => {
  it("marks a day, shows it, and removes it", async () => {
    const res = await send("PUT", "/unavailable-days/2026-09-14", consultant)

    expect(res.status).toBe(204)
    expect(await mine(consultant)).toContainEqual({ date: "2026-09-14" })

    expect((await send("DELETE", "/unavailable-days/2026-09-14", consultant)).status).toBe(204)
    expect(await mine(consultant)).not.toContainEqual({ date: "2026-09-14" })
  })

  it("does not mind marking the same day twice", async () => {
    await send("PUT", "/unavailable-days/2026-09-15", consultant)

    expect((await send("PUT", "/unavailable-days/2026-09-15", consultant)).status).toBe(204)
    expect((await mine(consultant)).filter((d: { date: string }) => d.date === "2026-09-15")).toHaveLength(1)
  })

  it("stores no reason: extra fields in the answer do not exist", async () => {
    await send("PUT", "/unavailable-days/2026-09-16", consultant, { reason: "sick" })

    expect(JSON.stringify(await mine(consultant))).not.toContain("sick")
  })

  it("rejects a date that is not a date with 400", async () => {
    expect((await send("PUT", "/unavailable-days/soon", consultant)).status).toBe(400)
  })

  it("keeps each consultant's days apart", async () => {
    await send("PUT", "/unavailable-days/2026-09-17", colleague)

    expect(await mine(consultant)).not.toContainEqual({ date: "2026-09-17" })
    expect(await mine(colleague)).toContainEqual({ date: "2026-09-17" })
  })

  it("forbids other roles with 403", async () => {
    expect((await send("PUT", "/unavailable-days/2026-09-18", pm)).status).toBe(403)
    expect((await send("GET", "/unavailable-days/mine", pm)).status).toBe(403)
  })
})

describe("the booking rules", () => {
  const booking = (workDate: string) => ({
    orderId, workDate, startTime: "09:00", endTime: "10:00", breakMinutes: 0, description: "Work on a marked day",
  })

  it("rejects a booking on a day marked unavailable with 422", async () => {
    await send("PUT", "/unavailable-days/2026-09-21", consultant)
    const res = await send("POST", "/time-entries", consultant, booking("2026-09-21"))

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("DAY_MARKED_UNAVAILABLE")
  })

  it("accepts the booking once the mark is removed", async () => {
    await send("PUT", "/unavailable-days/2026-09-22", consultant)
    await send("DELETE", "/unavailable-days/2026-09-22", consultant)

    expect((await send("POST", "/time-entries", consultant, booking("2026-09-22"))).status).toBe(201)
  })

  it("rejects marking a day that already has a booking with 422", async () => {
    expect((await send("POST", "/time-entries", consultant, booking("2026-09-23"))).status).toBe(201)
    const res = await send("PUT", "/unavailable-days/2026-09-23", consultant)

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("DAY_HAS_BOOKINGS")
  })
})

describe("what the project manager sees", () => {
  it("shows upcoming days of consultants on the order, with the name and no reason", async () => {
    const coming = addDays(today, 10)
    await send("PUT", `/unavailable-days/${coming}`, consultant)
    const days = await (await send("GET", `/orders/${orderId}/unavailable-days`, pm)).json()

    expect(days).toContainEqual({ date: coming, consultantName: "Carl Consultant" })
  })

  it("leaves out past days", async () => {
    const past = addDays(today, -5)
    await send("PUT", `/unavailable-days/${past}`, consultant)
    const days = await (await send("GET", `/orders/${orderId}/unavailable-days`, pm)).json()

    expect(days.map((d: { date: string }) => d.date)).not.toContain(past)
  })

  it("leaves out consultants who have not worked on the order lately", async () => {
    const coming = addDays(today, 11)
    await send("PUT", `/unavailable-days/${coming}`, colleague)
    const days = await (await send("GET", `/orders/${orderId}/unavailable-days`, pm)).json()

    expect(days.map((d: { consultantName: string }) => d.consultantName)).not.toContain("Colleague")
  })

  it("forbids another project manager and the consultant", async () => {
    const res = await send("GET", `/orders/${orderId}/unavailable-days`, otherPm)

    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe("NOT_YOUR_ORDER")
    expect((await send("GET", `/orders/${orderId}/unavailable-days`, consultant)).status).toBe(403)
  })
})

describe("the forecast", () => {
  it("runs out later when the only consultant on the order is away", async () => {
    // A small, fresh order with one person on it, so one marked day shows in the result.
    const supplierId = (await userRepository(db).findById(consultantId))!.supplierId!
    const manager = (await userRepository(db).findByEmail("pm@demo.local"))!
    const order = await orderRepository(db).create({
      code: "PO-AWAY", title: "Forecast with an absence", supplierId, projectManagerId: manager.id,
      budgetHours: 60, hourlyRateCents: 10000, startDate: addDays(today, -28), endDate: addDays(today, 300),
    })
    await timeEntryRepository(db).create({
      userId: consultantId, orderId: order.id, workDate: addDays(today, -3), startTime: "09:00", endTime: "17:00",
      breakMinutes: 0, durationMinutes: 480, description: "Recent work on the order",
    })
    const runsOut = async () =>
      (await (await send("GET", `/orders/${order.id}/budget`, pm)).json()).forecast.runsOutOn as string

    const before = await runsOut()
    for (let days = 1; days <= 21; days++) await send("PUT", `/unavailable-days/${addDays(today, days + 20)}`, consultant)
    const after = await runsOut()

    expect(after > before).toBe(true)
  })
})

describe("the audit log", () => {
  it("records marking and removing, with the date only", async () => {
    await send("PUT", "/unavailable-days/2026-09-24", consultant)
    await send("DELETE", "/unavailable-days/2026-09-24", consultant)

    const marked = await auditEventRepository(db).findLatest({ limit: 1, action: "unavailable_day.mark" })
    const removed = await auditEventRepository(db).findLatest({ limit: 1, action: "unavailable_day.remove" })

    expect(marked[0]).toMatchObject({ outcome: "success", details: { date: "2026-09-24" } })
    expect(removed[0]).toMatchObject({ outcome: "success", details: { date: "2026-09-24" } })
  })
})
