// Use cases "which orders can I book on?" (consultant) and "which orders do I manage?" (project manager).
// Each person only ever sees their own slice (docs/roles-and-privacy.md, ADR 0004).
import { type OrderBudget, calculateOrderBudget } from "../domain/budget.js"
import type { Order, User } from "../domain/models.js"
import type { Db } from "../persistence/db.js"
import { orderRepository, timeEntryRepository } from "../persistence/repositories.js"

/** Consultants see the orders of their own supplier – the same rule bookTime enforces (ORDER_NOT_ASSIGNED). */
export async function listBookableOrders(db: Db, consultant: User): Promise<{ order: Order; supplierName: string }[]> {
  if (consultant.supplierId === null) return []
  return orderRepository(db).findBySupplierWithName(consultant.supplierId)
}

/** Project managers see the orders they are responsible for, each with its budget (ADR 0008: computed on read). */
export async function listManagedOrders(db: Db, projectManager: User): Promise<{ order: Order; budget: OrderBudget }[]> {
  const managed = await orderRepository(db).findByProjectManager(projectManager.id)
  const booked = await timeEntryRepository(db).sumMinutesPerOrder(managed.map((o) => o.id))
  return managed.map((order) => ({ order, budget: calculateOrderBudget(order, booked.get(order.id) ?? 0) }))
}
