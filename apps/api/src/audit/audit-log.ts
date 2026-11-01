// Records one audit event per API request (ticket #23, ADR 0012).
// We write when the response has been sent ("finish"), because only then do we know the status code.
// Stored: who, when, which action, on what, the result and why it was refused, plus IP address and browser.
// Never stored: request bodies, query strings, cookies, passwords or free text (e.g. booking descriptions).
// Routes add key facts with setAuditContext(); everything else is filled in here.
import type { Request, RequestHandler, Response } from "express"
import { type AuditDetails, auditOutcome, type User } from "../domain/models.js"
import type { Db } from "../persistence/db.js"
import { auditEventRepository } from "../persistence/repositories.js"

const NOT_AUDITED = new Set(["/api/health"]) // monitoring noise, not a user action

/**
 * A readable name for every action, keyed by "METHOD route pattern".
 * audit.test.ts checks that every documented route (openapi.ts) has one – add new routes here.
 */
export const ACTIONS: Record<string, string> = {
  "POST /api/auth/login": "auth.login",
  "POST /api/auth/logout": "auth.logout",
  "GET /api/auth/me": "auth.session",
  "POST /api/auth/password": "auth.change_password",
  "GET /api/users": "user.list",
  "POST /api/users": "user.create",
  "PUT /api/users/:id": "user.update",
  "POST /api/users/:id/deactivate": "user.deactivate",
  "POST /api/users/:id/reactivate": "user.reactivate",
  "POST /api/users/:id/password": "user.reset_password",
  "GET /api/suppliers": "supplier.list",
  "POST /api/suppliers": "supplier.create",
  "PATCH /api/suppliers/:id": "supplier.update",
  "POST /api/time-entries": "time_entry.create",
  "GET /api/time-entries/mine": "time_entry.list_own",
  "PUT /api/time-entries/:id": "time_entry.update",
  "DELETE /api/time-entries/:id": "time_entry.delete",
  "POST /api/time-entries/:id/approve": "time_entry.approve",
  "POST /api/time-entries/:id/return": "time_entry.return",
  "POST /api/orders/:id/time-entries/approve-open": "order.approve_open",
  "GET /api/orders/:id/unavailable-days": "order.view_unavailable",
  "GET /api/unavailable-days/mine": "unavailable_day.list_own",
  "PUT /api/unavailable-days/:date": "unavailable_day.mark",
  "DELETE /api/unavailable-days/:date": "unavailable_day.remove",
  "GET /api/orders": "order.list_all",
  "POST /api/orders": "order.create",
  "PUT /api/orders/:id": "order.update",
  "GET /api/project-managers": "user.list_project_managers",
  "GET /api/public-holidays": "calendar.list_holidays",
  "GET /api/orders/bookable": "order.list_bookable",
  "GET /api/orders/managed": "order.list_managed",
  "GET /api/orders/:id/budget": "order.view_budget",
  "GET /api/orders/:id/time-entries": "order.view_bookings",
  "GET /api/audit-events": "audit.view",
}
const UNKNOWN_ROUTE_ACTION = "request.unknown_route" // e.g. someone probing URLs that do not exist

const MAX_USER_AGENT_LENGTH = 300 // user agents can be very long; the start identifies the browser

type AuditContext = {
  targetType?: string
  targetId?: number
  details?: AuditDetails
}

/** Routes call this to say what the action was about, e.g. { targetType: "order", targetId: 3 }. */
export function setAuditContext(res: Response, context: AuditContext) {
  const current: AuditContext = res.locals.auditContext ?? {}
  res.locals.auditContext = { ...current, ...context, details: { ...current.details, ...context.details } }
}

/**
 * Sign-in has no req.user yet when it succeeds, so the login route names the actor here.
 * Every other route is covered by req.user, set from the session cookie.
 */
export function setAuditActor(res: Response, user: User) {
  res.locals.auditActor = user
}

/**
 * Put in front of every router in app.ts. When a route throws (e.g. a business rule rejects a booking),
 * Express resets req.baseUrl before the error handler runs, so we remember the mount path here.
 */
export const rememberMountPath: RequestHandler = (req, res, next) => {
  res.locals.auditMountPath = req.baseUrl
  next()
}

/** Route pattern like "/api/orders/:id/budget", so events can be grouped by action. */
function routePattern(req: Request, res: Response): string {
  if (!req.route) return "(no matching route)"
  const routePath = req.route.path === "/" ? "" : String(req.route.path)
  return `${res.locals.auditMountPath ?? req.baseUrl}${routePath}` || "/"
}

export function auditLog(db: Db): RequestHandler {
  const repo = auditEventRepository(db)

  return (req, res, next) => {
    const path = req.originalUrl.split("?")[0]!
    if (NOT_AUDITED.has(path)) return next()

    // Every error response has the shape { code, message } (ADR 0005). Catch the code on its way out,
    // so the log says *why* a request failed – no matter which middleware or route answered.
    let errorCode: string | null = null
    const sendJson = res.json.bind(res)
    res.json = ((body: unknown) => {
      if (res.statusCode >= 400 && typeof (body as { code?: unknown })?.code === "string") {
        errorCode = (body as { code: string }).code
      }
      return sendJson(body)
    }) as Response["json"]

    const started = performance.now()
    res.on("finish", () => {
      const actor: User | undefined = req.user ?? res.locals.auditActor
      const route = routePattern(req, res)
      const context: AuditContext = res.locals.auditContext ?? {}
      const details = context.details && Object.keys(context.details).length > 0 ? context.details : null
      repo
        .record({
          occurredAt: new Date().toISOString(),
          actorUserId: actor?.id ?? null,
          actorRole: actor?.role ?? null,
          method: req.method,
          route,
          path,
          statusCode: res.statusCode,
          outcome: auditOutcome(res.statusCode),
          durationMs: Math.round(performance.now() - started),
          action: ACTIONS[`${req.method} ${route}`] ?? UNKNOWN_ROUTE_ACTION,
          targetType: context.targetType ?? null,
          targetId: context.targetId ?? null,
          errorCode,
          details,
          ipAddress: req.ip ?? null,
          userAgent: req.get("user-agent")?.slice(0, MAX_USER_AGENT_LENGTH) ?? null,
        })
        // The response is already sent, so we cannot fail the request. Make the gap visible in the server log.
        .catch((err) => console.error("Audit log write failed", err))
    })
    next()
  }
}
