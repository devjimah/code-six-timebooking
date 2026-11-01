// Ticket #6: a session token is only accepted if our server signed it and it has not expired.
import { createHmac } from "node:crypto"
import { describe, expect, it } from "vitest"
import { SESSION_MAX_AGE_SECONDS, createSessionToken, verifySessionToken } from "../src/auth/session.js"

const SECRET = "test-secret"
const NOW = 1_800_000_000 // fixed clock, so the tests do not depend on today's date
const CLAIMS = { userId: 42, version: 3 }

describe("session token", () => {
  it("accepts a token it signed and returns user id and session version", () => {
    const token = createSessionToken(CLAIMS, SECRET, NOW)

    expect(verifySessionToken(token, SECRET, NOW)).toEqual(CLAIMS)
  })

  it("rejects a token whose payload was changed to another user", () => {
    const [, signature] = createSessionToken(CLAIMS, SECRET, NOW).split(".")
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 1, exp: NOW + 3600 })).toString("base64url")

    expect(verifySessionToken(`${forgedPayload}.${signature}`, SECRET, NOW)).toBeNull()
  })

  it("rejects a token signed with another secret", () => {
    const token = createSessionToken(CLAIMS, "someone-elses-secret", NOW)

    expect(verifySessionToken(token, SECRET, NOW)).toBeNull()
  })

  it("accepts a token one second before it expires", () => {
    const token = createSessionToken(CLAIMS, SECRET, NOW)

    expect(verifySessionToken(token, SECRET, NOW + SESSION_MAX_AGE_SECONDS - 1)).toEqual(CLAIMS)
  })

  it("rejects an expired token", () => {
    const token = createSessionToken(CLAIMS, SECRET, NOW)

    expect(verifySessionToken(token, SECRET, NOW + SESSION_MAX_AGE_SECONDS)).toBeNull()
  })

  it("treats a token from before session versions (step 5) as version 0", () => {
    const data = Buffer.from(JSON.stringify({ sub: 42, exp: NOW + 3600 })).toString("base64url")
    // Re-sign the old-style payload with the real secret, as the server did before step 5.
    const oldToken = `${data}.${createHmac("sha256", SECRET).update(data).digest("base64url")}`

    expect(verifySessionToken(oldToken, SECRET, NOW)).toEqual({ userId: 42, version: 0 })
  })

  it("rejects garbage", () => {
    expect(verifySessionToken("not-a-token", SECRET, NOW)).toBeNull()
    expect(verifySessionToken("", SECRET, NOW)).toBeNull()
  })
})
