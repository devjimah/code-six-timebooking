// POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me (ticket #6, ADR 0002)
import bcrypt from "bcryptjs"
import { type Response, Router } from "express"
import { setAuditActor, setAuditContext } from "../audit/audit-log.js"
import { changeOwnPassword } from "../application/manage-passwords.js"
import { requireAuth } from "../auth/middleware.js"
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionToken } from "../auth/session.js"
import type { Db } from "../persistence/db.js"
import { userRepository } from "../persistence/repositories.js"
import { changePasswordRequest, loginRequest, toUserResponse } from "./dto.js"

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

  const startSession = (res: Response, userId: number, version: number) => {
    const token = createSessionToken({ userId, version }, options.sessionSecret)
    res.cookie(SESSION_COOKIE, token, { ...cookieOptions, maxAge: SESSION_MAX_AGE_SECONDS * 1000 })
  }

  router.post("/login", async (req, res) => {
    const { email, password } = loginRequest.parse(req.body) // invalid body → 400 via error handler
    // The email that was tried, also when it fails: many failures for one account = someone guessing passwords.
    setAuditContext(res, { details: { email } })
    const found = await userRepository(db).findCredentialsByEmail(email)
    const passwordOk = await bcrypt.compare(password, found?.passwordHash ?? DUMMY_HASH)

    if (!found || !passwordOk) {
      // Same message for both cases on purpose: do not reveal which emails have an account.
      res.status(401).json({ code: "INVALID_CREDENTIALS", message: "Email or password is wrong." })
      return
    }

    if (found.user.deactivatedAt !== null) {
      setAuditContext(res, { targetType: "user", targetId: found.user.id })
      res.status(403).json({ code: "ACCOUNT_DEACTIVATED", message: "This account has been deactivated. Contact your admin." })
      return
    }

    setAuditActor(res, found.user) // the audit log should show who signed in
    setAuditContext(res, { targetType: "user", targetId: found.user.id })
    startSession(res, found.user.id, found.sessionVersion)
    // With mustChangePassword the web app sends the person to "Choose your own password" (step 5).
    res.json(toUserResponse(found.user))
  })

  router.post("/logout", (_req, res) => {
    res.clearCookie(SESSION_COOKIE, cookieOptions)
    res.status(204).end()
  })

  router.get("/me", requireAuth, (req, res) => {
    res.json(toUserResponse(req.user!))
  })

  // POST /api/auth/password – change the own password (step 5). Open with requireAuth, not requireRole, because
  // it is exactly what a person with a reset password must do first. Other browsers are signed out;
  // this one gets a fresh cookie with the new session version.
  router.post("/password", requireAuth, async (req, res) => {
    const input = changePasswordRequest.parse(req.body)
    setAuditContext(res, { targetType: "user", targetId: req.user!.id })
    const { user, sessionVersion } = await changeOwnPassword(db, req.user!, input)
    startSession(res, user.id, sessionVersion)
    res.json(toUserResponse(user))
  })

  return router
}
