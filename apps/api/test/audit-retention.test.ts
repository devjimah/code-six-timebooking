// ADR 0012: the daily clean-up deletes expired audit events and nothing else.
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { purgeExpiredAuditEvents } from "../src/audit/retention.js"
import { auditEventRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-retention-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
const now = new Date("2026-10-31T12:00:00.000Z")
const policy = { readDays: 90, changeDays: 365 }

const event = (method: string, occurredAt: string) => ({
  occurredAt,
  actorUserId: 1,
  actorRole: "consultant" as const,
  method,
  route: method === "GET" ? "/api/time-entries/mine" : "/api/time-entries",
  path: method === "GET" ? "/api/time-entries/mine" : "/api/time-entries",
  statusCode: 200,
  outcome: "success" as const,
  durationMs: 3,
})

beforeAll(async () => {
  await setupDatabase(db)
  const repo = auditEventRepository(db)
  await repo.record(event("GET", "2026-10-30T09:00:00.000Z")) // read, 1 day old → kept
  await repo.record(event("GET", "2026-07-01T09:00:00.000Z")) // read, ~4 months old → deleted
  await repo.record(event("POST", "2026-07-01T09:00:00.000Z")) // booking, ~4 months old → kept
  await repo.record(event("POST", "2025-09-01T09:00:00.000Z")) // booking, > 1 year old → deleted
})

afterAll(() => {
  client.close()
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  } catch {
    /* Windows may keep the file locked briefly; leftover temp files are harmless */
  }
})

describe("audit retention clean-up", () => {
  it("deletes reads after 90 days and changes after 365 days, and keeps the rest", async () => {
    const deleted = await purgeExpiredAuditEvents(db, policy, now)

    expect(deleted).toBe(2)
    const left = await auditEventRepository(db).findLatest({ limit: 10 })
    expect(left.map((e) => `${e.method} ${e.occurredAt.slice(0, 10)}`).sort()).toEqual([
      "GET 2026-10-30",
      "POST 2026-07-01",
    ])
  })

  it("deletes nothing when it runs again on the same day", async () => {
    expect(await purgeExpiredAuditEvents(db, policy, now)).toBe(0)
  })
})
