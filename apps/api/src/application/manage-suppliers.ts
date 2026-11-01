// Use cases "purchasing creates a supplier" and "purchasing renames a supplier" (docs/roles-and-privacy.md).
// The role check is in the route; the rule (unique name) is in the domain.
import type { Supplier } from "../domain/models.js"
import { assertUniqueSupplierName } from "../domain/rules/supplier-name.js"
import type { Db } from "../persistence/db.js"
import { supplierRepository } from "../persistence/repositories.js"
import { NotFoundError } from "./errors.js"

export async function createSupplier(db: Db, input: { name: string }): Promise<Supplier> {
  const suppliers = supplierRepository(db)
  assertUniqueSupplierName(input.name, await suppliers.findAll())
  return suppliers.create({ name: input.name })
}

export async function renameSupplier(db: Db, id: number, input: { name: string }): Promise<Supplier> {
  const suppliers = supplierRepository(db)
  if (!(await suppliers.findById(id))) {
    throw new NotFoundError("SUPPLIER_NOT_FOUND", `Supplier ${id} does not exist.`)
  }
  assertUniqueSupplierName(input.name, await suppliers.findAll(), id)
  return suppliers.update(id, { name: input.name })
}
