// Two suppliers must not have the same name (ticket: purchasing manages suppliers). Otherwise an admin assigning a
// consultant, or purchasing placing an order, could pick the wrong company. "Acme GmbH" and " acme gmbh" are the same.
import { DomainError } from "../errors.js"
import type { Supplier } from "../models.js"

/** Name as it is compared: trimmed, inner spaces collapsed, lower case. */
export const normalizeSupplierName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase()

/** `exceptId`: the supplier being renamed may keep its own name. */
export function assertUniqueSupplierName(name: string, existing: Supplier[], exceptId?: number): void {
  const wanted = normalizeSupplierName(name)
  const clash = existing.find((s) => s.id !== exceptId && normalizeSupplierName(s.name) === wanted)
  if (clash) {
    throw new DomainError("SUPPLIER_NAME_TAKEN", `A supplier named "${clash.name}" already exists.`)
  }
}
