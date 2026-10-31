// The shapes the API sends back. They mirror the response DTOs in apps/api/src/api/dto.ts –
// when a DTO changes there, change it here too.

export const ROLES = ["consultant", "project_manager", "admin"] as const
export type Role = (typeof ROLES)[number]

export type User = {
  id: number
  email: string
  name: string
  role: Role
  supplierId: number | null
}

export type Supplier = {
  id: number
  name: string
}

export type AuditOutcome = "success" | "rejected" | "denied" | "error"

export type AuditEvent = {
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

// Body of POST /api/users (createUserRequest)
export type CreateUserRequest = {
  name: string
  email: string
  role: Role
  supplierId: number | null
  password: string
}
