// What purchasing may change on an order once consultants have booked time on it (team decision, step 2).
import { DomainError } from "../errors.js"
import { formatHours } from "../format.js"
import type { Order } from "../models.js"

/** The budget may grow or shrink, but never below what is already booked – a typo must not put an order over budget. */
export function assertBudgetNotBelowBooked(input: { budgetHours: number; bookedMinutes: number }): void {
  if (input.budgetHours * 60 < input.bookedMinutes) {
    throw new DomainError(
      "BUDGET_BELOW_BOOKED",
      `${formatHours(input.bookedMinutes)} are already booked on this order; the budget cannot be smaller.`,
    )
  }
}

/** Booked hours belong to the supplier whose consultants did the work, so the supplier is fixed after the first booking. */
export function assertSupplierUnchangedAfterBookings(input: {
  current: Pick<Order, "supplierId">
  newSupplierId: number
  bookedMinutes: number
}): void {
  if (input.newSupplierId !== input.current.supplierId && input.bookedMinutes > 0) {
    throw new DomainError(
      "SUPPLIER_FIXED_AFTER_BOOKINGS",
      "Time has already been booked on this order, so it must stay with its supplier. Create a new order instead.",
    )
  }
}
