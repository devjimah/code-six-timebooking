// GET /api/public-holidays?year=2026 – the holidays the booking rule uses for this consultant: the nationwide ones and
// those of the state they work in (domain/public-holidays.ts), so the booking calendar can grey them out. One source: the web app does not calculate holidays itself.
import { Router } from "express"
import { requireRole } from "../auth/middleware.js"
import { publicHolidays } from "../domain/public-holidays.js"
import { publicHolidaysQuery } from "./dto.js"

export function publicHolidayRoutes() {
  const router = Router()

  router.get("/", requireRole("consultant"), (req, res) => {
    const { year } = publicHolidaysQuery.parse(req.query)
    res.json(Object.entries(publicHolidays(year, req.user!.workState)).map(([date, name]) => ({ date, name })))
  })

  return router
}
