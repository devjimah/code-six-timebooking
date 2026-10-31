// API DTOs: what goes over the wire. Requests are validated with zod (ADR 0007);
// responses are built from domain objects, so internal fields never leak by accident.
import { z } from "zod"
import type { AuditEvent, User } from "../domain/models.js"

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
