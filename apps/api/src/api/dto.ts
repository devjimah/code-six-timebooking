// API DTOs: what goes over the wire. Requests are validated with zod (ADR 0007);
// responses are built from domain objects, so internal fields never leak by accident.
import { z } from "zod"
import type { AuditEvent, TimeEntry, User } from "../domain/models.js"

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
