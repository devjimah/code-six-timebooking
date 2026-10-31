// A consultant may only book on orders placed with their own company (supplier).
// Until there is an explicit assignment table, "the order belongs to my supplier" counts as assigned.
// The message names no other company's order on purpose: consultants must not learn about other suppliers' orders.
import { DomainError } from "../errors.js"
import type { Order, User } from "../models.js"

export function assertAssignedToOrder(input: {
  user: Pick<User, "supplierId">
  order: Pick<Order, "supplierId">
}): void {
  if (input.user.supplierId === null || input.user.supplierId !== input.order.supplierId) {
    throw new DomainError("ORDER_NOT_ASSIGNED", "Booking rejected: you can only book on orders of your own company.")
  }
}
