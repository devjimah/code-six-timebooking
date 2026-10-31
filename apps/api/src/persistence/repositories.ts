// Repositories: the only place that runs database queries.
// Each one maps a database row (persistence entity) to a domain object.
import { desc, eq } from "drizzle-orm"
import type { AuditEvent, Order, Supplier, TimeEntry, User } from "../domain/models.js"
import type { Db } from "./db.js"
import { auditEvents, orders, suppliers, timeEntries, users } from "./schema.js"

type NewOf<T> = Omit<T, "id">

const toUser = (r: typeof users.$inferSelect): User => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  supplierId: r.supplierId,
})
const toSupplier = (r: typeof suppliers.$inferSelect): Supplier => ({ id: r.id, name: r.name })
const toOrder = (r: typeof orders.$inferSelect): Order => ({
  id: r.id,
  code: r.code,
  title: r.title,
  supplierId: r.supplierId,
  projectManagerId: r.projectManagerId,
  budgetHours: r.budgetHours,
  hourlyRateCents: r.hourlyRateCents,
})
const toTimeEntry = (r: typeof timeEntries.$inferSelect): TimeEntry => ({
  id: r.id,
  userId: r.userId,
  orderId: r.orderId,
  workDate: r.workDate,
  durationMinutes: r.durationMinutes,
  description: r.description,
})

export function supplierRepository(db: Db) {
  return {
    async create(data: NewOf<Supplier>) {
      const [row] = await db.insert(suppliers).values(data).returning()
      return toSupplier(row!)
    },
    async findAll() {
      return (await db.select().from(suppliers)).map(toSupplier)
    },
  }
}

export function userRepository(db: Db) {
  return {
    async create(data: NewOf<User> & { passwordHash: string }) {
      const [row] = await db.insert(users).values(data).returning()
      return toUser(row!)
    },
    async findById(id: number) {
      const [row] = await db.select().from(users).where(eq(users.id, id))
      return row ? toUser(row) : null
    },
    async findByEmail(email: string) {
      const [row] = await db.select().from(users).where(eq(users.email, email))
      return row ? toUser(row) : null
    },
    // Only for sign-in: the hash stays next to the user, never inside the domain object.
    async findCredentialsByEmail(email: string) {
      const [row] = await db.select().from(users).where(eq(users.email, email))
      return row ? { user: toUser(row), passwordHash: row.passwordHash } : null
    },
    async findAll() {
      return (await db.select().from(users)).map(toUser)
    },
  }
}

export function orderRepository(db: Db) {
  return {
    async create(data: NewOf<Order>) {
      const [row] = await db.insert(orders).values(data).returning()
      return toOrder(row!)
    },
    async findById(id: number) {
      const [row] = await db.select().from(orders).where(eq(orders.id, id))
      return row ? toOrder(row) : null
    },
    async findAll() {
      return (await db.select().from(orders)).map(toOrder)
    },
  }
}

export function timeEntryRepository(db: Db) {
  return {
    async create(data: NewOf<TimeEntry>) {
      const [row] = await db.insert(timeEntries).values(data).returning()
      return toTimeEntry(row!)
    },
    async findByUser(userId: number) {
      return (await db.select().from(timeEntries).where(eq(timeEntries.userId, userId))).map(toTimeEntry)
    },
    async findByOrder(orderId: number) {
      return (await db.select().from(timeEntries).where(eq(timeEntries.orderId, orderId))).map(toTimeEntry)
    },
  }
}

const toAuditEvent = (r: typeof auditEvents.$inferSelect): AuditEvent => ({
  id: r.id,
  occurredAt: r.occurredAt,
  actorUserId: r.actorUserId,
  actorRole: r.actorRole as AuditEvent["actorRole"],
  method: r.method,
  route: r.route,
  path: r.path,
  statusCode: r.statusCode,
  outcome: r.outcome,
  durationMs: r.durationMs,
})

// Append-only on purpose (ADR 0012): there is no update or delete here.
export function auditEventRepository(db: Db) {
  return {
    async record(data: NewOf<AuditEvent>) {
      await db.insert(auditEvents).values(data)
    },
    /** Newest first. */
    async findLatest({ limit, actorUserId }: { limit: number; actorUserId?: number }) {
      const rows = await db
        .select()
        .from(auditEvents)
        .where(actorUserId === undefined ? undefined : eq(auditEvents.actorUserId, actorUserId))
        .orderBy(desc(auditEvents.id))
        .limit(limit)
      return rows.map(toAuditEvent)
    },
  }
}
