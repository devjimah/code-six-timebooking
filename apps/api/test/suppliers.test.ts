// Purchasing creates and renames suppliers; the admin may only read them (docs/roles-and-privacy.md).
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-suppliers-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
const cookies: Record<string, string> = {}

beforeAll(async () => {
  await setupDatabase(db)
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  for (const role of ["purchasing", "admin", "pm", "consultant"]) {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `${role}@demo.local`, password: DEMO_PASSWORD }),
    })
    cookies[role] = res.headers.getSetCookie()[0]!.split(";")[0]!
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

const send = (method: string, path: string, body: unknown, cookie?: string) =>
  fetch(`${baseUrl}/api/suppliers${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(cookie && { Cookie: cookie }) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

describe("purchasing manages suppliers", () => {
  it("creates a supplier", async () => {
    const res = await send("POST", "", { name: "  Bright Data GmbH " }, cookies.purchasing)

    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ id: expect.any(Number), name: "Bright Data GmbH" })
  })

  it("rejects a name that already exists, ignoring case, with 422", async () => {
    const res = await send("POST", "", { name: "acme consulting gmbh" }, cookies.purchasing)

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("SUPPLIER_NAME_TAKEN")
  })

  it("rejects a name that is too short with 400", async () => {
    const res = await send("POST", "", { name: "A" }, cookies.purchasing)

    expect(res.status).toBe(400)
  })

  it("renames a supplier", async () => {
    const created = await (await send("POST", "", { name: "Old Name AG" }, cookies.purchasing)).json()

    const res = await send("PATCH", `/${created.id}`, { name: "New Name AG" }, cookies.purchasing)

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ id: created.id, name: "New Name AG" })
  })

  it("rejects renaming to another supplier's name with 422", async () => {
    const created = await (await send("POST", "", { name: "Rename Me GmbH" }, cookies.purchasing)).json()

    const res = await send("PATCH", `/${created.id}`, { name: "Nordic Dev AG" }, cookies.purchasing)

    expect(res.status).toBe(422)
  })

  it("answers 404 for a supplier that does not exist", async () => {
    const res = await send("PATCH", "/99999", { name: "Ghost GmbH" }, cookies.purchasing)

    expect(res.status).toBe(404)
    expect((await res.json()).code).toBe("SUPPLIER_NOT_FOUND")
  })

  it("lists suppliers alphabetically for purchasing", async () => {
    const res = await send("GET", "", undefined, cookies.purchasing)
    const names = ((await res.json()) as { name: string }[]).map((s) => s.name)

    expect(res.status).toBe(200)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })
})

describe("other roles", () => {
  it("lets the admin read suppliers", async () => {
    expect((await send("GET", "", undefined, cookies.admin)).status).toBe(200)
  })

  it.each(["admin", "pm", "consultant"])("forbids %s to create a supplier with 403", async (role) => {
    expect((await send("POST", "", { name: `Not allowed ${role} GmbH` }, cookies[role])).status).toBe(403)
  })

  it("forbids the admin to rename a supplier with 403", async () => {
    expect((await send("PATCH", "/1", { name: "Hijacked GmbH" }, cookies.admin)).status).toBe(403)
  })

  it.each(["pm", "consultant"])("forbids %s to read suppliers with 403", async (role) => {
    expect((await send("GET", "", undefined, cookies[role])).status).toBe(403)
  })

  it("asks for a session without a cookie (401)", async () => {
    expect((await send("POST", "", { name: "Anonymous GmbH" })).status).toBe(401)
  })
})
