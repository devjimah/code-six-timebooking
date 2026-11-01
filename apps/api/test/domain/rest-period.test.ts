// Ticket #55: at least 11 hours rest between two working days (German Working Time Act §5).
import { describe, expect, it } from "vitest"
import { assertRestPeriod } from "../../src/domain/rules/rest-period.js"

// Booking on Tue 27 Oct 2026; the neighbours are Mon 26 and Wed 28 Oct.
const check =
  (startTime: string, endTime: string, previousDayLastEnd: string | null, nextDayFirstStart: string | null = null) =>
  () =>
    assertRestPeriod({ workDate: "2026-10-27", startTime, endTime, previousDayLastEnd, nextDayFirstStart })

describe("11 hours rest between working days", () => {
  it("accepts a day without work before or after", () => {
    expect(check("06:00", "16:00", null, null)).not.toThrow()
  })

  it("accepts a normal day after a normal day", () => {
    expect(check("09:00", "17:00", "17:00")).not.toThrow()
  })

  it("accepts exactly 11 hours rest after the day before", () => {
    expect(check("09:00", "12:00", "22:00")).not.toThrow()
  })

  it("rejects a start 10 hours after the day before ended, and names the earliest start", () => {
    expect(check("08:00", "12:00", "22:00")).toThrow(
      "Booking rejected: only 10 h rest after your work ended at 22:00 on Mon 26 Oct 2026. " +
        "Start at 09:00 at the earliest (min. 11 h rest, German Working Time Act §5).",
    )
  })

  it("accepts exactly 11 hours rest before the day after", () => {
    expect(check("09:00", "20:00", null, "07:00")).not.toThrow()
  })

  it("rejects a late end when the next morning is already booked, and names the latest end", () => {
    // Time is booked afterwards: Tuesday evening may be booked when Wednesday morning already is.
    expect(check("15:00", "21:00", null, "07:00")).toThrow(
      "Booking rejected: only 10 h rest before your work starts at 07:00 on Wed 28 Oct 2026. " +
        "End at 20:00 at the latest (min. 11 h rest, German Working Time Act §5).",
    )
  })

  it("names a quarter hour exactly", () => {
    expect(check("07:00", "09:00", "21:15")).toThrow(expect.objectContaining({ code: "REST_PERIOD_TOO_SHORT" }))
    expect(check("07:00", "09:00", "21:15")).toThrow("Start at 08:15 at the earliest")
  })
})
