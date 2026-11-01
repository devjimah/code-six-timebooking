// Ticket #50: only an open booking can be approved or returned, and returning needs a reason.
import { describe, expect, it } from "vitest"
import { assertCanBeReviewed, assertReturnReason } from "../../src/domain/rules/booking-review.js"

describe("reviewing a booking", () => {
  it("accepts an open booking", () => {
    expect(() => assertCanBeReviewed("open")).not.toThrow()
  })

  it("rejects an approved booking", () => {
    expect(() => assertCanBeReviewed("approved")).toThrow(expect.objectContaining({ code: "BOOKING_NOT_OPEN" }))
  })

  it("rejects a returned booking until the consultant has corrected it", () => {
    expect(() => assertCanBeReviewed("returned")).toThrow("The consultant must correct it first")
  })
})

describe("the reason for returning a booking", () => {
  it("accepts a short reason", () => {
    expect(() => assertReturnReason("Wrong order")).not.toThrow()
  })

  it("rejects an empty reason", () => {
    expect(() => assertReturnReason("")).toThrow(expect.objectContaining({ code: "RETURN_REASON_REQUIRED" }))
  })

  it("rejects a reason of only spaces", () => {
    expect(() => assertReturnReason("   ")).toThrow(expect.objectContaining({ code: "RETURN_REASON_REQUIRED" }))
  })
})
