// Ticket #18: ordered, booked and remaining budget of an order, in minutes and euro cents.
import { describe, expect, it } from "vitest"
import { calculateOrderBudget } from "../../src/domain/budget.js"

// 120 h at 95,00 €/h = 11.400,00 €
const portal = { budgetHours: 120, hourlyRateCents: 9500 }

describe("order budget", () => {
  it("computes booked and remaining time and money", () => {
    const budget = calculateOrderBudget(portal, 930) // 15.5 h booked

    expect(budget).toEqual({
      budgetMinutes: 7200,
      bookedMinutes: 930,
      remainingMinutes: 6270,
      budgetCents: 1_140_000,
      bookedCents: 147_250,
      remainingCents: 992_750,
      usedPercent: 12.9,
      overBudget: false,
    })
  })

  it("shows the full budget when nothing is booked", () => {
    const budget = calculateOrderBudget(portal, 0)

    expect(budget.remainingCents).toBe(budget.budgetCents)
    expect(budget.usedPercent).toBe(0)
  })

  it("rounds money to whole cents only once", () => {
    // 20 min at 95,00 €/h = 31,666… € → 31,67 €
    expect(calculateOrderBudget(portal, 20).bookedCents).toBe(3167)
  })

  it("reports exactly 100 % and no overrun when the budget is used up", () => {
    const budget = calculateOrderBudget(portal, 7200)

    expect(budget).toMatchObject({ remainingMinutes: 0, remainingCents: 0, usedPercent: 100, overBudget: false })
  })

  it("shows a negative remainder instead of hiding an overrun", () => {
    // Possible for bookings made before a rule existed, or imported from the old tool.
    const budget = calculateOrderBudget(portal, 7260)

    expect(budget).toMatchObject({ remainingMinutes: -60, remainingCents: -9500, overBudget: true })
  })

  it("does not divide by zero for an order without budget", () => {
    expect(calculateOrderBudget({ budgetHours: 0, hourlyRateCents: 9500 }, 0).usedPercent).toBe(0)
  })
})
