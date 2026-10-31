// Use case "a project manager looks at the budget of their order" (ticket #18).
// Only the order's own project manager may see it (docs/roles-and-privacy.md, ADR 0004).
import { type OrderBudget, calculateOrderBudget } from "../domain/budget.js"
import type { Order, User } from "../domain/models.js"
import type { Db } from "../persistence/db.js"
import { timeEntryRepository } from "../persistence/repositories.js"
import { loadOwnOrder } from "./own-order.js"

export async function getOrderBudget(
  db: Db,
  user: User,
  orderId: number,
): Promise<{ order: Order; budget: OrderBudget }> {
  const order = await loadOwnOrder(db, user, orderId)
  const bookedMinutes = await timeEntryRepository(db).sumMinutesForOrder(order.id)
  return { order, budget: calculateOrderBudget(order, bookedMinutes) }
}
