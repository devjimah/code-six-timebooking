// Integration test for ticket #8: data must survive a restart.
// We simulate a restart by closing the database connection and opening a new one on the same file.
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, describe, expect, it } from "vitest"
import * as schema from "../src/persistence/schema.js"
import { orderRepository, timeEntryRepository, userRepository } from "../src/persistence/repositories.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-test-"))
const url = `file:${join(dir, "test.db").replace(/\\/g, "/")}`

function open() {
  const client = createClient({ url })
  return { client, db: drizzle(client, { schema }) }
}

afterAll(() => {
  // On Windows the SQLite file can stay locked briefly; leftover temp files are harmless.
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  } catch {
    /* ignore */
  }
})

describe("persistence", () => {
  it("keeps a time entry after a restart", async () => {
    // First "run" of the app: migrate, seed, book time.
    const first = open()
    await setupDatabase(first.db)
    const consultant = await userRepository(first.db).findByEmail("consultant@demo.local")
    const [order] = await orderRepository(first.db).findAll()
    const created = await timeEntryRepository(first.db).create({
      userId: consultant!.id,
      orderId: order!.id,
      workDate: "2026-10-30",
      durationMinutes: 90,
      description: "Restart test",
    })
    first.client.close()

    // Second "run": new connection, same file.
    const second = open()
    await setupDatabase(second.db) // must not re-seed or wipe data
    const entries = await timeEntryRepository(second.db).findByUser(consultant!.id)
    second.client.close()

    expect(entries).toContainEqual(created)
    expect(entries).toHaveLength(4) // 3 seeded + 1 new, no duplicate seed
  })
})

