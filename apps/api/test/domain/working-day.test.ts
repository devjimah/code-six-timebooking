// Ticket #9: no bookings on Sundays and nationwide public holidays (ArbZG §9).
import { describe, expect, it } from "vitest"
import { easterSunday, nationwideHoliday } from "../../src/domain/public-holidays.js"
import { assertWorkingDay } from "../../src/domain/rules/working-day.js"

describe("working day", () => {
  it("accepts a normal weekday", () => {
    expect(() => assertWorkingDay("2026-10-27")).not.toThrow() // Tuesday
  })

  it("accepts a Saturday – a normal working day under the Act", () => {
    expect(() => assertWorkingDay("2026-10-31")).not.toThrow()
  })

  it("rejects a Sunday and names the day", () => {
    expect(() => assertWorkingDay("2026-10-25")).toThrow(
      "Booking rejected: Sun 25 Oct 2026 is a Sunday. No work on Sundays and public holidays (German Working Time Act §9).",
    )
  })

  it("rejects a fixed public holiday and names it", () => {
    expect(() => assertWorkingDay("2026-10-03")).toThrow("is a public holiday (Day of German Unity)")
  })

  it("rejects a holiday that moves with Easter", () => {
    expect(() => assertWorkingDay("2026-04-03")).toThrow(expect.objectContaining({ code: "SUNDAY_OR_HOLIDAY" })) // Good Friday
  })
})

describe("public holidays", () => {
  it("calculates Easter Sunday", () => {
    expect(easterSunday(2026)).toBe("2026-04-05")
    expect(easterSunday(2027)).toBe("2027-03-28")
    expect(easterSunday(2024)).toBe("2024-03-31")
  })

  it("knows the holidays that move with Easter in 2026", () => {
    expect(nationwideHoliday("2026-04-03")).toBe("Good Friday")
    expect(nationwideHoliday("2026-04-06")).toBe("Easter Monday")
    expect(nationwideHoliday("2026-05-14")).toBe("Ascension Day")
    expect(nationwideHoliday("2026-05-25")).toBe("Whit Monday")
  })

  it("does not count state-only holidays such as Reformation Day", () => {
    expect(nationwideHoliday("2026-10-31")).toBeNull()
  })
})
