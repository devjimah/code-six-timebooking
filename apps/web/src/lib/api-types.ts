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
  deactivatedAt: string | null // ISO timestamp; null = active
  mustChangePassword: boolean // an admin chose the password; the person must replace it first (step 5)
}

export type Supplier = {
  id: number
  name: string
}

// GET /api/orders/bookable (bookableOrderResponse): an order a consultant may book on – no money
export type BookableOrder = {
  id: number
  code: string
  title: string
  supplierName: string
  startDate: string // "YYYY-MM-DD"
  endDate: string
}

// GET /api/unavailable-days/mine (ADR 0016). No reason, on purpose.
export type UnavailableDay = { date: string } // "YYYY-MM-DD"
// GET /api/orders/:id/unavailable-days
export type OrderUnavailableDay = UnavailableDay & { consultantName: string }

// Check and approve (ADR 0014)
export type BookingStatus = "open" | "approved" | "returned"

// GET /api/time-entries/mine and POST /api/time-entries (timeEntryResponse): the consultant's own booking.
// Start, end and break are only ever sent to the consultant (ADR 0010).
export type TimeEntry = {
  id: number
  orderId: number
  workDate: string // "YYYY-MM-DD"
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
  breakMinutes: number
  durationMinutes: number // end − start − break, derived by the server
  description: string
  status: BookingStatus
  returnReason: string | null
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
// How long the budget lasts at the current pace (budgetForecastResponse, ADR 0015)
export type BudgetForecast = {
  state: "no_pace" | "ended" | "lasts" | "runs_out_early"
  paceHoursPerWeek: number
  runsOutOn: string | null // "YYYY-MM-DD"
  missingHours: number
  missingPersonDays: number
  orderMoreBy: string | null // may already lie in the past
  leadTimeWeeks: number
  orderEndDate: string
}

export type OrderOverview = {
  forecast: BudgetForecast
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
  approvedHours?: number // only in GET /api/orders (purchasing)
  notApprovedHours?: number
  remainingHours: number // negative when over budget
  budgetCents: number
  bookedCents: number
  remainingCents: number
  usedPercent: number
  overBudget: boolean
}

// GET /api/orders/managed and /api/orders/:id/budget (orderBudgetResponse): the project manager's view
export type OrderBudget = Pick<
  OrderOverview,
  | "orderId" | "code" | "title" | "budgetHours" | "bookedHours" | "remainingHours"
  | "budgetCents" | "bookedCents" | "remainingCents" | "usedPercent" | "overBudget"
>

// GET /api/orders/:id/budget (orderBudgetDetailResponse): one order, with its forecast
export type OrderBudgetDetail = OrderBudget & { forecast: BudgetForecast }

// GET /api/orders/:id/time-entries: one booking, with the consultant's name only
export type OrderBooking = {
  id: number
  workDate: string // "YYYY-MM-DD"
  durationMinutes: number
  description: string
  status: BookingStatus
  returnReason: string | null
  consultantName: string
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
