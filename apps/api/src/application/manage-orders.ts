// Use cases for purchasing: see all orders with their budget, place a new order, change an order
// (docs/roles-and-privacy.md). The role check is in the route; the rules are in src/domain/rules.
import { DomainError } from "../domain/errors.js"
import { type OrderBudget, calculateOrderBudget } from "../domain/budget.js"
import type { Order, User } from "../domain/models.js"
import { assertBudgetNotBelowBooked, assertSupplierUnchangedAfterBookings } from "../domain/rules/order-change.js"
import { assertUniqueOrderCode, normalizeOrderCode } from "../domain/rules/order-code.js"
import { assertPeriodCoversBookings, assertValidOrderPeriod } from "../domain/rules/order-period.js"
import { assertIsProjectManager } from "../domain/rules/project-manager.js"
import type { Db } from "../persistence/db.js"
import { orderRepository, supplierRepository, timeEntryRepository, userRepository } from "../persistence/repositories.js"
import { NotFoundError } from "./errors.js"

export type OrderInput = Omit<Order, "id">

export type OrderOverview = {
  order: Order
  budget: OrderBudget
  supplierName: string
  projectManagerName: string
}

/** All orders with their budget – purchasing follows up on every order, so it sees the sums of all of them. */
export async function listAllOrders(db: Db): Promise<OrderOverview[]> {
  const all = await orderRepository(db).findAll()
  const booked = await timeEntryRepository(db).sumMinutesPerOrder(all.map((o) => o.id))
  const suppliers = new Map((await supplierRepository(db).findAll()).map((s) => [s.id, s.name]))
  const users = new Map((await userRepository(db).findAll()).map((u) => [u.id, u.name]))
  return all.map((order) => ({
    order,
    budget: calculateOrderBudget(order, booked.get(order.id) ?? 0),
    supplierName: suppliers.get(order.supplierId) ?? "",
    projectManagerName: users.get(order.projectManagerId) ?? "",
  }))
}

/** Checks that do not depend on existing bookings – the same for a new and a changed order. */
async function assertValidOrder(db: Db, input: OrderInput, exceptId?: number) {
  assertValidOrderPeriod(input)
  assertUniqueOrderCode(input.code, await orderRepository(db).findAll(), exceptId)
  if (!(await supplierRepository(db).findById(input.supplierId))) {
    throw new DomainError("SUPPLIER_NOT_FOUND", `Supplier ${input.supplierId} does not exist.`)
  }
  assertIsProjectManager(await userRepository(db).findById(input.projectManagerId), input.projectManagerId)
}

export async function createOrder(db: Db, input: OrderInput): Promise<Order> {
  await assertValidOrder(db, input)
  return orderRepository(db).create({ ...input, code: normalizeOrderCode(input.code) })
}

export async function updateOrder(db: Db, id: number, input: OrderInput): Promise<Order> {
  const orders = orderRepository(db)
  const current = await orders.findById(id)
  if (!current) {
    throw new NotFoundError("ORDER_NOT_FOUND", `Order ${id} does not exist.`)
  }
  await assertValidOrder(db, input, id)

  // Rules that protect the time already booked on this order (team decisions, step 2).
  const entries = timeEntryRepository(db)
  const bookedMinutes = await entries.sumMinutesForOrder(id)
  assertBudgetNotBelowBooked({ budgetHours: input.budgetHours, bookedMinutes })
  assertSupplierUnchangedAfterBookings({ current, newSupplierId: input.supplierId, bookedMinutes })
  assertPeriodCoversBookings(input, await entries.bookedDateRange(id))

  return orders.update(id, { ...input, code: normalizeOrderCode(input.code) })
}

/** Who can be made responsible for an order: names only, no emails – purchasing needs no more to choose. */
export async function listProjectManagers(db: Db): Promise<Pick<User, "id" | "name">[]> {
  return (await userRepository(db).findAll())
    .filter((u) => u.role === "project_manager")
    .map(({ id, name }) => ({ id, name }))
}
