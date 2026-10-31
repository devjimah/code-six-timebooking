// A booking must last a positive, whole number of minutes.
// Without this, a negative booking would "free up" budget and daily hours for the other rules.
import { DomainError } from "../errors.js"

export function assertValidDuration(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes <= 0) {
    throw new DomainError(
      "INVALID_DURATION",
      `Booking rejected: the duration must be a positive number of whole minutes (got ${minutes}).`,
    )
  }
}
