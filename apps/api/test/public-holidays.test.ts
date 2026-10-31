// The booking calendar greys out public holidays. It gets them from the same domain code the booking rule uses
// (domain/public-holidays.ts), so the calendar and the rule can never disagree.
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { nationwideHoliday } from "../src/domain/public-holidays.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-holidays-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string

beforeAll(async () => {
  await setupDatabase(db)
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

const holidays = (query: string, cookie: string | null) =>
  fetch(`${baseUrl}/api/public-holidays${query}`, { headers: cookie ? { Cookie: cookie } : {} })

describe("public holidays for the booking calendar", () => {
  it("lists the nationwide holidays of a year in calendar order", async () => {
    const res = await holidays("?year=2026", await sessionCookieFor("consultant@demo.local"))

    expect(res.status).toBe(200)
    const list = (await res.json()) as { date: string; name: string }[]
    expect(list).toHaveLength(9)
    expect(list[0]).toEqual({ date: "2026-01-01", name: "New Year's Day" })
    expect(list).toContainEqual({ date: "2026-04-03", name: "Good Friday" })
    expect(list.map((h) => h.date)).toEqual([...list.map((h) => h.date)].sort())
  })

  it("lists exactly the days the booking rule refuses", async () => {
    const list = (await (await holidays("?year=2027", await sessionCookieFor("consultant@demo.local"))).json()) as {
      date: string
      name: string
    }[]

    for (const { date, name } of list) expect(nationwideHoliday(date)).toBe(name)
  })

  it("rejects a missing or impossible year with 400", async () => {
    const cookie = await sessionCookieFor("consultant@demo.local")

    expect((await holidays("", cookie)).status).toBe(400)
    expect((await holidays("?year=99999", cookie)).status).toBe(400)
  })

  it("is for consultants only (403) and needs a session (401)", async () => {
    expect((await holidays("?year=2026", await sessionCookieFor("pm@demo.local"))).status).toBe(403)
    expect((await holidays("?year=2026", null)).status).toBe(401)
  })
})
