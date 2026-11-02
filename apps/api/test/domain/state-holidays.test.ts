// Ticket #66: public holidays depend on the state a consultant works in.
import { describe, expect, it } from "vitest"
import { publicHoliday, publicHolidays } from "../../src/domain/public-holidays.js"
import { assertWorkingDay, isWorkingDay } from "../../src/domain/rules/working-day.js"

describe("holidays of a state", () => {
  it("adds Corpus Christi in Bavaria, and not in Hamburg", () => {
    expect(publicHoliday("2026-06-04", "BY")).toBe("Corpus Christi")
    expect(publicHoliday("2026-06-04", "HH")).toBeNull()
  })

  it("adds Reformation Day in Saxony, and not in Bavaria", () => {
    expect(publicHoliday("2026-10-31", "SN")).toBe("Reformation Day")
    expect(publicHoliday("2026-10-31", "BY")).toBeNull()
  })

  it("adds International Women's Day in Berlin", () => {
    expect(publicHoliday("2027-03-08", "BE")).toBe("International Women's Day")
  })

  it("adds World Children's Day in Thuringia", () => {
    expect(publicHoliday("2026-09-20", "TH")).toBe("World Children's Day")
  })

  it("finds the Day of Repentance in Saxony, the Wednesday before 23 November", () => {
    expect(publicHoliday("2026-11-18", "SN")).toBe("Day of Repentance and Prayer")
    expect(publicHoliday("2027-11-17", "SN")).toBe("Day of Repentance and Prayer")
    // 23 November on a Wednesday: the holiday is the week before.
    expect(publicHoliday("2022-11-16", "SN")).toBe("Day of Repentance and Prayer")
  })

  it("moves Corpus Christi with Easter", () => {
    expect(publicHoliday("2027-05-27", "NW")).toBe("Corpus Christi")
  })

  it("always includes the nationwide holidays", () => {
    expect(publicHoliday("2026-10-03", "BE")).toBe("Day of German Unity")
  })

  it("has only the nationwide holidays without a state", () => {
    expect(publicHoliday("2026-06-04")).toBeNull()
    expect(publicHoliday("2026-06-04", null)).toBeNull()
    expect(Object.keys(publicHolidays(2026))).toHaveLength(9)
  })

  it("lists the year in calendar order", () => {
    const dates = Object.keys(publicHolidays(2026, "BY"))

    expect(dates).toEqual([...dates].sort())
    expect(dates).toHaveLength(13)
  })
})

describe("booking on such a day", () => {
  it("accepts a day that is a holiday only elsewhere", () => {
    expect(() => assertWorkingDay("2026-06-04", "HH")).not.toThrow()
  })

  it("rejects a holiday of the consultant's own state and names it", () => {
    expect(() => assertWorkingDay("2026-06-04", "BY")).toThrow("is a public holiday (Corpus Christi)")
  })

  it("accepts it without a state, as before", () => {
    expect(() => assertWorkingDay("2026-06-04")).not.toThrow()
  })

  it("follows the same calendar in isWorkingDay", () => {
    expect(isWorkingDay("2026-06-04", "BY")).toBe(false)
    expect(isWorkingDay("2026-06-04", "HH")).toBe(true)
  })
})
