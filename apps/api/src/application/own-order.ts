// "Is this your order?" – shared by every use case where a project manager looks into one order
// (budget, bookings). One place, so the ownership rule cannot differ between routes (docs/roles-and-privacy.md).
import type { Order, User } from "../domain/models.js"
import type { Db } from "../persistence/db.js"
import { orderRepository } from "../persistence/repositories.js"
import { AccessDeniedError, NotFoundError } from "./errors.js"

export async function loadOwnOrder(db: Db, projectManager: User, orderId: number): Promise<Order> {
  const order = await orderRepository(db).findById(orderId)
  if (!order) {
    throw new NotFoundError("ORDER_NOT_FOUND", `Order ${orderId} does not exist.`)
  }
  if (order.projectManagerId !== projectManager.id) {
    throw new AccessDeniedError("NOT_YOUR_ORDER", "Only the project manager of this order can see its budget and bookings.")
  }
  return order
}
