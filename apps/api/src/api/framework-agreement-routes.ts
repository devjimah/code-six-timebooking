// Framework agreements (ticket #69, ADR 0020): purchasing only.
import { Router } from "express"
import { createAgreement, listAgreements, updateAgreement } from "../application/framework-agreements.js"
import { setAuditContext } from "../audit/audit-log.js"
import { requireRole } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"
import { frameworkAgreementIdParams, frameworkAgreementRequest, toFrameworkAgreementOverview } from "./dto.js"

export function frameworkAgreementRoutes(db: Db) {
  const router = Router()

  router.get("/", requireRole("purchasing"), async (_req, res) => {
    res.json((await listAgreements(db)).map(toFrameworkAgreementOverview))
  })

  router.post("/", requireRole("purchasing"), async (req, res) => {
    const input = frameworkAgreementRequest.parse(req.body)
    setAuditContext(res, { details: { code: input.code, supplierId: input.supplierId, totalBudgetCents: input.totalBudgetCents } })
    const agreement = await createAgreement(db, input)
    setAuditContext(res, { targetType: "framework_agreement", targetId: agreement.id })
    res.status(201).json(agreement)
  })

  router.put("/:id", requireRole("purchasing"), async (req, res) => {
    const { id } = frameworkAgreementIdParams.parse(req.params)
    const input = frameworkAgreementRequest.parse(req.body)
    setAuditContext(res, {
      targetType: "framework_agreement",
      targetId: id,
      details: { code: input.code, supplierId: input.supplierId, totalBudgetCents: input.totalBudgetCents },
    })
    res.json(await updateAgreement(db, id, input))
  })

  return router
}
