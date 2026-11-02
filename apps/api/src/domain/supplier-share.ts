// How much the company depends on each supplier (ticket #71). Sums per supplier only, no single bookings or persons.
import { calculateOrderBudget } from "./budget.js"
import type { Order } from "./models.js"

export type SupplierShare = {
  supplierId: number
  orderCount: number
  budgetCents: number
  bookedCents: number
  sharePercent: number // of everything ordered, 0–100, one decimal
}

export function supplierShares(
  supplierIds: number[],
  orders: Pick<Order, "id" | "supplierId" | "budgetHours" | "hourlyRateCents">[],
  bookedMinutes: Map<number, number>,
): SupplierShare[] {
  const budgets = orders.map((order) => ({ order, budget: calculateOrderBudget(order, bookedMinutes.get(order.id) ?? 0) }))
  const total = budgets.reduce((sum, { budget }) => sum + budget.budgetCents, 0)
  return supplierIds.map((supplierId) => {
    const own = budgets.filter(({ order }) => order.supplierId === supplierId)
    const budgetCents = own.reduce((sum, { budget }) => sum + budget.budgetCents, 0)
    return {
      supplierId,
      orderCount: own.length,
      budgetCents,
      bookedCents: own.reduce((sum, { budget }) => sum + budget.bookedCents, 0),
      sharePercent: total === 0 ? 0 : Math.round((budgetCents / total) * 1000) / 10,
    }
  })
}
