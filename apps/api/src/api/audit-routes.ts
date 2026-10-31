// GET /api/audit-events – admin only (ticket #23, ADR 0012). Reading the log is itself recorded.
import { Router } from "express"
import { setAuditContext } from "../audit/audit-log.js"
import { requireRole } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"
import { auditEventRepository } from "../persistence/repositories.js"
import { auditEventsQuery, toAuditEventResponse } from "./dto.js"

export function auditRoutes(db: Db) {
  const router = Router()

  router.get("/", requireRole("admin"), async (req, res) => {
    const { limit, userId, outcome, action } = auditEventsQuery.parse(req.query)
    // Reading the log is itself logged, including whose actions were looked at.
    if (userId !== undefined) setAuditContext(res, { targetType: "user", targetId: userId })
    const events = await auditEventRepository(db).findLatest({ limit, actorUserId: userId, outcome, action })
    res.json(events.map(toAuditEventResponse))
  })

  return router
}
