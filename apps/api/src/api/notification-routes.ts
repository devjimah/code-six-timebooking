// GET /api/notifications – what needs the signed-in person's attention. Computed each time, never stored.
import { Router } from "express"
import { listNotifications } from "../application/notifications.js"
import { requireAuth } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"

export function notificationRoutes(db: Db, purchasingLeadTimeWeeks: number) {
  const router = Router()

  router.get("/", requireAuth, async (req, res) => {
    res.json(await listNotifications(db, req.user!, purchasingLeadTimeWeeks))
  })

  return router
}
