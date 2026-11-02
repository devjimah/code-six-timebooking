// Closing an order (ticket #70): purchasing says the work on it is finished. A closed order takes no more bookings and
// no more changes, until it is reopened. It is closed, never deleted: the bookings stay as the proof behind the invoice.
import { DomainError } from "../errors.js"
import type { Order } from "../models.js"

export function assertOrderOpen(order: Pick<Order, "code" | "closedAt">): void {
  if (order.closedAt !== null) {
    throw new DomainError("ORDER_CLOSED", `Order ${order.code} is closed. Purchasing can reopen it.`)
  }
}

/** Work that is still being checked must be finished first, or it would stay open on a closed order for good. */
export function assertCanClose(input: { code: string; unapprovedMinutes: number }): void {
  if (input.unapprovedMinutes > 0) {
    throw new DomainError(
      "ORDER_HAS_UNAPPROVED_BOOKINGS",
      `Order ${input.code} still has bookings that are open or returned. The project manager must check them first.`,
    )
  }
}
