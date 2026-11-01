// The consultant's own unavailable days (ticket #10, ADR 0016). There is no reason field on purpose:
// sick days are health data, and managing a supplier's absences is the employer's job.
import { Router } from "express"
import { markUnavailable } from "../application/unavailable-days.js"
import { setAuditContext } from "../audit/audit-log.js"
import { requireRole } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"
import { unavailableDayRepository } from "../persistence/repositories.js"
import { unavailableDayParams } from "./dto.js"

export function unavailableDayRoutes(db: Db) {
  const router = Router()

  router.get("/mine", requireRole("consultant"), async (req, res) => {
    res.json(await unavailableDayRepository(db).findByUser(req.user!.id))
  })

  // PUT and DELETE on the date itself: doing either twice changes nothing, so a double tap is harmless.
  router.put("/:date", requireRole("consultant"), async (req, res) => {
    const { date } = unavailableDayParams.parse(req.params)
    setAuditContext(res, { details: { date } })
    await markUnavailable(db, req.user!, date)
    res.status(204).end()
  })

  router.delete("/:date", requireRole("consultant"), async (req, res) => {
    const { date } = unavailableDayParams.parse(req.params)
    setAuditContext(res, { details: { date } })
    await unavailableDayRepository(db).remove(req.user!.id, date)
    res.status(204).end()
  })

  return router
}
