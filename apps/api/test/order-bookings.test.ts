// Step 3: a project manager sees the single bookings of their own orders – to check the work – but nobody
// else does, and the answer contains no email, user id or totals per person (docs/roles-and-privacy.md).
// Seed: PO-2026-001 has two bookings by Carl Consultant (26 and 27 Oct 2026).
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import bcrypt from "bcryptjs"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { orderRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-order-bookings-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
let portalId: number
const cookies: Record<string, string> = {}

beforeAll(async () => {
  await setupDatabase(db)
  portalId = (await orderRepository(db).findAll()).find((o) => o.code === "PO-2026-001")!.id
  // A second project manager who is responsible for no order in the seed.
  await userRepository(db).create({
    email: "other-pm@demo.local",
    name: "Otto Otherpm",
    role: "project_manager",
    supplierId: null,
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
  })
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  for (const who of ["pm", "other-pm", "consultant", "purchasing", "admin"]) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `${who}@demo.local`, password: DEMO_PASSWORD }),
    })
    cookies[who] = res.headers.getSetCookie()[0]!.split(";")[0]!
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

const bookingsOf = (orderId: number | string, cookie?: string) =>
  fetch(`${baseUrl}/api/orders/${orderId}/time-entries`, { headers: cookie ? { Cookie: cookie } : {} })

describe("the project manager checks the work on their order", () => {
  it("lists each booking with date, hours, description and the consultant's name, newest first", async () => {
    const res = await bookingsOf(portalId, cookies.pm)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([
      { id: expect.any(Number), workDate: "2026-10-27", durationMinutes: 450, description: "Login page implementation", status: "open", returnReason: null, consultantName: "Carl Consultant" },
      { id: expect.any(Number), workDate: "2026-10-26", durationMinutes: 480, description: "Kick-off and requirements workshop", status: "open", returnReason: null, consultantName: "Carl Consultant" },
    ])
  })

  it("contains no email, user id or totals per person", async () => {
    const text = await (await bookingsOf(portalId, cookies.pm)).text()

    expect(text).not.toContain("@demo.local")
    expect(text).not.toContain("userId")
    expect(text).not.toMatch(/total/i)
  })

  it("contains no start time, end time or break – only the consultant sees those (ADR 0010)", async () => {
    const text = await (await bookingsOf(portalId, cookies.pm)).text()

    expect(text).not.toMatch(/startTime|endTime|breakMinutes/)
    expect(text).not.toContain("08:30") // the seeded start on 26 Oct
  })
})

describe("nobody else sees these bookings", () => {
  it("refuses another project manager with 403 NOT_YOUR_ORDER", async () => {
    const res = await bookingsOf(portalId, cookies["other-pm"])

    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe("NOT_YOUR_ORDER")
  })

  it.each(["consultant", "purchasing", "admin"])("refuses %s with 403", async (who) => {
    expect((await bookingsOf(portalId, cookies[who])).status).toBe(403)
  })

  it("asks for a session without a cookie (401)", async () => {
    expect((await bookingsOf(portalId)).status).toBe(401)
  })

  it("answers 404 for an order that does not exist and 400 for an id that is not a number", async () => {
    expect((await bookingsOf(99999, cookies.pm)).status).toBe(404)
    expect((await bookingsOf("abc", cookies.pm)).status).toBe(400)
  })
})
