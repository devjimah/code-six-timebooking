// The shapes the API sends back. They mirror the response DTOs in apps/api/src/api/dto.ts –
// when a DTO changes there, change it here too.

export const ROLES = ["consultant", "project_manager", "purchasing", "admin", "supplier_manager"] as const
export type Role = (typeof ROLES)[number]

// The 16 German states; public holidays differ between them (ADR 0019).
export const GERMAN_STATES = ["BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV", "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH"] as const
export type GermanState = (typeof GERMAN_STATES)[number]

export type User = {
  id: number
  email: string
  name: string
  role: Role
  supplierId: number | null
  workState: GermanState | null
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

// POST /api/time-entries/copy-last-week
export type CopyLastWeekResult = {
  created: TimeEntry[]
  refused: { workDate: string; code: string; message: string }[]
  notYet: number
}

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
  state: "no_pace" | "ended" | "closed" | "lasts" | "runs_out_early"
  paceHoursPerWeek: number
  pacePersonDaysPerWeek: number
  runsOutOn: string | null // "YYYY-MM-DD"
  missingHours: number
  missingPersonDays: number
  orderMoreBy: string | null // may already lie in the past
  leadTimeWeeks: number
  orderEndDate: string
}

// GET /api/framework-agreements (ADR 0020)
export type FrameworkAgreement = {
  id: number
  code: string
  title: string
  supplierId: number
  supplierName: string
  totalBudgetCents: number
  startDate: string
  endDate: string
  orderCount: number
  orderedCents: number
  bookedCents: number
  freeCents: number
}

// GET /api/suppliers/overview: sums per supplier
export type SupplierOverview = {
  supplierId: number
  name: string
  orderCount: number
  budgetCents: number
  bookedCents: number
  sharePercent: number
}

export type OrderOverview = {
  frameworkAgreementId: number | null
  accountingObject: string | null
  closedAt: string | null // ISO timestamp when purchasing closed it; null = open
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
  budgetPersonDays: number
  bookedPersonDays: number
  remainingPersonDays: number
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
  | "budgetPersonDays" | "bookedPersonDays" | "remainingPersonDays" | "closedAt"
  | "budgetCents" | "bookedCents" | "remainingCents" | "usedPercent" | "overBudget"
>

// GET /api/orders/:id/budget (orderBudgetDetailResponse): one order, with its forecast
export type OrderBudgetDetail = OrderBudget & { accountingObject: string | null; forecast: BudgetForecast }

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
  accountingObject: string | null
  frameworkAgreementId: number | null
}

// GET /api/orders/:id/proof-of-work (ADR 0018)
export type ProofOfWork = {
  orderId: number
  code: string
  title: string
  accountingObject: string | null
  month: string
  approvedHours: number
  openHours: number
  returnedHours: number
  approvedCents: number
  bookings: OrderBooking[]
}

// GET /api/orders/:id/invoice-check (ADR 0018): sums only
export type InvoiceCheck = {
  orderId: number
  code: string
  month: string
  approvedHours: number
  notApprovedHours: number
  approvedCents: number
  invoicedCents: number
  differenceCents: number
  result: "matches" | "invoice_higher" | "invoice_lower"
}

// GET /api/supplier/bookings (ADR 0021)
export type SupplierBooking = {
  id: number
  userId: number
  consultantName: string
  orderCode: string
  workDate: string
  startTime: string
  endTime: string
  breakMinutes: number
  durationMinutes: number
  description: string
  status: BookingStatus
}

// GET /api/notifications: computed each time, never stored
export type Notification =
  | { type: "booking_returned"; timeEntryId: number; workDate: string; reason: string | null }
  | { type: "bookings_to_check"; orderId: number; code: string; count: number }
  | { type: "budget_runs_out"; orderId: number; code: string; runsOutOn: string }
  | { type: "order_more"; orderId: number; code: string; runsOutOn: string; orderMoreBy: string | null }

// POST /api/users/import
export type UserImportResult = {
  created: User[]
  refused: { line: number; email: string; code: string; message: string }[]
}

// POST /api/time-entries/parse-sentence (ADR 0022): null = not understood
export type SentenceProposal = {
  orderId: number | null
  workDate: string | null
  startTime: string | null
  endTime: string | null
  breakMinutes: number | null
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
