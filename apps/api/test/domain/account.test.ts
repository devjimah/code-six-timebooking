// Ticket #5: consultants belong to a supplier, client-side roles do not (ADR 0004).
import { describe, expect, it } from "vitest"
import { assertSupplierMatchesRole } from "../../src/domain/rules/account.js"

describe("supplier and role of an account", () => {
  it("accepts a consultant of a supplier", () => {
    expect(() => assertSupplierMatchesRole({ role: "consultant", supplierId: 1 })).not.toThrow()
  })

  it("accepts a project manager, purchasing and an admin without supplier", () => {
    expect(() => assertSupplierMatchesRole({ role: "project_manager", supplierId: null })).not.toThrow()
    expect(() => assertSupplierMatchesRole({ role: "purchasing", supplierId: null })).not.toThrow()
    expect(() => assertSupplierMatchesRole({ role: "admin", supplierId: null })).not.toThrow()
  })

  it("rejects purchasing with a supplier: purchasing works for the client", () => {
    expect(() => assertSupplierMatchesRole({ role: "purchasing", supplierId: 1 })).toThrow(
      expect.objectContaining({ code: "SUPPLIER_ONLY_FOR_CONSULTANTS" }),
    )
  })

  it("rejects a consultant without supplier", () => {
    expect(() => assertSupplierMatchesRole({ role: "consultant", supplierId: null })).toThrow(
      expect.objectContaining({ code: "CONSULTANT_NEEDS_SUPPLIER" }),
    )
  })

  it("rejects a project manager or admin with a supplier", () => {
    expect(() => assertSupplierMatchesRole({ role: "project_manager", supplierId: 1 })).toThrow(
      expect.objectContaining({ code: "SUPPLIER_ONLY_FOR_CONSULTANTS" }),
    )
    expect(() => assertSupplierMatchesRole({ role: "admin", supplierId: 1 })).toThrow(
      "Only consultants belong to a supplier.",
    )
  })
})
