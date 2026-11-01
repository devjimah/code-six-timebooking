// Repositories: the only place that runs database queries.
// Each one maps a database row (persistence entity) to a domain object.
import { and, asc, desc, eq, gte, inArray, lt, ne, notInArray, or, sql } from "drizzle-orm"
import { READ_METHODS } from "../domain/audit-retention.js"
import type { AuditDetails, AuditEvent, AuditOutcome, Order, Supplier, TimeEntry, User } from "../domain/models.js"
import type { Db } from "./db.js"
import { auditEvents, orders, suppliers, timeEntries, unavailableDays, users } from "./schema.js"

type NewOf<T> = Omit<T, "id">

const toUser = (r: typeof users.$inferSelect): User => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  supplierId: r.supplierId,
  deactivatedAt: r.deactivatedAt,
  mustChangePassword: r.mustChangePassword,
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
  startDate: r.startDate,
  endDate: r.endDate,
})
const toTimeEntry = (r: typeof timeEntries.$inferSelect): TimeEntry => ({
  id: r.id,
  userId: r.userId,
  orderId: r.orderId,
  workDate: r.workDate,
  startTime: r.startTime,
  endTime: r.endTime,
  breakMinutes: r.breakMinutes,
  durationMinutes: r.durationMinutes,
  description: r.description,
  status: r.status,
  returnReason: r.returnReason,
})

export function supplierRepository(db: Db) {
  return {
    async create(data: NewOf<Supplier>) {
      const [row] = await db.insert(suppliers).values(data).returning()
      return toSupplier(row!)
    },
    async findById(id: number) {
      const [row] = await db.select().from(suppliers).where(eq(suppliers.id, id))
      return row ? toSupplier(row) : null
    },
    /** Alphabetical, so pickers in the UI are easy to scan. */
    async findAll() {
      return (await db.select().from(suppliers).orderBy(asc(suppliers.name))).map(toSupplier)
    },
    async update(id: number, data: Partial<NewOf<Supplier>>) {
      const [row] = await db.update(suppliers).set(data).where(eq(suppliers.id, id)).returning()
      return toSupplier(row!)
    },
  }
}

export function userRepository(db: Db) {
  return {
    /** New accounts are always active. `mustChangePassword` is false unless given (the seeded demo users). */
    async create(
      data: Omit<NewOf<User>, "deactivatedAt" | "mustChangePassword"> & { passwordHash: string; mustChangePassword?: boolean },
    ) {
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
    // Only for sign-in and password changes: the hash and the session version stay next to the user,
    // never inside the domain object.
    async findCredentialsByEmail(email: string) {
      const [row] = await db.select().from(users).where(eq(users.email, email))
      return row ? { user: toUser(row), passwordHash: row.passwordHash, sessionVersion: row.sessionVersion } : null
    },
    async findCredentialsById(id: number) {
      const [row] = await db.select().from(users).where(eq(users.id, id))
      return row ? { user: toUser(row), passwordHash: row.passwordHash, sessionVersion: row.sessionVersion } : null
    },
    /** Stores a new password hash and ends all sessions issued before (step 5): the session version goes up. */
    async setPassword(id: number, data: { passwordHash: string; mustChangePassword: boolean }) {
      const [row] = await db
        .update(users)
        .set({ ...data, sessionVersion: sql`${users.sessionVersion} + 1` })
        .where(eq(users.id, id))
        .returning()
      return { user: toUser(row!), sessionVersion: row!.sessionVersion }
    },
    async findAll() {
      return (await db.select().from(users)).map(toUser)
    },
    async update(id: number, data: Partial<Omit<NewOf<User>, "mustChangePassword">>) {
      const [row] = await db.update(users).set(data).where(eq(users.id, id)).returning()
      return toUser(row!)
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
      return (await db.select().from(orders).orderBy(asc(orders.code))).map(toOrder)
    },
    async update(id: number, data: NewOf<Order>) {
      const [row] = await db.update(orders).set(data).where(eq(orders.id, id)).returning()
      return toOrder(row!)
    },
    /** Orders a consultant of this supplier may book on, with the supplier's name for display. */
    async findBySupplierWithName(supplierId: number) {
      const rows = await db
        .select({ order: orders, supplierName: suppliers.name })
        .from(orders)
        .innerJoin(suppliers, eq(orders.supplierId, suppliers.id))
        .where(eq(orders.supplierId, supplierId))
        .orderBy(asc(orders.code))
      return rows.map((r) => ({ order: toOrder(r.order), supplierName: r.supplierName }))
    },
    async findByProjectManager(projectManagerId: number) {
      const rows = await db
        .select()
        .from(orders)
        .where(eq(orders.projectManagerId, projectManagerId))
        .orderBy(asc(orders.code))
      return rows.map(toOrder)
    },
  }
}

export function timeEntryRepository(db: Db) {
  // The rule queries take exceptId: when a booking is corrected, its own old version must not count.
  const notThis = (exceptId?: number) => (exceptId === undefined ? undefined : ne(timeEntries.id, exceptId))
  return {
    /** New bookings are always open. */
    async create(data: Omit<NewOf<TimeEntry>, "status" | "returnReason">) {
      const [row] = await db.insert(timeEntries).values(data).returning()
      return toTimeEntry(row!)
    },
    async findById(id: number) {
      const [row] = await db.select().from(timeEntries).where(eq(timeEntries.id, id))
      return row ? toTimeEntry(row) : null
    },
    async update(id: number, data: Partial<NewOf<TimeEntry>>) {
      const [row] = await db.update(timeEntries).set(data).where(eq(timeEntries.id, id)).returning()
      return toTimeEntry(row!)
    },
    async delete(id: number) {
      await db.delete(timeEntries).where(eq(timeEntries.id, id))
    },
    async setReview(id: number, data: Pick<TimeEntry, "status" | "returnReason">) {
      const [row] = await db.update(timeEntries).set(data).where(eq(timeEntries.id, id)).returning()
      return toTimeEntry(row!)
    },
    /** Approves every open booking of the order in one statement. Returns how many. */
    async approveOpenOfOrder(orderId: number) {
      const result = await db
        .update(timeEntries)
        .set({ status: "approved" })
        .where(and(eq(timeEntries.orderId, orderId), eq(timeEntries.status, "open")))
      return result.rowsAffected
    },
    /** Newest work date first. */
    async findByUser(userId: number) {
      const rows = await db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.userId, userId))
        .orderBy(desc(timeEntries.workDate), desc(timeEntries.id))
      return rows.map(toTimeEntry)
    },
    /** For the role-change rule: does this person have any bookings? */
    async countByUser(userId: number) {
      const [row] = await db.select({ n: sql<number>`count(*)` }).from(timeEntries).where(eq(timeEntries.userId, userId))
      return Number(row?.n ?? 0)
    },
    /** For the 10-hour rule: everything this person booked on this date, on any order. */
    async sumMinutesForUserOnDate(userId: number, workDate: string, exceptId?: number) {
      const [row] = await db
        .select({ total: sql<number>`coalesce(sum(${timeEntries.durationMinutes}), 0)` })
        .from(timeEntries)
        .where(and(eq(timeEntries.userId, userId), eq(timeEntries.workDate, workDate), notThis(exceptId)))
      return Number(row?.total ?? 0)
    },
    /** For the overlap rule: this person's bookings on this date, on any order, with the order's code. */
    async slotsForUserOnDate(userId: number, workDate: string, exceptId?: number) {
      return db
        .select({ startTime: timeEntries.startTime, endTime: timeEntries.endTime, orderCode: orders.code })
        .from(timeEntries)
        .innerJoin(orders, eq(timeEntries.orderId, orders.id))
        .where(and(eq(timeEntries.userId, userId), eq(timeEntries.workDate, workDate), notThis(exceptId)))
    },
    /** For the rest-period rule: when this person's work started and ended on this date, on any order, or null. */
    async workingHoursForUserOnDate(userId: number, workDate: string, exceptId?: number) {
      // "HH:MM" strings sort like times, so min and max work on text.
      const [row] = await db
        .select({ first: sql<string | null>`min(${timeEntries.startTime})`, last: sql<string | null>`max(${timeEntries.endTime})` })
        .from(timeEntries)
        .where(and(eq(timeEntries.userId, userId), eq(timeEntries.workDate, workDate), notThis(exceptId)))
      return row?.first && row.last ? { firstStart: row.first, lastEnd: row.last } : null
    },
    /** First and last booked work date of an order, or null without bookings – for the period editing rule. */
    async bookedDateRange(orderId: number) {
      const [row] = await db
        .select({ first: sql<string | null>`min(${timeEntries.workDate})`, last: sql<string | null>`max(${timeEntries.workDate})` })
        .from(timeEntries)
        .where(eq(timeEntries.orderId, orderId))
      return row?.first && row.last ? { first: row.first, last: row.last } : null
    },
    /** For the budget rule: everything booked on this order, by anyone (ADR 0008: computed, not stored). */
    async sumMinutesForOrder(orderId: number, exceptId?: number) {
      const [row] = await db
        .select({ total: sql<number>`coalesce(sum(${timeEntries.durationMinutes}), 0)` })
        .from(timeEntries)
        .where(and(eq(timeEntries.orderId, orderId), notThis(exceptId)))
      return Number(row?.total ?? 0)
    },
    /** Booked minutes per order in one query, instead of one query per order. Orders without bookings are missing. */
    async sumMinutesPerOrder(orderIds: number[]) {
      if (orderIds.length === 0) return new Map<number, number>()
      const rows = await db
        .select({ orderId: timeEntries.orderId, total: sql<number>`sum(${timeEntries.durationMinutes})` })
        .from(timeEntries)
        .where(inArray(timeEntries.orderId, orderIds))
        .groupBy(timeEntries.orderId)
      return new Map(rows.map((r) => [r.orderId, Number(r.total)]))
    },
    /** Who booked on each order from this date on: the team the forecast and the project manager look at. */
    async consultantsPerOrderSince(orderIds: number[], fromDate: string) {
      const team = new Map<number, number[]>()
      if (orderIds.length === 0) return team
      const rows = await db
        .selectDistinct({ orderId: timeEntries.orderId, userId: timeEntries.userId })
        .from(timeEntries)
        .where(and(inArray(timeEntries.orderId, orderIds), gte(timeEntries.workDate, fromDate)))
      for (const r of rows) team.set(r.orderId, [...(team.get(r.orderId) ?? []), r.userId])
      return team
    },
    /** Minutes booked from this date on, per order, for the forecast's pace. Orders without bookings are missing. */
    async minutesPerOrderSince(orderIds: number[], fromDate: string) {
      if (orderIds.length === 0) return new Map<number, number>()
      const rows = await db
        .select({ orderId: timeEntries.orderId, total: sql<number>`sum(${timeEntries.durationMinutes})` })
        .from(timeEntries)
        .where(and(inArray(timeEntries.orderId, orderIds), gte(timeEntries.workDate, fromDate)))
        .groupBy(timeEntries.orderId)
      return new Map(rows.map((r) => [r.orderId, Number(r.total)]))
    },
    /** Approved minutes per order, for purchasing's overview. Orders without approved bookings are missing. */
    async approvedMinutesPerOrder(orderIds: number[]) {
      if (orderIds.length === 0) return new Map<number, number>()
      const rows = await db
        .select({ orderId: timeEntries.orderId, total: sql<number>`sum(${timeEntries.durationMinutes})` })
        .from(timeEntries)
        .where(and(inArray(timeEntries.orderId, orderIds), eq(timeEntries.status, "approved")))
        .groupBy(timeEntries.orderId)
      return new Map(rows.map((r) => [r.orderId, Number(r.total)]))
    },
    /** Bookings of one order with the consultant's name, newest work date first. No email, no user id. */
    async findByOrderWithConsultantName(orderId: number) {
      const rows = await db
        .select({
          id: timeEntries.id,
          workDate: timeEntries.workDate,
          durationMinutes: timeEntries.durationMinutes,
          description: timeEntries.description,
          status: timeEntries.status,
          returnReason: timeEntries.returnReason,
          consultantName: users.name,
        })
        .from(timeEntries)
        .innerJoin(users, eq(timeEntries.userId, users.id))
        .where(eq(timeEntries.orderId, orderId))
        .orderBy(desc(timeEntries.workDate), desc(timeEntries.id))
      return rows
    },
  }
}

export function unavailableDayRepository(db: Db) {
  return {
    /** Marking a day twice changes nothing. */
    async mark(userId: number, date: string) {
      await db.insert(unavailableDays).values({ userId, date }).onConflictDoNothing()
    },
    async remove(userId: number, date: string) {
      await db.delete(unavailableDays).where(and(eq(unavailableDays.userId, userId), eq(unavailableDays.date, date)))
    },
    async isMarked(userId: number, date: string) {
      const [row] = await db
        .select({ id: unavailableDays.id })
        .from(unavailableDays)
        .where(and(eq(unavailableDays.userId, userId), eq(unavailableDays.date, date)))
      return row !== undefined
    },
    async findByUser(userId: number) {
      return db
        .select({ date: unavailableDays.date })
        .from(unavailableDays)
        .where(eq(unavailableDays.userId, userId))
        .orderBy(asc(unavailableDays.date))
    },
    /** For the project manager: the date and the name, nothing else. */
    async findForUsersFrom(userIds: number[], fromDate: string) {
      if (userIds.length === 0) return []
      return db
        .select({ date: unavailableDays.date, consultantName: users.name })
        .from(unavailableDays)
        .innerJoin(users, eq(unavailableDays.userId, users.id))
        .where(and(inArray(unavailableDays.userId, userIds), gte(unavailableDays.date, fromDate)))
        .orderBy(asc(unavailableDays.date), asc(users.name))
    },
    /** For the forecast: date → who is away. */
    async findUserIdsPerDateFrom(userIds: number[], fromDate: string) {
      const away = new Map<string, Set<number>>()
      if (userIds.length === 0) return away
      const rows = await db
        .select({ date: unavailableDays.date, userId: unavailableDays.userId })
        .from(unavailableDays)
        .where(and(inArray(unavailableDays.userId, userIds), gte(unavailableDays.date, fromDate)))
      for (const r of rows) away.set(r.date, (away.get(r.date) ?? new Set()).add(r.userId))
      return away
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
  action: r.action,
  targetType: r.targetType,
  targetId: r.targetId,
  errorCode: r.errorCode,
  details: r.details === null ? null : (JSON.parse(r.details) as AuditDetails),
  ipAddress: r.ipAddress,
  userAgent: r.userAgent,
})

// Append-only on purpose (ADR 0012): no update, and the only delete is the retention clean-up (audit/retention.ts).
export function auditEventRepository(db: Db) {
  return {
    async record({ details, ...data }: NewOf<AuditEvent>) {
      await db.insert(auditEvents).values({ ...data, details: details === null ? null : JSON.stringify(details) })
    },
    /** Newest first. Every filter is optional. */
    async findLatest({ limit, actorUserId, outcome, action }: AuditEventFilter) {
      const conditions = [
        actorUserId === undefined ? undefined : eq(auditEvents.actorUserId, actorUserId),
        outcome === undefined ? undefined : eq(auditEvents.outcome, outcome),
        action === undefined ? undefined : eq(auditEvents.action, action),
      ]
      const rows = await db
        .select()
        .from(auditEvents)
        .where(and(...conditions))
        .orderBy(desc(auditEvents.id))
        .limit(limit)
      return rows.map(toAuditEvent)
    },
    /** Retention: read events (GET, HEAD) before readBefore, all others before changeBefore. Returns the number deleted. */
    async deleteExpired({ readBefore, changeBefore }: { readBefore: string; changeBefore: string }) {
      const result = await db
        .delete(auditEvents)
        .where(
          or(
            and(inArray(auditEvents.method, READ_METHODS), lt(auditEvents.occurredAt, readBefore)),
            and(notInArray(auditEvents.method, READ_METHODS), lt(auditEvents.occurredAt, changeBefore)),
          ),
        )
      return result.rowsAffected
    },
  }
}

export type AuditEventFilter = { limit: number; actorUserId?: number; outcome?: AuditOutcome; action?: string }
