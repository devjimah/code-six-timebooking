// Ticket #13: ArbZG §3 – at most 10 hours of work per person and day, across all orders.
import { describe, expect, it } from "vitest"
import { DomainError } from "../../src/domain/errors.js"
import { assertWithinDailyLimit } from "../../src/domain/rules/daily-limit.js"

const workDate = "2026-10-27" // Tue 27 Oct 2026, the challenge's example day

describe("daily limit of 10 hours", () => {
  it("accepts a booking that keeps the day below 10 hours", () => {
    expect(() => assertWithinDailyLimit({ workDate, alreadyBookedMinutes: 6 * 60, newMinutes: 210 })).not.toThrow()
  })

  it("accepts a booking that fills the day to exactly 10 hours", () => {
    expect(() => assertWithinDailyLimit({ workDate, alreadyBookedMinutes: 8 * 60, newMinutes: 120 })).not.toThrow()
  })

  it("accepts a first booking of exactly 10 hours", () => {
    expect(() => assertWithinDailyLimit({ workDate, alreadyBookedMinutes: 0, newMinutes: 600 })).not.toThrow()
  })

  it("rejects a booking that takes the day over 10 hours and says how much is left", () => {
    const book = () => assertWithinDailyLimit({ workDate, alreadyBookedMinutes: 8 * 60, newMinutes: 3 * 60 })

    expect(book).toThrow(DomainError)
    expect(book).toThrow("Booking rejected: only 2 h left on Tue 27 Oct 2026 (max. 10 h per day, German Working Time Act §3).")
  })

  it("rejects even one extra minute", () => {
    expect(() => assertWithinDailyLimit({ workDate, alreadyBookedMinutes: 600, newMinutes: 1 })).toThrow(
      "only 0 h left",
    )
  })

  it("rejects a single booking longer than 10 hours", () => {
    expect(() => assertWithinDailyLimit({ workDate, alreadyBookedMinutes: 0, newMinutes: 601 })).toThrow(
      expect.objectContaining({ code: "DAILY_LIMIT_EXCEEDED" }),
    )
  })
})
