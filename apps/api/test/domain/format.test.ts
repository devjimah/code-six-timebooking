// The rule messages must show the right day and amounts, whatever the server's time zone.
import { describe, expect, it } from "vitest"
import { formatDay, formatHours, formatPersonDays } from "../../src/domain/format.js"

describe("message formatting", () => {
  it("formats a date with its weekday", () => {
    expect(formatDay("2026-10-27")).toBe("Tue 27 Oct 2026")
    expect(formatDay("2027-01-01")).toBe("Fri 1 Jan 2027")
  })

  it("formats minutes as hours without trailing zeros", () => {
    expect(formatHours(150)).toBe("2.5 h")
    expect(formatHours(15)).toBe("0.25 h")
    expect(formatHours(0)).toBe("0 h")
  })

  it("formats minutes as person-days of 8 hours", () => {
    expect(formatPersonDays(8 * 60)).toBe("1 PD")
    expect(formatPersonDays(120)).toBe("0.25 PD")
  })
})
