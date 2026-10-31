// All settings from environment variables, with safe defaults for local development (.env.example).
import "dotenv/config"

const DEV_SESSION_SECRET = "dev-only-secret-change-me"
const production = process.env.NODE_ENV === "production"

/** A whole number of days ≥ 1, or the default. A typo must not silently switch retention off. */
function days(name: string, fallback: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw === "") return fallback
  const value = Number(raw)
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a whole number of days ≥ 1, got "${raw}".`)
  return value
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  sessionSecret: process.env.SESSION_SECRET ?? DEV_SESSION_SECRET,
  secureCookies: production,
  // ADR 0012: how long audit events are kept before the daily clean-up deletes them.
  auditRetention: {
    readDays: days("AUDIT_RETENTION_READ_DAYS", 90),
    changeDays: days("AUDIT_RETENTION_CHANGE_DAYS", 365),
  },
}

// With the public default secret, anyone could forge a session cookie. Refuse to start in production.
if (production && config.sessionSecret === DEV_SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set to a long random value in production.")
}
