// Step 5: rules for changing the own password. Each rule: accepting and rejecting cases.
import { describe, expect, it } from "vitest"
import { assertNotOwnAccount } from "../../src/domain/rules/account-change.js"
import { assertPasswordChangeAllowed } from "../../src/domain/rules/password-change.js"

const code = (c: string) => expect.objectContaining({ code: c })

describe("changing the own password", () => {
  it("accepts a new password when the current one is right", () => {
    expect(() => assertPasswordChangeAllowed({ currentPasswordCorrect: true, newSameAsCurrent: false })).not.toThrow()
  })

  it("rejects a wrong current password", () => {
    expect(() => assertPasswordChangeAllowed({ currentPasswordCorrect: false, newSameAsCurrent: false })).toThrow(
      code("CURRENT_PASSWORD_WRONG"),
    )
  })

  it("rejects keeping the same password, so the admin no longer knows it after a reset", () => {
    expect(() => assertPasswordChangeAllowed({ currentPasswordCorrect: true, newSameAsCurrent: true })).toThrow(
      code("NEW_PASSWORD_SAME_AS_CURRENT"),
    )
  })

  it("checks the current password first: a wrong one never reveals anything about the new one", () => {
    expect(() => assertPasswordChangeAllowed({ currentPasswordCorrect: false, newSameAsCurrent: true })).toThrow(
      code("CURRENT_PASSWORD_WRONG"),
    )
  })
})

describe("an admin resets passwords of others only", () => {
  it("accepts resetting someone else's password", () => {
    expect(() => assertNotOwnAccount({ actorId: 1, targetId: 2, action: "reset_password" })).not.toThrow()
  })

  it("rejects resetting the own password", () => {
    expect(() => assertNotOwnAccount({ actorId: 1, targetId: 1, action: "reset_password" })).toThrow(
      code("CANNOT_RESET_OWN_PASSWORD"),
    )
  })
})
