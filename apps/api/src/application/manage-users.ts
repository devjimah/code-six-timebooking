// Use cases "an admin changes, deactivates or reactivates an account" (step 4, docs/roles-and-privacy.md).
// Creating accounts is in create-user.ts. The role check (admin only) is in the route; the rules are in the domain.
import { DomainError } from "../domain/errors.js"
import type { Role, User } from "../domain/models.js"
import { assertSupplierMatchesRole } from "../domain/rules/account.js"
import { assertNoManagedOrders, assertNotOwnAccount, assertRoleChangeAllowed } from "../domain/rules/account-change.js"
import type { Db } from "../persistence/db.js"
import { orderRepository, supplierRepository, timeEntryRepository, userRepository } from "../persistence/repositories.js"
import { NotFoundError } from "./errors.js"

export type AccountChanges = {
  email: string
  name: string
  role: Role
  supplierId: number | null
}

async function loadUser(db: Db, id: number): Promise<User> {
  const user = await userRepository(db).findById(id)
  if (!user) throw new NotFoundError("USER_NOT_FOUND", `User ${id} does not exist.`)
  return user
}

const managedOrderCodes = async (db: Db, userId: number) =>
  (await orderRepository(db).findByProjectManager(userId)).map((o) => o.code)

export async function updateUser(db: Db, admin: User, id: number, changes: AccountChanges): Promise<User> {
  const users = userRepository(db)
  const current = await loadUser(db, id)

  assertSupplierMatchesRole(changes)
  if (changes.supplierId !== null && !(await supplierRepository(db).findById(changes.supplierId))) {
    throw new DomainError("SUPPLIER_NOT_FOUND", `Supplier ${changes.supplierId} does not exist.`)
  }
  const sameEmail = await users.findByEmail(changes.email)
  if (sameEmail && sameEmail.id !== id) {
    throw new DomainError("EMAIL_TAKEN", "An account with this email address already exists.")
  }
  if (changes.role !== current.role) {
    assertNotOwnAccount({ actorId: admin.id, targetId: id, action: "change_role" })
    assertRoleChangeAllowed({
      current,
      newRole: changes.role,
      bookingCount: await timeEntryRepository(db).countByUser(id),
      managedOrderCodes: await managedOrderCodes(db, id),
    })
  }
  return users.update(id, changes)
}

export async function deactivateUser(db: Db, admin: User, id: number, now = new Date()): Promise<User> {
  const user = await loadUser(db, id)
  if (user.deactivatedAt !== null) return user // already deactivated: nothing to do, keep the first date
  assertNotOwnAccount({ actorId: admin.id, targetId: id, action: "deactivate" })
  if (user.role === "project_manager") {
    assertNoManagedOrders({ managedOrderCodes: await managedOrderCodes(db, id) })
  }
  return userRepository(db).update(id, { deactivatedAt: now.toISOString() })
}

export async function reactivateUser(db: Db, id: number): Promise<User> {
  await loadUser(db, id)
  return userRepository(db).update(id, { deactivatedAt: null })
}
