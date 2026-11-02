// Tickets #75 and #76: the project manager gets a proof of work per month, purchasing checks an invoice against it.
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
import { auditEventRepository, orderRepository, timeEntryRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-proof-"))
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
  await userRepository(db).create({
    email: "other-pm@demo.local", name: "Other PM", role: "project_manager", supplierId: null,
    passwordHash: await bcrypt.hash(DEMO_PASSWORD, 4),
  })
  for (const who of ["pm", "other-pm", "purchasing", "consultant", "admin"]) cookie[who] = await sessionCookieFor(`${who}@demo.local`)

  const pm = (await userRepository(db).findByEmail("pm@demo.local"))!
  const carl = (await userRepository(db).findByEmail("consultant@demo.local"))!
  const order = await orderRepository(db).create({
    code: "PO/PROOF 1", title: "Proof of work", supplierId: carl.supplierId!, projectManagerId: pm.id,
    budgetHours: 100, hourlyRateCents: 10000, startDate: "2026-08-01", endDate: "2027-03-31",
  })
  orderId = order.id
  const entries = timeEntryRepository(db)
  const book = (workDate: string, durationMinutes: number, description: string) =>
    entries.create({ userId: carl.id, orderId, workDate, startTime: "09:00", endTime: "17:00", breakMinutes: 0, durationMinutes, description })
  const first = await book("2026-09-01", 480, "Approved work; with a semicolon")
  const second = await book("2026-09-30", 90, '=HYPERLINK("http://evil.example")')
  const third = await book("2026-09-15", 60, 'Returned "work" with Überstunden')
  await book("2026-09-16", 30, "Still open work")
  await book("2026-10-01", 600, "The next month")
  await entries.setReview(first.id, { status: "approved", returnReason: null })
  await entries.setReview(second.id, { status: "approved", returnReason: null })
  await entries.setReview(third.id, { status: "returned", returnReason: "Wrong order" })
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

const get = (path: string, who: string) => fetch(`${baseUrl}/api${path}`, { headers: { Cookie: cookie[who]! } })

describe("the proof of work", () => {
  it("gives the project manager one month's bookings and totals", async () => {
    const res = await get(`/orders/${orderId}/proof-of-work?month=2026-09`, "pm")
    const proof = await res.json()

    expect(res.status).toBe(200)
    expect(proof).toMatchObject({ month: "2026-09", approvedHours: 9.5, openHours: 0.5, returnedHours: 1, approvedCents: 95000 })
    expect(proof.bookings).toHaveLength(4)
    expect(JSON.stringify(proof)).not.toContain("startTime")
  })

  it("rejects a month that is not a month with 400", async () => {
    expect((await get(`/orders/${orderId}/proof-of-work?month=2026-13`, "pm")).status).toBe(400)
    expect((await get(`/orders/${orderId}/proof-of-work`, "pm")).status).toBe(400)
  })

  it("is only for the order's own project manager", async () => {
    expect((await get(`/orders/${orderId}/proof-of-work?month=2026-09`, "other-pm")).status).toBe(403)
    for (const who of ["purchasing", "consultant", "admin"]) {
      expect((await get(`/orders/${orderId}/proof-of-work?month=2026-09`, who)).status).toBe(403)
      expect((await get(`/orders/${orderId}/proof-of-work.csv?month=2026-09`, who)).status).toBe(403)
    }
  })
})

describe("the CSV download", () => {
  const download = async () => {
    const res = await get(`/orders/${orderId}/proof-of-work.csv?month=2026-09`, "pm")
    return { res, text: await res.text() }
  }

  it("is a file named after the order and the month, with a safe name", async () => {
    const { res } = await download()

    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toContain("text/csv")
    expect(res.headers.get("content-disposition")).toBe("attachment; filename=proof-of-work-PO_PROOF_1-2026-09.csv")
  })

  it("lists the month oldest first, with semicolons and a decimal comma, for German Excel", async () => {
    const { text } = await download()
    const lines = text.trim().split("\r\n")

    expect(lines).toHaveLength(5)
    expect(lines[0]).toContain('"Date";"Consultant"')
    expect(lines[1]).toContain('"2026-09-01";"Carl Consultant";"Approved work; with a semicolon";"8";"approved"')
    expect(lines[4]).toContain('"2026-09-30"')
    expect(lines[4]).toContain('"1,5"')
    expect(text).not.toContain("The next month")
  })

  it("keeps a formula in a description from running in Excel", async () => {
    const { text } = await download()

    expect(text).toContain(`"'=HYPERLINK(""http://evil.example"")"`)
  })

  it("doubles quotes, keeps umlauts and starts with a byte order mark", async () => {
    const buffer = await (await get(`/orders/${orderId}/proof-of-work.csv?month=2026-09`, "pm")).arrayBuffer()
    const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(buffer)

    expect(text.charCodeAt(0)).toBe(0xfeff)
    expect(text).toContain('"Returned ""work"" with Überstunden"')
    expect(text).toContain('"Wrong order"')
  })

  it("contains no start or end times", async () => {
    const { text } = await download()

    expect(text).not.toMatch(/09:00|17:00/)
  })
})

describe("the invoice check", () => {
  const check = (month: string, invoicedCents: number, who = "purchasing") =>
    get(`/orders/${orderId}/invoice-check?month=${month}&invoicedCents=${invoicedCents}`, who)

  it("matches an invoice for exactly the approved hours", async () => {
    const res = await check("2026-09", 95000)

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ result: "matches", differenceCents: 0, approvedHours: 9.5, notApprovedHours: 1.5 })
  })

  it("highlights the difference of a higher invoice", async () => {
    expect(await (await check("2026-09", 110000)).json()).toMatchObject({ result: "invoice_higher", differenceCents: 15000 })
  })

  it("gives purchasing sums, never single bookings", async () => {
    const text = await (await check("2026-09", 95000)).text()

    expect(text).not.toMatch(/Carl|semicolon|Überstunden/)
  })

  it("stores nothing", async () => {
    await check("2026-09", 123456)
    const events = await auditEventRepository(db).findLatest({ limit: 5, action: "order.check_invoice" })

    expect(events[0]).toMatchObject({ targetId: orderId, details: { month: "2026-09" } })
  })

  it("rejects a negative amount and a bad month with 400, and answers 404 for an unknown order", async () => {
    expect((await check("2026-09", -1)).status).toBe(400)
    expect((await check("soon", 100)).status).toBe(400)
    expect((await get(`/orders/99999/invoice-check?month=2026-09&invoicedCents=1`, "purchasing")).status).toBe(404)
  })

  it("is only for purchasing", async () => {
    for (const who of ["pm", "consultant", "admin"]) expect((await check("2026-09", 100, who)).status).toBe(403)
  })
})
