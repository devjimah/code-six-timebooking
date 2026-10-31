// Ticket #6: a session token is only accepted if our server signed it and it has not expired.
import { describe, expect, it } from "vitest"
import { SESSION_MAX_AGE_SECONDS, createSessionToken, verifySessionToken } from "../src/auth/session.js"

const SECRET = "test-secret"
const NOW = 1_800_000_000 // fixed clock, so the tests do not depend on today's date

describe("session token", () => {
  it("accepts a token it signed and returns the user id", () => {
    const token = createSessionToken(42, SECRET, NOW)

    expect(verifySessionToken(token, SECRET, NOW)).toBe(42)
  })

  it("rejects a token whose payload was changed to another user", () => {
    const [, signature] = createSessionToken(42, SECRET, NOW).split(".")
    const forgedPayload = Buffer.from(JSON.stringify({ sub: 1, exp: NOW + 3600 })).toString("base64url")

    expect(verifySessionToken(`${forgedPayload}.${signature}`, SECRET, NOW)).toBeNull()
  })

  it("rejects a token signed with another secret", () => {
    const token = createSessionToken(42, "someone-elses-secret", NOW)

    expect(verifySessionToken(token, SECRET, NOW)).toBeNull()
  })

  it("accepts a token one second before it expires", () => {
    const token = createSessionToken(42, SECRET, NOW)

    expect(verifySessionToken(token, SECRET, NOW + SESSION_MAX_AGE_SECONDS - 1)).toBe(42)
  })

  it("rejects an expired token", () => {
    const token = createSessionToken(42, SECRET, NOW)

    expect(verifySessionToken(token, SECRET, NOW + SESSION_MAX_AGE_SECONDS)).toBeNull()
  })

  it("rejects garbage", () => {
    expect(verifySessionToken("not-a-token", SECRET, NOW)).toBeNull()
    expect(verifySessionToken("", SECRET, NOW)).toBeNull()
  })
})
