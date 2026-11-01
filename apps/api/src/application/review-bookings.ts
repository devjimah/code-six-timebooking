// Use cases "a project manager approves or returns the bookings on their order" (ticket #50, ADR 0014).
// Only the order's own project manager may do this: the same ownership check as seeing the budget (own-order.ts).
import { assertCanBeReviewed, assertReturnReason } from "../domain/rules/booking-review.js"
import type { TimeEntry, User } from "../domain/models.js"
import type { Db } from "../persistence/db.js"
import { timeEntryRepository } from "../persistence/repositories.js"
import { NotFoundError } from "./errors.js"
import { loadOwnOrder } from "./own-order.js"

async function loadOwnOrdersBooking(db: Db, projectManager: User, timeEntryId: number): Promise<TimeEntry> {
  const entry = await timeEntryRepository(db).findById(timeEntryId)
  if (!entry) {
    throw new NotFoundError("TIME_ENTRY_NOT_FOUND", `Booking ${timeEntryId} does not exist.`)
  }
  await loadOwnOrder(db, projectManager, entry.orderId)
  return entry
}

export async function approveBooking(db: Db, projectManager: User, timeEntryId: number): Promise<TimeEntry> {
  const entry = await loadOwnOrdersBooking(db, projectManager, timeEntryId)
  assertCanBeReviewed(entry.status)
  return timeEntryRepository(db).setReview(entry.id, { status: "approved", returnReason: null })
}

export async function returnBooking(db: Db, projectManager: User, timeEntryId: number, reason: string): Promise<TimeEntry> {
  const entry = await loadOwnOrdersBooking(db, projectManager, timeEntryId)
  assertCanBeReviewed(entry.status)
  assertReturnReason(reason)
  return timeEntryRepository(db).setReview(entry.id, { status: "returned", returnReason: reason.trim() })
}

/** "Approve all": every open booking of the order. Returned ones stay with the consultant. Returns how many. */
export async function approveOpenBookings(db: Db, projectManager: User, orderId: number): Promise<number> {
  const order = await loadOwnOrder(db, projectManager, orderId)
  return timeEntryRepository(db).approveOpenOfOrder(order.id)
}
