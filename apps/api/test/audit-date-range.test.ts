// The admin narrows the audit log to a date range.
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { auditEventRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-audit-range-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
let admin: string

const event = (occurredAt: string) => ({
  occurredAt, actorUserId: null, actorRole: null, method: "GET", route: "/range-test", path: "/range-test",
  statusCode: 200, outcome: "success" as const, durationMs: 1, action: "range.test", targetType: null, targetId: null,
  errorCode: null, details: null, ipAddress: null, userAgent: null,
})

beforeAll(async () => {
  await setupDatabase(db)
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "admin@demo.local", password: DEMO_PASSWORD }),
  })
  admin = res.headers.getSetCookie()[0]!.split(";")[0]!
  const log = auditEventRepository(db)
  for (const at of ["2026-10-09T23:59:59.000Z", "2026-10-10T00:00:00.000Z", "2026-10-12T23:59:59.000Z", "2026-10-13T00:00:00.000Z"]) {
    await log.record(event(at))
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

const times = async (query: string) => {
  const res = await fetch(`${baseUrl}/api/audit-events?action=range.test&${query}`, { headers: { Cookie: admin } })
  return { status: res.status, body: await res.json() }
}
const dates = (events: { occurredAt: string }[]) => events.map((e) => e.occurredAt.slice(0, 10)).sort()

describe("audit log date range", () => {
  it("includes both the first and the last day", async () => {
    const { body } = await times("from=2026-10-10&to=2026-10-12")

    expect(dates(body)).toEqual(["2026-10-10", "2026-10-12"])
  })

  it("works with only a start date", async () => {
    const { body } = await times("from=2026-10-13")

    expect(dates(body)).toEqual(["2026-10-13"])
  })

  it("works with only an end date", async () => {
    const { body } = await times("to=2026-10-09")

    expect(dates(body)).toEqual(["2026-10-09"])
  })

  it("rejects a value that is not a date with 400", async () => {
    expect((await times("from=yesterday")).status).toBe(400)
  })
})
