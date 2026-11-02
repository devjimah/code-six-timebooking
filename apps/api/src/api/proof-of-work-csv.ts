// The proof of work as a CSV file (ticket #75, ADR 0018), for the German Excel the client uses: semicolons, a decimal
// comma and a byte order mark, so umlauts survive. Never start times: the project manager does not get them (ADR 0010).
import type { ProofOfWork } from "../application/proof-of-work.js"

const BYTE_ORDER_MARK = "﻿"
const COLUMNS = ["Date", "Consultant", "Work done", "Hours", "Status", "Reason for return"]

/**
 * Consultants type the description, and Excel runs a cell starting with = + - or @ as a formula. A leading apostrophe
 * makes it plain text. Quotes are doubled, as CSV requires.
 */
function cell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}

const hours = (minutes: number) => String(Number((minutes / 60).toFixed(2))).replace(".", ",")

export function proofOfWorkCsv({ bookings }: ProofOfWork): string {
  // Oldest first, as a proof of work reads; the list on the page is newest first.
  const rows = [...bookings]
    .reverse()
    .map((b) => [b.workDate, b.consultantName, b.description, hours(b.durationMinutes), b.status, b.returnReason ?? ""])
  return BYTE_ORDER_MARK + [COLUMNS, ...rows].map((row) => row.map(cell).join(";")).join("\r\n") + "\r\n"
}

/** Only safe characters in the download's name: order codes are free text. */
export function proofOfWorkFileName({ order, month }: ProofOfWork): string {
  return `proof-of-work-${order.code.replace(/[^A-Za-z0-9-]/g, "_")}-${month}.csv`
}
