// Use case "a project manager looks at the budget of their order" (ticket #18).
// Only the order's own project manager may see it (docs/roles-and-privacy.md, ADR 0004).
import { type OrderBudget, calculateOrderBudget } from "../domain/budget.js"
import type { Order, User } from "../domain/models.js"
import type { Db } from "../persistence/db.js"
import { orderRepository, timeEntryRepository } from "../persistence/repositories.js"
import { AccessDeniedError, NotFoundError } from "./errors.js"

export async function getOrderBudget(
  db: Db,
  user: User,
  orderId: number,
): Promise<{ order: Order; budget: OrderBudget }> {
  const order = await orderRepository(db).findById(orderId)
  if (!order) {
    throw new NotFoundError("ORDER_NOT_FOUND", `Order ${orderId} does not exist.`)
  }
  if (order.projectManagerId !== user.id) {
    throw new AccessDeniedError("NOT_YOUR_ORDER", "Only the project manager of this order can see its budget.")
  }

  const bookedMinutes = await timeEntryRepository(db).sumMinutesForOrder(order.id)
  return { order, budget: calculateOrderBudget(order, bookedMinutes) }
}
