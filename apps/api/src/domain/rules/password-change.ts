// Changing the own password (step 5). After an admin reset the person must choose a new password; these rules
// make sure it really is their own: they prove they know the current one, and the new one is different.
// The length (10–72 characters) is checked by the request schema in api/dto.ts, like for new accounts.
import { DomainError } from "../errors.js"

export function assertPasswordChangeAllowed(input: { currentPasswordCorrect: boolean; newSameAsCurrent: boolean }): void {
  if (!input.currentPasswordCorrect) {
    // Without this, anyone at an unlocked computer could change the password and take over the account.
    throw new DomainError("CURRENT_PASSWORD_WRONG", "Your current password is wrong.")
  }
  if (input.newSameAsCurrent) {
    // Otherwise the admin would still know the password after a reset.
    throw new DomainError("NEW_PASSWORD_SAME_AS_CURRENT", "Choose a new password that differs from the current one.")
  }
}
