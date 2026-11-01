// Use cases "an admin resets a password" and "a person changes their own password" (step 5, team decisions):
// the admin types the new password and hands it over; the person must replace it at the next sign-in; every
// password change ends all open sessions (the session version goes up, see auth/session.ts).
import bcrypt from "bcryptjs"
import type { User } from "../domain/models.js"
import { assertNotOwnAccount } from "../domain/rules/account-change.js"
import { assertPasswordChangeAllowed } from "../domain/rules/password-change.js"
import type { Db } from "../persistence/db.js"
import { userRepository } from "../persistence/repositories.js"
import { NotFoundError } from "./errors.js"

/** The admin chooses a new password for someone else. Works on deactivated accounts too, ready for reactivation. */
export async function resetPassword(db: Db, admin: User, id: number, newPassword: string): Promise<User> {
  const users = userRepository(db)
  if (!(await users.findById(id))) throw new NotFoundError("USER_NOT_FOUND", `User ${id} does not exist.`)
  assertNotOwnAccount({ actorId: admin.id, targetId: id, action: "reset_password" })
  const passwordHash = await bcrypt.hash(newPassword, 10)
  return (await users.setPassword(id, { passwordHash, mustChangePassword: true })).user
}

/**
 * The signed-in person replaces their password. Returns the new session version, so the route can give this
 * browser a fresh session cookie – all other browsers are signed out.
 */
export async function changeOwnPassword(
  db: Db,
  user: User,
  input: { currentPassword: string; newPassword: string },
): Promise<{ user: User; sessionVersion: number }> {
  const users = userRepository(db)
  const credentials = (await users.findCredentialsById(user.id))!
  assertPasswordChangeAllowed({
    currentPasswordCorrect: await bcrypt.compare(input.currentPassword, credentials.passwordHash),
    newSameAsCurrent: input.newPassword === input.currentPassword,
  })
  const passwordHash = await bcrypt.hash(input.newPassword, 10)
  return users.setPassword(user.id, { passwordHash, mustChangePassword: false })
}
