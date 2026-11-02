// A proof of work (Leistungsnachweis) and the check of an invoice against it (tickets #75, #76, ADR 0018).
// Both are worked out from the bookings of one month, never stored, so they cannot drift from them.
import type { BookingStatus } from "./models.js"

type MonthBooking = { durationMinutes: number; status: BookingStatus }

export type MonthTotals = {
  approvedMinutes: number
  openMinutes: number
  returnedMinutes: number
  approvedCents: number
}

export function monthTotals(bookings: MonthBooking[], hourlyRateCents: number): MonthTotals {
  const minutes = (status: BookingStatus) =>
    bookings.filter((b) => b.status === status).reduce((sum, b) => sum + b.durationMinutes, 0)
  const approvedMinutes = minutes("approved")
  return {
    approvedMinutes,
    openMinutes: minutes("open"),
    returnedMinutes: minutes("returned"),
    // Rounded once, to whole cents, like the budget (ADR 0008).
    approvedCents: Math.round((approvedMinutes * hourlyRateCents) / 60),
  }
}

export type InvoiceCheck = {
  result: "matches" | "invoice_higher" | "invoice_lower"
  differenceCents: number // invoice minus approved; positive means the supplier invoiced more than was approved
}

export function checkInvoice(invoicedCents: number, approvedCents: number): InvoiceCheck {
  const differenceCents = invoicedCents - approvedCents
  if (differenceCents > 0) return { result: "invoice_higher", differenceCents }
  if (differenceCents < 0) return { result: "invoice_lower", differenceCents }
  return { result: "matches", differenceCents }
}

/** "2026-12" → the first day of the month and of the next, for "from ≤ date < to". */
export function monthRange(month: string): { from: string; to: string } {
  const [year, number] = month.split("-").map(Number) as [number, number]
  const next = number === 12 ? `${year + 1}-01` : `${year}-${String(number + 1).padStart(2, "0")}`
  return { from: `${month}-01`, to: `${next}-01` }
}
