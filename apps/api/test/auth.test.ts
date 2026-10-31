// Ticket #6: sign-in, sign-out and server-side permission checks, tested through the real HTTP API
// against a temporary SQLite database with the demo users from the seed.
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

const dir = mkdtempSync(join(tmpdir(), "timebooking-auth-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
let server: Server
let baseUrl: string

beforeAll(async () => {
  const db = drizzle(client, { schema })
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

const login = (email: string, password: string) =>
  fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

/** Signs in and returns the "session=…" part of Set-Cookie, ready to send back as a Cookie header. */
async function sessionCookieFor(email: string): Promise<string> {
  const res = await login(email, DEMO_PASSWORD)
  return res.headers.getSetCookie()[0]!.split(";")[0]!
}

const get = (path: string, cookie?: string) =>
  fetch(`${baseUrl}${path}`, { headers: cookie ? { Cookie: cookie } : {} })

describe("sign-in", () => {
  it("signs in a demo user and sets an httpOnly session cookie", async () => {
    const res = await login("consultant@demo.local", DEMO_PASSWORD)
    const body = await res.json()
    const setCookie = res.headers.getSetCookie()[0]!

    expect(res.status).toBe(200)
    expect(body).toMatchObject({ email: "consultant@demo.local", role: "consultant" })
    expect(body).not.toHaveProperty("passwordHash")
    expect(setCookie).toMatch(/^session=/)
    expect(setCookie).toContain("HttpOnly")
    expect(setCookie).toContain("SameSite=Lax")
  })

  it("rejects a wrong password with 401 and no cookie", async () => {
    const res = await login("consultant@demo.local", "wrong-password")

    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ code: "INVALID_CREDENTIALS", message: "Email or password is wrong." })
    expect(res.headers.getSetCookie()).toHaveLength(0)
  })

  it("gives an unknown email the same answer as a wrong password", async () => {
    const res = await login("nobody@demo.local", DEMO_PASSWORD)

    expect(res.status).toBe(401)
    expect((await res.json()).code).toBe("INVALID_CREDENTIALS")
  })

  it("rejects a request without a valid email with 400", async () => {
    const res = await login("not-an-email", DEMO_PASSWORD)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.code).toBe("VALIDATION_FAILED")
    expect(body.message).toContain("email")
  })
})

describe("session", () => {
  it("returns the signed-in user from /api/auth/me", async () => {
    const res = await get("/api/auth/me", await sessionCookieFor("pm@demo.local"))

    expect(res.status).toBe(200)
    expect((await res.json()).role).toBe("project_manager")
  })

  it("answers 401 without a session", async () => {
    const res = await get("/api/auth/me")

    expect(res.status).toBe(401)
    expect((await res.json()).code).toBe("UNAUTHENTICATED")
  })

  it("answers 401 for a tampered session cookie", async () => {
    const cookie = await sessionCookieFor("consultant@demo.local")

    const res = await get("/api/auth/me", `${cookie}x`)

    expect(res.status).toBe(401)
  })

  it("clears the cookie on logout", async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, { method: "POST" })

    expect(res.status).toBe(204)
    expect(res.headers.getSetCookie()[0]).toMatch(/^session=;.*Expires=Thu, 01 Jan 1970/)
  })
})

describe("permissions", () => {
  it("lets an admin list users", async () => {
    const res = await get("/api/users", await sessionCookieFor("admin@demo.local"))
    const users = await res.json()

    expect(res.status).toBe(200)
    expect(users).toHaveLength(3)
    expect(JSON.stringify(users)).not.toContain("passwordHash")
  })

  it("forbids a consultant to list users with 403", async () => {
    const res = await get("/api/users", await sessionCookieFor("consultant@demo.local"))

    expect(res.status).toBe(403)
    expect((await res.json()).code).toBe("FORBIDDEN")
  })

  it("answers 401, not 403, when nobody is signed in", async () => {
    const res = await get("/api/users")

    expect(res.status).toBe(401)
  })
})
