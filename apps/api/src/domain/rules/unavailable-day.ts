// A consultant marks days on which they are not available, never why (ticket #10, ADR 0016).
// A day cannot be both: booked work on a day marked unavailable would make the plan and the bookings disagree.
import { formatDay } from "../format.js"
import { DomainError } from "../errors.js"

export function assertNotMarkedUnavailable(input: { workDate: string; markedUnavailable: boolean }): void {
  if (input.markedUnavailable) {
    throw new DomainError(
      "DAY_MARKED_UNAVAILABLE",
      `Booking rejected: you marked ${formatDay(input.workDate)} as unavailable. Remove the mark first if you worked that day.`,
    )
  }
}

export function assertNoBookingsThatDay(input: { date: string; bookedMinutes: number }): void {
  if (input.bookedMinutes > 0) {
    throw new DomainError(
      "DAY_HAS_BOOKINGS",
      `You already booked time on ${formatDay(input.date)}. Delete the booking first if you were not available.`,
    )
  }
}
