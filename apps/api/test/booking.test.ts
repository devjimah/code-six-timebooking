// Ticket #12: a consultant books time on an order through the API, and every rule is enforced on the server.
// Seed data used here (src/persistence/seed.ts), consultant Carl of Acme Consulting:
// - 26 Oct: 8 h and 27 Oct: 7.5 h on "Customer portal relaunch" (120 h budget)
// - 28 Oct: 4 h on "SAP data migration" (40 h budget, so 36 h free)
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
  durationMinutes: 210,
  description: "Legacy data reconciliation",
  ...overrides,
})

describe("booking time", () => {
  it("books 3.5 h on an order of the consultant's company and returns it", async () => {
    const res = await book(booking())
    const entry = await res.json()

    expect(res.status).toBe(201)
    expect(entry).toMatchObject({ workDate: "2026-10-20", durationMinutes: 210, description: "Legacy data reconciliation" })

    const mine = await (await fetch(`${baseUrl}/api/time-entries/mine`, { headers: { Cookie: consultant } })).json()
    expect(mine).toContainEqual(entry)
  })

  it("accepts a booking that fills the day to exactly 10 hours", async () => {
    // 8 h already booked on 26 Oct
    const res = await book(booking({ workDate: "2026-10-26", durationMinutes: 120 }))

    expect(res.status).toBe(201)
  })
})

describe("rules enforced by the API", () => {
  it("rejects a booking over 10 hours on one day with 422 and the hours left", async () => {
    // 7.5 h already booked on Tue 27 Oct
    const res = await book(booking({ workDate: "2026-10-27", durationMinutes: 180 }))

    expect(res.status).toBe(422)
    expect(await res.json()).toEqual({
      code: "DAILY_LIMIT_EXCEEDED",
      message: "Booking rejected: only 2.5 h left on Tue 27 Oct 2026 (max. 10 h per day, German Working Time Act §3).",
    })
  })

  it("counts the 10 hours across all orders of the day", async () => {
    // 7.5 h on the portal order on 27 Oct; 3 h more on another order is still too much
    const res = await book(booking({ orderId: orderId["PO-2026-002"], workDate: "2026-10-27", durationMinutes: 180 }))

    expect((await res.json()).code).toBe("DAILY_LIMIT_EXCEEDED")
  })

  it("accepts the free budget exactly, then rejects the next booking on that order", async () => {
    // "SAP data migration": 40 h budget, 4 h used → 36 h free = 3 × 10 h + 6 h
    const sap = orderId["PO-2026-002"]
    for (const workDate of ["2026-10-12", "2026-10-13", "2026-10-14"]) {
      expect((await book(booking({ orderId: sap, workDate, durationMinutes: 600 }))).status).toBe(201)
    }
    expect((await book(booking({ orderId: sap, workDate: "2026-10-15", durationMinutes: 360 }))).status).toBe(201)

    const res = await book(booking({ orderId: sap, workDate: "2026-10-16", durationMinutes: 15 }))

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

  it("rejects a negative duration", async () => {
    const res = await book(booking({ durationMinutes: -60 }))

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("INVALID_DURATION")
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
