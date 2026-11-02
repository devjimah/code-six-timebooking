// GET /api/notifications – what needs the signed-in person's attention. Computed each time, never stored.
import { Router } from "express"
import { listNotifications } from "../application/notifications.js"
import { requireRole } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"

export function notificationRoutes(db: Db, purchasingLeadTimeWeeks: number) {
  const router = Router()

  // Every role, but through requireRole: someone who must still replace an admin-chosen password gets nothing yet.
  router.get("/", requireRole("consultant", "project_manager", "purchasing", "supplier_manager", "admin"), async (req, res) => {
    res.json(await listNotifications(db, req.user!, purchasingLeadTimeWeeks))
  })

  return router
}
