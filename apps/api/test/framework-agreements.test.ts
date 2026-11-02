// Ticket #69: framework agreements; ticket #71: the supplier overview. Both are for purchasing, as sums.
// Seed data: FA-2026-01 with Acme holds PO-2026-001 (11,400 €) and PO-2026-002 (4,400 €), with a total of 50,000 €.
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { frameworkAgreementRepository, orderRepository, supplierRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-framework-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
const cookie: Record<string, string> = {}
let acmeId: number
let nordicId: number
let pmId: number
let agreementId: number
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
  const suppliers = await supplierRepository(db).findAll()
  acmeId = suppliers.find((s) => s.name.startsWith("Acme"))!.id
  nordicId = suppliers.find((s) => s.name.startsWith("Nordic"))!.id
  pmId = (await orderRepository(db).findAll())[0]!.projectManagerId
  agreementId = (await frameworkAgreementRepository(db).findAll())[0]!.id
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
const newOrder = (overrides: object = {}) => ({
  code: `PO-FA-${++number}`, title: "In the agreement", supplierId: acmeId, projectManagerId: pmId, budgetHours: 10, hourlyRateCents: 10000,
  startDate: "2026-11-01", endDate: "2026-12-31", frameworkAgreementId: agreementId, ...overrides,
})
const overview = async () => (await send("GET", "/framework-agreements", "purchasing")).json()
const newAgreement = (overrides: object = {}) => ({
  code: `FA-T-${++number}`, title: "A test agreement", supplierId: nordicId, totalBudgetCents: 1_000_000, startDate: "2026-01-01", endDate: "2027-12-31", ...overrides,
})

describe("the overview of framework agreements", () => {
  it("shows what the orders take and what is left, as sums", async () => {
    const [seeded] = await overview()

    expect(seeded).toMatchObject({
      code: "FA-2026-01", supplierName: "Acme Consulting GmbH", totalBudgetCents: 5_000_000, orderCount: 2, orderedCents: 1_580_000,
    })
    expect(seeded.freeCents).toBe(5_000_000 - 1_580_000)
    expect(seeded.bookedCents).toBeGreaterThan(0)
  })

  it("is only for purchasing", async () => {
    for (const who of ["pm", "consultant", "admin"]) expect((await send("GET", "/framework-agreements", who)).status).toBe(403)
  })
})

describe("an order in a framework agreement", () => {
  it("accepts an order that fits, and takes it off what is left", async () => {
    const before = (await overview())[0].freeCents

    const res = await send("POST", "/orders", "purchasing", newOrder())

    expect(res.status).toBe(201)
    expect((await res.json()).frameworkAgreementId).toBe(agreementId)
    expect((await overview())[0].freeCents).toBe(before - 100_000)
  })

  it("rejects an order beyond what is left with 422", async () => {
    const res = await send("POST", "/orders", "purchasing", newOrder({ budgetHours: 100_000 }))

    expect(res.status).toBe(422)
    expect(await res.json()).toMatchObject({ code: "FRAMEWORK_BUDGET_EXCEEDED", message: expect.stringContaining("left in framework agreement FA-2026-01") })
  })

  it("rejects raising an existing order beyond what is left", async () => {
    const created = await (await send("POST", "/orders", "purchasing", newOrder())).json()
    const res = await send("PUT", `/orders/${created.id}`, "purchasing", newOrder({ code: created.code, budgetHours: 100_000 }))

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("FRAMEWORK_BUDGET_EXCEEDED")
  })

  it("does not count an order's own budget against itself when it changes", async () => {
    const created = await (await send("POST", "/orders", "purchasing", newOrder({ budgetHours: 10 }))).json()
    const res = await send("PUT", `/orders/${created.id}`, "purchasing", newOrder({ code: created.code, budgetHours: 11 }))

    expect(res.status).toBe(200)
  })

  it("rejects an order of another supplier", async () => {
    const res = await send("POST", "/orders", "purchasing", newOrder({ supplierId: nordicId }))

    expect((await res.json()).code).toBe("FRAMEWORK_OTHER_SUPPLIER")
  })

  it("rejects an agreement that does not exist", async () => {
    const res = await send("POST", "/orders", "purchasing", newOrder({ frameworkAgreementId: 9999 }))

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("FRAMEWORK_NOT_FOUND")
  })

  it("still places an order without an agreement, as before", async () => {
    const res = await send("POST", "/orders", "purchasing", newOrder({ frameworkAgreementId: null, budgetHours: 100_000 }))

    expect(res.status).toBe(201)
  })
})

describe("managing framework agreements", () => {
  it("creates and changes one", async () => {
    const created = await send("POST", "/framework-agreements", "purchasing", newAgreement())
    const body = await created.json()
    expect(created.status).toBe(201)

    const changed = await send("PUT", `/framework-agreements/${body.id}`, "purchasing", { ...newAgreement({ code: body.code }), totalBudgetCents: 2_000_000 })
    expect(changed.status).toBe(200)
    expect((await changed.json()).totalBudgetCents).toBe(2_000_000)
  })

  it("rejects a code in use, a bad period and a total below its orders", async () => {
    expect((await (await send("POST", "/framework-agreements", "purchasing", newAgreement({ code: "fa-2026-01" }))).json()).code).toBe("FRAMEWORK_CODE_TAKEN")
    expect((await (await send("POST", "/framework-agreements", "purchasing", newAgreement({ endDate: "2025-01-01" }))).json()).code).toBe("ORDER_PERIOD_INVALID")
    const res = await send("PUT", `/framework-agreements/${agreementId}`, "purchasing", {
      code: "FA-2026-01", title: "Too small", supplierId: acmeId, totalBudgetCents: 1, startDate: "2026-01-01", endDate: "2027-12-31",
    })
    expect((await res.json()).code).toBe("FRAMEWORK_TOTAL_BELOW_ORDERS")
  })

  it("rejects a negative total with 400, and answers 404 for an unknown agreement", async () => {
    expect((await send("POST", "/framework-agreements", "purchasing", newAgreement({ totalBudgetCents: -1 }))).status).toBe(400)
    expect((await send("PUT", "/framework-agreements/9999", "purchasing", newAgreement())).status).toBe(404)
  })

  it("is only for purchasing", async () => {
    expect((await send("POST", "/framework-agreements", "pm", newAgreement())).status).toBe(403)
  })
})

describe("the supplier overview", () => {
  it("shows purchasing the orders, money and share per supplier", async () => {
    const res = await send("GET", "/suppliers/overview", "purchasing")
    const rows = await res.json()

    expect(res.status).toBe(200)
    expect(rows.find((r: { name: string }) => r.name.startsWith("Nordic"))).toMatchObject({
      orderCount: expect.any(Number), budgetCents: expect.any(Number), bookedCents: expect.any(Number), sharePercent: expect.any(Number),
    })
    expect(rows.reduce((sum: number, r: { sharePercent: number }) => sum + r.sharePercent, 0)).toBeCloseTo(100, 0)
  })

  it("names no person and no single booking", async () => {
    const text = await (await send("GET", "/suppliers/overview", "purchasing")).text()

    expect(text).not.toMatch(/Carl|Anna|Ben|description/)
  })

  it("is only for purchasing", async () => {
    for (const who of ["admin", "pm", "consultant"]) expect((await send("GET", "/suppliers/overview", who)).status).toBe(403)
  })
})
