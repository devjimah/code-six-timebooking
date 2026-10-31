// Persistence entities = the shape of our database tables (Drizzle ORM).
// These are NOT domain objects: the rest of the app should talk to repositories,
// which map these rows to domain types in src/domain/.
import { sql } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

// Roles are a fixed list, so we store them as text with a CHECK-like enum
// instead of a separate table. Working names – rename once product-vision.md is done.
export const ROLES = ["consultant", "project_manager", "admin"] as const

const timestamps = {
  createdAt: text("created_at")
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`),
}

// A service provider company that employs consultants.
export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  ...timestamps,
})

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ROLES }).notNull(),
  // Only consultants belong to a supplier; null for client-side roles.
  supplierId: integer("supplier_id").references(() => suppliers.id),
  ...timestamps,
})

// A client order placed with one supplier, with a budget.
export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  supplierId: integer("supplier_id")
    .notNull()
    .references(() => suppliers.id),
  // Client-side project manager responsible for this order.
  projectManagerId: integer("project_manager_id")
    .notNull()
    .references(() => users.id),
  budgetHours: integer("budget_hours").notNull(),
  // Money budget = budgetHours * hourlyRateCents. Cents avoid float rounding.
  hourlyRateCents: integer("hourly_rate_cents").notNull(),
  ...timestamps,
})

// Audit log (ADR 0012): one row per API request. Append-only: the application never updates or deletes rows.
// No request bodies, passwords or cookies are stored here.
export const AUDIT_OUTCOMES = ["success", "rejected", "denied", "error"] as const

export const auditEvents = sqliteTable("audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  occurredAt: text("occurred_at").notNull(), // ISO timestamp, UTC
  // Null when nobody is signed in (e.g. a failed sign-in). No foreign key on purpose:
  // the audit trail must outlive a deleted user account.
  actorUserId: integer("actor_user_id"),
  actorRole: text("actor_role"),
  method: text("method").notNull(), // GET, POST, …
  route: text("route").notNull(), // pattern, e.g. "/api/orders/:id/budget"
  path: text("path").notNull(), // concrete path, e.g. "/api/orders/7/budget" (no query string)
  statusCode: integer("status_code").notNull(),
  outcome: text("outcome", { enum: AUDIT_OUTCOMES }).notNull(),
  durationMs: integer("duration_ms").notNull(),
})

// One booking: exactly one user, one order, a date, a duration and a description.
export const timeEntries = sqliteTable("time_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  workDate: text("work_date").notNull(), // ISO date "YYYY-MM-DD"
  durationMinutes: integer("duration_minutes").notNull(),
  description: text("description").notNull(),
  ...timestamps,
})

