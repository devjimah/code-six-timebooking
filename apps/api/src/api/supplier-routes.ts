// GET /api/suppliers – admin only, to pick a consultant's company when creating an account (ticket #5).
import { Router } from "express"
import { requireRole } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"
import { supplierRepository } from "../persistence/repositories.js"
import { toSupplierResponse } from "./dto.js"

export function supplierRoutes(db: Db) {
  const router = Router()

  router.get("/", requireRole("admin"), async (_req, res) => {
    res.json((await supplierRepository(db).findAll()).map(toSupplierResponse))
  })

  return router
}
