// Use case "a consultant books time on an order" (ticket #12, ADR 0007).
// It loads what the rules need, asks every rule, and only then saves. The rules themselves live in
// src/domain/rules; this file contains no rule logic of its own.
import { DomainError } from "../domain/errors.js"
import type { TimeEntry, User } from "../domain/models.js"
import { assertWithinDailyLimit } from "../domain/rules/daily-limit.js"
import { assertNoOverlap } from "../domain/rules/no-overlap.js"
import { assertAssignedToOrder } from "../domain/rules/order-assignment.js"
import { assertWithinOrderBudget } from "../domain/rules/order-budget.js"
import { assertWithinOrderPeriod } from "../domain/rules/order-period.js"
import { assertNotInFuture } from "../domain/rules/work-date.js"
import { assertWorkingDay } from "../domain/rules/working-day.js"
import { workedMinutes } from "../domain/rules/working-times.js"
import type { Db } from "../persistence/db.js"
import { orderRepository, timeEntryRepository } from "../persistence/repositories.js"
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

  const entries = timeEntryRepository(db)
  assertNoOverlap({
    startTime: input.startTime,
    endTime: input.endTime,
    sameDayBookings: await entries.slotsForUserOnDate(consultant.id, input.workDate),
  })
  assertWithinDailyLimit({
    workDate: input.workDate,
    alreadyBookedMinutes: await entries.sumMinutesForUserOnDate(consultant.id, input.workDate),
    newMinutes: durationMinutes,
  })
  assertWithinOrderBudget({
    order,
    alreadyBookedMinutes: await entries.sumMinutesForOrder(order.id),
    newMinutes: durationMinutes,
  })

  // Known gap (ADR 0006): two bookings saved at the same moment could both pass the checks.
  // Acceptable for the demo; production wraps check and insert in one transaction.
  return entries.create({ userId: consultant.id, ...input, durationMinutes })
}
