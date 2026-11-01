// Step 4: the admin changes, deactivates and reactivates accounts. Deactivated people cannot sign in, and their
// open sessions end at once. Seed: Paula (project manager) is responsible for all three orders; Carl (consultant)
// has bookings.
import { mkdtempSync, rmSync } from "node:fs"
import type { Server } from "node:http"
import type { AddressInfo } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { createApp } from "../src/app.js"
import { supplierRepository, userRepository } from "../src/persistence/repositories.js"
import * as schema from "../src/persistence/schema.js"
import { DEMO_PASSWORD } from "../src/persistence/seed.js"
import { setupDatabase } from "../src/persistence/setup.js"

const dir = mkdtempSync(join(tmpdir(), "timebooking-manage-users-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
let admin: string
const ids: Record<string, number> = {}
let acmeId: number

beforeAll(async () => {
  await setupDatabase(db)
  for (const u of await userRepository(db).findAll()) ids[u.email.split("@")[0]!] = u.id
  acmeId = (await supplierRepository(db).findAll()).find((s) => s.name.startsWith("Acme"))!.id
  server = createApp({ db, sessionSecret: "test-secret", secureCookies: false }).listen(0)
  await new Promise((resolve) => server.once("listening", resolve))
  baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
  admin = await signIn("admin@demo.local")
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

const login = (email: string, password = DEMO_PASSWORD) =>
  fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

async function signIn(email: string, password = DEMO_PASSWORD): Promise<string> {
  return (await login(email, password)).headers.getSetCookie()[0]!.split(";")[0]!
}

const call = (method: string, path: string, body?: unknown, cookie = admin) =>
  fetch(`${baseUrl}/api/users${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const errorCode = async (res: Response) => ((await res.json()) as { code: string }).code

/** A fresh account for one test, so tests do not depend on each other. */
async function newAccount(role: string, supplierId: number | null = null) {
  const email = `person.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@demo.local`
  const res = await call("POST", "", { email, name: "Test Person", role, supplierId, password: "initial-pass-123" })
  return { ...(await res.json()), email } as { id: number; email: string }
}

describe("changing an account", () => {
  it("changes name and email", async () => {
    const person = await newAccount("purchasing")

    const res = await call("PUT", `/${person.id}`, { name: "Renamed Person", email: "Renamed@Demo.local", role: "purchasing", supplierId: null })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ name: "Renamed Person", email: "renamed@demo.local", deactivatedAt: null })
  })

  it("changes the role while nothing depends on it", async () => {
    const person = await newAccount("consultant", acmeId)

    const res = await call("PUT", `/${person.id}`, { name: "Test Person", email: person.email, role: "project_manager", supplierId: null })

    expect(res.status).toBe(200)
    expect((await res.json()).role).toBe("project_manager")
  })

  it.each([
    ["a consultant with bookings", "consultant", { role: "purchasing", supplierId: null }],
    ["a project manager with orders", "pm", { role: "purchasing", supplierId: null }],
  ])("rejects a new role for %s with 422 ROLE_IN_USE", async (_case, who, change) => {
    const res = await call("PUT", `/${ids[who]}`, { name: "Anyone", email: `${who}@demo.local`, ...change })

    expect(res.status).toBe(422)
    expect(await errorCode(res)).toBe("ROLE_IN_USE")
  })

  it("rejects changing your own role", async () => {
    const res = await call("PUT", `/${ids.admin}`, { name: "Ada Admin", email: "admin@demo.local", role: "purchasing", supplierId: null })

    expect(await errorCode(res)).toBe("CANNOT_CHANGE_OWN_ROLE")
  })

  it("lets an admin change their own name", async () => {
    const res = await call("PUT", `/${ids.admin}`, { name: "Ada A. Admin", email: "admin@demo.local", role: "admin", supplierId: null })

    expect(res.status).toBe(200)
  })

  it("rejects an email that another account uses", async () => {
    const person = await newAccount("purchasing")

    const res = await call("PUT", `/${person.id}`, { name: "Test Person", email: "pm@demo.local", role: "purchasing", supplierId: null })

    expect(await errorCode(res)).toBe("EMAIL_TAKEN")
  })

  it("keeps the existing account rules (a consultant needs a company)", async () => {
    const res = await call("PUT", `/${ids.consultant}`, { name: "Carl Consultant", email: "consultant@demo.local", role: "consultant", supplierId: null })

    expect(await errorCode(res)).toBe("CONSULTANT_NEEDS_SUPPLIER")
  })

  it("answers 404 for an account that does not exist", async () => {
    const res = await call("PUT", "/99999", { name: "Nobody", email: "nobody@demo.local", role: "admin", supplierId: null })

    expect(res.status).toBe(404)
  })
})

describe("deactivating and reactivating", () => {
  it("deactivates an account: sign-in is refused with a clear reason, and an open session ends at once", async () => {
    const person = await newAccount("purchasing")
    const openSession = await signIn(person.email, "initial-pass-123")

    const res = await call("POST", `/${person.id}/deactivate`)
    const signInAgain = await login(person.email, "initial-pass-123")
    const useOpenSession = await fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: openSession } })

    expect(res.status).toBe(200)
    expect((await res.json()).deactivatedAt).toEqual(expect.any(String))
    expect(signInAgain.status).toBe(403)
    expect(await errorCode(signInAgain)).toBe("ACCOUNT_DEACTIVATED")
    expect(useOpenSession.status).toBe(401)
  })

  it("does not reveal a deactivated account to someone guessing the password", async () => {
    const person = await newAccount("purchasing")
    await call("POST", `/${person.id}/deactivate`)

    const res = await login(person.email, "wrong-guess-123")

    expect(res.status).toBe(401)
    expect(await errorCode(res)).toBe("INVALID_CREDENTIALS")
  })

  it("reactivates an account so the person can sign in again", async () => {
    const person = await newAccount("purchasing")
    await call("POST", `/${person.id}/deactivate`)

    const res = await call("POST", `/${person.id}/reactivate`)

    expect((await res.json()).deactivatedAt).toBeNull()
    expect((await login(person.email, "initial-pass-123")).status).toBe(200)
  })

  it("rejects deactivating a project manager who still has orders", async () => {
    const res = await call("POST", `/${ids.pm}/deactivate`)

    expect(res.status).toBe(422)
    expect(await errorCode(res)).toBe("MANAGES_ORDERS")
  })

  it("rejects deactivating yourself", async () => {
    expect(await errorCode(await call("POST", `/${ids.admin}/deactivate`))).toBe("CANNOT_DEACTIVATE_YOURSELF")
  })

  it("keeps a deactivated project manager out of the order form", async () => {
    const person = await newAccount("project_manager")
    await call("POST", `/${person.id}/deactivate`)

    const purchasing = await signIn("purchasing@demo.local")
    const list = await (await fetch(`${baseUrl}/api/project-managers`, { headers: { Cookie: purchasing } })).json()

    expect(list.map((p: { id: number }) => p.id)).not.toContain(person.id)
  })
})

describe("only admins", () => {
  it.each(["pm", "purchasing", "consultant"])("forbids %s to change or deactivate accounts with 403", async (who) => {
    const cookie = await signIn(`${who}@demo.local`)
    const target = ids.purchasing
    expect((await call("PUT", `/${target}`, { name: "X Y", email: "x@demo.local", role: "admin", supplierId: null }, cookie)).status).toBe(403)
    expect((await call("POST", `/${target}/deactivate`, undefined, cookie)).status).toBe(403)
    expect((await call("POST", `/${target}/reactivate`, undefined, cookie)).status).toBe(403)
  })
})
