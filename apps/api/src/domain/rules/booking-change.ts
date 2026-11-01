// A consultant corrects or deletes an own booking until it is approved (ticket #53, ADR 0014). An approved booking
// is the proof behind an invoice, so it stays as it is. A returned one must be correctable: that is why it was returned.
import { DomainError } from "../errors.js"
import type { BookingStatus } from "../models.js"

export function assertCanBeChanged(status: BookingStatus): void {
  if (status === "approved") {
    throw new DomainError("BOOKING_APPROVED", "This booking is approved and can no longer be changed or deleted.")
  }
}
