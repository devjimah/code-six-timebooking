// Use cases "the project manager gets the proof of work of a month" and "purchasing checks an invoice against the
// approved hours" (tickets #75, #76, ADR 0018). Single bookings go to the order's project manager only; purchasing
// gets sums, as everywhere (docs/roles-and-privacy.md).
import { type InvoiceCheck, type MonthTotals, checkInvoice, monthTotals } from "../domain/proof-of-work.js"
import type { Order, User } from "../domain/models.js"
import type { Db } from "../persistence/db.js"
import { orderRepository, timeEntryRepository } from "../persistence/repositories.js"
import { NotFoundError } from "./errors.js"
import type { OrderBooking } from "./list-order-bookings.js"
import { loadOwnOrder } from "./own-order.js"

export type ProofOfWork = { order: Order; month: string; totals: MonthTotals; bookings: OrderBooking[] }

export async function getProofOfWork(db: Db, projectManager: User, orderId: number, month: string): Promise<ProofOfWork> {
  const order = await loadOwnOrder(db, projectManager, orderId)
  const bookings = await timeEntryRepository(db).findByOrderWithConsultantName(order.id, month)
  return { order, month, totals: monthTotals(bookings, order.hourlyRateCents), bookings }
}

export type OrderInvoiceCheck = { order: Order; month: string; totals: MonthTotals; invoicedCents: number; check: InvoiceCheck }

export async function checkOrderInvoice(
  db: Db,
  orderId: number,
  month: string,
  invoicedCents: number,
): Promise<OrderInvoiceCheck> {
  const order = await orderRepository(db).findById(orderId)
  if (!order) {
    throw new NotFoundError("ORDER_NOT_FOUND", `Order ${orderId} does not exist.`)
  }
  const bookings = await timeEntryRepository(db).findByOrderWithConsultantName(order.id, month)
  const totals = monthTotals(bookings, order.hourlyRateCents)
  return { order, month, totals, invoicedCents, check: checkInvoice(invoicedCents, totals.approvedCents) }
}
