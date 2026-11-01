// What the admin may change on an existing account (step 4, team decisions).
// Accounts are never deleted: bookings and audit events must keep pointing to the person.
// An admin can neither change their own role nor deactivate themselves. Because the acting admin is active and
// stays an admin, the system can never end up without an active admin – no extra "last admin" rule is needed.
import { DomainError } from "../errors.js"
import type { Role, User } from "../models.js"

/**
 * A role can only change while no data depends on the old one: a consultant's bookings must stay a consultant's,
 * and every order needs a real project manager to check its work.
 */
export function assertRoleChangeAllowed(input: {
  current: Pick<User, "role">
  newRole: Role
  bookingCount: number
  managedOrderCodes: string[]
}): void {
  const { current, newRole } = input
  if (newRole === current.role) return
  if (current.role === "consultant" && input.bookingCount > 0) {
    throw new DomainError(
      "ROLE_IN_USE",
      `This consultant has ${input.bookingCount} booking(s), so the role cannot change. Create a new account instead.`,
    )
  }
  if (current.role === "project_manager" && input.managedOrderCodes.length > 0) {
    throw new DomainError(
      "ROLE_IN_USE",
      `This project manager is responsible for ${input.managedOrderCodes.join(", ")}. ` +
        "Purchasing must assign these orders to someone else first.",
    )
  }
}

const OWN_ACCOUNT_ERRORS = {
  change_role: ["CANNOT_CHANGE_OWN_ROLE", "You cannot change your own role. Ask another admin."],
  deactivate: ["CANNOT_DEACTIVATE_YOURSELF", "You cannot deactivate your own account. Ask another admin."],
  // A reset would make the admin choose a password and then be forced to replace it – use "Change password".
  reset_password: ["CANNOT_RESET_OWN_PASSWORD", "You cannot reset your own password. Use \"Change password\" instead."],
} as const

/** Protects against locking yourself out: no own role change, no own deactivation, no reset of the own password. */
export function assertNotOwnAccount(input: { actorId: number; targetId: number; action: keyof typeof OWN_ACCOUNT_ERRORS }): void {
  if (input.actorId !== input.targetId) return
  const [code, message] = OWN_ACCOUNT_ERRORS[input.action]
  throw new DomainError(code, message)
}

/** A project manager may only leave once no order depends on them – nobody else could check its work. */
export function assertNoManagedOrders(input: { managedOrderCodes: string[] }): void {
  if (input.managedOrderCodes.length > 0) {
    throw new DomainError(
      "MANAGES_ORDERS",
      `This project manager is still responsible for ${input.managedOrderCodes.join(", ")}. ` +
        "Purchasing must assign these orders to someone else first.",
    )
  }
}
