// Ticket #20 / ADR 0010: the duration of a booking is derived from start, end and break.
import { describe, expect, it } from "vitest"
import { minutesOfDay, workedMinutes } from "../../src/domain/rules/working-times.js"

describe("time of day", () => {
  it("turns HH:MM into minutes since midnight", () => {
    expect(minutesOfDay("00:00")).toBe(0)
    expect(minutesOfDay("09:30")).toBe(570)
    expect(minutesOfDay("23:59")).toBe(1439)
  })

  it.each(["24:00", "9:30", "09:60", "09.30", ""])("rejects %j", (time) => {
    expect(() => minutesOfDay(time)).toThrow(expect.objectContaining({ code: "INVALID_TIME" }))
  })
})

describe("worked minutes", () => {
  it("accepts a day with a break: 08:30–17:00 minus 30 minutes is 8 hours", () => {
    expect(workedMinutes({ startTime: "08:30", endTime: "17:00", breakMinutes: 30 })).toBe(480)
  })

  it("accepts a short booking without a break", () => {
    expect(workedMinutes({ startTime: "09:00", endTime: "09:15", breakMinutes: 0 })).toBe(15)
  })

  it("rejects an end before the start", () => {
    expect(() => workedMinutes({ startTime: "17:00", endTime: "09:00", breakMinutes: 0 })).toThrow(
      "the end (09:00) must be after the start (17:00)",
    )
  })

  it("rejects an end equal to the start", () => {
    expect(() => workedMinutes({ startTime: "09:00", endTime: "09:00", breakMinutes: 0 })).toThrow(
      expect.objectContaining({ code: "END_NOT_AFTER_START" }),
    )
  })

  it("rejects a break as long as the whole time, which would leave nothing worked", () => {
    expect(() => workedMinutes({ startTime: "09:00", endTime: "10:00", breakMinutes: 60 })).toThrow(
      "shorter than the 60 minutes between 09:00 and 10:00 (got 60)",
    )
  })

  it.each([-15, 7.5])("rejects a break of %j minutes", (breakMinutes) => {
    expect(() => workedMinutes({ startTime: "09:00", endTime: "17:00", breakMinutes })).toThrow(
      expect.objectContaining({ code: "INVALID_BREAK" }),
    )
  })

  it("rejects a badly written time before comparing anything", () => {
    expect(() => workedMinutes({ startTime: "9:00", endTime: "17:00", breakMinutes: 0 })).toThrow(
      expect.objectContaining({ code: "INVALID_TIME" }),
    )
  })
})
