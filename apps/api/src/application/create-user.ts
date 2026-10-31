// Use case "an admin creates an account" (ticket #5, ADR 0004). Nobody can register themselves,
// so nobody can give themselves a role. In production, accounts come from single sign-on (ADR 0002).
import bcrypt from "bcryptjs"
import { DomainError } from "../domain/errors.js"
import type { Role, User } from "../domain/models.js"
import { assertSupplierMatchesRole } from "../domain/rules/account.js"
import type { Db } from "../persistence/db.js"
import { supplierRepository, userRepository } from "../persistence/repositories.js"

export type NewAccount = {
  email: string
  name: string
  role: Role
  supplierId: number | null
  initialPassword: string
}

export async function createUser(db: Db, input: NewAccount): Promise<User> {
  assertSupplierMatchesRole(input)

  if (input.supplierId !== null && !(await supplierRepository(db).findById(input.supplierId))) {
    throw new DomainError("SUPPLIER_NOT_FOUND", `Supplier ${input.supplierId} does not exist.`)
  }
  const users = userRepository(db)
  if (await users.findByEmail(input.email)) {
    throw new DomainError("EMAIL_TAKEN", "An account with this email address already exists.")
  }

  // Only the hash is stored; the password itself is never written anywhere, the audit log included.
  const passwordHash = await bcrypt.hash(input.initialPassword, 10)
  return users.create({
    email: input.email,
    name: input.name,
    role: input.role,
    supplierId: input.supplierId,
    passwordHash,
  })
}
