// Ticket #53: consultants correct or delete their own bookings while they are not approved.
// Each test books on its own dates, so the tests do not depend on each other.
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
import { auditEventRepository, orderRepository, supplierRepository, timeEntryRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-correction-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
let consultant: string
let colleague: string
let pm: string
const orderId: Record<string, number> = {}

beforeAll(async () => {
  await setupDatabase(db)
  for (const order of await orderRepository(db).findAll()) orderId[order.code] = order.id
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  const acme = (await supplierRepository(db).findAll()).find((s) => s.name.startsWith("Acme"))!
  await userRepository(db).create({
    email: "colleague@demo.local", name: "Colleague", role: "consultant", supplierId: acme.id,
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 4),
  })
  consultant = await sessionCookieFor("consultant@demo.local")
  colleague = await sessionCookieFor("colleague@demo.local")
  pm = await sessionCookieFor("pm@demo.local")
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

const booking = (overrides: object = {}) => ({
  orderId: orderId["PO-2026-001"],
  workDate: "2026-09-01",
  startTime: "09:00",
  endTime: "12:00",
  breakMinutes: 0,
  description: "Booked with a typo",
  ...overrides,
})

const bookOn = async (workDate: string, overrides: object = {}) => {
  const res = await send("POST", "/time-entries", consultant, booking({ workDate, ...overrides }))
  expect(res.status).toBe(201)
  return (await res.json()).id as number
}

describe("correcting a booking", () => {
  it("changes the times and the text, and derives the duration again", async () => {
    const id = await bookOn("2026-09-01")
    const res = await send("PUT", `/time-entries/${id}`, consultant, booking({ workDate: "2026-09-01", endTime: "13:30", breakMinutes: 30, description: "Booked without a typo" }))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ id, endTime: "13:30", durationMinutes: 240, description: "Booked without a typo" })
  })

  it("does not clash with the booking's own old version", async () => {
    // 08:00–18:00 → 09:00–19:00 overlaps the old times, and 10 hours fit into the day only without them.
    const id = await bookOn("2026-09-02", { startTime: "08:00", endTime: "18:00" })
    const res = await send("PUT", `/time-entries/${id}`, consultant, booking({ workDate: "2026-09-02", startTime: "09:00", endTime: "19:00" }))

    expect(res.status).toBe(200)
  })

  it("runs the booking rules: another booking on that day still clashes", async () => {
    const other = await bookOn("2026-09-03")
    expect(other).toBeGreaterThan(0)
    const id = await bookOn("2026-09-03", { startTime: "13:00", endTime: "14:00" })
    const res = await send("PUT", `/time-entries/${id}`, consultant, booking({ workDate: "2026-09-03", startTime: "11:00", endTime: "14:00" }))

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("BOOKING_OVERLAP")
  })

  it("runs the booking rules: no moving to a Sunday", async () => {
    const id = await bookOn("2026-09-04")
    const res = await send("PUT", `/time-entries/${id}`, consultant, booking({ workDate: "2026-09-06" }))

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("SUNDAY_OR_HOLIDAY")
  })

  it("makes a returned booking open again and clears the reason", async () => {
    const id = await bookOn("2026-09-07")
    await send("POST", `/time-entries/${id}/return`, pm, { reason: "Wrong order" })

    const res = await send("PUT", `/time-entries/${id}`, consultant, booking({ workDate: "2026-09-07", orderId: orderId["PO-2026-002"] }))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ status: "open", returnReason: null, orderId: orderId["PO-2026-002"] })
  })
})

describe("deleting a booking", () => {
  it("removes it from the consultant's list and from the budget", async () => {
    const id = await bookOn("2026-09-08")
    const res = await send("DELETE", `/time-entries/${id}`, consultant)

    expect(res.status).toBe(204)
    expect(await timeEntryRepository(db).findById(id)).toBeNull()
  })
})

describe("what cannot be changed", () => {
  it("rejects changing and deleting an approved booking with 422", async () => {
    const id = await bookOn("2026-09-09")
    await send("POST", `/time-entries/${id}/approve`, pm)

    for (const res of [
      await send("PUT", `/time-entries/${id}`, consultant, booking({ workDate: "2026-09-09" })),
      await send("DELETE", `/time-entries/${id}`, consultant),
    ]) {
      expect(res.status).toBe(422)
      expect((await res.json()).code).toBe("BOOKING_APPROVED")
    }
    expect(await timeEntryRepository(db).findById(id)).not.toBeNull()
  })

  it("forbids changing or deleting a colleague's booking with 403", async () => {
    const id = await bookOn("2026-09-10")

    for (const res of [
      await send("PUT", `/time-entries/${id}`, colleague, booking({ workDate: "2026-09-10" })),
      await send("DELETE", `/time-entries/${id}`, colleague),
    ]) {
      expect(res.status).toBe(403)
      expect((await res.json()).code).toBe("NOT_YOUR_BOOKING")
    }
  })

  it("forbids the project manager with 403 and answers 404 for an unknown booking", async () => {
    const id = await bookOn("2026-09-11")

    expect((await send("DELETE", `/time-entries/${id}`, pm)).status).toBe(403)
    expect((await send("DELETE", "/time-entries/99999", consultant)).status).toBe(404)
  })
})

describe("the audit log", () => {
  it("records change and delete, without times or the description", async () => {
    const id = await bookOn("2026-09-12")
    await send("PUT", `/time-entries/${id}`, consultant, booking({ workDate: "2026-09-12", description: "Secret free text here" }))
    await send("DELETE", `/time-entries/${id}`, consultant)

    const updated = await auditEventRepository(db).findLatest({ limit: 1, action: "time_entry.update" })
    const deleted = await auditEventRepository(db).findLatest({ limit: 1, action: "time_entry.delete" })

    expect(updated[0]).toMatchObject({ targetType: "time_entry", targetId: id, outcome: "success" })
    expect(deleted[0]).toMatchObject({ targetType: "time_entry", targetId: id, outcome: "success" })
    expect(JSON.stringify([updated[0]!.details, deleted[0]!.details])).not.toMatch(/Secret free text|09:00|12:00/)
  })
})
