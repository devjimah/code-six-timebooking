// API DTOs: what goes over the wire. Requests are validated with zod (ADR 0007);
// responses are built from domain objects, so internal fields never leak by accident.
import { z } from "zod"
import type { OrderBudget } from "../domain/budget.js"
import type { AuditEvent, Order, TimeEntry, User } from "../domain/models.js"

export const loginRequest = z.object({
  email: z.email(),
  password: z.string().min(1),
})
export type LoginRequest = z.infer<typeof loginRequest>

export type UserResponse = {
  id: number
  email: string
  name: string
  role: User["role"]
  supplierId: number | null
}

export const toUserResponse = (user: User): UserResponse => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  supplierId: user.supplierId,
})

// GET /api/audit-events?limit=100&userId=3 – query values arrive as strings, so coerce them.
export const auditEventsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  userId: z.coerce.number().int().positive().optional(),
})

export type AuditEventResponse = AuditEvent

export const toAuditEventResponse = (event: AuditEvent): AuditEventResponse => ({ ...event })

// POST /api/time-entries
export const createTimeEntryRequest = z.object({
  orderId: z.number().int().positive(),
  workDate: z.iso.date(), // "YYYY-MM-DD"
  // Only the type is checked here. What counts as a valid duration is a business rule (domain/rules/duration.ts).
  durationMinutes: z.number(),
  description: z.string().trim().min(10).max(500),
})
export type CreateTimeEntryRequest = z.infer<typeof createTimeEntryRequest>

export type TimeEntryResponse = {
  id: number
  orderId: number
  workDate: string
  durationMinutes: number
  description: string
}

// userId is left out: the consultant only ever sees their own entries.
export const toTimeEntryResponse = (entry: TimeEntry): TimeEntryResponse => ({
  id: entry.id,
  orderId: entry.orderId,
  workDate: entry.workDate,
  durationMinutes: entry.durationMinutes,
  description: entry.description,
})

// GET /api/orders/:id/budget – the id arrives as text in the URL.
export const orderIdParams = z.object({ id: z.coerce.number().int().positive() })

// Hours and person-days (1 PD = 8 h) for people, cents for money (ADR 0008). The UI formats cents as "1.234,56 €".
export type OrderBudgetResponse = {
  orderId: number
  code: string
  title: string
  budgetHours: number
  bookedHours: number
  remainingHours: number
  budgetPersonDays: number
  bookedPersonDays: number
  remainingPersonDays: number
  budgetCents: number
  bookedCents: number
  remainingCents: number
  usedPercent: number
  overBudget: boolean
}

const round2 = (n: number) => Math.round(n * 100) / 100
const hours = (minutes: number) => round2(minutes / 60)
const personDays = (minutes: number) => round2(minutes / 60 / 8)

export const toOrderBudgetResponse = (order: Order, budget: OrderBudget): OrderBudgetResponse => ({
  orderId: order.id,
  code: order.code,
  title: order.title,
  budgetHours: hours(budget.budgetMinutes),
  bookedHours: hours(budget.bookedMinutes),
  remainingHours: hours(budget.remainingMinutes),
  budgetPersonDays: personDays(budget.budgetMinutes),
  bookedPersonDays: personDays(budget.bookedMinutes),
  remainingPersonDays: personDays(budget.remainingMinutes),
  budgetCents: budget.budgetCents,
  bookedCents: budget.bookedCents,
  remainingCents: budget.remainingCents,
  usedPercent: budget.usedPercent,
  overBudget: budget.overBudget,
})
