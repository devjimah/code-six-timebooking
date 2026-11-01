// Ticket #12: a consultant books time on an order through the API, and every rule is enforced on the server.
// Seed data used here (src/persistence/seed.ts), consultant Carl of Acme Consulting:
// - 26 Oct: 8 h (08:30–17:00, 30 min break) and 27 Oct: 7.5 h (09:00–17:00, 30 min break) on "Customer portal relaunch" (120 h budget)
// - 28 Oct: 4 h (09:00–13:00) on "SAP data migration" (40 h budget, so 36 h free)
// Test bookings on those days start at 17:00, after the seeded ones.
// - "Mobile app security audit" belongs to another supplier (Nordic Dev)
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { orderRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-booking-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
let consultant: string
const orderId: Record<string, number> = {}

beforeAll(async () => {
  await setupDatabase(db)
  for (const order of await orderRepository(db).findAll()) orderId[order.code] = order.id
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  consultant = await sessionCookieFor("consultant@demo.local")
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

// cookie: null = not signed in. (Passing undefined would fall back to the default, the consultant.)
const book = (body: object, cookie: string | null = consultant) =>
  fetch(`${baseUrl}/api/time-entries`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  })

const booking = (overrides: object = {}) => ({
  orderId: orderId["PO-2026-001"],
  workDate: "2026-10-20",
  startTime: "09:00",
  endTime: "12:30",
  breakMinutes: 0,
  description: "Legacy data reconciliation",
  ...overrides,
})

describe("booking time", () => {
  it("books 09:00–12:30 on an order of the consultant's company as 3.5 h and returns it", async () => {
    const res = await book(booking())
    const entry = await res.json()

    expect(res.status).toBe(201)
    expect(entry).toMatchObject({
      workDate: "2026-10-20", startTime: "09:00", endTime: "12:30", breakMinutes: 0, durationMinutes: 210,
      description: "Legacy data reconciliation",
    })

    const mine = await (await fetch(`${baseUrl}/api/time-entries/mine`, { headers: { Cookie: consultant } })).json()
    expect(mine).toContainEqual(entry)
  })

  it("accepts a booking that fills the day to exactly 10 hours", async () => {
    // 8 h already booked on 26 Oct
    const res = await book(booking({ workDate: "2026-10-26", startTime: "17:00", endTime: "19:00" }))

    expect(res.status).toBe(201)
  })

  it("takes the break off the duration", async () => {
    const res = await book(booking({ workDate: "2026-10-21", startTime: "08:00", endTime: "16:45", breakMinutes: 45 }))

    expect(res.status).toBe(201)
    expect((await res.json()).durationMinutes).toBe(480)
  })

  it("treats a missing break as no break", async () => {
    const { breakMinutes: _, ...withoutBreak } = booking({ workDate: "2026-10-22", startTime: "10:00", endTime: "11:00" })
    const res = await book(withoutBreak)

    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ breakMinutes: 0, durationMinutes: 60 })
  })
})

describe("rules enforced by the API", () => {
  it("rejects a booking over 10 hours on one day with 422 and the hours left", async () => {
    // 7.5 h already booked on Tue 27 Oct
    const res = await book(booking({ workDate: "2026-10-27", startTime: "17:00", endTime: "20:00" }))

    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({
      code: "DAILY_LIMIT_EXCEEDED",
      message: "Booking rejected: only 2.5 h left on Tue 27 Oct 2026 (max. 10 h per day, German Working Time Act §3).",
    })
  })

  it("counts the 10 hours across all orders of the day", async () => {
    // 7.5 h on the portal order on 27 Oct; 3 h more on another order is still too much
    const res = await book(booking({ orderId: orderId["PO-2026-002"], workDate: "2026-10-27", startTime: "17:00", endTime: "20:00" }))

    expect((await res.json()).code).toBe("DAILY_LIMIT_EXCEEDED")
  })

  it("rejects a booking that overlaps the consultant's booking on another order, and names it (#54)", async () => {
    // 27 Oct: 09:00–17:00 already booked on PO-2026-001
    const res = await book(booking({ orderId: orderId["PO-2026-002"], workDate: "2026-10-27", startTime: "16:00", endTime: "17:30" }))

    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({
      code: "BOOKING_OVERLAP",
      message: "Booking rejected: 16:00–17:30 overlaps your booking 09:00–17:00 on PO-2026-001.",
    })
  })

  it("accepts a booking that starts when the previous one ends", async () => {
    // 28 Oct: 09:00–13:00 already booked on PO-2026-002
    const res = await book(booking({ workDate: "2026-10-28", startTime: "13:00", endTime: "14:00" }))

    expect(res.status).toBe(201)
  })

  it("accepts the free budget exactly, then rejects the next booking on that order", async () => {
    // "SAP data migration": 40 h budget, 4 h used → 36 h free = 3 × 10 h + 6 h
    const sap = orderId["PO-2026-002"]
    for (const workDate of ["2026-10-12", "2026-10-13", "2026-10-14"]) {
      expect((await book(booking({ orderId: sap, workDate, startTime: "08:00", endTime: "18:00" }))).status).toBe(201)
    }
    expect((await book(booking({ orderId: sap, workDate: "2026-10-15", startTime: "08:00", endTime: "14:00" }))).status).toBe(201)

    const res = await book(booking({ orderId: sap, workDate: "2026-10-16", startTime: "08:00", endTime: "08:15" }))

    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({
      code: "BUDGET_EXCEEDED",
      message: 'Booking rejected: only 0 h (0 PD) left on order PO-2026-002 "SAP data migration".',
    })
  })

  it("rejects a booking on another supplier's order", async () => {
    const res = await book(booking({ orderId: orderId["PO-2026-003"] }))

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("ORDER_NOT_ASSIGNED")
  })

  it("rejects a booking on an order that does not exist", async () => {
    const res = await book(booking({ orderId: 9999 }))

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("ORDER_NOT_FOUND")
  })

  it("rejects a booking for a future date", async () => {
    const res = await book(booking({ workDate: "2999-01-01" }))

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("DATE_IN_FUTURE")
  })

  it("rejects a booking on a Sunday (ArbZG §9)", async () => {
    const res = await book(booking({ workDate: "2026-10-25" }))

    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({
      code: "SUNDAY_OR_HOLIDAY",
      message: "Booking rejected: Sun 25 Oct 2026 is a Sunday. No work on Sundays and public holidays (German Working Time Act §9).",
    })
  })

  it("rejects a booking before the order's period starts", async () => {
    // PO-2026-002 runs from 1 Sep 2026; Mon 31 Aug 2026 is a normal working day in the past.
    const res = await book(booking({ orderId: orderId["PO-2026-002"], workDate: "2026-08-31" }))

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("OUTSIDE_ORDER_PERIOD")
  })

  it("rejects an end before the start, which would otherwise free up budget", async () => {
    const res = await book(booking({ startTime: "12:30", endTime: "09:00" }))

    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({
      code: "END_NOT_AFTER_START",
      message: "Booking rejected: the end (09:00) must be after the start (12:30) on the same day.",
    })
  })

  it("rejects a break as long as the working time", async () => {
    const res = await book(booking({ startTime: "09:00", endTime: "10:00", breakMinutes: 60 }))

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("INVALID_BREAK")
  })

  it("rejects a time that is not HH:MM", async () => {
    const res = await book(booking({ startTime: "9 am" }))

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("INVALID_TIME")
  })

  it("rejects a duration instead of times with 400", async () => {
    const { startTime: _s, endTime: _e, ...withoutTimes } = booking({ durationMinutes: 60 })
    const res = await book(withoutTimes)

    expect(res.status).toBe(400)
    expect((await res.json()).message).toContain("startTime")
  })

  it("rejects a description shorter than 10 characters with 400", async () => {
    const res = await book(booking({ description: "work" }))
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.code).toBe("VALIDATION_FAILED")
    expect(body.message).toContain("description")
  })
})

describe("who may book", () => {
  it("forbids a project manager to book time with 403", async () => {
    const res = await book(booking(), await sessionCookieFor("pm@demo.local"))

    expect(res.status).toBe(403)
  })

  it("answers 401 without a session", async () => {
    const res = await book(booking(), null)

    expect(res.status).toBe(401)
  })
})
