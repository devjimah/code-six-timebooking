// Ticket #23: every API request leaves an audit event that says who did what, on what, with which result and why;
// only admins can read the log; passwords, query strings and free text never end up in it.
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { routes as documentedRoutes } from "../src/api/openapi.js"
import { ACTIONS } from "../src/audit/audit-log.js"
import { type AuditEvent, auditOutcome } from "../src/domain/models.js"
import { auditEventRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-audit-"))
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

const login = (email: string, password: string) =>
  fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

async function sessionCookieFor(email: string): Promise<string> {
  const res = await login(email, DEMO_PASSWORD)
  return res.headers.getSetCookie()[0]!.split(";")[0]!
}

const get = (path: string, cookie?: string) =>
  fetch(`${baseUrl}${path}`, { headers: cookie ? { Cookie: cookie } : {} })

const post = (path: string, body: unknown, cookie: string) =>
  fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  })

/** Events are written right after the response is sent, so wait until the expected one is there. */
async function waitForEvent(match: (e: AuditEvent) => boolean): Promise<AuditEvent> {
  for (let attempt = 0; attempt < 100; attempt++) {
    const found = (await auditEventRepository(db).findLatest({ limit: 500 })).find(match)
    if (found) return found
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error("Expected audit event was not recorded")
}

describe("audit outcome", () => {
  it("maps status codes to outcomes", () => {
    expect(auditOutcome(200)).toBe("success")
    expect(auditOutcome(204)).toBe("success")
    expect(auditOutcome(400)).toBe("rejected")
    expect(auditOutcome(422)).toBe("rejected")
    expect(auditOutcome(401)).toBe("denied")
    expect(auditOutcome(403)).toBe("denied")
    expect(auditOutcome(500)).toBe("error")
  })
})

describe("audit log", () => {
  it("records a successful sign-in with the user who signed in", async () => {
    await login("consultant@demo.local", DEMO_PASSWORD)

    const event = await waitForEvent((e) => e.route === "/api/auth/login" && e.outcome === "success")

    expect(event).toMatchObject({ method: "POST", statusCode: 200, actorRole: "consultant" })
    expect(event.actorUserId).toBeTypeOf("number")
  })

  it("records a failed sign-in as denied, without a user", async () => {
    await login("consultant@demo.local", "wrong-guess")

    const event = await waitForEvent((e) => e.route === "/api/auth/login" && e.statusCode === 401)

    expect(event).toMatchObject({ outcome: "denied", actorUserId: null, actorRole: null })
  })

  it("records who tried an action they are not allowed to do", async () => {
    await get("/api/users", await sessionCookieFor("pm@demo.local"))

    const event = await waitForEvent((e) => e.route === "/api/users" && e.outcome === "denied")

    expect(event).toMatchObject({ method: "GET", statusCode: 403, actorRole: "project_manager" })
  })

  it("never stores passwords or query strings", async () => {
    await login("admin@demo.local", "S3cret-guess!")
    await get("/api/audit-events?limit=5&userId=1", await sessionCookieFor("admin@demo.local"))
    await waitForEvent((e) => e.route === "/api/audit-events")

    const everything = JSON.stringify(await auditEventRepository(db).findLatest({ limit: 500 }))

    expect(everything).not.toContain("S3cret-guess!")
    expect(everything).not.toContain(DEMO_PASSWORD)
    expect(everything).not.toContain("limit=5")
  })

  it("does not record the health check", async () => {
    await get("/api/health")
    await get("/api/auth/me") // a later request that is recorded, so we know the health check had its chance
    await waitForEvent((e) => e.route === "/api/auth/me")

    const events = await auditEventRepository(db).findLatest({ limit: 500 })

    expect(events.some((e) => e.path === "/api/health")).toBe(false)
  })
})

describe("what an audit event says", () => {
  it("names the email of a failed sign-in and why it failed, but never the password", async () => {
    await login("pm@demo.local", "Wr0ng-guess-123")

    const event = await waitForEvent((e) => e.action === "auth.login" && e.errorCode === "INVALID_CREDENTIALS")

    expect(event.details).toEqual({ email: "pm@demo.local" })
    expect(JSON.stringify(event)).not.toContain("Wr0ng-guess-123")
  })

  it("names the signed-in user as the target of a successful sign-in", async () => {
    await login("admin@demo.local", DEMO_PASSWORD)

    const event = await waitForEvent((e) => e.action === "auth.login" && e.outcome === "success" && e.actorRole === "admin")

    expect(event).toMatchObject({ targetType: "user", targetId: event.actorUserId, errorCode: null })
  })

  it("records a rejected booking with its order, key facts and the rule that rejected it", async () => {
    const description = "Secret project detail that must not be logged"
    await post(
      "/api/time-entries",
      { orderId: 1, workDate: "2026-10-27", durationMinutes: -30, description },
      await sessionCookieFor("consultant@demo.local"),
    )

    const event = await waitForEvent((e) => e.action === "time_entry.create" && e.errorCode === "INVALID_DURATION")

    expect(event).toMatchObject({
      outcome: "rejected",
      statusCode: 422,
      targetType: "order",
      targetId: 1,
      details: { workDate: "2026-10-27", durationMinutes: -30 },
    })
    expect(JSON.stringify(event)).not.toContain(description)
  })

  it("records a new account with its key facts and id, but not its password", async () => {
    const email = `audit.${Date.now()}@demo.local`
    const res = await post(
      "/api/users",
      { email, name: "Audit Person", role: "project_manager", password: "initial-pass-123" },
      await sessionCookieFor("admin@demo.local"),
    )
    const created = await res.json()

    const event = await waitForEvent((e) => e.action === "user.create" && e.details?.email === email)

    expect(event).toMatchObject({
      outcome: "success",
      targetType: "user",
      targetId: created.id,
      details: { email, role: "project_manager", supplierId: null },
    })
    expect(JSON.stringify(event)).not.toContain("initial-pass-123")
  })

  it("records why a request was denied", async () => {
    await get("/api/suppliers", await sessionCookieFor("consultant@demo.local"))

    const event = await waitForEvent((e) => e.action === "supplier.list" && e.outcome === "denied")

    expect(event.errorCode).toBe("FORBIDDEN")
  })

  it("records the IP address and the browser", async () => {
    await fetch(`${baseUrl}/api/auth/me`, { headers: { "User-Agent": "audit-test-browser/1.0" } })

    const event = await waitForEvent((e) => e.userAgent === "audit-test-browser/1.0")

    expect(event.ipAddress).toMatch(/127\.0\.0\.1|::1/)
  })

  it("records requests to routes that do not exist", async () => {
    await get("/api/does-not-exist")

    const event = await waitForEvent((e) => e.path === "/api/does-not-exist")

    expect(event).toMatchObject({ action: "request.unknown_route", statusCode: 404 })
  })

  it("has an action name for every documented route", () => {
    const missing = documentedRoutes
      .filter((route) => route.path !== "/api/health")
      .map((route) => `${route.method.toUpperCase()} ${route.path.replace(/\{(\w+)\}/g, ":$1")}`)
      .filter((key) => !(key in ACTIONS))

    expect(missing).toEqual([])
  })
})

describe("reading the audit log", () => {
  it("lets an admin read events, newest first", async () => {
    const res = await get("/api/audit-events?limit=3", await sessionCookieFor("admin@demo.local"))
    const events: AuditEvent[] = await res.json()

    expect(res.status).toBe(200)
    expect(events).toHaveLength(3)
    expect(events[0]!.id).toBeGreaterThan(events[1]!.id)
  })

  it("filters events by user", async () => {
    const admin = await sessionCookieFor("admin@demo.local")
    const me = await (await get("/api/auth/me", admin)).json()

    const res = await get(`/api/audit-events?userId=${me.id}`, admin)
    const events: AuditEvent[] = await res.json()

    expect(events.length).toBeGreaterThan(0)
    expect(events.every((e) => e.actorUserId === me.id)).toBe(true)
  })

  it("filters events by outcome and action", async () => {
    const admin = await sessionCookieFor("admin@demo.local")
    await login("consultant@demo.local", "another-wrong-guess")
    await waitForEvent((e) => e.action === "auth.login" && e.outcome === "denied")

    const res = await get("/api/audit-events?outcome=denied&action=auth.login", admin)
    const events: AuditEvent[] = await res.json()

    expect(events.length).toBeGreaterThan(0)
    expect(events.every((e) => e.outcome === "denied" && e.action === "auth.login")).toBe(true)
  })

  it("forbids a consultant to read the audit log with 403", async () => {
    const res = await get("/api/audit-events", await sessionCookieFor("consultant@demo.local"))

    expect(res.status).toBe(403)
  })

  it("offers no way to delete audit events", async () => {
    const res = await fetch(`${baseUrl}/api/audit-events`, {
      method: "DELETE",
      headers: { Cookie: await sessionCookieFor("admin@demo.local") },
    })

    expect(res.status).toBe(404)
  })
})
