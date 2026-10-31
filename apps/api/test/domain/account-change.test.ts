// Step 4: what an admin may change on an existing account. Each rule: accepting and rejecting cases.
import { describe, expect, it } from "vitest"
import { assertNoManagedOrders, assertNotOwnAccount, assertRoleChangeAllowed } from "../../src/domain/rules/account-change.js"

const code = (c: string) => expect.objectContaining({ code: c })

describe("role change only while no data depends on the old role", () => {
  it("accepts keeping the same role, even with bookings", () => {
    expect(() =>
      assertRoleChangeAllowed({ current: { role: "consultant" }, newRole: "consultant", bookingCount: 5, managedOrderCodes: [] }),
    ).not.toThrow()
  })

  it("accepts a new role when nothing depends on the old one", () => {
    expect(() =>
      assertRoleChangeAllowed({ current: { role: "consultant" }, newRole: "project_manager", bookingCount: 0, managedOrderCodes: [] }),
    ).not.toThrow()
    expect(() =>
      assertRoleChangeAllowed({ current: { role: "admin" }, newRole: "purchasing", bookingCount: 0, managedOrderCodes: [] }),
    ).not.toThrow()
  })

  it("rejects a new role for a consultant with bookings", () => {
    expect(() =>
      assertRoleChangeAllowed({ current: { role: "consultant" }, newRole: "project_manager", bookingCount: 3, managedOrderCodes: [] }),
    ).toThrow(code("ROLE_IN_USE"))
  })

  it("rejects a new role for a project manager with orders, naming them", () => {
    expect(() =>
      assertRoleChangeAllowed({
        current: { role: "project_manager" },
        newRole: "purchasing",
        bookingCount: 0,
        managedOrderCodes: ["PO-2026-001", "PO-2026-002"],
      }),
    ).toThrow(
      expect.objectContaining({
        code: "ROLE_IN_USE",
        message: "This project manager is responsible for PO-2026-001, PO-2026-002. " +
          "Purchasing must assign these orders to someone else first.",
      }),
    )
  })
})

describe("no changes that lock yourself out", () => {
  it("accepts changing someone else", () => {
    expect(() => assertNotOwnAccount({ actorId: 1, targetId: 2, action: "change_role" })).not.toThrow()
    expect(() => assertNotOwnAccount({ actorId: 1, targetId: 2, action: "deactivate" })).not.toThrow()
  })

  it("rejects changing your own role or deactivating yourself", () => {
    expect(() => assertNotOwnAccount({ actorId: 1, targetId: 1, action: "change_role" })).toThrow(code("CANNOT_CHANGE_OWN_ROLE"))
    expect(() => assertNotOwnAccount({ actorId: 1, targetId: 1, action: "deactivate" })).toThrow(
      code("CANNOT_DEACTIVATE_YOURSELF"),
    )
  })
})

describe("a project manager leaves only without orders", () => {
  it("accepts a project manager without orders", () => {
    expect(() => assertNoManagedOrders({ managedOrderCodes: [] })).not.toThrow()
  })

  it("rejects a project manager who still has orders", () => {
    expect(() => assertNoManagedOrders({ managedOrderCodes: ["PO-2026-003"] })).toThrow(code("MANAGES_ORDERS"))
  })
})
