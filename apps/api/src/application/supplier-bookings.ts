// Use case "the supplier manager checks the bookings of their own company's consultants" (ticket #77, ADR 0021).
// The supplier is the employer and responsible for working-time law, so this role gets the times the client never sees.
// No money, and nothing from any other supplier: the supplier comes from the person's own account, never from the request.
import type { User } from "../domain/models.js"
import type { Db } from "../persistence/db.js"
import { timeEntryRepository } from "../persistence/repositories.js"

export async function listSupplierBookings(db: Db, manager: User, month: string) {
  // The account rule guarantees a supplier for this role; without one there is simply nothing to show.
  if (manager.supplierId === null) return []
  return timeEntryRepository(db).findBySupplierInMonth(manager.supplierId, month)
}
