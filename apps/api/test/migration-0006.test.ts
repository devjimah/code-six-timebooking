// Migration 0006 (ADR 0010) is edited by hand: bookings that exist before it must get start and end times
// that match their stored duration. We migrate up to 0005, add old-style bookings, then apply 0006.
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { migrate } from "drizzle-orm/libsql/migrator"
import { afterAll, describe, expect, it } from "vitest"
import * as schema from "../src/persistence/schema.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-migration-"))

afterAll(() => {
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  } catch {
    /* ignore */
  }
})

/** A copy of ./drizzle whose journal stops before the migration with the given tag. */
function migrationsBefore(tag: string) {
  const folder = join(dir, "drizzle-before")
  cpSync("./drizzle", folder, { recursive: true })
  const journalPath = join(folder, "meta", "_journal.json")
  const journal = JSON.parse(readFileSync(journalPath, "utf-8"))
  journal.entries = journal.entries.slice(0, journal.entries.findIndex((e: { tag: string }) => e.tag === tag))
  writeFileSync(journalPath, JSON.stringify(journal))
  return folder
}

describe("migration 0006: start and end times", () => {
  it("gives existing bookings times from 09:00 that add up to their duration", async () => {
    const client = createClient({ url: `file:${join(dir, "old.db").replace(/\\/g, "/")}` })
    const db = drizzle(client, { schema })
    await migrate(db, { migrationsFolder: migrationsBefore("0006_start_end_times") })

    await client.executeMultiple(`
      INSERT INTO suppliers (name) VALUES ('Old Supplier');
      INSERT INTO users (email, name, password_hash, role, supplier_id) VALUES ('old@demo.local', 'Old', 'x', 'consultant', 1);
      INSERT INTO users (email, name, password_hash, role) VALUES ('pm-old@demo.local', 'PM', 'x', 'project_manager');
      INSERT INTO orders (code, title, supplier_id, project_manager_id, budget_hours, hourly_rate_cents) VALUES ('PO-OLD', 'Old', 1, 2, 100, 9000);
      INSERT INTO time_entries (user_id, order_id, work_date, duration_minutes, description) VALUES
        (1, 1, '2026-10-26', 450, 'seven and a half hours'),
        (1, 1, '2026-10-27', 600, 'the longest allowed day'),
        (1, 1, '2026-10-28', 15, 'a quarter of an hour');
    `)

    await migrate(db, { migrationsFolder: "./drizzle" })
    const rows = await client.execute(
      "SELECT start_time, end_time, break_minutes, duration_minutes FROM time_entries ORDER BY work_date",
    )
    client.close()

    expect(rows.rows.map((r) => [r.start_time, r.end_time, r.break_minutes, r.duration_minutes])).toEqual([
      ["09:00", "16:30", 0, 450],
      ["09:00", "19:00", 0, 600],
      ["09:00", "09:15", 0, 15],
    ])
  })
})
