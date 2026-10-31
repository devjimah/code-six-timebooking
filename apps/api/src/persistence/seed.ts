// Demo data so the app is usable right after setup.
// Idempotent: it does nothing if users already exist, so it is safe to run on every start.
import bcrypt from "bcryptjs"
import type { Db } from "./db.js"
import { orderRepository, supplierRepository, timeEntryRepository, userRepository } from "./repositories.js"

export const DEMO_PASSWORD = "demo1234" // demo only – documented in the README

export async function seed(db: Db): Promise<boolean> {
  const userRepo = userRepository(db)
  if ((await userRepo.findAll()).length > 0) return false

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10)

  const supplierRepo = supplierRepository(db)
  const acme = await supplierRepo.create({ name: "Acme Consulting GmbH" })
  const nordic = await supplierRepo.create({ name: "Nordic Dev AG" })

  const admin = await userRepo.create({
    email: "admin@demo.local", name: "Ada Admin", role: "admin", supplierId: null, passwordHash,
  })
  const pm = await userRepo.create({
    email: "pm@demo.local", name: "Paula Projectmanager", role: "project_manager", supplierId: null, passwordHash,
  })
  const consultant = await userRepo.create({
    email: "consultant@demo.local", name: "Carl Consultant", role: "consultant", supplierId: acme.id, passwordHash,
  })
  void admin

  const orderRepo = orderRepository(db)
  const portal = await orderRepo.create({
    code: "PO-2026-001", title: "Customer portal relaunch", supplierId: acme.id,
    projectManagerId: pm.id, budgetHours: 120, hourlyRateCents: 9500,
  })
  const migration = await orderRepo.create({
    code: "PO-2026-002", title: "SAP data migration", supplierId: acme.id,
    projectManagerId: pm.id, budgetHours: 40, hourlyRateCents: 11000,
  })
  await orderRepo.create({
    code: "PO-2026-003", title: "Mobile app security audit", supplierId: nordic.id,
    projectManagerId: pm.id, budgetHours: 60, hourlyRateCents: 12000,
  })

  const entries = timeEntryRepository(db)
  await entries.create({ userId: consultant.id, orderId: portal.id, workDate: "2026-10-26", durationMinutes: 480, description: "Kick-off and requirements workshop" })
  await entries.create({ userId: consultant.id, orderId: portal.id, workDate: "2026-10-27", durationMinutes: 450, description: "Login page implementation" })
  await entries.create({ userId: consultant.id, orderId: migration.id, workDate: "2026-10-28", durationMinutes: 240, description: "Analyse source data" })

  return true
}

