// Supplier names are unique, ignoring case and extra spaces, so nobody picks the wrong company.
import { describe, expect, it } from "vitest"
import { assertUniqueSupplierName, normalizeSupplierName } from "../../src/domain/rules/supplier-name.js"

const existing = [
  { id: 1, name: "Acme Consulting GmbH" },
  { id: 2, name: "Nordic Dev AG" },
]

describe("unique supplier name", () => {
  it("accepts a new name", () => {
    expect(() => assertUniqueSupplierName("Bright Data GmbH", existing)).not.toThrow()
  })

  it("lets a supplier keep its own name when it is renamed", () => {
    expect(() => assertUniqueSupplierName("ACME Consulting GmbH", existing, 1)).not.toThrow()
  })

  it("rejects a name that differs only in case and spaces", () => {
    expect(() => assertUniqueSupplierName("  acme   consulting gmbh ", existing)).toThrow(
      expect.objectContaining({ code: "SUPPLIER_NAME_TAKEN", message: 'A supplier named "Acme Consulting GmbH" already exists.' }),
    )
  })

  it("rejects renaming a supplier to another supplier's name", () => {
    expect(() => assertUniqueSupplierName("Nordic Dev AG", existing, 1)).toThrow(
      expect.objectContaining({ code: "SUPPLIER_NAME_TAKEN" }),
    )
  })

  it("compares names trimmed, with single spaces, in lower case", () => {
    expect(normalizeSupplierName("  Nordic   Dev AG ")).toBe("nordic dev ag")
  })
})
