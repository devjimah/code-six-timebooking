// Step 5: the admin resets a password, the person must choose their own at the next sign-in, and every password
// change ends the open sessions. Fresh accounts per test, so the seeded demo users keep their password.
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

const dir = mkdtempSync(join(tmpdir(), "timebooking-passwords-"))
const client = createClient({ url: `file:${join(dir, "test.db").replace(/\\/g, "/")}` })
const db = drizzle(client, { schema })
let server: Server
let baseUrl: string
let admin: string
const ids: Record<string, number> = {}

beforeAll(async () => {
  await setupDatabase(db)
  for (const u of await userRepository(db).findAll()) ids[u.email.split("@")[0]!] = u.id
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

const INITIAL = "initial-pass-123"
const RESET = "reset-by-admin-456"
const OWN = "my-very-own-789"

const login = (email: string, password = DEMO_PASSWORD) =>
  fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })

const cookieOf = (res: Response) => res.headers.getSetCookie()[0]!.split(";")[0]!

async function signIn(email: string, password = DEMO_PASSWORD): Promise<string> {
  return cookieOf(await login(email, password))
}

const call = (method: string, path: string, body?: unknown, cookie = admin) =>
  fetch(`${baseUrl}/api/users${path}`, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

const me = (cookie: string) => fetch(`${baseUrl}/api/auth/me`, { headers: { Cookie: cookie } })
/** Any business route will do: purchasing's order list. */
const orders = (cookie: string) => fetch(`${baseUrl}/api/orders`, { headers: { Cookie: cookie } })
const changeOwn = (cookie: string, currentPassword: string, newPassword: string) =>
  fetch(`${baseUrl}/api/auth/password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ currentPassword, newPassword }),
  })

const errorCode = async (res: Response) => ((await res.json()) as { code: string }).code

/** A fresh purchasing account with the initial password the admin chose. */
async function newAccount() {
  const email = `person.${Date.now()}.${Math.random().toString(36).slice(2, 6)}@demo.local`
  const res = await call("POST", "", { email, name: "Test Person", role: "purchasing", supplierId: null, password: INITIAL })
  return { ...(await res.json()), email } as { id: number; email: string }
}

/** A fresh account whose person has already chosen their own password – the normal state. */
async function activePerson() {
  const person = await newAccount()
  const changed = await changeOwn(await signIn(person.email, INITIAL), INITIAL, OWN)
  return { ...person, cookie: cookieOf(changed) }
}

describe("new accounts", () => {
  it("must choose their own password first: business routes answer 403, the own account stays readable", async () => {
    const person = await newAccount()
    const cookie = await signIn(person.email, INITIAL)

    const blocked = await orders(cookie)
    const account = await me(cookie)

    expect(blocked.status).toBe(403)
    expect(await errorCode(blocked)).toBe("PASSWORD_CHANGE_REQUIRED")
    expect(account.status).toBe(200)
    expect((await account.json()).mustChangePassword).toBe(true)
  })

  it("leaves the seeded demo users alone, so the demo works without a password change", async () => {
    expect((await orders(await signIn("purchasing@demo.local"))).status).toBe(200)
  })
})

describe("changing the own password", () => {
  it("unlocks the app, keeps this browser signed in and signs out the others", async () => {
    const person = await newAccount()
    const otherBrowser = await signIn(person.email, INITIAL)
    const thisBrowser = await signIn(person.email, INITIAL)

    const res = await changeOwn(thisBrowser, INITIAL, OWN)

    expect(res.status).toBe(200)
    expect((await res.json()).mustChangePassword).toBe(false)
    expect((await orders(cookieOf(res))).status).toBe(200) // the fresh cookie from the response works
    expect((await me(thisBrowser)).status).toBe(401) // the cookie from before the change is outdated
    expect((await me(otherBrowser)).status).toBe(401)
    expect((await login(person.email, INITIAL)).status).toBe(401)
    expect((await login(person.email, OWN)).status).toBe(200)
  })

  it("rejects a wrong current password with 422 CURRENT_PASSWORD_WRONG", async () => {
    const person = await newAccount()

    const res = await changeOwn(await signIn(person.email, INITIAL), "not-my-password", OWN)

    expect(res.status).toBe(422)
    expect(await errorCode(res)).toBe("CURRENT_PASSWORD_WRONG")
  })

  it("rejects keeping the same password with 422 NEW_PASSWORD_SAME_AS_CURRENT", async () => {
    const person = await newAccount()

    const res = await changeOwn(await signIn(person.email, INITIAL), INITIAL, INITIAL)

    expect(res.status).toBe(422)
    expect(await errorCode(res)).toBe("NEW_PASSWORD_SAME_AS_CURRENT")
  })

  it("rejects a new password shorter than 10 characters with 400", async () => {
    const person = await newAccount()

    expect((await changeOwn(await signIn(person.email, INITIAL), INITIAL, "short")).status).toBe(400)
  })

  it("needs a session (401)", async () => {
    expect((await changeOwn("", INITIAL, OWN)).status).toBe(401)
  })
})

describe("admin resets a password", () => {
  it("sets the new password, ends the open session and makes the person choose their own again", async () => {
    const person = await activePerson()

    const res = await call("POST", `/${person.id}/password`, { password: RESET })

    expect(res.status).toBe(200)
    expect((await res.json()).mustChangePassword).toBe(true)
    expect((await me(person.cookie)).status).toBe(401)
    expect((await login(person.email, OWN)).status).toBe(401)
    const afterReset = await signIn(person.email, RESET)
    expect(await errorCode(await orders(afterReset))).toBe("PASSWORD_CHANGE_REQUIRED")
  })

  it("rejects resetting your own password with 422 CANNOT_RESET_OWN_PASSWORD", async () => {
    const res = await call("POST", `/${ids.admin}/password`, { password: RESET })

    expect(res.status).toBe(422)
    expect(await errorCode(res)).toBe("CANNOT_RESET_OWN_PASSWORD")
  })

  it("rejects a password shorter than 10 characters with 400", async () => {
    const person = await newAccount()

    expect((await call("POST", `/${person.id}/password`, { password: "short" })).status).toBe(400)
  })

  it("answers 404 for an account that does not exist", async () => {
    expect((await call("POST", "/99999/password", { password: RESET })).status).toBe(404)
  })

  it.each(["pm", "purchasing", "consultant"])("forbids %s to reset passwords with 403", async (who) => {
    const cookie = await signIn(`${who}@demo.local`)

    expect((await call("POST", `/${ids.admin}/password`, { password: RESET }, cookie)).status).toBe(403)
  })

  it("records reset and change in the audit log, never the passwords", async () => {
    const person = await activePerson()
    await call("POST", `/${person.id}/password`, { password: RESET })
    await changeOwn(await signIn(person.email, RESET), RESET, "second-own-password")

    // Events are written right after the response is sent, so wait until both are there.
    let actions: string[] = []
    for (let i = 0; i < 50 && actions.length < 2; i++) {
      const events = await auditEventRepository(db).findLatest({ limit: 500 })
      actions = events
        .filter((e) => e.targetType === "user" && e.targetId === person.id)
        .map((e) => e.action)
        .filter((a) => a === "user.reset_password" || a === "auth.change_password")
      await new Promise((resolve) => setTimeout(resolve, 20))
    }

    expect(actions).toEqual(expect.arrayContaining(["user.reset_password", "auth.change_password"]))
    const rows = JSON.stringify(await db.select().from(schema.auditEvents))
    for (const secret of [INITIAL, RESET, OWN, "second-own-password"]) expect(rows).not.toContain(secret)
  })
})
