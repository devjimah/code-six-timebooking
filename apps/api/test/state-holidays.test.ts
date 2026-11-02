// Ticket #66: the booking rule, the calendar's list and the forecast follow the consultant's work state.
// Seed data: Carl Consultant works in Bavaria; Assumption Day, Sat 15 Aug 2026, lies inside PO-2026-001's period.
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { forecastOrders } from "../src/application/forecast-orders.js"
import { orderRepository, timeEntryRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-states-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
const cookie: Record<string, string> = {}
let orderId: number

beforeAll(async () => {
  await setupDatabase(db)
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  for (const who of ["consultant", "admin", "pm", "anna"]) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `${who}@demo.local`, password: DEMO_PASSWORD }),
    })
    cookie[who] = res.headers.getSetCookie()[0]!.split(";")[0]!
  }
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

const send = (method: string, path: string, who: string, body?: object) =>
  fetch(`${baseUrl}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie[who]! },
    body: body ? JSON.stringify(body) : undefined,
  })
const book = (workDate: string) =>
  send("POST", "/time-entries", "consultant", {
    orderId, workDate, startTime: "09:00", endTime: "10:00", breakMinutes: 0, description: "Work on a holiday",
  })

describe("the booking rule", () => {
  it("refuses Carl in Bavaria on Assumption Day, and names it", async () => {
    const res = await book("2026-08-15")

    expect(res.status).toBe(422)
    expect(await res.json()).toMatchObject({ code: "SUNDAY_OR_HOLIDAY", message: expect.stringContaining("Assumption Day") })
  })

  it("accepts him on a holiday of another state", async () => {
    expect((await book("2026-10-31")).status).toBe(201) // Reformation Day, not in Bavaria
  })

  it("follows a change of state by the admin", async () => {
    const carl = (await userRepository(db).findByEmail("consultant@demo.local"))!
    const account = { name: carl.name, email: carl.email, role: carl.role, supplierId: carl.supplierId }

    const res = await send("PUT", `/users/${carl.id}`, "admin", { ...account, workState: "HH" })

    expect(res.status).toBe(200)
    expect((await res.json()).workState).toBe("HH")
    expect((await book("2026-08-15")).status).toBe(201)
    await send("PUT", `/users/${carl.id}`, "admin", { ...account, workState: "BY" })
  })
})

describe("the calendar's list", () => {
  const dates = async (who: string) =>
    (await (await send("GET", "/public-holidays?year=2026", who)).json()).map((h: { date: string }) => h.date)

  it("includes the consultant's own state", async () => {
    expect(await dates("consultant")).toContain("2026-08-15")
  })

  it("has only the nationwide ones without a state", async () => {
    expect(await dates("anna")).not.toContain("2026-08-15")
  })
})

describe("the account", () => {
  it("rejects a work state on a project manager with 422", async () => {
    const res = await send("POST", "/users", "admin", {
      name: "New PM", email: "new-pm@demo.local", role: "project_manager", supplierId: null, workState: "BY", password: "initial-pass-123",
    })

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("WORK_STATE_ONLY_FOR_CONSULTANTS")
  })

  it("rejects a state that does not exist with 400", async () => {
    const carl = (await userRepository(db).findByEmail("consultant@demo.local"))!
    const res = await send("PUT", `/users/${carl.id}`, "admin", { name: carl.name, email: carl.email, role: carl.role, supplierId: carl.supplierId, workState: "XX" })

    expect(res.status).toBe(400)
  })

  it("lets a consultant be created with a state", async () => {
    const carl = (await userRepository(db).findByEmail("consultant@demo.local"))!
    const res = await send("POST", "/users", "admin", {
      name: "New Consultant", email: "new-consultant@demo.local", role: "consultant", supplierId: carl.supplierId, workState: "NW", password: "initial-pass-123",
    })

    expect((await res.json()).workState).toBe("NW")
  })
})

describe("the forecast", () => {
  it("counts a holiday of the state as the consultant being away", async () => {
    // One person, 192 h in the last 4 weeks: 48 h per week, 8 h per working day, with 40 h of budget left.
    const pm = (await userRepository(db).findByEmail("pm@demo.local"))!
    const carl = (await userRepository(db).findByEmail("consultant@demo.local"))!
    const order = await orderRepository(db).create({
      code: "PO-STATE", title: "Forecast by state", supplierId: carl.supplierId!, projectManagerId: pm.id,
      budgetHours: 232, hourlyRateCents: 10000, startDate: "2026-01-01", endDate: "2027-12-31",
    })
    await timeEntryRepository(db).create({
      userId: carl.id, orderId: order.id, workDate: "2026-05-25", startTime: "09:00", endTime: "17:00", breakMinutes: 0,
      durationMinutes: 192 * 60, description: "Four weeks at once, for an exact pace",
    })
    const runsOut = async () =>
      (await forecastOrders(db, [order], new Map([[order.id, 192 * 60]]), 4, "2026-06-01")).get(order.id)!.runsOutOn

    // Five working days from Tue 2 Jun. Corpus Christi on Thu 4 Jun costs Bavaria one, and Sun 7 Jun is no working day.
    expect(await runsOut()).toBe("2026-06-08")

    await userRepository(db).update(carl.id, { workState: null })
    expect(await runsOut()).toBe("2026-06-06")
    await userRepository(db).update(carl.id, { workState: "BY" })
  })
})
