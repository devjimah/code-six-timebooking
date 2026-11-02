// GET /api/supplier/bookings – the supplier manager's view of their own company (ticket #77, ADR 0021). Read only.
import { Router } from "express"
import { listSupplierBookings } from "../application/supplier-bookings.js"
import { setAuditContext } from "../audit/audit-log.js"
import { requireRole } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"
import { proofOfWorkQuery } from "./dto.js"

export function supplierBookingsRoutes(db: Db) {
  const router = Router()

  router.get("/bookings", requireRole("supplier_manager"), async (req, res) => {
    const { month } = proofOfWorkQuery.parse(req.query)
    setAuditContext(res, { details: { month } })
    res.json(await listSupplierBookings(db, req.user!, month))
  })

  return router
}
