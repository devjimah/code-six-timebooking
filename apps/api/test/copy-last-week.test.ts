// Ticket #63: a consultant copies last week; every copy passes the booking rules.
// The seed has nothing in November, and the fixed "today" keeps the result independent of the day the tests run.
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
import { copyLastWeek } from "../src/application/copy-last-week.js"
import type { User } from "../src/domain/models.js"
import { orderRepository, timeEntryRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-copy-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
let orderId: number
let carl: User
let person = 0

beforeAll(async () => {
  await setupDatabase(db)
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  carl = (await userRepository(db).findByEmail("consultant@demo.local"))!
  orderId = (await orderRepository(db).findAll()).find((o) => o.code === "PO-2026-001")!.id
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

/** A consultant of their own for each test, so one test's bookings cannot clash with another's. */
async function newConsultant(): Promise<User> {
  return userRepository(db).create({
    email: `copy${++person}@demo.local`, name: `Copy ${person}`, role: "consultant", supplierId: carl.supplierId,
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 4),
  })
}
const booked = (user: User, workDate: string, description = "Work from last week") =>
  timeEntryRepository(db).create({
    userId: user.id, orderId, workDate, startTime: "09:00", endTime: "12:00", breakMinutes: 0, durationMinutes: 180, description,
  })

// Fri 13 Nov 2026: last week is Mon 2 to Sun 8 Nov.
const FRIDAY = "2026-11-13"

describe("copying last week", () => {
  it("books the same work a week later, with the same order, times and text", async () => {
    const user = await newConsultant()
    await booked(user, "2026-11-02")
    await booked(user, "2026-11-03", "Second day of work")

    const result = await copyLastWeek(db, user, FRIDAY)

    expect(result.refused).toEqual([])
    expect(result.created.map((e) => e.workDate)).toEqual(["2026-11-09", "2026-11-10"])
    expect(result.created[1]).toMatchObject({ orderId, startTime: "09:00", endTime: "12:00", durationMinutes: 180, description: "Second day of work", status: "open" })
  })

  it("does not book days still to come, and counts them", async () => {
    const user = await newConsultant()
    await booked(user, "2026-11-02")
    await booked(user, "2026-11-06")

    const result = await copyLastWeek(db, user, "2026-11-09") // Monday: only that Monday has happened

    expect(result.created.map((e) => e.workDate)).toEqual(["2026-11-09"])
    expect(result.notYet).toBe(1)
  })

  it("leaves out a returned booking", async () => {
    const user = await newConsultant()
    const returned = await booked(user, "2026-11-02")
    await timeEntryRepository(db).setReview(returned.id, { status: "returned", returnReason: "Wrong order" })

    expect((await copyLastWeek(db, user, FRIDAY)).created).toEqual([])
  })

  it("leaves out everything older than last week", async () => {
    const user = await newConsultant()
    await booked(user, "2026-11-01") // the Sunday before last week's Monday

    expect((await copyLastWeek(db, user, FRIDAY)).created).toEqual([])
  })

  it("refuses a day that breaks a rule with its reason, and still books the others", async () => {
    const user = await newConsultant()
    await booked(user, "2026-11-02")
    await booked(user, "2026-11-03")
    await booked(user, "2026-11-10") // already booked: the copy of the 3rd overlaps it

    const result = await copyLastWeek(db, user, FRIDAY)

    expect(result.created.map((e) => e.workDate)).toEqual(["2026-11-09"])
    expect(result.refused).toEqual([expect.objectContaining({ workDate: "2026-11-10", code: "BOOKING_OVERLAP" })])
  })

  it("refuses the copies when it is run a second time", async () => {
    const user = await newConsultant()
    await booked(user, "2026-11-02")
    await copyLastWeek(db, user, FRIDAY)

    const again = await copyLastWeek(db, user, FRIDAY)

    expect(again.created).toEqual([])
    expect(again.refused[0]!.code).toBe("BOOKING_OVERLAP")
  })

  it("only copies the consultant's own bookings", async () => {
    const someone = await newConsultant()
    await booked(someone, "2026-11-02")
    const other = await newConsultant()

    expect((await copyLastWeek(db, other, FRIDAY)).created).toEqual([])
  })
})

describe("the route", () => {
  const post = async (email: string) => {
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: DEMO_PASSWORD }),
    })
    const cookie = login.headers.getSetCookie()[0]!.split(";")[0]!
    return fetch(`${baseUrl}/api/time-entries/copy-last-week`, { method: "POST", headers: { Cookie: cookie } })
  }

  it("answers the consultant with what happened", async () => {
    const res = await post("consultant@demo.local")

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(expect.objectContaining({ created: expect.any(Array), refused: expect.any(Array), notYet: expect.any(Number) }))
  })

  it("forbids the project manager with 403", async () => {
    expect((await post("pm@demo.local")).status).toBe(403)
  })
})
