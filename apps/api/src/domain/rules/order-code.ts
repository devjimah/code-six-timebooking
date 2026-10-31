// Every purchase order has its own code – it is what appears on the invoice. "po-2026-001 " and "PO-2026-001"
// are the same order, so codes are compared trimmed and in upper case.
import { DomainError } from "../errors.js"
import type { Order } from "../models.js"

export const normalizeOrderCode = (code: string) => code.trim().toUpperCase()

/** `exceptId`: the order being edited may keep its own code. */
export function assertUniqueOrderCode(code: string, existing: Pick<Order, "id" | "code">[], exceptId?: number): void {
  const wanted = normalizeOrderCode(code)
  if (existing.some((o) => o.id !== exceptId && normalizeOrderCode(o.code) === wanted)) {
    throw new DomainError("ORDER_CODE_TAKEN", `An order with the code ${wanted} already exists.`)
  }
}
