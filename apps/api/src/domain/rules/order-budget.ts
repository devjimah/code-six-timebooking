// A booking may not use more than the free budget of its order.
// The caller passes the minutes already booked on this order by everyone (ADR 0008: computed from bookings).
import { formatHours, formatPersonDays } from "../format.js"
import { DomainError } from "../errors.js"
import type { Order } from "../models.js"

export function assertWithinOrderBudget(input: {
  order: Pick<Order, "code" | "title" | "budgetHours">
  alreadyBookedMinutes: number // this order, all people, all dates
  newMinutes: number
}): void {
  const { order } = input
  const left = Math.max(0, order.budgetHours * 60 - input.alreadyBookedMinutes)
  if (input.newMinutes > left) {
    throw new DomainError(
      "BUDGET_EXCEEDED",
      `Booking rejected: only ${formatHours(left)} (${formatPersonDays(left)}) left ` +
        `on order ${order.code} "${order.title}".`,
    )
  }
}
