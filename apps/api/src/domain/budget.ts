// Budget of an order: ordered, booked and remaining (ticket #18, ADR 0008).
// Computed from the bookings every time, never stored, so it cannot drift from them.
// Time in minutes and money in integer euro cents: no floating-point rounding errors in totals.
import type { Order } from "./models.js"

export interface OrderBudget {
  budgetMinutes: number
  bookedMinutes: number
  remainingMinutes: number // negative if the order is over budget
  budgetCents: number
  bookedCents: number
  remainingCents: number
  usedPercent: number // 0–100+, one decimal
  overBudget: boolean
}

export function calculateOrderBudget(
  order: Pick<Order, "budgetHours" | "hourlyRateCents">,
  bookedMinutes: number,
): OrderBudget {
  const budgetMinutes = order.budgetHours * 60
  const budgetCents = order.budgetHours * order.hourlyRateCents
  // 20 min at 95,00 €/h = 31,666… € → rounded once, to whole cents.
  const bookedCents = Math.round((bookedMinutes * order.hourlyRateCents) / 60)

  return {
    budgetMinutes,
    bookedMinutes,
    remainingMinutes: budgetMinutes - bookedMinutes,
    budgetCents,
    bookedCents,
    remainingCents: budgetCents - bookedCents,
    usedPercent: budgetMinutes === 0 ? 0 : Math.round((bookedMinutes / budgetMinutes) * 1000) / 10,
    overBudget: bookedMinutes > budgetMinutes,
  }
}
