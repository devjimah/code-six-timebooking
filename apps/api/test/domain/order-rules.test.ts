// Rules for purchase orders (step 2): unique code, a valid period, bookings inside the period, and what may change
// once time is booked. Each rule: one accepting and one rejecting case at least.
import { describe, expect, it } from "vitest"
import { assertBudgetNotBelowBooked, assertSupplierUnchangedAfterBookings } from "../../src/domain/rules/order-change.js"
import { assertUniqueOrderCode, normalizeOrderCode } from "../../src/domain/rules/order-code.js"
import {
  assertPeriodCoversBookings,
  assertValidOrderPeriod,
  assertWithinOrderPeriod,
} from "../../src/domain/rules/order-period.js"
import { assertIsProjectManager } from "../../src/domain/rules/project-manager.js"

const code = (c: string) => expect.objectContaining({ code: c })

describe("unique order code", () => {
  const existing = [{ id: 1, code: "PO-2026-001" }]

  it("accepts a new code", () => {
    expect(() => assertUniqueOrderCode("PO-2026-002", existing)).not.toThrow()
  })

  it("lets an order keep its own code when it is edited", () => {
    expect(() => assertUniqueOrderCode("po-2026-001", existing, 1)).not.toThrow()
  })

  it("rejects a code that differs only in case and spaces", () => {
    expect(() => assertUniqueOrderCode(" po-2026-001 ", existing)).toThrow(code("ORDER_CODE_TAKEN"))
  })

  it("stores codes trimmed and in upper case", () => {
    expect(normalizeOrderCode(" po-2026-009 ")).toBe("PO-2026-009")
  })
})

describe("order period", () => {
  it("accepts a period that starts before it ends, or on the same day", () => {
    expect(() => assertValidOrderPeriod({ startDate: "2026-11-01", endDate: "2027-03-31" })).not.toThrow()
    expect(() => assertValidOrderPeriod({ startDate: "2026-11-01", endDate: "2026-11-01" })).not.toThrow()
  })

  it("rejects a period that ends before it starts", () => {
    expect(() => assertValidOrderPeriod({ startDate: "2026-11-01", endDate: "2026-10-31" })).toThrow(
      code("ORDER_PERIOD_INVALID"),
    )
  })
})

describe("booking inside the order period", () => {
  const order = { code: "PO-2026-002", startDate: "2026-09-01", endDate: "2026-12-31" }

  it("accepts the first and the last day of the period", () => {
    expect(() => assertWithinOrderPeriod({ order, workDate: "2026-09-01" })).not.toThrow()
    expect(() => assertWithinOrderPeriod({ order, workDate: "2026-12-31" })).not.toThrow()
  })

  it("rejects the day before the period starts, with both dates in the message", () => {
    expect(() => assertWithinOrderPeriod({ order, workDate: "2026-08-31" })).toThrow(
      expect.objectContaining({
        code: "OUTSIDE_ORDER_PERIOD",
        message: "Booking rejected: order PO-2026-002 runs from Tue 1 Sep 2026 to Thu 31 Dec 2026; " +
          "Mon 31 Aug 2026 is outside this period.",
      }),
    )
  })

  it("rejects the day after the period ends", () => {
    expect(() => assertWithinOrderPeriod({ order, workDate: "2027-01-01" })).toThrow(code("OUTSIDE_ORDER_PERIOD"))
  })
})

describe("changing the period of an order with bookings", () => {
  const booked = { first: "2026-10-05", last: "2026-10-28" }

  it("accepts a period that still contains all bookings, or any period without bookings", () => {
    expect(() => assertPeriodCoversBookings({ startDate: "2026-10-05", endDate: "2026-10-28" }, booked)).not.toThrow()
    expect(() => assertPeriodCoversBookings({ startDate: "2027-01-01", endDate: "2027-02-01" }, null)).not.toThrow()
  })

  it("rejects a period that cuts off booked days", () => {
    expect(() => assertPeriodCoversBookings({ startDate: "2026-10-06", endDate: "2026-12-31" }, booked)).toThrow(
      code("PERIOD_EXCLUDES_BOOKINGS"),
    )
    expect(() => assertPeriodCoversBookings({ startDate: "2026-09-01", endDate: "2026-10-27" }, booked)).toThrow(
      code("PERIOD_EXCLUDES_BOOKINGS"),
    )
  })
})

describe("budget not below booked hours", () => {
  it("accepts a budget equal to the booked hours", () => {
    expect(() => assertBudgetNotBelowBooked({ budgetHours: 16, bookedMinutes: 960 })).not.toThrow()
  })

  it("rejects a budget smaller than the booked hours", () => {
    expect(() => assertBudgetNotBelowBooked({ budgetHours: 15, bookedMinutes: 930 })).toThrow(
      expect.objectContaining({
        code: "BUDGET_BELOW_BOOKED",
        message: "15.5 h are already booked on this order; the budget cannot be smaller.",
      }),
    )
  })
})

describe("supplier fixed after the first booking", () => {
  const current = { supplierId: 1 }

  it("accepts a new supplier while nothing is booked, and the same supplier any time", () => {
    expect(() => assertSupplierUnchangedAfterBookings({ current, newSupplierId: 2, bookedMinutes: 0 })).not.toThrow()
    expect(() => assertSupplierUnchangedAfterBookings({ current, newSupplierId: 1, bookedMinutes: 600 })).not.toThrow()
  })

  it("rejects a new supplier once time is booked", () => {
    expect(() => assertSupplierUnchangedAfterBookings({ current, newSupplierId: 2, bookedMinutes: 30 })).toThrow(
      code("SUPPLIER_FIXED_AFTER_BOOKINGS"),
    )
  })
})

describe("responsible project manager", () => {
  it("accepts a project manager", () => {
    expect(() => assertIsProjectManager({ role: "project_manager" }, 2)).not.toThrow()
  })

  it("rejects other roles and unknown users", () => {
    expect(() => assertIsProjectManager({ role: "consultant" }, 4)).toThrow(code("NOT_A_PROJECT_MANAGER"))
    expect(() => assertIsProjectManager({ role: "purchasing" }, 3)).toThrow(code("NOT_A_PROJECT_MANAGER"))
    expect(() => assertIsProjectManager(null, 999)).toThrow(code("NOT_A_PROJECT_MANAGER"))
  })
})
