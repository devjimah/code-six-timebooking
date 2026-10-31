// Ticket #12: a consultant may only book on orders of their own company.
import { describe, expect, it } from "vitest"
import { assertAssignedToOrder } from "../../src/domain/rules/order-assignment.js"

const acmeOrder = { supplierId: 1 }

describe("order assignment", () => {
  it("accepts a consultant of the order's supplier", () => {
    expect(() => assertAssignedToOrder({ user: { supplierId: 1 }, order: acmeOrder })).not.toThrow()
  })

  it("rejects a consultant of another supplier, without naming the order", () => {
    expect(() => assertAssignedToOrder({ user: { supplierId: 2 }, order: acmeOrder })).toThrow(
      "Booking rejected: you can only book on orders of your own company.",
    )
  })

  it("rejects a user who belongs to no supplier", () => {
    expect(() => assertAssignedToOrder({ user: { supplierId: null }, order: acmeOrder })).toThrow(
      expect.objectContaining({ code: "ORDER_NOT_ASSIGNED" }),
    )
  })
})
