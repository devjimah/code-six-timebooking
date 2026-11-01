// Ticket #5: only an admin creates accounts (ADR 0004), and the new person can sign in afterwards.
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { auditEventRepository, supplierRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-users-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
let acmeId: number
let admin: string

beforeAll(async () => {
  await setupDatabase(db)
  acmeId = (await supplierRepository(db).findAll()).find((s) => s.name === "Acme Consulting GmbH")!.id
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  admin = await sessionCookieFor("admin@demo.local")
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

async function sessionCookieFor(email: string, password = DEMO_PASSWORD): Promise<string> {
  return (await login(email, password)).headers.getSetCookie()[0]!.split(";")[0]!
}

const createUser = (body: object, cookie: string | null) =>
  fetch(`${baseUrl}/api/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie && { Cookie: cookie }) },
    body: JSON.stringify(body),
  })

const newConsultant = (overrides: object = {}) => ({
  email: "nina.neu@acme.example",
  name: "Nina Neu",
  role: "consultant",
  supplierId: acmeId,
  password: "first-day-2026",
  ...overrides,
})

describe("admin creates an account", () => {
  it("creates a consultant who can then sign in with the initial password", async () => {
    const res = await createUser(newConsultant(), admin)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toEqual({
      id: expect.any(Number),
      email: "nina.neu@acme.example",
      name: "Nina Neu",
      role: "consultant",
      supplierId: acmeId,
      deactivatedAt: null, // new accounts are active
      mustChangePassword: true, // the admin knows the initial password, so the person chooses their own (step 5)
    })
    expect(JSON.stringify(body)).not.toContain("first-day-2026")
    expect(JSON.stringify(body)).not.toContain("passwordHash")

    expect((await login("nina.neu@acme.example", "first-day-2026")).status).toBe(200)
  })

  it("stores the email in lower case, so sign-in does not depend on how it was typed", async () => {
    const res = await createUser(newConsultant({ email: "Max.Gross@Acme.example" }), admin)

    expect((await res.json()).email).toBe("max.gross@acme.example")
    expect((await login("MAX.GROSS@acme.example", "first-day-2026")).status).toBe(200)
  })

  it("creates a project manager without supplier", async () => {
    const res = await createUser({ email: "pia@client.example", name: "Pia Plan", role: "project_manager", password: "first-day-2026" }, admin)

    expect(res.status).toBe(201)
    expect((await res.json()).supplierId).toBeNull()
  })

  it("never writes the password into the audit log", async () => {
    await createUser(newConsultant({ email: "audit.check@acme.example", password: "do-not-log-me-123" }), admin)

    const events = await auditEventRepository(db).findLatest({ limit: 5 })
    expect(JSON.stringify(events)).not.toContain("do-not-log-me-123")
    expect(events[0]).toMatchObject({ method: "POST", route: "/api/users", statusCode: 201 })
  })
})

describe("account rules", () => {
  it("rejects a consultant without supplier with 422", async () => {
    const res = await createUser(newConsultant({ email: "x1@acme.example", supplierId: null }), admin)

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("CONSULTANT_NEEDS_SUPPLIER")
  })

  it("rejects a project manager with a supplier with 422", async () => {
    const res = await createUser(newConsultant({ email: "x2@acme.example", role: "project_manager" }), admin)

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("SUPPLIER_ONLY_FOR_CONSULTANTS")
  })

  it("rejects an unknown supplier with 422", async () => {
    const res = await createUser(newConsultant({ email: "x3@acme.example", supplierId: 9999 }), admin)

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("SUPPLIER_NOT_FOUND")
  })

  it("rejects an email address that is already taken with 422", async () => {
    const res = await createUser(newConsultant({ email: "consultant@demo.local" }), admin)

    expect(res.status).toBe(422)
    expect((await res.json()).code).toBe("EMAIL_TAKEN")
  })

  it("rejects a password shorter than 10 characters with 400", async () => {
    const res = await createUser(newConsultant({ email: "x4@acme.example", password: "short" }), admin)

    expect(res.status).toBe(400)
    expect((await res.json()).code).toBe("VALIDATION_FAILED")
  })
})

describe("who may create accounts", () => {
  it("forbids project managers and consultants with 403 – nobody can give themselves a role", async () => {
    const asAdmin = newConsultant({ email: "x5@acme.example", role: "admin", supplierId: null })

    expect((await createUser(asAdmin, await sessionCookieFor("pm@demo.local"))).status).toBe(403)
    expect((await createUser(asAdmin, await sessionCookieFor("consultant@demo.local"))).status).toBe(403)
  })

  it("answers 401 without a session – there is no self-registration", async () => {
    expect((await createUser(newConsultant({ email: "x6@acme.example" }), null)).status).toBe(401)
  })
})

describe("suppliers list", () => {
  it("lists the suppliers for the admin", async () => {
    const res = await fetch(`${baseUrl}/api/suppliers`, { headers: { Cookie: admin } })

    expect(res.status).toBe(200)
    expect((await res.json()).map((s: { name: string }) => s.name)).toEqual(["Acme Consulting GmbH", "Nordic Dev AG"])
  })

  it("forbids everyone else with 403", async () => {
    const res = await fetch(`${baseUrl}/api/suppliers`, { headers: { Cookie: await sessionCookieFor("pm@demo.local") } })

    expect(res.status).toBe(403)
  })
})
