// Ticket #13: a booking may not exceed the free budget of its order.
import { describe, expect, it } from "vitest"
import { DomainError } from "../../src/domain/errors.js"
import { assertWithinOrderBudget } from "../../src/domain/rules/order-budget.js"

// 40 h budget = 5 person-days
const order = { code: "PO-2026-002", title: "SAP data migration", budgetHours: 40 }

describe("free budget of an order", () => {
  it("accepts a booking below the free budget", () => {
    expect(() => assertWithinOrderBudget({ order, alreadyBookedMinutes: 30 * 60, newMinutes: 4 * 60 })).not.toThrow()
  })

  it("accepts a booking that uses exactly the free budget", () => {
    expect(() => assertWithinOrderBudget({ order, alreadyBookedMinutes: 38 * 60, newMinutes: 2 * 60 })).not.toThrow()
  })

  it("rejects a booking beyond the free budget and names hours, person-days and the order", () => {
    const book = () => assertWithinOrderBudget({ order, alreadyBookedMinutes: 38 * 60, newMinutes: 4 * 60 })

    expect(book).toThrow(DomainError)
    expect(book).toThrow('Booking rejected: only 2 h (0.25 PD) left on order PO-2026-002 "SAP data migration".')
  })

  it("rejects any booking when the budget is used up", () => {
    expect(() => assertWithinOrderBudget({ order, alreadyBookedMinutes: 40 * 60, newMinutes: 15 })).toThrow(
      expect.objectContaining({ code: "BUDGET_EXCEEDED" }),
    )
  })

  it("still rejects, without a negative amount, when the order is already over budget", () => {
    expect(() => assertWithinOrderBudget({ order, alreadyBookedMinutes: 41 * 60, newMinutes: 15 })).toThrow(
      "only 0 h (0 PD) left",
    )
  })
})
