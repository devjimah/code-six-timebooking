// Ticket #11: every role sees only its own slice of the orders.
// Seed data (src/persistence/seed.ts): Acme has PO-2026-001 and PO-2026-002, Nordic has PO-2026-003;
// Paula (pm@demo.local) manages all three; Carl Consultant works for Acme.
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
import { supplierRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-orders-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string

beforeAll(async () => {
  await setupDatabase(db)
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)
  const users = userRepository(db)
  // A project manager without orders, and a consultant of Nordic (the other supplier).
  await users.create({ email: "other-pm@demo.local", name: "Otto Otherpm", role: "project_manager", supplierId: null, passwordHash })
  const nordic = (await supplierRepository(db).findAll()).find((s) => s.name === "Nordic Dev AG")!
  await users.create({ email: "nora@demo.local", name: "Nora Nordic", role: "consultant", supplierId: nordic.id, passwordHash })
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
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

const get = (path: string, cookie: string | null) =>
  fetch(`${baseUrl}/api/orders/${path}`, { headers: cookie ? { Cookie: cookie } : {} })

describe("orders a consultant can book on", () => {
  it("lists only the orders of the consultant's own supplier, without money", async () => {
    const res = await get("bookable", await sessionCookieFor("consultant@demo.local"))

    expect(res.status).toBe(200)
    const orders = await res.json()
    expect(orders.map((o: { code: string }) => o.code)).toEqual(["PO-2026-001", "PO-2026-002"])
    expect(orders[0]).toEqual({
      id: expect.any(Number),
      code: "PO-2026-001",
      title: "Customer portal relaunch",
      supplierName: "Acme Consulting GmbH",
      startDate: "2026-07-01",
      endDate: "2027-01-31",
    })
    expect(JSON.stringify(orders)).not.toMatch(/Cents|budget/) // no money for consultants
  })

  it("shows a consultant of another supplier only that supplier's orders", async () => {
    const res = await get("bookable", await sessionCookieFor("nora@demo.local"))

    expect((await res.json()).map((o: { code: string }) => o.code)).toEqual(["PO-2026-003"])
  })

  it("forbids project managers and admins with 403", async () => {
    expect((await get("bookable", await sessionCookieFor("pm@demo.local"))).status).toBe(403)
    expect((await get("bookable", await sessionCookieFor("admin@demo.local"))).status).toBe(403)
  })

  it("answers 401 without a session", async () => {
    expect((await get("bookable", null)).status).toBe(401)
  })
})

describe("orders a project manager is responsible for", () => {
  it("lists the project manager's orders, each with its budget", async () => {
    const res = await get("managed", await sessionCookieFor("pm@demo.local"))

    expect(res.status).toBe(200)
    const orders = await res.json()
    expect(orders.map((o: { code: string }) => o.code)).toEqual(["PO-2026-001", "PO-2026-002", "PO-2026-003"])
    expect(orders[1]).toMatchObject({ code: "PO-2026-002", budgetHours: 40, bookedHours: 4, remainingHours: 36 })
    // An order without any booking still shows its full budget.
    expect(orders[2]).toMatchObject({ code: "PO-2026-003", bookedHours: 0, remainingCents: 720_000, usedPercent: 0 })
  })

  it("returns an empty list for a project manager without orders", async () => {
    const res = await get("managed", await sessionCookieFor("other-pm@demo.local"))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it("forbids consultants and admins with 403", async () => {
    expect((await get("managed", await sessionCookieFor("consultant@demo.local"))).status).toBe(403)
    expect((await get("managed", await sessionCookieFor("admin@demo.local"))).status).toBe(403)
  })
})
