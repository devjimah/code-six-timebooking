// GET /api/project-managers – purchasing picks who is responsible for an order. Names only (data minimisation).
import { Router } from "express"
import { listProjectManagers } from "../application/manage-orders.js"
import { requireRole } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"

export function projectManagerRoutes(db: Db) {
  const router = Router()

  router.get("/", requireRole("purchasing"), async (_req, res) => {
    res.json(await listProjectManagers(db))
  })

  return router
}
