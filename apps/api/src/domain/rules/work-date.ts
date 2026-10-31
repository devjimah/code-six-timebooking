// Time is booked after the work is done, never in advance.
// "today" is passed in (not read from the clock here), so tests can fix the date.
import { formatDay } from "../format.js"
import { DomainError } from "../errors.js"

export function assertNotInFuture(input: { workDate: string; today: string }): void {
  // ISO dates ("2026-10-31") sort like text, so a string comparison is enough.
  if (input.workDate > input.today) {
    throw new DomainError(
      "DATE_IN_FUTURE",
      `Booking rejected: ${formatDay(input.workDate)} is in the future. Book time once the work is done.`,
    )
  }
}
