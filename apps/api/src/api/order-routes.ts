// GET /api/orders/:id/budget – project managers only, and only for their own orders (ticket #18).
import { Router } from "express"
import { getOrderBudget } from "../application/get-order-budget.js"
import { requireRole } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"
import { orderIdParams, toOrderBudgetResponse } from "./dto.js"

export function orderRoutes(db: Db) {
  const router = Router()

  // Role check here (403 for consultants, admins …); ownership check in the use case (403 NOT_YOUR_ORDER).
  router.get("/:id/budget", requireRole("project_manager"), async (req, res) => {
    const { id } = orderIdParams.parse(req.params)
    const { order, budget } = await getOrderBudget(db, req.user!, id)
    res.json(toOrderBudgetResponse(order, budget))
  })

  return router
}
