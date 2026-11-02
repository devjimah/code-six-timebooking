// Demo data so the app is usable right after setup.
// Idempotent: it does nothing if users already exist, so it is safe to run on every start.
import bcrypt from "bcryptjs"
import { todayInCompanyTimeZone } from "../application/clock.js"
import type { Db } from "./db.js"
import { frameworkAgreementRepository, orderRepository, supplierRepository, timeEntryRepository, userRepository } from "./repositories.js"
import { seedBudgetExample } from "./seed-budget-example.js"

export const DEMO_PASSWORD = "demo1234" // demo only – documented in the README

export async function seed(db: Db, today = todayInCompanyTimeZone()): Promise<boolean> {
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
  await userRepo.create({
    email: "purchasing@demo.local", name: "Pia Purchasing", role: "purchasing", supplierId: null, passwordHash,
  })
  const consultant = await userRepo.create({
    email: "consultant@demo.local", name: "Carl Consultant", role: "consultant", supplierId: acme.id, workState: "BY", passwordHash,
  })
  void admin
  const anna = await userRepo.create({
    email: "anna@demo.local", name: "Anna Analyst", role: "consultant", supplierId: nordic.id, passwordHash,
  })
  const ben = await userRepo.create({
    email: "ben@demo.local", name: "Ben Builder", role: "consultant", supplierId: nordic.id, passwordHash,
  })

  const orderRepo = orderRepository(db)
  // A framework agreement with Acme, whose total budget its first two orders draw from (ADR 0020).
  const agreement = await frameworkAgreementRepository(db).create({
    code: "FA-2026-01", title: "Acme software services 2026–2027", supplierId: acme.id, totalBudgetCents: 5_000_000,
    startDate: "2026-01-01", endDate: "2027-12-31",
  })
  const portal = await orderRepo.create({
    code: "PO-2026-001", title: "Customer portal relaunch", supplierId: acme.id,
    projectManagerId: pm.id, budgetHours: 120, hourlyRateCents: 9500, startDate: "2026-07-01", endDate: "2027-01-31",
    accountingObject: "P-2026-0815.03", frameworkAgreementId: agreement.id,
  })
  const migration = await orderRepo.create({
    code: "PO-2026-002", title: "SAP data migration", supplierId: acme.id,
    projectManagerId: pm.id, budgetHours: 40, hourlyRateCents: 11000, startDate: "2026-09-01", endDate: "2026-12-31",
    accountingObject: "CC-4100", frameworkAgreementId: agreement.id,
  })
  await orderRepo.create({
    code: "PO-2026-003", title: "Mobile app security audit", supplierId: nordic.id,
    projectManagerId: pm.id, budgetHours: 60, hourlyRateCents: 12000, startDate: "2026-10-01", endDate: "2026-12-18",
    accountingObject: "CC-7300",
  })

  const entries = timeEntryRepository(db)
  // durationMinutes = end − start − break (ADR 0010)
  await entries.create({ userId: consultant.id, orderId: portal.id, workDate: "2026-10-26", startTime: "08:30", endTime: "17:00", breakMinutes: 30, durationMinutes: 480, description: "Kick-off and requirements workshop" })
  await entries.create({ userId: consultant.id, orderId: portal.id, workDate: "2026-10-27", startTime: "09:00", endTime: "17:00", breakMinutes: 30, durationMinutes: 450, description: "Login page implementation" })
  await entries.create({ userId: consultant.id, orderId: migration.id, workDate: "2026-10-28", startTime: "09:00", endTime: "13:00", breakMinutes: 0, durationMinutes: 240, description: "Analyse source data" })

  await seedBudgetExample(db, { projectManagerId: pm.id, supplierId: nordic.id, annaId: anna.id, benId: ben.id }, today)

  return true
}

