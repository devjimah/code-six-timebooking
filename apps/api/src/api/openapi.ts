// OpenAPI description of the API, built from the same zod DTOs the routes use (ADR 0009, ticket #19).
// Served as JSON at /api/openapi.json and as Swagger UI at /api/docs.
// When you add or change a route, add or change its entry in `routes` below – openapi.test.ts fails otherwise.
import { z } from "zod"
import type { Role } from "../domain/models.js"
import {
  auditEventResponse,
  auditEventsQuery,
  bookableOrderResponse,
  createTimeEntryRequest,
  createUserRequest,
  errorResponse,
  loginRequest,
  orderBudgetResponse,
  orderBookingResponse,
  orderIdParams,
  orderOverviewResponse,
  orderRequest,
  orderResponse,
  projectManagerResponse,
  supplierIdParams,
  updateUserRequest,
  userIdParams,
  supplierRequest,
  supplierResponse,
  timeEntryResponse,
  userResponse,
} from "./dto.js"

type RouteDoc = {
  method: "get" | "post" | "put" | "patch"
  path: string // OpenAPI style: /api/orders/{id}/budget
  summary: string
  tag: string
  /** undefined = public; [] = any signed-in user; otherwise only these roles. */
  roles?: Role[]
  params?: z.ZodObject
  query?: z.ZodObject
  body?: z.ZodType
  success: { status: number; description: string; schema?: z.ZodType }
  /** Error statuses besides 401/403, which follow from `roles`. */
  errors?: Partial<Record<400 | 401 | 403 | 404 | 422, string>>
}

export const routes: RouteDoc[] = [
  {
    method: "get", path: "/api/health", tag: "System", summary: "Health check",
    success: { status: 200, description: "The API is running", schema: z.object({ status: z.literal("ok") }) },
  },
  {
    method: "post", path: "/api/auth/login", tag: "Sign-in",
    summary: "Sign in with email and password; sets the session cookie",
    body: loginRequest,
    success: { status: 200, description: "Signed in", schema: userResponse },
    errors: {
      400: "Invalid request body",
      401: "Email or password is wrong (INVALID_CREDENTIALS)",
      403: "Right password, but the account is deactivated (ACCOUNT_DEACTIVATED)",
    },
  },
  {
    method: "post", path: "/api/auth/logout", tag: "Sign-in", summary: "Sign out; clears the session cookie",
    success: { status: 204, description: "Signed out" },
  },
  {
    method: "get", path: "/api/auth/me", tag: "Sign-in", summary: "The signed-in user", roles: [],
    success: { status: 200, description: "The signed-in user", schema: userResponse },
  },
  {
    method: "get", path: "/api/users", tag: "Users", summary: "All users", roles: ["admin"],
    success: { status: 200, description: "All users", schema: z.array(userResponse) },
  },
  {
    method: "post", path: "/api/users", tag: "Users", roles: ["admin"],
    summary: "Create an account (there is no self-registration). Consultants need a supplier, other roles none",
    body: createUserRequest,
    success: { status: 201, description: "Account created", schema: userResponse },
    errors: {
      400: "Invalid request body",
      422: "CONSULTANT_NEEDS_SUPPLIER, SUPPLIER_ONLY_FOR_CONSULTANTS, SUPPLIER_NOT_FOUND, EMAIL_TAKEN",
    },
  },
  {
    method: "put", path: "/api/users/{id}", tag: "Users", roles: ["admin"],
    summary: "Change name, email, role or company. A role only changes while no bookings or orders depend on it; " +
      "not your own role",
    params: userIdParams,
    body: updateUserRequest,
    success: { status: 200, description: "Account changed", schema: userResponse },
    errors: {
      400: "Invalid id or body",
      404: "USER_NOT_FOUND",
      422: "CONSULTANT_NEEDS_SUPPLIER, SUPPLIER_ONLY_FOR_CONSULTANTS, SUPPLIER_NOT_FOUND, EMAIL_TAKEN, ROLE_IN_USE, " +
        "CANNOT_CHANGE_OWN_ROLE",
    },
  },
  {
    method: "post", path: "/api/users/{id}/deactivate", tag: "Users", roles: ["admin"],
    summary: "Deactivate an account: no more sign-in, open sessions end. Not yourself; not a project manager with orders",
    params: userIdParams,
    success: { status: 200, description: "Account deactivated (or already was)", schema: userResponse },
    errors: { 400: "Invalid id", 404: "USER_NOT_FOUND", 422: "CANNOT_DEACTIVATE_YOURSELF, MANAGES_ORDERS" },
  },
  {
    method: "post", path: "/api/users/{id}/reactivate", tag: "Users", roles: ["admin"],
    summary: "Reactivate an account",
    params: userIdParams,
    success: { status: 200, description: "Account active again", schema: userResponse },
    errors: { 400: "Invalid id", 404: "USER_NOT_FOUND" },
  },
  {
    method: "get", path: "/api/suppliers", tag: "Suppliers",
    summary: "All suppliers, alphabetical (admin: to choose a consultant's company; purchasing: to manage them)",
    roles: ["admin", "purchasing"],
    success: { status: 200, description: "All suppliers", schema: z.array(supplierResponse) },
  },
  {
    method: "post", path: "/api/suppliers", tag: "Suppliers", summary: "Create a supplier company",
    roles: ["purchasing"],
    body: supplierRequest,
    success: { status: 201, description: "Supplier created", schema: supplierResponse },
    errors: { 400: "Invalid request body", 422: "SUPPLIER_NAME_TAKEN" },
  },
  {
    method: "patch", path: "/api/suppliers/{id}", tag: "Suppliers", summary: "Rename a supplier company",
    roles: ["purchasing"],
    params: supplierIdParams,
    body: supplierRequest,
    success: { status: 200, description: "Supplier renamed", schema: supplierResponse },
    errors: { 400: "Invalid id or body", 404: "SUPPLIER_NOT_FOUND", 422: "SUPPLIER_NAME_TAKEN" },
  },
  {
    method: "post", path: "/api/time-entries", tag: "Time entries", roles: ["consultant"],
    summary: "Book time on an order of your own company (max. 10 h per day, within the order budget, not in the future, " +
      "not on Sundays or public holidays, inside the order's period)",
    body: createTimeEntryRequest,
    success: { status: 201, description: "Booked", schema: timeEntryResponse },
    errors: {
      400: "Invalid request body",
      422: "A business rule was broken: DAILY_LIMIT_EXCEEDED, BUDGET_EXCEEDED, INVALID_DURATION, " +
        "ORDER_NOT_FOUND, ORDER_NOT_ASSIGNED, DATE_IN_FUTURE, SUNDAY_OR_HOLIDAY",
    },
  },
  {
    method: "get", path: "/api/time-entries/mine", tag: "Time entries", summary: "Your own time entries, newest first",
    roles: ["consultant"],
    success: { status: 200, description: "Your time entries", schema: z.array(timeEntryResponse) },
  },
  {
    method: "get", path: "/api/orders", tag: "Orders", roles: ["purchasing"],
    summary: "All orders with supplier, project manager, period and budget (sums only, no single bookings)",
    success: { status: 200, description: "All orders, by code", schema: z.array(orderOverviewResponse) },
  },
  {
    method: "post", path: "/api/orders", tag: "Orders", roles: ["purchasing"],
    summary: "Place an order with a supplier",
    body: orderRequest,
    success: { status: 201, description: "Order created", schema: orderResponse },
    errors: {
      400: "Invalid request body",
      422: "ORDER_CODE_TAKEN, ORDER_PERIOD_INVALID, SUPPLIER_NOT_FOUND, NOT_A_PROJECT_MANAGER, PROJECT_MANAGER_DEACTIVATED",
    },
  },
  {
    method: "put", path: "/api/orders/{id}", tag: "Orders", roles: ["purchasing"],
    summary: "Change an order (all fields). Budget not below booked hours; supplier fixed after the first booking; " +
      "period must include all bookings",
    params: orderIdParams,
    body: orderRequest,
    success: { status: 200, description: "Order changed", schema: orderResponse },
    errors: {
      400: "Invalid id or body",
      404: "ORDER_NOT_FOUND",
      422: "ORDER_CODE_TAKEN, ORDER_PERIOD_INVALID, SUPPLIER_NOT_FOUND, NOT_A_PROJECT_MANAGER, BUDGET_BELOW_BOOKED, " +
        "SUPPLIER_FIXED_AFTER_BOOKINGS, PERIOD_EXCLUDES_BOOKINGS",
    },
  },
  {
    method: "get", path: "/api/project-managers", tag: "Orders", roles: ["purchasing"],
    summary: "Project managers who can be responsible for an order (names only)",
    success: { status: 200, description: "Project managers", schema: z.array(projectManagerResponse) },
  },
  {
    method: "get", path: "/api/orders/bookable", tag: "Orders", summary: "Orders of your own company you can book on",
    roles: ["consultant"],
    success: { status: 200, description: "Bookable orders", schema: z.array(bookableOrderResponse) },
  },
  {
    method: "get", path: "/api/orders/managed", tag: "Orders",
    summary: "Orders you are project manager of, with their budget",
    roles: ["project_manager"],
    success: { status: 200, description: "Your orders with budget", schema: z.array(orderBudgetResponse) },
  },
  {
    method: "get", path: "/api/orders/{id}/budget", tag: "Orders",
    summary: "Booked and remaining budget of one of your orders",
    roles: ["project_manager"],
    params: orderIdParams,
    success: { status: 200, description: "Budget of the order", schema: orderBudgetResponse },
    errors: {
      400: "The id is not a number",
      403: "Not a project manager (FORBIDDEN), or not your order (NOT_YOUR_ORDER)",
      404: "The order does not exist (ORDER_NOT_FOUND)",
    },
  },
  {
    method: "get", path: "/api/orders/{id}/time-entries", tag: "Orders", roles: ["project_manager"],
    summary: "Single bookings of your own order, newest first – to check the work (no totals per person)",
    params: orderIdParams,
    success: { status: 200, description: "Bookings of the order", schema: z.array(orderBookingResponse) },
    errors: {
      400: "The id is not a number",
      403: "Not a project manager (FORBIDDEN), or not your order (NOT_YOUR_ORDER)",
      404: "The order does not exist (ORDER_NOT_FOUND)",
    },
  },
  {
    method: "get", path: "/api/audit-events", tag: "Audit log", summary: "Latest recorded actions, newest first",
    roles: ["admin"],
    query: auditEventsQuery,
    success: { status: 200, description: "Audit events", schema: z.array(auditEventResponse) },
    errors: { 400: "Invalid query parameter" },
  },
]

const toSchema = (schema: z.ZodType, io: "input" | "output") =>
  z.toJSONSchema(schema, { target: "openapi-3.0", io, unrepresentable: "any" })

const errorContent = { "application/json": { schema: toSchema(errorResponse, "output") } }

/** Turns each field of a zod object into an OpenAPI parameter (path or query). */
function parameters(schema: z.ZodObject, location: "path" | "query") {
  const json = toSchema(schema, "input") as { properties?: Record<string, object>; required?: string[] }
  return Object.entries(json.properties ?? {}).map(([name, fieldSchema]) => ({
    name,
    in: location,
    required: location === "path" || (json.required ?? []).includes(name),
    schema: fieldSchema,
  }))
}

function operation(route: RouteDoc) {
  // 401 and 403 follow from the role list; a route can still describe them more precisely in `errors`.
  const errors: Record<string, string> = {}
  if (route.roles) errors[401] = "Not signed in (UNAUTHENTICATED)"
  if (route.roles?.length) errors[403] = `Signed in, but not as ${route.roles.join(" or ")} (FORBIDDEN)`
  Object.assign(errors, route.errors)

  const responses: Record<string, object> = {
    [route.success.status]: {
      description: route.success.description,
      ...(route.success.schema && {
        content: { "application/json": { schema: toSchema(route.success.schema, "output") } },
      }),
    },
  }
  for (const [status, description] of Object.entries(errors)) {
    responses[status] = { description, content: errorContent }
  }

  return {
    tags: [route.tag],
    summary: route.summary,
    ...(route.roles?.length && { description: `Roles: ${route.roles.join(", ")}` }),
    ...(route.roles && { security: [{ sessionCookie: [] }] }),
    parameters: [
      ...(route.params ? parameters(route.params, "path") : []),
      ...(route.query ? parameters(route.query, "query") : []),
    ],
    ...(route.body && {
      requestBody: { required: true, content: { "application/json": { schema: toSchema(route.body, "input") } } },
    }),
    responses,
  }
}

export function buildOpenApiDocument() {
  const paths: Record<string, Record<string, object>> = {}
  for (const route of routes) {
    paths[route.path] = { ...paths[route.path], [route.method]: operation(route) }
  }
  return {
    openapi: "3.0.3",
    info: {
      title: "Time booking API",
      version: "0.1.0",
      description:
        "Sign in with POST /api/auth/login (demo users are listed in the README). The browser keeps the session " +
        "cookie, so \"Try it out\" works for the other routes afterwards. Money is in euro cents, durations in minutes.",
    },
    components: {
      securitySchemes: { sessionCookie: { type: "apiKey", in: "cookie", name: "session" } },
    },
    paths,
  }
}
