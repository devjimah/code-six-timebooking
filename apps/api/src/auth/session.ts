// Session tokens for the demo sign-in (ADR 0002).
// A token is "<payload>.<signature>": the payload says which user and until when,
// the HMAC-SHA256 signature proves that our server created it. Anyone can read the payload
// (it holds only a user id), but nobody without SESSION_SECRET can change it.
import { createHmac, timingSafeEqual } from "node:crypto"

export const SESSION_COOKIE = "session"
export const SESSION_MAX_AGE_SECONDS = 12 * 60 * 60 // longer than the 10-hour working day

type Payload = { sub: number; exp: number } // user id, expiry in seconds since 1970

const nowInSeconds = () => Math.floor(Date.now() / 1000)
const sign = (data: string, secret: string) => createHmac("sha256", secret).update(data).digest("base64url")

export function createSessionToken(userId: number, secret: string, now = nowInSeconds()): string {
  const payload: Payload = { sub: userId, exp: now + SESSION_MAX_AGE_SECONDS }
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${data}.${sign(data, secret)}`
}

/** Returns the user id if the token is genuine and not expired, otherwise null. */
export function verifySessionToken(token: string, secret: string, now = nowInSeconds()): number | null {
  const [data, signature] = token.split(".")
  if (!data || !signature) return null

  // Compare in constant time, so an attacker cannot guess the signature byte by byte from response times.
  const expected = Buffer.from(sign(data, secret))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    const payload = JSON.parse(Buffer.from(data, "base64url").toString()) as Payload
    return Number.isInteger(payload.sub) && payload.exp > now ? payload.sub : null
  } catch {
    return null
  }
}
