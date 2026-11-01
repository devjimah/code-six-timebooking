// Consultants book and see their own time (ticket #12); project managers approve or return it (ticket #50).
import { Router } from "express"
import { bookTime } from "../application/book-time.js"
import { approveBooking, returnBooking } from "../application/review-bookings.js"
import { setAuditContext } from "../audit/audit-log.js"
import { requireRole } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"
import { timeEntryRepository } from "../persistence/repositories.js"
import {
  createTimeEntryRequest,
  returnBookingRequest,
  timeEntryIdParams,
  toBookingReviewResponse,
  toTimeEntryResponse,
} from "./dto.js"

export function timeEntryRoutes(db: Db) {
  const router = Router()

  // Malformed body → 400 (zod). Broken business rule → 422 (DomainError). Both via the error handler.
  router.post("/", requireRole("consultant"), async (req, res) => {
    const input = createTimeEntryRequest.parse(req.body)
    // The target is the order whose budget the booking uses. The description is free text and the times are
    // personal (ADR 0010), so both stay out of the log; the derived duration is logged once the booking is saved.
    setAuditContext(res, { targetType: "order", targetId: input.orderId, details: { workDate: input.workDate } })
    const entry = await bookTime(db, req.user!, input)
    setAuditContext(res, { details: { timeEntryId: entry.id, durationMinutes: entry.durationMinutes } })
    res.status(201).json(toTimeEntryResponse(entry))
  })

  router.get("/mine", requireRole("consultant"), async (req, res) => {
    const entries = await timeEntryRepository(db).findByUser(req.user!.id)
    res.json(entries.map(toTimeEntryResponse))
  })

  // Role check here; "is it your order?" in the use case (403 NOT_YOUR_ORDER). The reason is free text: not logged.
  router.post("/:id/approve", requireRole("project_manager"), async (req, res) => {
    const { id } = timeEntryIdParams.parse(req.params)
    setAuditContext(res, { targetType: "time_entry", targetId: id })
    res.json(toBookingReviewResponse(await approveBooking(db, req.user!, id)))
  })

  router.post("/:id/return", requireRole("project_manager"), async (req, res) => {
    const { id } = timeEntryIdParams.parse(req.params)
    const { reason } = returnBookingRequest.parse(req.body)
    setAuditContext(res, { targetType: "time_entry", targetId: id })
    res.json(toBookingReviewResponse(await returnBooking(db, req.user!, id, reason)))
  })

  return router
}
