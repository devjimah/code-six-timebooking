// Orders, seen from each role (tickets #11 and #18). Every route checks the role here
// and the use case narrows the data to the caller's own orders.
import { Router } from "express"
import { getOrderBudget } from "../application/get-order-budget.js"
import { listBookableOrders, listManagedOrders } from "../application/list-orders.js"
import { requireRole } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"
import { orderIdParams, toBookableOrderResponse, toOrderBudgetResponse } from "./dto.js"

export function orderRoutes(db: Db) {
  const router = Router()

  // GET /api/orders/bookable – the consultant's own supplier's orders, to pick one when booking time.
  router.get("/bookable", requireRole("consultant"), async (req, res) => {
    const orders = await listBookableOrders(db, req.user!)
    res.json(orders.map(({ order, supplierName }) => toBookableOrderResponse(order, supplierName)))
  })

  // GET /api/orders/managed – the project manager's own orders, each with its budget.
  router.get("/managed", requireRole("project_manager"), async (req, res) => {
    const orders = await listManagedOrders(db, req.user!)
    res.json(orders.map(({ order, budget }) => toOrderBudgetResponse(order, budget)))
  })

  // Role check here (403 for consultants, admins …); ownership check in the use case (403 NOT_YOUR_ORDER).
  router.get("/:id/budget", requireRole("project_manager"), async (req, res) => {
    const { id } = orderIdParams.parse(req.params)
    const { order, budget } = await getOrderBudget(db, req.user!, id)
    res.json(toOrderBudgetResponse(order, budget))
  })

  return router
}
