// Domain objects: the language of our business, independent of the database.
// No Drizzle imports here – if we swapped SQLite for Postgres, this file would not change.
// Note: User has no passwordHash; credentials stay inside the persistence/auth layer.

export type Role = "consultant" | "project_manager" | "admin"

export interface Supplier {
  id: number
  name: string
}

export interface User {
  id: number
  email: string
  name: string
  role: Role
  supplierId: number | null
}

export interface Order {
  id: number
  code: string
  title: string
  supplierId: number
  projectManagerId: number
  budgetHours: number
  hourlyRateCents: number
}

export interface TimeEntry {
  id: number
  userId: number
  orderId: number
  workDate: string // "YYYY-MM-DD"
  durationMinutes: number
  description: string
}

/** success = 2xx/3xx · rejected = other 4xx (invalid input, broken rule) · denied = 401/403 · error = 5xx */
export type AuditOutcome = "success" | "rejected" | "denied" | "error"

/** One recorded action in the audit log (ADR 0012). */
export interface AuditEvent {
  id: number
  occurredAt: string // ISO timestamp, UTC
  actorUserId: number | null
  actorRole: Role | null
  method: string
  route: string
  path: string
  statusCode: number
  outcome: AuditOutcome
  durationMs: number
}

export function auditOutcome(statusCode: number): AuditOutcome {
  if (statusCode === 401 || statusCode === 403) return "denied"
  if (statusCode >= 500) return "error"
  if (statusCode >= 400) return "rejected"
  return "success"
}

/** Money budget of an order in cents (hours × rate). */
export function budgetCents(order: Order): number {
  return order.budgetHours * order.hourlyRateCents
}

