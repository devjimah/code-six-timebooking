// Tickets #75 and #76: the totals of a month, and an invoice checked against the approved hours.
import { describe, expect, it } from "vitest"
import { checkInvoice, monthRange, monthTotals } from "../../src/domain/proof-of-work.js"

describe("the totals of a month", () => {
  it("adds the hours per status and prices only the approved ones", () => {
    const totals = monthTotals(
      [
        { durationMinutes: 480, status: "approved" },
        { durationMinutes: 240, status: "approved" },
        { durationMinutes: 60, status: "open" },
        { durationMinutes: 30, status: "returned" },
      ],
      9500,
    )

    expect(totals).toEqual({ approvedMinutes: 720, openMinutes: 60, returnedMinutes: 30, approvedCents: 114000 })
  })

  it("rounds the money once, to whole cents", () => {
    expect(monthTotals([{ durationMinutes: 20, status: "approved" }], 9500).approvedCents).toBe(3167)
  })

  it("is all zero without bookings", () => {
    expect(monthTotals([], 9500)).toEqual({ approvedMinutes: 0, openMinutes: 0, returnedMinutes: 0, approvedCents: 0 })
  })
})

describe("checking an invoice", () => {
  it("accepts an invoice equal to the approved amount", () => {
    expect(checkInvoice(114000, 114000)).toEqual({ result: "matches", differenceCents: 0 })
  })

  it("flags an invoice higher than what was approved", () => {
    expect(checkInvoice(120000, 114000)).toEqual({ result: "invoice_higher", differenceCents: 6000 })
  })

  it("flags an invoice lower than what was approved", () => {
    expect(checkInvoice(100000, 114000)).toEqual({ result: "invoice_lower", differenceCents: -14000 })
  })
})

describe("the range of a month", () => {
  it("runs to the first day of the next month", () => {
    expect(monthRange("2026-10")).toEqual({ from: "2026-10-01", to: "2026-11-01" })
  })

  it("crosses into the next year in December", () => {
    expect(monthRange("2026-12")).toEqual({ from: "2026-12-01", to: "2027-01-01" })
  })
})
