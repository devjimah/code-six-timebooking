// Use case "a project manager checks the work booked on their order" (step 3, docs/roles-and-privacy.md).
// Each booking on its own – date, hours, description, who – so the work can be checked before the invoice is paid.
// Deliberately NO totals per person and day or week: the client checks the work, not the worker's hours
// (conflict "checking the work vs. becoming the employer").
import type { TimeEntry, User } from "../domain/models.js"
import type { Db } from "../persistence/db.js"
import { timeEntryRepository } from "../persistence/repositories.js"
import { loadOwnOrder } from "./own-order.js"

export type OrderBooking = Pick<TimeEntry, "id" | "workDate" | "durationMinutes" | "description" | "status" | "returnReason"> & {
  consultantName: string
}

export async function listOrderBookings(db: Db, projectManager: User, orderId: number): Promise<OrderBooking[]> {
  const order = await loadOwnOrder(db, projectManager, orderId)
  return timeEntryRepository(db).findByOrderWithConsultantName(order.id)
}
