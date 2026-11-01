// Purchasing places and changes orders and sees all of them with their budget (docs/roles-and-privacy.md).
// Seed: PO-2026-001 (Acme, 120 h, 15.5 h booked on 26–27 Oct), PO-2026-002 (Acme, 40 h, 4 h booked), PO-2026-003 (Nordic, nothing booked).
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import type { Order } from "../src/domain/models.js"
import { orderRepository, supplierRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-orders-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
const cookies: Record<string, string> = {}
const ids = { acme: 0, nordic: 0, pm: 0, consultant: 0 }
const orders: Record<string, Order> = {}

beforeAll(async () => {
  await setupDatabase(db)
  for (const s of await supplierRepository(db).findAll()) {
    if (s.name.startsWith("Acme")) ids.acme = s.id
    if (s.name.startsWith("Nordic")) ids.nordic = s.id
  }
  for (const u of await userRepository(db).findAll()) {
    if (u.role === "project_manager") ids.pm = u.id
    if (u.role === "consultant") ids.consultant = u.id
  }
  for (const o of await orderRepository(db).findAll()) orders[o.code] = o
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  for (const role of ["purchasing", "admin", "pm", "consultant"]) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `${role}@demo.local`, password: DEMO_PASSWORD }),
    })
    cookies[role] = res.headers.getSetCookie()[0]!.split(";")[0]!
  }
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

const send = (method: string, path: string, body?: unknown, cookie: string | undefined = cookies.purchasing) =>
  fetch(`${baseUrl}/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie && { Cookie: cookie }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

let counter = 0
const newOrder = (overrides: object = {}) => ({
  code: `PO-TEST-${++counter}`,
  title: "Data warehouse reporting",
  supplierId: ids.nordic,
  projectManagerId: ids.pm,
  budgetHours: 80,
  hourlyRateCents: 10500,
  startDate: "2026-11-01",
  endDate: "2027-03-31",
  ...overrides,
})

/** The order as it is now, with some fields changed – PUT sends all fields, like the form. */
const changed = (order: Order, overrides: object) => {
  const { id: _id, ...fields } = order
  return { ...fields, ...overrides }
}

const errorCode = async (res: Response) => ((await res.json()) as { code: string }).code

describe("purchasing sees all orders", () => {
  it("lists every order with supplier, project manager, period and budget", async () => {
    const res = await send("GET", "/orders")
    const list = await res.json()

    expect(res.status).toBe(200)
    expect(list.find((o: { code: string }) => o.code === "PO-2026-001")).toMatchObject({
      supplierName: "Acme Consulting GmbH",
      projectManagerName: "Paula Projectmanager",
      startDate: "2026-07-01",
      endDate: "2027-01-31",
      budgetHours: 120,
      bookedHours: 15.5,
      remainingHours: 104.5,
    })
  })

  it("lists project managers by name only, for the order form", async () => {
    const res = await send("GET", "/project-managers")

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ id: ids.pm, name: "Paula Projectmanager" }])
  })
})

describe("placing an order", () => {
  it("creates an order and stores the code in upper case", async () => {
    const res = await send("POST", "/orders", newOrder({ code: " po-2026-104 " }))

    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ code: "PO-2026-104", budgetHours: 80, startDate: "2026-11-01" })
  })

  it.each([
    ["an existing code in other spelling", { code: "po-2026-001" }, "ORDER_CODE_TAKEN"],
    ["a period that ends before it starts", { startDate: "2027-01-01", endDate: "2026-12-31" }, "ORDER_PERIOD_INVALID"],
    ["a supplier that does not exist", { supplierId: 99999 }, "SUPPLIER_NOT_FOUND"],
    ["a consultant as project manager", { projectManagerId: -1 }, "NOT_A_PROJECT_MANAGER"],
  ])("rejects %s with 422", async (_case, overrides, expected) => {
    const body = newOrder(overrides)
    if (body.projectManagerId === -1) body.projectManagerId = ids.consultant

    const res = await send("POST", "/orders", body)

    expect(res.status).toBe(422)
    expect(await errorCode(res)).toBe(expected)
  })

  it("rejects a budget of 0 hours with 400", async () => {
    expect((await send("POST", "/orders", newOrder({ budgetHours: 0 }))).status).toBe(400)
  })
})

describe("changing an order", () => {
  it("changes title and budget", async () => {
    const res = await send("PUT", `/orders/${orders["PO-2026-001"]!.id}`, changed(orders["PO-2026-001"]!, { budgetHours: 140 }))

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ budgetHours: 140 })
  })

  it("rejects a budget below the 15.5 booked hours, accepts 16", async () => {
    const order = orders["PO-2026-001"]!
    const tooSmall = await send("PUT", `/orders/${order.id}`, changed(order, { budgetHours: 15 }))
    const justEnough = await send("PUT", `/orders/${order.id}`, changed(order, { budgetHours: 16 }))

    expect(tooSmall.status).toBe(422)
    expect(await errorCode(tooSmall)).toBe("BUDGET_BELOW_BOOKED")
    expect(justEnough.status).toBe(200)
  })

  it("rejects moving an order with bookings to another supplier", async () => {
    const order = orders["PO-2026-002"]!
    const res = await send("PUT", `/orders/${order.id}`, changed(order, { supplierId: ids.nordic }))

    expect(res.status).toBe(422)
    expect(await errorCode(res)).toBe("SUPPLIER_FIXED_AFTER_BOOKINGS")
  })

  it("allows moving an order without bookings to another supplier", async () => {
    const order = orders["PO-2026-003"]!
    const res = await send("PUT", `/orders/${order.id}`, changed(order, { supplierId: ids.acme }))

    expect(res.status).toBe(200)
  })

  it("rejects a period that cuts off booked days", async () => {
    const order = orders["PO-2026-001"]!
    const res = await send("PUT", `/orders/${order.id}`, changed(order, { startDate: "2026-10-27" }))

    expect(res.status).toBe(422)
    expect(await errorCode(res)).toBe("PERIOD_EXCLUDES_BOOKINGS")
  })

  it("rejects taking the code of another order", async () => {
    const order = orders["PO-2026-002"]!
    const res = await send("PUT", `/orders/${order.id}`, changed(order, { code: "PO-2026-001" }))

    expect(await errorCode(res)).toBe("ORDER_CODE_TAKEN")
  })

  it("answers 404 for an order that does not exist", async () => {
    const res = await send("PUT", "/orders/99999", newOrder())

    expect(res.status).toBe(404)
    expect(await errorCode(res)).toBe("ORDER_NOT_FOUND")
  })
})

describe("other roles", () => {
  it.each(["admin", "pm", "consultant"])("forbids %s to list, create or change orders with 403", async (role) => {
    const order = orders["PO-2026-003"]!
    expect((await send("GET", "/orders", undefined, cookies[role])).status).toBe(403)
    expect((await send("POST", "/orders", newOrder(), cookies[role])).status).toBe(403)
    expect((await send("PUT", `/orders/${order.id}`, changed(order, {}), cookies[role])).status).toBe(403)
    expect((await send("GET", "/project-managers", undefined, cookies[role])).status).toBe(403)
  })

  it("asks for a session without a cookie (401)", async () => {
    expect((await send("POST", "/orders", newOrder(), "")).status).toBe(401)
  })
})
