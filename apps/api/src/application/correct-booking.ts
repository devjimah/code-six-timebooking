// Use cases "a consultant corrects or deletes an own booking" (ticket #53, ADR 0014).
// A correction passes the same rules as a new booking, leaving out the booking's own old version, and is then open
// again, so the project manager checks the corrected work.
import { assertCanBeChanged } from "../domain/rules/booking-change.js"
import type { TimeEntry, User } from "../domain/models.js"
import type { Db } from "../persistence/db.js"
import { timeEntryRepository } from "../persistence/repositories.js"
import { type BookTimeInput, checkBookingRules } from "./book-time.js"
import { todayInCompanyTimeZone } from "./clock.js"
import { AccessDeniedError, NotFoundError } from "./errors.js"

async function loadOwnBooking(db: Db, consultant: User, timeEntryId: number): Promise<TimeEntry> {
  const entry = await timeEntryRepository(db).findById(timeEntryId)
  if (!entry) {
    throw new NotFoundError("TIME_ENTRY_NOT_FOUND", `Booking ${timeEntryId} does not exist.`)
  }
  if (entry.userId !== consultant.id) {
    throw new AccessDeniedError("NOT_YOUR_BOOKING", "You can only change your own bookings.")
  }
  return entry
}

export async function correctBooking(
  db: Db,
  consultant: User,
  timeEntryId: number,
  input: BookTimeInput,
  today = todayInCompanyTimeZone(),
): Promise<TimeEntry> {
  const entry = await loadOwnBooking(db, consultant, timeEntryId)
  assertCanBeChanged(entry.status)
  const durationMinutes = await checkBookingRules(db, consultant, input, today, entry.id)
  return timeEntryRepository(db).update(entry.id, { ...input, durationMinutes, status: "open", returnReason: null })
}

export async function deleteBooking(db: Db, consultant: User, timeEntryId: number): Promise<TimeEntry> {
  const entry = await loadOwnBooking(db, consultant, timeEntryId)
  assertCanBeChanged(entry.status)
  await timeEntryRepository(db).delete(entry.id)
  return entry
}
