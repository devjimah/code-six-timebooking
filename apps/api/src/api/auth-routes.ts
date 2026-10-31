// POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me (ticket #6, ADR 0002)
import bcrypt from "bcryptjs"
import { Router } from "express"
import { setAuditActor } from "../audit/audit-log.js"
import { requireAuth } from "../auth/middleware.js"
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionToken } from "../auth/session.js"
import type { Db } from "../persistence/db.js"
import { userRepository } from "../persistence/repositories.js"
import { loginRequest, toUserResponse } from "./dto.js"

// Compared against when the email is unknown, so "unknown email" and "wrong password"
// take the same time and an attacker cannot find out which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10)

export function authRoutes(db: Db, options: { sessionSecret: string; secureCookies: boolean }) {
  const router = Router()
  const cookieOptions = {
    httpOnly: true, // JavaScript in the browser cannot read it, so an XSS bug cannot steal it
    sameSite: "lax" as const, // not sent with requests started by other websites (CSRF protection)
    secure: options.secureCookies, // HTTPS only in production
    path: "/",
  }

  router.post("/login", async (req, res) => {
    const { email, password } = loginRequest.parse(req.body) // invalid body → 400 via error handler
    const found = await userRepository(db).findCredentialsByEmail(email)
    const passwordOk = await bcrypt.compare(password, found?.passwordHash ?? DUMMY_HASH)

    if (!found || !passwordOk) {
      // Same message for both cases on purpose: do not reveal which emails have an account.
      res.status(401).json({ code: "INVALID_CREDENTIALS", message: "Email or password is wrong." })
      return
    }

    setAuditActor(res, found.user) // the audit log should show who signed in
    const token = createSessionToken(found.user.id, options.sessionSecret)
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_MAX_AGE_SECONDS * 1000 })
    res.json(toUserResponse(found.user))
  })

  router.post("/logout", (_req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions)
    res.status(204).end()
  })

  router.get("/me", requireAuth, (req, res) => {
    res.json(toUserResponse(req.user!))
  })

  return router
}
