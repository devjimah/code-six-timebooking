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

/** Money budget of an order in cents (hours × rate). */
export function budgetCents(order: Order): number {
  return order.budgetHours * order.hourlyRateCents
}

