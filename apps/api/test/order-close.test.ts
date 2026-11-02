// Ticket #70: purchasing closes and reopens an order.
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { orderRepository, timeEntryRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-close-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
const cookie: Record<string, string> = {}
let order: { id: number; code: string; supplierId: number; projectManagerId: number }
let carlId: number
let number = 0

beforeAll(async () => {
  await setupDatabase(db)
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  for (const who of ["purchasing", "pm", "consultant", "admin"]) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `${who}@demo.local`, password: DEMO_PASSWORD }),
    })
    cookie[who] = res.headers.getSetCookie()[0]!.split(";")[0]!
  }
  order = (await orderRepository(db).findAll()).find((o) => o.code === "PO-2026-001")!
  carlId = (await userRepository(db).findByEmail("consultant@demo.local"))!.id
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
const newOrder = () =>
  orderRepository(db).create({
    code: `PO-CLOSE-${++number}`, title: "To be closed", supplierId: order.supplierId, projectManagerId: order.projectManagerId,
    budgetHours: 100, hourlyRateCents: 9500, startDate: "2026-01-01", endDate: "2027-12-31",
  })
const booking = (orderId: number, workDate = "2026-09-07") => ({
  orderId, workDate, startTime: "09:00", endTime: "10:00", breakMinutes: 0, description: "Work on this order",
})

describe("closing an order", () => {
  it("closes an order without unchecked work, and reopens it", async () => {
    const { id } = await newOrder()

    const closed = await send("POST", `/orders/${id}/close`, "purchasing")
    expect(closed.status).toBe(200)
    expect((await closed.json()).closedAt).toEqual(expect.any(String))

    const reopened = await send("POST", `/orders/${id}/reopen`, "purchasing")
    expect(reopened.status).toBe(200)
    expect((await reopened.json()).closedAt).toBeNull()
  })

  it("refuses while bookings are open or returned, and accepts once they are approved", async () => {
    const { id } = await newOrder()
    const entry = await timeEntryRepository(db).create({
      userId: carlId, orderId: id, workDate: "2026-09-08", startTime: "09:00", endTime: "10:00", breakMinutes: 0, durationMinutes: 60,
      description: "Still to be checked",
    })

    const refused = await send("POST", `/orders/${id}/close`, "purchasing")
    expect(refused.status).toBe(422)
    expect((await refused.json()).code).toBe("ORDER_HAS_UNAPPROVED_BOOKINGS")

    await timeEntryRepository(db).setReview(entry.id, { status: "approved", returnReason: null })
    expect((await send("POST", `/orders/${id}/close`, "purchasing")).status).toBe(200)
  })

  it("keeps its bookings and its budget", async () => {
    const { id } = await newOrder()
    const entry = await timeEntryRepository(db).create({
      userId: carlId, orderId: id, workDate: "2026-09-09", startTime: "09:00", endTime: "10:00", breakMinutes: 0, durationMinutes: 60,
      description: "Approved work stays",
    })
    await timeEntryRepository(db).setReview(entry.id, { status: "approved", returnReason: null })
    await send("POST", `/orders/${id}/close`, "purchasing")

    const budget = await (await send("GET", `/orders/${id}/budget`, "pm")).json()

    expect(budget).toMatchObject({ bookedHours: 1, closedAt: expect.any(String) })
    expect(budget.forecast.state).toBe("closed")
  })

  it("is only for purchasing, and answers 404 for an unknown order", async () => {
    const { id } = await newOrder()

    for (const who of ["pm", "consultant", "admin"]) expect((await send("POST", `/orders/${id}/close`, who)).status).toBe(403)
    expect((await send("POST", "/orders/99999/close", "purchasing")).status).toBe(404)
  })
})

describe("a closed order", () => {
  it("refuses a new booking, and accepts it after reopening", async () => {
    const { id } = await newOrder()
    await send("POST", `/orders/${id}/close`, "purchasing")

    const res = await send("POST", "/time-entries", "consultant", booking(id))
    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("ORDER_CLOSED")

    await send("POST", `/orders/${id}/reopen`, "purchasing")
    expect((await send("POST", "/time-entries", "consultant", booking(id))).status).toBe(201)
    await timeEntryRepository(db).delete((await timeEntryRepository(db).findByUser(carlId)).find((e) => e.orderId === id)!.id)
  })

  it("leaves the list of orders a consultant can book on", async () => {
    const { id } = await newOrder()
    await send("POST", `/orders/${id}/close`, "purchasing")

    const list = await (await send("GET", "/orders/bookable", "consultant")).json()

    expect(list.map((o: { id: number }) => o.id)).not.toContain(id)
  })

  it("cannot be changed until it is reopened", async () => {
    const created = await newOrder()
    await send("POST", `/orders/${created.id}/close`, "purchasing")

    const res = await send("PUT", `/orders/${created.id}`, "purchasing", {
      code: created.code, title: "A new title", supplierId: created.supplierId, projectManagerId: created.projectManagerId,
      budgetHours: 100, hourlyRateCents: 9500, startDate: created.startDate, endDate: created.endDate,
    })

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("ORDER_CLOSED")
  })
})
