// Permission checks on the server (ADR 0002, ADR 0004). Hiding a button in the UI is not a check;
// these middlewares are. 401 = we do not know who you are, 403 = we know, but you may not do this.
import type { Request, RequestHandler } from "express"
import type { Role } from "../domain/models.js"
import type { Db } from "../persistence/db.js"
import { userRepository } from "../persistence/repositories.js"
import { SESSION_COOKIE, verifySessionToken } from "./session.js"

function readCookie(req: Request, name: string): string | undefined {
  // Header looks like "session=abc.def; other=1"
  for (const part of req.headers.cookie?.split(";") ?? []) {
    const [key, ...value] = part.trim().split("=")
    if (key === name) return decodeURIComponent(value.join("="))
  }
  return undefined
}

/** Runs on every request: sets req.user when a valid session cookie is present. Never rejects. */
export function loadUser(db: Db, sessionSecret: string): RequestHandler {
  return async (req, _res, next) => {
    const token = readCookie(req, SESSION_COOKIE)
    const userId = token ? verifySessionToken(token, sessionSecret) : null
    // Load from the database each time, so a deleted user or a changed role takes effect immediately.
    const user = userId ? await userRepository(db).findById(userId) : null
    // A deactivated account counts as signed out, so an open session ends with the next request (step 4).
    req.user = user && user.deactivatedAt === null ? user : undefined
    next()
  }
}

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ code: "UNAUTHENTICATED", message: "Please sign in." })
    return
  }
  next()
}

export function requireRole(...roles: Role[]): RequestHandler {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({ code: "UNAUTHENTICATED", message: "Please sign in." })
      return
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ code: "FORBIDDEN", message: "Your role is not allowed to do this." })
      return
    }
    next()
  }
}
