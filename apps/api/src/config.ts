// All settings from environment variables, with safe defaults for local development (.env.example).
import "dotenv/config"

const DEV_SESSION_SECRET = "dev-only-secret-change-me"
const production = process.env.NODE_ENV === "production"

export const config = {
  port: Number(process.env.PORT ?? 3001),
  sessionSecret: process.env.SESSION_SECRET ?? DEV_SESSION_SECRET,
  secureCookies: production,
}

// With the public default secret, anyone could forge a session cookie. Refuse to start in production.
if (production && config.sessionSecret === DEV_SESSION_SECRET) {
  throw new Error("SESSION_SECRET must be set to a long random value in production.")
}
