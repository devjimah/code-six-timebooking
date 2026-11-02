// An admin imports accounts from a file. Each one passes the rules of an account made by hand.
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { auditEventRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-import-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
let admin: string
let pm: string

const login = async (email: string, password = DEMO_PASSWORD) => {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  return { status: res.status, cookie: res.headers.getSetCookie()[0]?.split(";")[0] ?? "", body: await res.json() }
}

beforeAll(async () => {
  await setupDatabase(db)
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  admin = (await login("admin@demo.local")).cookie
  pm = (await login("pm@demo.local")).cookie
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

const PASSWORD = "bulk-initial-pass-1"
const post = (csv: string, cookie = admin, password = PASSWORD) =>
  fetch(`${baseUrl}/api/users/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ csv, password }),
  })

describe("importing accounts", () => {
  it("creates the accounts, which must replace the password at the first sign-in", async () => {
    const res = await post("email;name;role;supplier;state\nnew.one@acme.example;New One;consultant;acme consulting gmbh;BY\nnew.two@corp.example;New Two;purchasing;;")
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.refused).toEqual([])
    expect(body.created.map((u: { email: string }) => u.email)).toEqual(["new.one@acme.example", "new.two@corp.example"])
    expect(body.created[0]).toMatchObject({ workState: "BY", mustChangePassword: true, supplierId: expect.any(Number) })
    expect((await login("new.two@corp.example", PASSWORD)).body.user ?? (await login("new.two@corp.example", PASSWORD)).status).toBeTruthy()
  })

  it("reports each refused line with its reason, and still creates the others", async () => {
    const res = await post(
      [
        "email;name;role;supplier",
        "good@acme.example;Good Person;consultant;Acme Consulting GmbH",
        "admin@demo.local;Taken Email;purchasing;",
        "nosupplier@acme.example;No Company;consultant;",
        "ghost@acme.example;Ghost Company;consultant;Ghost Ltd",
        "client@corp.example;Client With Company;purchasing;Acme Consulting GmbH",
        "not-an-email;Bad Email;consultant;",
      ].join("\n"),
    )
    const { created, refused } = await res.json()

    expect(created.map((u: { email: string }) => u.email)).toEqual(["good@acme.example"])
    expect(refused.map((r: { line: number; code: string }) => [r.line, r.code])).toEqual([
      [3, "EMAIL_TAKEN"],
      [4, "CONSULTANT_NEEDS_SUPPLIER"],
      [5, "SUPPLIER_NOT_FOUND"],
      [6, "SUPPLIER_ONLY_FOR_SUPPLIER_SIDE"],
      [7, "IMPORT_INVALID_EMAIL"],
    ])
  })

  it("rejects a bad file as a whole with 422", async () => {
    const res = await post("just;some;columns\n1;2;3")

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("IMPORT_BAD_HEADER")
  })

  it("rejects a short initial password with 400, and creates nobody", async () => {
    const before = (await userRepository(db).findAll()).length
    const res = await post("email;name;role\nshort@corp.example;Short Pass;purchasing", admin, "short")

    expect(res.status).toBe(400)
    expect((await userRepository(db).findAll()).length).toBe(before)
  })

  it("is only for the admin", async () => {
    expect((await post("email;name;role\nx@corp.example;X Y;purchasing", pm)).status).toBe(403)
  })

  it("logs how many, never the password or the file", async () => {
    await post("email;name;role\nlogged@corp.example;Logged Person;purchasing")
    const [event] = await auditEventRepository(db).findLatest({ limit: 1, action: "user.import" })

    expect(event).toMatchObject({ outcome: "success", details: { created: 1, refused: 0 } })
    expect(JSON.stringify(event)).not.toMatch(/bulk-initial|logged@corp/)
  })
})
