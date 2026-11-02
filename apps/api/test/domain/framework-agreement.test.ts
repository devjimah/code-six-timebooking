// Ticket #69: a framework agreement's total budget is a hard limit for its orders.
import { describe, expect, it } from "vitest"
import {
  assertAgreementCoversOrders,
  assertOrderFitsAgreement,
  assertUniqueAgreementCode,
} from "../../src/domain/rules/framework-agreement.js"

const agreement = {
  id: 1, code: "FA-1", title: "Frame", supplierId: 7, totalBudgetCents: 100_000, startDate: "2026-01-01", endDate: "2026-12-31",
}
const fits = (budgetCents: number, otherOrdersCents = 60_000, overrides: object = {}) => () =>
  assertOrderFitsAgreement({
    agreement,
    otherOrdersCents,
    order: { supplierId: 7, startDate: "2026-03-01", endDate: "2026-06-30", budgetCents, ...overrides },
  })

describe("an order in a framework agreement", () => {
  it("accepts an order that fits", () => {
    expect(fits(10_000)).not.toThrow()
  })

  it("accepts an order that takes exactly what is left", () => {
    expect(fits(40_000)).not.toThrow()
  })

  it("rejects an order beyond what is left, with the amounts", () => {
    expect(fits(40_001)).toThrow(
      "Order rejected: only 400.00 € left in framework agreement FA-1, and this order needs 400.01 €.",
    )
  })

  it("says nothing is left when other orders already took everything", () => {
    expect(fits(1, 100_000)).toThrow("only 0.00 € left")
  })

  it("rejects an order of another supplier", () => {
    expect(fits(1, 0, { supplierId: 8 })).toThrow(expect.objectContaining({ code: "FRAMEWORK_OTHER_SUPPLIER" }))
  })

  it("rejects an order that starts before the agreement", () => {
    expect(fits(1, 0, { startDate: "2025-12-31" })).toThrow(expect.objectContaining({ code: "FRAMEWORK_PERIOD" }))
  })

  it("rejects an order that ends after the agreement", () => {
    expect(fits(1, 0, { endDate: "2027-01-01" })).toThrow(expect.objectContaining({ code: "FRAMEWORK_PERIOD" }))
  })
})

describe("changing a framework agreement", () => {
  const change = (totalBudgetCents: number, period = { startDate: "2026-01-01", endDate: "2026-12-31" }) => () =>
    assertAgreementCoversOrders({
      code: "FA-1", totalBudgetCents, ordersCents: 60_000, period, orders: [{ startDate: "2026-03-01", endDate: "2026-06-30" }],
    })

  it("accepts a total that still covers its orders", () => {
    expect(change(60_000)).not.toThrow()
  })

  it("rejects a total below its orders", () => {
    expect(change(59_999)).toThrow(expect.objectContaining({ code: "FRAMEWORK_TOTAL_BELOW_ORDERS" }))
  })

  it("rejects a period that no longer covers its orders", () => {
    expect(change(60_000, { startDate: "2026-04-01", endDate: "2026-12-31" })).toThrow(expect.objectContaining({ code: "FRAMEWORK_PERIOD" }))
  })
})

describe("the code of a framework agreement", () => {
  it("accepts a new code, and the agreement's own", () => {
    expect(() => assertUniqueAgreementCode("FA-2", [agreement])).not.toThrow()
    expect(() => assertUniqueAgreementCode("FA-1", [agreement], 1)).not.toThrow()
  })

  it("rejects a code in use, in any spelling", () => {
    expect(() => assertUniqueAgreementCode("fa-1", [agreement])).toThrow(expect.objectContaining({ code: "FRAMEWORK_CODE_TAKEN" }))
  })
})
