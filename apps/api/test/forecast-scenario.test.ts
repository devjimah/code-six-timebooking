// Ticket #73: what if another consultant joins, or the project runs longer? The calculation is tested in
// domain/forecast.test.ts; here the route, on the demo order with the challenge's numbers.
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
import { orderRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-scenario-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
const cookie: Record<string, string> = {}
let order: { id: number; endDate: string }

beforeAll(async () => {
  await setupDatabase(db)
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  await userRepository(db).create({
    email: "other-pm@demo.local", name: "Other PM", role: "project_manager", supplierId: null, passwordHash: await bcrypt.hash(DEMO_PASSWORD, 4),
  })
  for (const who of ["pm", "other-pm", "purchasing", "consultant"]) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `${who}@demo.local`, password: DEMO_PASSWORD }),
    })
    cookie[who] = res.headers.getSetCookie()[0]!.split(";")[0]!
  }
  order = (await orderRepository(db).findAll()).find((o) => o.code === "PO-2026-004")!
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

const scenario = (query: string, who = "pm") =>
  fetch(`${baseUrl}/api/orders/${order.id}/forecast-scenario?${query}`, { headers: { Cookie: cookie[who]! } })

describe("the what-if route", () => {
  it("uses the budget up sooner with a third consultant, at one and a half times the pace", async () => {
    const asIs = await (await scenario("")).json()
    const more = await (await scenario("extraConsultants=1")).json()

    expect(more.paceHoursPerWeek).toBeCloseTo(asIs.paceHoursPerWeek * 1.5, 0)
    expect(more.runsOutOn < asIs.runsOutOn).toBe(true)
  })

  it("moves the order's end when the project runs longer", async () => {
    const asIs = await (await scenario("")).json()
    const longer = await (await scenario("extraWeeks=4")).json()

    expect(Date.parse(longer.orderEndDate) - Date.parse(asIs.orderEndDate)).toBe(28 * 86_400_000)
    expect(longer.missingHours).toBeGreaterThan(asIs.missingHours)
  })

  it("saves nothing", async () => {
    await scenario("extraWeeks=52")

    expect((await orderRepository(db).findById(order.id))!.endDate).toBe(order.endDate)
  })

  it("rejects values out of range with 400", async () => {
    expect((await scenario("extraConsultants=-1")).status).toBe(400)
    expect((await scenario("extraWeeks=999")).status).toBe(400)
  })

  it("is only for the order's own project manager", async () => {
    expect((await scenario("", "other-pm")).status).toBe(403)
    for (const who of ["purchasing", "consultant"]) expect((await scenario("", who)).status).toBe(403)
  })
})
