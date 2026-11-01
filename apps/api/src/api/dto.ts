// API DTOs: what goes over the wire. Requests are validated with zod (ADR 0007);
// responses are built from domain objects, so internal fields never leak by accident.
// Response shapes are zod schemas too: the TypeScript types and the OpenAPI docs (openapi.ts, ADR 0009) come from them.
import { z } from "zod"
import type { OrderBudget } from "../domain/budget.js"
import type { AuditEvent, Order, Supplier, TimeEntry, User } from "../domain/models.js"

const ROLES = ["consultant", "project_manager", "purchasing", "admin"] as const

// Every error response (401, 403, 404, 422 …) has this shape (ADR 0005). The UI translates `code`.
export const errorResponse = z.object({
  code: z.string().meta({ example: "DAILY_LIMIT_EXCEEDED" }),
  message: z.string(),
})

// Emails are compared in lower case, so "Carl@Acme.de" and "carl@acme.de" are the same account.
export const loginRequest = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1),
})
export type LoginRequest = z.infer<typeof loginRequest>

export const userResponse = z.object({
  id: z.number().int(),
  email: z.string(),
  name: z.string(),
  role: z.enum(ROLES),
  supplierId: z.number().int().nullable(),
  deactivatedAt: z.string().nullable().meta({ description: "ISO timestamp; null = active" }),
  mustChangePassword: z.boolean().meta({ description: "An admin chose the password; the person must replace it first" }),
})
export type UserResponse = z.infer<typeof userResponse>

export const toUserResponse = (user: User): UserResponse => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  supplierId: user.supplierId,
  deactivatedAt: user.deactivatedAt,
  mustChangePassword: user.mustChangePassword,
})

// One password policy for new accounts, resets and changes.
// bcrypt only uses the first 72 bytes, so longer passwords would give a false sense of security.
const password = z.string().min(10).max(72)

// POST /api/users – admin only (ADR 0004).
export const createUserRequest = z.object({
  email: z.email().toLowerCase(),
  name: z.string().trim().min(2).max(100),
  role: z.enum(ROLES),
  // Required for consultants, empty for everyone else – a business rule (domain/rules/account.ts), not a format check.
  supplierId: z.number().int().positive().nullable().default(null),
  password: password.meta({ description: "Initial password; the admin hands it to the person" }),
})

// PUT /api/users/:id – admin only. Same fields as creating an account, without the password.
export const updateUserRequest = createUserRequest.omit({ password: true })
export const userIdParams = z.object({ id: z.coerce.number().int().positive() })

// POST /api/users/:id/password – admin only (step 5). The person must replace it at the next sign-in.
export const resetPasswordRequest = z.object({
  password: password.meta({ description: "New password; the admin hands it to the person" }),
})

// POST /api/auth/password – every signed-in person, for their own account.
export const changePasswordRequest = z.object({
  currentPassword: z.string().min(1),
  newPassword: password,
})

export const supplierResponse = z.object({ id: z.number().int(), name: z.string() })

// POST /api/suppliers and PATCH /api/suppliers/:id – purchasing only. Uniqueness is a domain rule (supplier-name.ts).
export const supplierRequest = z.object({
  name: z.string().trim().min(2).max(100).meta({ example: "Acme Consulting GmbH" }),
})
export const supplierIdParams = z.object({ id: z.coerce.number().int().positive() })
export type SupplierResponse = z.infer<typeof supplierResponse>

export const toSupplierResponse = (supplier: Supplier): SupplierResponse => ({ id: supplier.id, name: supplier.name })

// GET /api/audit-events?limit=100&userId=3 – query values arrive as strings, so coerce them.
export const auditEventsQuery = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  userId: z.coerce.number().int().positive().optional(),
  outcome: z.enum(["success", "rejected", "denied", "error"]).optional(),
  action: z.string().max(64).optional().meta({ example: "time_entry.create" }),
})

export const auditEventResponse = z.object({
  id: z.number().int(),
  occurredAt: z.string().meta({ description: "ISO timestamp, UTC" }),
  actorUserId: z.number().int().nullable(),
  actorRole: z.enum(ROLES).nullable(),
  method: z.string(),
  route: z.string().meta({ example: "/api/orders/:id/budget" }),
  path: z.string(),
  statusCode: z.number().int(),
  outcome: z.enum(["success", "rejected", "denied", "error"]),
  durationMs: z.number(),
  action: z.string().nullable().meta({ example: "time_entry.create", description: "Null on events recorded before actions existed" }),
  targetType: z.string().nullable().meta({ example: "order" }),
  targetId: z.number().int().nullable(),
  errorCode: z.string().nullable().meta({ example: "DAILY_LIMIT_EXCEEDED" }),
  details: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .nullable()
    .meta({ description: "Key facts of the action; never passwords or free text" }),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
})
export type AuditEventResponse = z.infer<typeof auditEventResponse>

export const toAuditEventResponse = (event: AuditEvent): AuditEventResponse => ({ ...event })

// POST /api/time-entries
export const createTimeEntryRequest = z.object({
  orderId: z.number().int().positive(),
  workDate: z.iso.date(), // "YYYY-MM-DD"
  // Only the types are checked here. Valid times and breaks are a business rule (domain/rules/working-times.ts),
  // which also derives the duration (ADR 0010).
  startTime: z.string().meta({ example: "09:00" }),
  endTime: z.string().meta({ example: "12:30" }),
  breakMinutes: z.number().default(0),
  description: z.string().trim().min(10).max(500),
})
export type CreateTimeEntryRequest = z.infer<typeof createTimeEntryRequest>

// Only ever sent to the consultant who booked it – the times are theirs alone (ADR 0010).
export const timeEntryResponse = z.object({
  id: z.number().int(),
  orderId: z.number().int(),
  workDate: z.string().meta({ example: "2026-10-27" }),
  startTime: z.string().meta({ example: "09:00" }),
  endTime: z.string().meta({ example: "12:30" }),
  breakMinutes: z.number().int(),
  durationMinutes: z.number().int(),
  description: z.string(),
})
export type TimeEntryResponse = z.infer<typeof timeEntryResponse>

// userId is left out: the consultant only ever sees their own entries.
export const toTimeEntryResponse = (entry: TimeEntry): TimeEntryResponse => ({
  id: entry.id,
  orderId: entry.orderId,
  workDate: entry.workDate,
  startTime: entry.startTime,
  endTime: entry.endTime,
  breakMinutes: entry.breakMinutes,
  durationMinutes: entry.durationMinutes,
  description: entry.description,
})

// GET /api/orders/bookable – what a consultant needs to pick an order. No rate and no money:
// prices are agreed between the client and the supplier's management, not shown to every consultant.
// The period is included so the booking form can offer only dates the server will accept.
export const bookableOrderResponse = z.object({
  id: z.number().int(),
  code: z.string().meta({ example: "PO-2026-001" }),
  title: z.string(),
  supplierName: z.string(),
  startDate: z.string().meta({ example: "2026-07-01" }),
  endDate: z.string().meta({ example: "2027-01-31" }),
})
export type BookableOrderResponse = z.infer<typeof bookableOrderResponse>

export const toBookableOrderResponse = (order: Order, supplierName: string): BookableOrderResponse => ({
  id: order.id,
  code: order.code,
  title: order.title,
  supplierName,
  startDate: order.startDate,
  endDate: order.endDate,
})

// GET /api/public-holidays?year=2026 – for the booking calendar
export const publicHolidaysQuery = z.object({ year: z.coerce.number().int().min(2000).max(2100) })
export const publicHolidayResponse = z.object({
  date: z.string().meta({ example: "2026-10-03" }),
  name: z.string().meta({ example: "Day of German Unity" }),
})

// POST /api/orders and PUT /api/orders/:id – purchasing only. Format checks here; business rules in the domain.
export const orderRequest = z.object({
  code: z.string().trim().min(3).max(40).meta({ example: "PO-2026-004" }),
  title: z.string().trim().min(3).max(200).meta({ example: "Data warehouse reporting" }),
  supplierId: z.number().int().positive(),
  projectManagerId: z.number().int().positive(),
  budgetHours: z.number().int().min(1).max(100_000).meta({ description: "Ordered hours; 1 person-day = 8 h" }),
  hourlyRateCents: z.number().int().min(1).max(10_000_00).meta({ description: "Euro cents: 9500 = 95,00 € per hour" }),
  startDate: z.iso.date().meta({ example: "2026-11-01" }),
  endDate: z.iso.date().meta({ example: "2027-03-31" }),
})
export type OrderRequest = z.infer<typeof orderRequest>

export const orderResponse = z.object({
  id: z.number().int(),
  code: z.string(),
  title: z.string(),
  supplierId: z.number().int(),
  projectManagerId: z.number().int(),
  budgetHours: z.number().int(),
  hourlyRateCents: z.number().int(),
  startDate: z.string(),
  endDate: z.string(),
})
export const toOrderResponse = (order: Order): z.infer<typeof orderResponse> => ({ ...order })

// GET /api/orders/:id/time-entries – the project manager checks the work on their order.
// The consultant's name, but not their email or user id; no totals per person (docs/roles-and-privacy.md).
// The duration only – start, end and break are the consultant's alone (ADR 0010).
export const orderBookingResponse = z.object({
  id: z.number().int(),
  workDate: z.string().meta({ example: "2026-10-27" }),
  durationMinutes: z.number().int(),
  description: z.string(),
  consultantName: z.string(),
})

// GET /api/project-managers – what purchasing needs to pick the person responsible: no email, no role details.
export const projectManagerResponse = z.object({ id: z.number().int(), name: z.string() })

// GET /api/orders/:id/budget – the id arrives as text in the URL.
export const orderIdParams = z.object({ id: z.coerce.number().int().positive() })

// Hours and person-days (1 PD = 8 h) for people, cents for money (ADR 0008). The UI formats cents as "1.234,56 €".
export const orderBudgetResponse = z.object({
  orderId: z.number().int(),
  code: z.string(),
  title: z.string(),
  budgetHours: z.number(),
  bookedHours: z.number(),
  remainingHours: z.number().meta({ description: "Negative when the order is over budget" }),
  budgetPersonDays: z.number(),
  bookedPersonDays: z.number(),
  remainingPersonDays: z.number(),
  budgetCents: z.number().int().meta({ description: "Euro cents: 1140000 = 11.400,00 €" }),
  bookedCents: z.number().int(),
  remainingCents: z.number().int(),
  usedPercent: z.number(),
  overBudget: z.boolean(),
})
export type OrderBudgetResponse = z.infer<typeof orderBudgetResponse>

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

// GET /api/orders – purchasing's overview: every order with supplier, project manager, period and budget.
export const orderOverviewResponse = orderBudgetResponse.extend({
  supplierId: z.number().int(),
  supplierName: z.string(),
  projectManagerId: z.number().int(),
  projectManagerName: z.string(),
  hourlyRateCents: z.number().int(),
  startDate: z.string(),
  endDate: z.string(),
})

export const toOrderOverviewResponse = (row: {
  order: Order
  budget: OrderBudget
  supplierName: string
  projectManagerName: string
}): z.infer<typeof orderOverviewResponse> => ({
  ...toOrderBudgetResponse(row.order, row.budget),
  supplierId: row.order.supplierId,
  supplierName: row.supplierName,
  projectManagerId: row.order.projectManagerId,
  projectManagerName: row.projectManagerName,
  hourlyRateCents: row.order.hourlyRateCents,
  startDate: row.order.startDate,
  endDate: row.order.endDate,
})
