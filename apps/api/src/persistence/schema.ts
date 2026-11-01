// Persistence entities = the shape of our database tables (Drizzle ORM).
// These are NOT domain objects: the rest of the app should talk to repositories,
// which map these rows to domain types in src/domain/.
import { sql } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

// Roles are a fixed list, so we store them as text with a CHECK-like enum
// instead of a separate table. Who may do what: docs/roles-and-privacy.md.
export const ROLES = ["consultant", "project_manager", "purchasing", "admin"] as const

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
  // Set when an admin deactivates the account (step 4). The person can no longer sign in; their bookings stay.
  deactivatedAt: text("deactivated_at"),
  // Step 5: a password chosen by an admin (new account or reset) must be replaced by the person at the next sign-in.
  mustChangePassword: integer("must_change_password", { mode: "boolean" }).notNull().default(false),
  // Goes up with every password change. A session cookie carries the version it was issued with; an older
  // version is not accepted any more, so a reset signs the person out of every browser at once.
  sessionVersion: integer("session_version").notNull().default(0),
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
  // Period of the order, ISO dates. Bookings outside it are rejected (rules/order-period.ts).
  // Migration 0003 gave orders that existed before it the whole year 2026 – only demo data existed then.
  startDate: text("start_date").notNull().default("2026-01-01"),
  endDate: text("end_date").notNull().default("2026-12-31"),
  ...timestamps,
})

// Audit log (ADR 0012): one row per API request. Append-only: the application never updates or deletes rows.
// No request bodies, passwords, cookies or free-text descriptions are stored here – only allow-listed key facts.
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
  // What the request meant (migration 0002). Null on events recorded before that.
  action: text("action"), // e.g. "time_entry.create", see ACTIONS in audit/audit-log.ts
  targetType: text("target_type"), // what the action was about, e.g. "order" or "user"
  targetId: integer("target_id"),
  errorCode: text("error_code"), // why it was refused, e.g. "DAILY_LIMIT_EXCEEDED"
  details: text("details"), // JSON of key facts set by the route, e.g. {"workDate":"2026-10-27","durationMinutes":180}
  ipAddress: text("ip_address"), // personal data: covered by the retention period in ADR 0012
  userAgent: text("user_agent"),
})

// Check and approve (ADR 0014): new bookings are open; the project manager approves or returns them.
export const BOOKING_STATUSES = ["open", "approved", "returned"] as const

// One booking: exactly one user, one order, a date, start and end time, a duration and a description.
export const timeEntries = sqliteTable("time_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id),
  workDate: text("work_date").notNull(), // ISO date "YYYY-MM-DD"
  // Times on the work date, company time zone, "HH:MM". Only the consultant sees them (ADR 0010).
  startTime: text("start_time").notNull(),
  endTime: text("end_time").notNull(),
  breakMinutes: integer("break_minutes").notNull(),
  // Derived: end − start − break. Stored so budget and daily sums stay simple SQL sums.
  durationMinutes: integer("duration_minutes").notNull(),
  description: text("description").notNull(),
  status: text("status", { enum: BOOKING_STATUSES }).notNull().default("open"),
  // Why the project manager returned it; null otherwise. Shown to the consultant, never logged (free text).
  returnReason: text("return_reason"),
  ...timestamps,
})

