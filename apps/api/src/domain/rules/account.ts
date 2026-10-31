// Who belongs to which side (ADR 0004): consultants work for a supplier; project managers, purchasing and admins
// work for the client company. A wrong combination would give a client employee a supplier's view, or
// leave a consultant who can book on no order at all.
import { DomainError } from "../errors.js"
import type { User } from "../models.js"

export function assertSupplierMatchesRole(account: Pick<User, "role" | "supplierId">): void {
  if (account.role === "consultant" && account.supplierId === null) {
    throw new DomainError("CONSULTANT_NEEDS_SUPPLIER", "A consultant must belong to a supplier. Choose the consultant's company.")
  }
  if (account.role !== "consultant" && account.supplierId !== null) {
    throw new DomainError(
      "SUPPLIER_ONLY_FOR_CONSULTANTS",
      "Only consultants belong to a supplier. Project managers, purchasing and admins work for the client; leave the supplier empty.",
    )
  }
}
