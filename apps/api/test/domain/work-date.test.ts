// Ticket #12: time is booked after the work is done, never for a future date.
import { describe, expect, it } from "vitest"
import { todayInCompanyTimeZone } from "../../src/application/clock.js"
import { assertNotInFuture } from "../../src/domain/rules/work-date.js"

const today = "2026-10-31"

describe("work date", () => {
  it("accepts today", () => {
    expect(() => assertNotInFuture({ workDate: "2026-10-31", today })).not.toThrow()
  })

  it("accepts a past date", () => {
    expect(() => assertNotInFuture({ workDate: "2026-10-27", today })).not.toThrow()
  })

  it("rejects tomorrow and names the day", () => {
    expect(() => assertNotInFuture({ workDate: "2026-11-01", today })).toThrow(
      "Booking rejected: Sun 1 Nov 2026 is in the future. Book time once the work is done.",
    )
  })
})

describe("company clock", () => {
  it("is already the next day in Berlin at 23:30 UTC", () => {
    // 31 Oct 2026, 23:30 UTC = 1 Nov, 00:30 in Berlin (CET, UTC+1 after the clocks changed on 25 Oct)
    expect(todayInCompanyTimeZone(new Date("2026-10-31T23:30:00Z"))).toBe("2026-11-01")
  })
})
