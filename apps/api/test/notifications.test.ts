// In-app notifications: each role gets only what it may already see, computed from the data each time.
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

const dir = mkdtempSync(join(tmpdir(), "timebooking-notifications-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
const cookie: Record<string, string> = {}

beforeAll(async () => {
  await setupDatabase(db)
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  for (const who of ["pm", "purchasing", "consultant", "anna", "admin", "supplier"]) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `${who}@demo.local`, password: DEMO_PASSWORD }),
    })
    cookie[who] = res.headers.getSetCookie()[0]!.split(";")[0]!
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

const notifications = async (who: string) => (await fetch(`${baseUrl}/api/notifications`, { headers: { Cookie: cookie[who]! } })).json()
type Note = { type: string; code?: string; count?: number; reason?: string; orderMoreBy?: string }

describe("notifications per role", () => {
  it("tells the project manager which orders have bookings to check, and which run out early", async () => {
    const notes: Note[] = await notifications("pm")

    expect(notes).toContainEqual(expect.objectContaining({ type: "budget_runs_out", code: "PO-2026-004" }))
    expect(notes).toContainEqual(expect.objectContaining({ type: "bookings_to_check", code: "PO-2026-001", count: 2 }))
  })

  it("tells purchasing which orders to follow up", async () => {
    const notes: Note[] = await notifications("purchasing")

    expect(notes).toContainEqual(expect.objectContaining({ type: "order_more", code: "PO-2026-004", orderMoreBy: expect.any(String) }))
    expect(notes.every((n) => n.type === "order_more")).toBe(true)
  })

  it("tells the consultant nothing until a booking is returned, then why, and stops once it is corrected", async () => {
    const carl = (await userRepository(db).findByEmail("consultant@demo.local"))!
    expect(await notifications("consultant")).toEqual([])

    const [entry] = await timeEntryRepository(db).findByUser(carl.id)
    await timeEntryRepository(db).setReview(entry!.id, { status: "returned", returnReason: "Wrong order" })
    expect(await notifications("consultant")).toEqual([
      { type: "booking_returned", timeEntryId: entry!.id, workDate: entry!.workDate, reason: "Wrong order" },
    ])

    await timeEntryRepository(db).setReview(entry!.id, { status: "open", returnReason: null })
    expect(await notifications("consultant")).toEqual([])
  })

  it("does not tell one consultant about another's returned booking", async () => {
    const carl = (await userRepository(db).findByEmail("consultant@demo.local"))!
    const [entry] = await timeEntryRepository(db).findByUser(carl.id)
    await timeEntryRepository(db).setReview(entry!.id, { status: "returned", returnReason: "Secret reason" })

    expect(JSON.stringify(await notifications("anna"))).not.toContain("Secret reason")

    await timeEntryRepository(db).setReview(entry!.id, { status: "open", returnReason: null })
  })

  it("has nothing for the admin and the supplier manager", async () => {
    expect(await notifications("admin")).toEqual([])
    expect(await notifications("supplier")).toEqual([])
  })

  it("forgets a closed order", async () => {
    const order = (await orderRepository(db).findAll()).find((o) => o.code === "PO-2026-004")!
    await orderRepository(db).update(order.id, { closedAt: "2026-11-02T10:00:00.000Z" })

    expect(JSON.stringify(await notifications("pm"))).not.toContain("PO-2026-004")
    expect(JSON.stringify(await notifications("purchasing"))).not.toContain("PO-2026-004")

    await orderRepository(db).update(order.id, { closedAt: null })
  })

  it("waits until someone has replaced a password an admin chose", async () => {
    const created = await fetch(`${baseUrl}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie.admin! },
      body: JSON.stringify({ email: "forced@demo.local", name: "Forced", role: "purchasing", password: "initial-pass-123" }),
    })
    expect(created.status).toBe(201)
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "forced@demo.local", password: "initial-pass-123" }),
    })
    const session = login.headers.getSetCookie()[0]!.split(";")[0]!

    const res = await fetch(`${baseUrl}/api/notifications`, { headers: { Cookie: session } })

    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe("PASSWORD_CHANGE_REQUIRED")
  })

  it("needs a session", async () => {
    expect((await fetch(`${baseUrl}/api/notifications`)).status).toBe(401)
  })
})
