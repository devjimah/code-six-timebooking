// Suppliers (docs/roles-and-privacy.md): purchasing creates and renames them; the admin reads them to assign
// a consultant's company when creating an account.
import { Router } from "express"
import { createSupplier, renameSupplier } from "../application/manage-suppliers.js"
import { setAuditContext } from "../audit/audit-log.js"
import { requireRole } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"
import { supplierRepository } from "../persistence/repositories.js"
import { supplierIdParams, supplierRequest, toSupplierResponse } from "./dto.js"

export function supplierRoutes(db: Db) {
  const router = Router()

  router.get("/", requireRole("admin", "purchasing"), async (_req, res) => {
    res.json((await supplierRepository(db).findAll()).map(toSupplierResponse))
  })

  router.post("/", requireRole("purchasing"), async (req, res) => {
    const { name } = supplierRequest.parse(req.body)
    setAuditContext(res, { details: { name } })
    const supplier = await createSupplier(db, { name })
    setAuditContext(res, { targetType: "supplier", targetId: supplier.id })
    res.status(201).json(toSupplierResponse(supplier))
  })

  router.patch("/:id", requireRole("purchasing"), async (req, res) => {
    const { id } = supplierIdParams.parse(req.params)
    const { name } = supplierRequest.parse(req.body)
    setAuditContext(res, { targetType: "supplier", targetId: id, details: { name } })
    res.json(toSupplierResponse(await renameSupplier(db, id, { name })))
  })

  return router
}
