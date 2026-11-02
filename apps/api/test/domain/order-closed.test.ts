// Ticket #70: a closed order takes no more bookings, and only checked work can be closed.
import { describe, expect, it } from "vitest"
import { assertCanClose, assertOrderOpen } from "../../src/domain/rules/order-closed.js"

describe("a closed order", () => {
  it("accepts an open order", () => {
    expect(() => assertOrderOpen({ code: "PO-1", closedAt: null })).not.toThrow()
  })

  it("rejects a closed order and names it", () => {
    expect(() => assertOrderOpen({ code: "PO-1", closedAt: "2026-11-02T10:00:00.000Z" })).toThrow("Order PO-1 is closed")
  })
})

describe("closing an order", () => {
  it("accepts an order whose bookings are all approved", () => {
    expect(() => assertCanClose({ code: "PO-1", unapprovedMinutes: 0 })).not.toThrow()
  })

  it("rejects an order with work still being checked", () => {
    expect(() => assertCanClose({ code: "PO-1", unapprovedMinutes: 30 })).toThrow(
      expect.objectContaining({ code: "ORDER_HAS_UNAPPROVED_BOOKINGS" }),
    )
  })
})
