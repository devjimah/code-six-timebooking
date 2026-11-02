// Use case "purchasing sees how much the company depends on each supplier" (ticket #71). Sums only.
import { supplierShares, type SupplierShare } from "../domain/supplier-share.js"
import type { Db } from "../persistence/db.js"
import { orderRepository, supplierRepository, timeEntryRepository } from "../persistence/repositories.js"

export async function supplierOverview(db: Db): Promise<(SupplierShare & { name: string })[]> {
  const suppliers = await supplierRepository(db).findAll()
  const orders = await orderRepository(db).findAll()
  const booked = await timeEntryRepository(db).sumMinutesPerOrder(orders.map((o) => o.id))
  const shares = supplierShares(suppliers.map((s) => s.id), orders, booked)
  return shares.map((share, index) => ({ ...share, name: suppliers[index]!.name }))
}
