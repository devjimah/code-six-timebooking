// Use case "a consultant books time on an order" (ticket #12, ADR 0007).
// It loads what the rules need, asks every rule, and only then saves. The rules themselves live in
// src/domain/rules; this file contains no rule logic of its own. A correction runs the same checks (#53).
import { DomainError } from "../domain/errors.js"
import type { TimeEntry, User } from "../domain/models.js"
import { assertWithinDailyLimit } from "../domain/rules/daily-limit.js"
import { addDays } from "../domain/public-holidays.js"
import { assertNoOverlap } from "../domain/rules/no-overlap.js"
import { assertAssignedToOrder } from "../domain/rules/order-assignment.js"
import { assertWithinOrderBudget } from "../domain/rules/order-budget.js"
import { assertWithinOrderPeriod } from "../domain/rules/order-period.js"
import { assertRestPeriod } from "../domain/rules/rest-period.js"
import { assertNotInFuture } from "../domain/rules/work-date.js"
import { assertNotMarkedUnavailable } from "../domain/rules/unavailable-day.js"
import { assertWorkingDay } from "../domain/rules/working-day.js"
import { workedMinutes } from "../domain/rules/working-times.js"
import type { Db } from "../persistence/db.js"
import { orderRepository, timeEntryRepository, unavailableDayRepository } from "../persistence/repositories.js"
import { todayInCompanyTimeZone } from "./clock.js"

export type BookTimeInput = {
  orderId: number
  workDate: string // "YYYY-MM-DD"
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
  breakMinutes: number
  description: string
}

export async function bookTime(
  db: Db,
  consultant: User,
  input: BookTimeInput,
  today = todayInCompanyTimeZone(),
): Promise<TimeEntry> {
  const durationMinutes = await checkBookingRules(db, consultant, input, today)
  // Known gap (ADR 0006): two bookings saved at the same moment could both pass the checks.
  // Acceptable for the demo; production wraps check and insert in one transaction.
  return timeEntryRepository(db).create({ userId: consultant.id, ...input, durationMinutes })
}

/**
 * Asks every booking rule and returns the derived duration. exceptId leaves out a booking's own old version
 * when it is being corrected, so it cannot clash with itself or count twice.
 */
export async function checkBookingRules(
  db: Db,
  consultant: User,
  input: BookTimeInput,
  today: string,
  exceptId?: number,
): Promise<number> {
  // Cheap checks first: they need no database. The duration is derived from the times (ADR 0010).
  const durationMinutes = workedMinutes(input)
  assertNotInFuture({ workDate: input.workDate, today })
  assertWorkingDay(input.workDate)

  const order = await orderRepository(db).findById(input.orderId)
  if (!order) {
    throw new DomainError("ORDER_NOT_FOUND", `Booking rejected: order ${input.orderId} does not exist.`)
  }
  assertAssignedToOrder({ user: consultant, order })
  assertWithinOrderPeriod({ order, workDate: input.workDate })

  assertNotMarkedUnavailable({
    workDate: input.workDate,
    markedUnavailable: await unavailableDayRepository(db).isMarked(consultant.id, input.workDate),
  })
  const entries = timeEntryRepository(db)
  assertNoOverlap({
    startTime: input.startTime,
    endTime: input.endTime,
    sameDayBookings: await entries.slotsForUserOnDate(consultant.id, input.workDate, exceptId),
  })
  const [dayBefore, dayAfter] = await Promise.all([
    entries.workingHoursForUserOnDate(consultant.id, addDays(input.workDate, -1), exceptId),
    entries.workingHoursForUserOnDate(consultant.id, addDays(input.workDate, 1), exceptId),
  ])
  assertRestPeriod({
    workDate: input.workDate,
    startTime: input.startTime,
    endTime: input.endTime,
    previousDayLastEnd: dayBefore?.lastEnd ?? null,
    nextDayFirstStart: dayAfter?.firstStart ?? null,
  })
  assertWithinDailyLimit({
    workDate: input.workDate,
    alreadyBookedMinutes: await entries.sumMinutesForUserOnDate(consultant.id, input.workDate, exceptId),
    newMinutes: durationMinutes,
  })
  assertWithinOrderBudget({
    order,
    alreadyBookedMinutes: await entries.sumMinutesForOrder(order.id, exceptId),
    newMinutes: durationMinutes,
  })

  return durationMinutes
}
