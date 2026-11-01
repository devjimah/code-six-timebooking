// Use case "a consultant books time on an order" (ticket #12, ADR 0007).
// It loads what the rules need, asks every rule, and only then saves. The rules themselves live in
// src/domain/rules; this file contains no rule logic of its own.
import { DomainError } from "../domain/errors.js"
import type { TimeEntry, User } from "../domain/models.js"
import { assertWithinDailyLimit } from "../domain/rules/daily-limit.js"
import { assertValidDuration } from "../domain/rules/duration.js"
import { assertAssignedToOrder } from "../domain/rules/order-assignment.js"
import { assertWithinOrderBudget } from "../domain/rules/order-budget.js"
import { assertWithinOrderPeriod } from "../domain/rules/order-period.js"
import { assertNotInFuture } from "../domain/rules/work-date.js"
import { assertWorkingDay } from "../domain/rules/working-day.js"
import type { Db } from "../persistence/db.js"
import { orderRepository, timeEntryRepository } from "../persistence/repositories.js"
import { todayInCompanyTimeZone } from "./clock.js"

export type BookTimeInput = {
  orderId: number
  workDate: string // "YYYY-MM-DD"
  durationMinutes: number
  description: string
}

export async function bookTime(
  db: Db,
  consultant: User,
  input: BookTimeInput,
  today = todayInCompanyTimeZone(),
): Promise<TimeEntry> {
  // Cheap checks first: they need no database.
  assertValidDuration(input.durationMinutes)
  assertNotInFuture({ workDate: input.workDate, today })
  assertWorkingDay(input.workDate)

  const order = await orderRepository(db).findById(input.orderId)
  if (!order) {
    throw new DomainError("ORDER_NOT_FOUND", `Booking rejected: order ${input.orderId} does not exist.`)
  }
  assertAssignedToOrder({ user: consultant, order })
  assertWithinOrderPeriod({ order, workDate: input.workDate })

  const entries = timeEntryRepository(db)
  assertWithinDailyLimit({
    workDate: input.workDate,
    alreadyBookedMinutes: await entries.sumMinutesForUserOnDate(consultant.id, input.workDate),
    newMinutes: input.durationMinutes,
  })
  assertWithinOrderBudget({
    order,
    alreadyBookedMinutes: await entries.sumMinutesForOrder(order.id),
    newMinutes: input.durationMinutes,
  })

  // Known gap (ADR 0006): two bookings saved at the same moment could both pass the checks.
  // Acceptable for the demo; production wraps check and insert in one transaction.
  // TEMPORARY (#20, step 2 of 7): the API still sends a duration only, so the booking starts at 09:00 like the
  // migrated ones. Step 4 replaces this with the times the consultant enters.
  const end = 9 * 60 + input.durationMinutes
  const endTime = `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`
  return entries.create({ userId: consultant.id, ...input, startTime: "09:00", endTime, breakMinutes: 0 })
}
