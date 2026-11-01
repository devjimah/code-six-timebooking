// Ticket #10: a day is either marked unavailable or booked, not both.
import { describe, expect, it } from "vitest"
import { assertNoBookingsThatDay, assertNotMarkedUnavailable } from "../../src/domain/rules/unavailable-day.js"

describe("booking on a day", () => {
  it("accepts a day that is not marked", () => {
    expect(() => assertNotMarkedUnavailable({ workDate: "2026-10-27", markedUnavailable: false })).not.toThrow()
  })

  it("rejects a day marked unavailable and names it", () => {
    expect(() => assertNotMarkedUnavailable({ workDate: "2026-10-27", markedUnavailable: true })).toThrow(
      "you marked Tue 27 Oct 2026 as unavailable",
    )
  })
})

describe("marking a day unavailable", () => {
  it("accepts a day without bookings", () => {
    expect(() => assertNoBookingsThatDay({ date: "2026-10-27", bookedMinutes: 0 })).not.toThrow()
  })

  it("rejects a day with bookings and names it", () => {
    expect(() => assertNoBookingsThatDay({ date: "2026-10-27", bookedMinutes: 60 })).toThrow(
      "You already booked time on Tue 27 Oct 2026",
    )
  })
})
