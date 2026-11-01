// Session tokens for the demo sign-in (ADR 0002).
// A token is "<payload>.<signature>": the payload says which user and until when,
// the HMAC-SHA256 signature proves that our server created it. Anyone can read the payload
// (it holds only a user id and a version number), but nobody without SESSION_SECRET can change it.
// The version is the user's session version at sign-in; middleware.ts rejects a token once the version in the
// database has moved on (password reset or change, step 5).
import { createHmac, timingSafeEqual } from "node:crypto"

export const SESSION_COOKIE = "session"
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60 // longer than the 10-hour working day

type Payload = { sub: number; ver?: number; exp: number } // user id, session version, expiry in seconds since 1970

export type SessionClaims = { userId: number; version: number }

const nowInSeconds = () => Math.floor(Date.now() / 1000)
const sign = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest("base64url")

export function createSessionToken(claims: SessionClaims, secret: string, now = nowInSeconds()): string {
  const payload: Payload = { sub: claims.userId, ver: claims.version, exp: now + SESSION_MAX_AGE_SECONDS }
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${data}.${sign(data, secret)}`
}

/** Returns user id and session version if the token is genuine and not expired, otherwise null. */
export function verifySessionToken(token: string, secret: string, now = nowInSeconds()): SessionClaims | null {
  const [data, signature] = token.split(".")
  if (!data || !signature) return null

  // Compare in constant time, so an attacker cannot guess the signature byte by byte from response times.
  const expected = Buffer.from(sign(data, secret))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as Payload
    if (!Number.isInteger(payload.sub) || !(payload.exp > now)) return null
    // Tokens issued before step 5 have no version; they belong to version 0.
    return { userId: payload.sub, version: payload.ver ?? 0 }
  } catch {
    return null
  }
}
