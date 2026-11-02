// Ticket #79: the route behind the sentence field. The parsing itself is tested in domain/booking-sentence.test.ts.
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { auditEventRepository, orderRepository, timeEntryRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-sentence-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
const servers: Server[] = []
let baseUrl: string
let offUrl: string

const start = async (aiMode: "mock" | "off") => {
  const server = createApp({ db, sessionSecret: "test-secret", secureCookies: false, aiMode }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  servers.push(server)
  return `http://localhost:${(server.address() as AddressInfo).port}`
}

beforeAll(async () => {
  await setupDatabase(db)
  baseUrl = await start("mock")
  offUrl = await start("off")
})

afterAll(() => {
  for (const server of servers) server.close()
  client.close()
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  } catch {
    /* Windows may keep the file locked briefly; leftover temp files are harmless */
  }
})

const parse = async (sentence: string, email = "consultant@demo.local", url = baseUrl) => {
  const login = await fetch(`${url}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: DEMO_PASSWORD }),
  })
  return fetch(`${url}/api/time-entries/parse-sentence`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: login.headers.getSetCookie()[0]!.split(";")[0]! },
    body: JSON.stringify({ sentence }),
  })
}

describe("booking from a sentence", () => {
  it("returns a proposal for one of the consultant's own orders", async () => {
    const res = await parse("today 9-5 on SAP data migration, 30 min break")
    const order = (await orderRepository(db).findAll()).find((o) => o.code === "PO-2026-002")!

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ orderId: order.id, startTime: "09:00", endTime: "17:00", breakMinutes: 30 })
  })

  it("saves nothing", async () => {
    const carl = (await userRepository(db).findByEmail("consultant@demo.local"))!
    const before = (await timeEntryRepository(db).findByUser(carl.id)).length

    await parse("yesterday 9-5 on SAP data migration")

    expect((await timeEntryRepository(db).findByUser(carl.id)).length).toBe(before)
  })

  it("cannot propose an order of another company", async () => {
    // "Mobile app security audit" belongs to Nordic Dev; Carl works for Acme.
    expect((await (await parse("9-5 on mobile security audit")).json()).orderId).toBeNull()
  })

  it("keeps the sentence out of the audit log: it is free text", async () => {
    await parse("Secret free text 9-5")
    const [event] = await auditEventRepository(db).findLatest({ limit: 1, action: "time_entry.parse_sentence" })

    expect(event).toMatchObject({ outcome: "success" })
    expect(JSON.stringify(event)).not.toContain("Secret")
  })

  it("rejects an empty sentence with 400", async () => {
    expect((await parse("")).status).toBe(400)
  })

  it("is refused with 422 when AI_MODE is off", async () => {
    const res = await parse("today 9-5", "consultant@demo.local", offUrl)

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("AI_OFF")
  })

  it("is only for consultants", async () => {
    expect((await parse("today 9-5", "pm@demo.local")).status).toBe(403)
  })
})
