// Records one audit event per API request (ticket #23, ADR 0012).
// We write when the response has been sent ("finish"), because only then do we know the status code.
// Only metadata is stored: never the request body, query string, cookies or passwords.
import type { Request, RequestHandler, Response } from "express"
import { auditOutcome, type User } from "../domain/models.js"
import type { Db } from "../persistence/db.js"
import { auditEventRepository } from "../persistence/repositories.js"

const NOT_AUDITED = new Set(["/api/health"]) // monitoring noise, not a user action

/** Route pattern like "/api/orders/:id/budget", so events can be grouped by action. */
function routePattern(req: Request): string {
  if (!req.route) return "(no matching route)"
  const routePath = req.route.path === "/" ? "" : String(req.route.path)
  return `${req.baseUrl}${routePath}` || "/"
}

/**
 * Sign-in has no req.user yet when it succeeds, so the login route names the actor here.
 * Every other route is covered by req.user, set from the session cookie.
 */
export function setAuditActor(res: Response, user: User) {
  res.locals.auditActor = user
}

export function auditLog(db: Db): RequestHandler {
  const repo = auditEventRepository(db)

  return (req, res, next) => {
    const path = req.originalUrl.split("?")[0]!
    if (NOT_AUDITED.has(path)) return next()

    const started = performance.now()
    res.on("finish", () => {
      const actor: User | undefined = req.user ?? res.locals.auditActor
      repo
        .record({
          occurredAt: new Date().toISOString(),
          actorUserId: actor?.id ?? null,
          actorRole: actor?.role ?? null,
          method: req.method,
          route: routePattern(req),
          path,
          statusCode: res.statusCode,
          outcome: auditOutcome(res.statusCode),
          durationMs: Math.round(performance.now() - started),
        })
        // The response is already sent, so we cannot fail the request. Make the gap visible in the server log.
        .catch((err) => console.error("Audit log write failed", err))
    })
    next()
  }
}
