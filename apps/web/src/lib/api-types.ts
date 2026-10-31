// The shapes the API sends back. They mirror the response DTOs in apps/api/src/api/dto.ts –
// when a DTO changes there, change it here too.

export const ROLES = ["consultant", "project_manager", "purchasing", "admin"] as const
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

export const AUDIT_OUTCOMES = ["success", "rejected", "denied", "error"] as const
export type AuditOutcome = (typeof AUDIT_OUTCOMES)[number]

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
  action: string | null // e.g. "time_entry.create"; null on events recorded before actions existed
  targetType: string | null // e.g. "order"
  targetId: number | null
  errorCode: string | null // e.g. "DAILY_LIMIT_EXCEEDED"
  details: Record<string, string | number | boolean | null> | null
  ipAddress: string | null
  userAgent: string | null
}

// GET /api/orders (orderOverviewResponse): one order with its budget, for purchasing
export type OrderOverview = {
  orderId: number
  code: string
  title: string
  supplierId: number
  supplierName: string
  projectManagerId: number
  projectManagerName: string
  hourlyRateCents: number
  startDate: string // "YYYY-MM-DD"
  endDate: string
  budgetHours: number
  bookedHours: number
  remainingHours: number // negative when over budget
  budgetCents: number
  bookedCents: number
  remainingCents: number
  usedPercent: number
  overBudget: boolean
}

// Body of POST /api/orders and PUT /api/orders/:id (orderRequest)
export type OrderRequest = {
  code: string
  title: string
  supplierId: number
  projectManagerId: number
  budgetHours: number
  hourlyRateCents: number
  startDate: string
  endDate: string
}

// GET /api/project-managers: names only
export type ProjectManager = { id: number; name: string }

// Body of POST /api/users (createUserRequest)
export type CreateUserRequest = {
  name: string
  email: string
  role: Role
  supplierId: number | null
  password: string
}
