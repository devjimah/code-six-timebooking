// Use cases around framework agreements (ticket #69, ADR 0020). The role check is in the route, the rules in the domain.
import { calculateOrderBudget } from "../domain/budget.js"
import type { FrameworkAgreement } from "../domain/models.js"
import { assertValidOrderPeriod } from "../domain/rules/order-period.js"
import { assertAgreementCoversOrders, assertUniqueAgreementCode } from "../domain/rules/framework-agreement.js"
import type { Db } from "../persistence/db.js"
import { frameworkAgreementRepository, orderRepository, supplierRepository, timeEntryRepository } from "../persistence/repositories.js"
import { DomainError } from "../domain/errors.js"
import { NotFoundError } from "./errors.js"

export type AgreementInput = Omit<FrameworkAgreement, "id">
export type AgreementOverview = {
  agreement: FrameworkAgreement
  supplierName: string
  orderCount: number
  orderedCents: number // what its orders take of the total
  bookedCents: number // what has been booked on them
  freeCents: number // what is left for new orders
}

export async function listAgreements(db: Db): Promise<AgreementOverview[]> {
  const orders = await orderRepository(db).findAll()
  const booked = await timeEntryRepository(db).sumMinutesPerOrder(orders.map((o) => o.id))
  const suppliers = new Map((await supplierRepository(db).findAll()).map((s) => [s.id, s.name]))
  return (await frameworkAgreementRepository(db).findAll()).map((agreement) => {
    const budgets = orders
      .filter((o) => o.frameworkAgreementId === agreement.id)
      .map((o) => calculateOrderBudget(o, booked.get(o.id) ?? 0))
    const orderedCents = budgets.reduce((sum, b) => sum + b.budgetCents, 0)
    return {
      agreement,
      supplierName: suppliers.get(agreement.supplierId) ?? "",
      orderCount: budgets.length,
      orderedCents,
      bookedCents: budgets.reduce((sum, b) => sum + b.bookedCents, 0),
      freeCents: agreement.totalBudgetCents - orderedCents,
    }
  })
}

async function assertValidAgreement(db: Db, input: AgreementInput, exceptId?: number) {
  assertValidOrderPeriod(input)
  assertUniqueAgreementCode(input.code, await frameworkAgreementRepository(db).findAll(), exceptId)
  if (!(await supplierRepository(db).findById(input.supplierId))) {
    throw new DomainError("SUPPLIER_NOT_FOUND", `Supplier ${input.supplierId} does not exist.`)
  }
}

export async function createAgreement(db: Db, input: AgreementInput): Promise<FrameworkAgreement> {
  await assertValidAgreement(db, input)
  return frameworkAgreementRepository(db).create(input)
}

export async function updateAgreement(db: Db, id: number, input: AgreementInput): Promise<FrameworkAgreement> {
  const agreements = frameworkAgreementRepository(db)
  const current = await agreements.findById(id)
  if (!current) {
    throw new NotFoundError("FRAMEWORK_NOT_FOUND", `Framework agreement ${id} does not exist.`)
  }
  await assertValidAgreement(db, input, id)
  const orders = (await orderRepository(db).findAll()).filter((o) => o.frameworkAgreementId === id)
  if (orders.length > 0 && input.supplierId !== current.supplierId) {
    throw new DomainError("FRAMEWORK_OTHER_SUPPLIER", `Framework agreement ${current.code} has orders, so its supplier stays.`)
  }
  assertAgreementCoversOrders({
    code: current.code,
    totalBudgetCents: input.totalBudgetCents,
    ordersCents: orders.reduce((sum, o) => sum + o.budgetHours * o.hourlyRateCents, 0),
    period: input,
    orders,
  })
  return agreements.update(id, input)
}
