// Ticket #54: one person cannot book two overlapping times, on any order.
import { describe, expect, it } from "vitest"
import { assertNoOverlap } from "../../src/domain/rules/no-overlap.js"

const morning = { startTime: "09:00", endTime: "12:00", orderCode: "PO-2026-001" }
const check = (startTime: string, endTime: string, sameDayBookings = [morning]) => () =>
  assertNoOverlap({ startTime, endTime, sameDayBookings })

describe("no overlapping bookings", () => {
  it("accepts the first booking of the day", () => {
    expect(check("09:00", "12:00", [])).not.toThrow()
  })

  it("accepts a booking that starts when the other ends", () => {
    expect(check("12:00", "13:00")).not.toThrow()
  })

  it("accepts a booking that ends when the other starts", () => {
    expect(check("07:00", "09:00")).not.toThrow()
  })

  it("rejects a booking that starts inside another and names it", () => {
    expect(check("11:30", "13:00")).toThrow(
      "Booking rejected: 11:30–13:00 overlaps your booking 09:00–12:00 on PO-2026-001.",
    )
  })

  it("rejects a booking that ends inside another", () => {
    expect(check("08:00", "09:15")).toThrow(expect.objectContaining({ code: "BOOKING_OVERLAP" }))
  })

  it("rejects a booking that lies completely inside another", () => {
    expect(check("10:00", "11:00")).toThrow(expect.objectContaining({ code: "BOOKING_OVERLAP" }))
  })

  it("rejects a booking that covers another completely", () => {
    expect(check("08:00", "13:00")).toThrow(expect.objectContaining({ code: "BOOKING_OVERLAP" }))
  })

  it("rejects exactly the same time again", () => {
    expect(check("09:00", "12:00")).toThrow(expect.objectContaining({ code: "BOOKING_OVERLAP" }))
  })

  it("finds the clash among several bookings, on any order", () => {
    const day = [morning, { startTime: "13:00", endTime: "17:00", orderCode: "PO-2026-002" }]

    expect(check("12:00", "13:00", day)).not.toThrow()
    expect(check("16:00", "18:00", day)).toThrow("overlaps your booking 13:00–17:00 on PO-2026-002")
  })
})
