// Ticket #53: a booking can be changed until it is approved.
import { describe, expect, it } from "vitest"
import { assertCanBeChanged } from "../../src/domain/rules/booking-change.js"

describe("changing a booking", () => {
  it("accepts an open booking", () => {
    expect(() => assertCanBeChanged("open")).not.toThrow()
  })

  it("accepts a returned booking, which is what returning is for", () => {
    expect(() => assertCanBeChanged("returned")).not.toThrow()
  })

  it("rejects an approved booking", () => {
    expect(() => assertCanBeChanged("approved")).toThrow(
      "This booking is approved and can no longer be changed or deleted.",
    )
  })
})
