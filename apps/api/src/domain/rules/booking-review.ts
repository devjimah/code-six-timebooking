// Check and approve (ticket #50, ADR 0014): a project manager approves or returns a booking before it is invoiced.
// Only an open booking can be reviewed: an approved one is final, and a returned one is with the consultant,
// who corrects it first (it is then open again).
import { DomainError } from "../errors.js"
import type { BookingStatus } from "../models.js"

export function assertCanBeReviewed(status: BookingStatus): void {
  if (status === "approved") {
    throw new DomainError("BOOKING_NOT_OPEN", "This booking is already approved and cannot be reviewed again.")
  }
  if (status === "returned") {
    throw new DomainError("BOOKING_NOT_OPEN", "This booking was returned. The consultant must correct it first.")
  }
}

export function assertReturnReason(reason: string): void {
  if (reason.trim() === "") {
    throw new DomainError("RETURN_REASON_REQUIRED", "Say why you return this booking, so the consultant can correct it.")
  }
}
