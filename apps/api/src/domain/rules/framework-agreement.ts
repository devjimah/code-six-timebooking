// A framework agreement: a long-term contract with one supplier, whose total budget its orders draw from (ticket #69,
// ADR 0020). The total is a hard limit, like every other budget here: an order beyond it is refused.
import { DomainError } from "../errors.js"
import { formatEuros } from "../format.js"
import type { FrameworkAgreement, Order } from "../models.js"

export function assertOrderFitsAgreement(input: {
  agreement: FrameworkAgreement
  order: Pick<Order, "supplierId" | "startDate" | "endDate"> & { budgetCents: number }
  otherOrdersCents: number // everything the agreement's other orders already take
}): void {
  const { agreement, order, otherOrdersCents } = input
  if (order.supplierId !== agreement.supplierId) {
    throw new DomainError("FRAMEWORK_OTHER_SUPPLIER", `Framework agreement ${agreement.code} is with another supplier.`)
  }
  if (order.startDate < agreement.startDate || order.endDate > agreement.endDate) {
    throw new DomainError(
      "FRAMEWORK_PERIOD",
      `The order's period must lie inside framework agreement ${agreement.code} (${agreement.startDate} to ${agreement.endDate}).`,
    )
  }
  const free = Math.max(0, agreement.totalBudgetCents - otherOrdersCents)
  if (order.budgetCents > free) {
    throw new DomainError(
      "FRAMEWORK_BUDGET_EXCEEDED",
      `Order rejected: only ${formatEuros(free)} left in framework agreement ${agreement.code}, and this order needs ${formatEuros(order.budgetCents)}.`,
    )
  }
}

/** Changing an agreement cannot take away what its orders already rely on. */
export function assertAgreementCoversOrders(input: {
  code: string
  totalBudgetCents: number
  ordersCents: number
  period: { startDate: string; endDate: string }
  orders: Pick<Order, "startDate" | "endDate">[]
}): void {
  if (input.totalBudgetCents < input.ordersCents) {
    throw new DomainError(
      "FRAMEWORK_TOTAL_BELOW_ORDERS",
      `Framework agreement ${input.code} cannot be lower than its orders, which take ${formatEuros(input.ordersCents)}.`,
    )
  }
  if (input.orders.some((o) => o.startDate < input.period.startDate || o.endDate > input.period.endDate)) {
    throw new DomainError("FRAMEWORK_PERIOD", `The period of framework agreement ${input.code} must still cover all its orders.`)
  }
}

export function assertUniqueAgreementCode(code: string, existing: Pick<FrameworkAgreement, "id" | "code">[], exceptId?: number): void {
  if (existing.some((a) => a.id !== exceptId && a.code.toLowerCase() === code.toLowerCase())) {
    throw new DomainError("FRAMEWORK_CODE_TAKEN", `A framework agreement with the code ${code} already exists.`)
  }
}
