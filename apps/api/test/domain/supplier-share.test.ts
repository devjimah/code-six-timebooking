// Ticket #71: how much the company depends on each supplier.
import { describe, expect, it } from "vitest"
import { supplierShares } from "../../src/domain/supplier-share.js"

const order = (id: number, supplierId: number, budgetHours: number) => ({ id, supplierId, budgetHours, hourlyRateCents: 10000 })

describe("the share of each supplier", () => {
  it("adds budget and booked money per supplier, and the share of everything ordered", () => {
    const shares = supplierShares([1, 2], [order(1, 1, 30), order(2, 1, 30), order(3, 2, 20)], new Map([[1, 600]]))

    expect(shares).toEqual([
      { supplierId: 1, orderCount: 2, budgetCents: 600_000, bookedCents: 100_000, sharePercent: 75 },
      { supplierId: 2, orderCount: 1, budgetCents: 200_000, bookedCents: 0, sharePercent: 25 },
    ])
  })

  it("lists a supplier without orders with a share of 0", () => {
    expect(supplierShares([1, 2], [order(1, 1, 10)], new Map())[1]).toEqual({
      supplierId: 2, orderCount: 0, budgetCents: 0, bookedCents: 0, sharePercent: 0,
    })
  })

  it("does not divide by zero without any orders", () => {
    expect(supplierShares([1], [], new Map())[0]!.sharePercent).toBe(0)
  })

  it("rounds the share to one decimal", () => {
    expect(supplierShares([1, 2], [order(1, 1, 1), order(2, 2, 2)], new Map())[0]!.sharePercent).toBe(33.3)
  })
})
