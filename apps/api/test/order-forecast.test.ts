// Ticket #51: the project manager and purchasing see how long a budget lasts. The calculation itself is tested in
// domain/forecast.test.ts; here the route's real clock is used, so all dates are relative to today.
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { todayInCompanyTimeZone } from "../src/application/clock.js"
import { addDays } from "../src/domain/public-holidays.js"
import { orderRepository, supplierRepository, timeEntryRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-forecast-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
const today = todayInCompanyTimeZone()
let server: Server
let baseUrl: string
let pm: string
let purchasing: string
let consultant: string
let orderId: number

beforeAll(async () => {
  await setupDatabase(db)
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false, purchasingLeadTimeWeeks: 6 }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  pm = await sessionCookieFor("pm@demo.local")
  purchasing = await sessionCookieFor("purchasing@demo.local")
  consultant = await sessionCookieFor("consultant@demo.local")

  // 100 h budget, 90 h booked in the last days, and the order runs for a long time yet: it will run out early.
  const person = (await userRepository(db).findByEmail("consultant@demo.local"))!
  const manager = (await userRepository(db).findByEmail("pm@demo.local"))!
  const supplier = (await supplierRepository(db).findById(person.supplierId!))!
  const order = await orderRepository(db).create({
    code: "PO-FORECAST", title: "Runs out early", supplierId: supplier.id, projectManagerId: manager.id,
    budgetHours: 100, hourlyRateCents: 10000, startDate: addDays(today, -60), endDate: addDays(today, 200),
  })
  orderId = order.id
  await timeEntryRepository(db).create({
    userId: person.id, orderId, workDate: addDays(today, -1), startTime: "08:00", endTime: "18:00", breakMinutes: 0,
    durationMinutes: 90 * 60, description: "Seeded straight into the repository",
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

const get = (path: string, cookie: string) => fetch(`${baseUrl}/api${path}`, { headers: { Cookie: cookie } })

describe("the forecast in the API", () => {
  it("warns the order's project manager, with the configured lead time", async () => {
    const res = await get(`/orders/${orderId}/budget`, pm)
    const { forecast } = await res.json()

    expect(res.status).toBe(200)
    expect(forecast).toMatchObject({
      state: "runs_out_early", paceHoursPerWeek: 22.5, leadTimeWeeks: 6, orderEndDate: addDays(today, 200),
    })
    expect(forecast.orderMoreBy).toBe(addDays(forecast.runsOutOn, -42))
    expect(forecast.missingHours).toBeGreaterThan(0)
  })

  it("shows purchasing the forecast of every order", async () => {
    const orders = await (await get("/orders", purchasing)).json()

    expect(orders.find((o: { orderId: number }) => o.orderId === orderId).forecast.state).toBe("runs_out_early")
    expect(orders.every((o: { forecast: unknown }) => o.forecast)).toBe(true)
  })

  it("keeps it from the consultant: 403", async () => {
    expect((await get(`/orders/${orderId}/budget`, consultant)).status).toBe(403)
  })
})
