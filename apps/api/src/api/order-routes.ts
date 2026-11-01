// Orders, seen from each role (tickets #11 and #18). Every route checks the role here
// and the use case narrows the data to the caller's own orders.
import { Router } from "express"
import { getOrderBudget } from "../application/get-order-budget.js"
import { listOrderBookings } from "../application/list-order-bookings.js"
import { createOrder, listAllOrders, updateOrder } from "../application/manage-orders.js"
import { listBookableOrders, listManagedOrders } from "../application/list-orders.js"
import { approveOpenBookings } from "../application/review-bookings.js"
import { setAuditContext } from "../audit/audit-log.js"
import { requireRole } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"
import {
  type OrderRequest,
  orderIdParams,
  orderRequest,
  toBookableOrderResponse,
  toOrderBudgetDetailResponse,
  toOrderBudgetResponse,
  toOrderOverviewResponse,
  toOrderResponse,
} from "./dto.js"

export function orderRoutes(db: Db, purchasingLeadTimeWeeks: number) {
  const router = Router()

  // GET /api/orders – purchasing sees every order with its budget (Σ per order, no single bookings).
  router.get("/", requireRole("purchasing"), async (_req, res) => {
    res.json((await listAllOrders(db, purchasingLeadTimeWeeks)).map(toOrderOverviewResponse))
  })

  // POST /api/orders – purchasing places an order with a supplier.
  router.post("/", requireRole("purchasing"), async (req, res) => {
    const input = orderRequest.parse(req.body)
    setAuditContext(res, { details: auditFacts(input) })
    const order = await createOrder(db, input)
    setAuditContext(res, { targetType: "order", targetId: order.id })
    res.status(201).json(toOrderResponse(order))
  })

  // PUT /api/orders/:id – purchasing changes an order; all fields are sent, like in the form.
  router.put("/:id", requireRole("purchasing"), async (req, res) => {
    const { id } = orderIdParams.parse(req.params)
    const input = orderRequest.parse(req.body)
    setAuditContext(res, { targetType: "order", targetId: id, details: auditFacts(input) })
    res.json(toOrderResponse(await updateOrder(db, id, input)))
  })

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
    setAuditContext(res, { targetType: "order", targetId: id })
    const { order, budget, forecast } = await getOrderBudget(db, req.user!, id, purchasingLeadTimeWeeks)
    res.json(toOrderBudgetDetailResponse(order, budget, forecast))
  })

  // GET /api/orders/:id/time-entries – single bookings of the project manager's own order (same ownership check).
  router.get("/:id/time-entries", requireRole("project_manager"), async (req, res) => {
    const { id } = orderIdParams.parse(req.params)
    setAuditContext(res, { targetType: "order", targetId: id })
    res.json(await listOrderBookings(db, req.user!, id))
  })

  // POST /api/orders/:id/time-entries/approve-open – "approve all" on the project manager's own order (ticket #50).
  router.post("/:id/time-entries/approve-open", requireRole("project_manager"), async (req, res) => {
    const { id } = orderIdParams.parse(req.params)
    setAuditContext(res, { targetType: "order", targetId: id })
    const approved = await approveOpenBookings(db, req.user!, id)
    setAuditContext(res, { details: { approved } })
    res.json({ approved })
  })

  return router
}

/** Key facts of an order for the audit log (ADR 0012): the title is left out – it is free text. */
const auditFacts = (input: OrderRequest) => ({
  code: input.code,
  supplierId: input.supplierId,
  projectManagerId: input.projectManagerId,
  budgetHours: input.budgetHours,
  hourlyRateCents: input.hourlyRateCents,
  startDate: input.startDate,
  endDate: input.endDate,
})
