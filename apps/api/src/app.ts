// Builds the Express app without starting it, so tests can run it against a temporary database.
import express from "express"
import swaggerUi from "swagger-ui-express"
import { loadUser } from "./auth/middleware.js"
import { auditRoutes } from "./api/audit-routes.js"
import { authRoutes } from "./api/auth-routes.js"
import { auditLog, rememberMountPath } from "./audit/audit-log.js"
import { errorHandler } from "./api/error-handler.js"
import { buildOpenApiDocument } from "./api/openapi.js"
import { orderRoutes } from "./api/order-routes.js"
import { projectManagerRoutes } from "./api/project-manager-routes.js"
import { publicHolidayRoutes } from "./api/public-holiday-routes.js"
import { supplierRoutes } from "./api/supplier-routes.js"
import { timeEntryRoutes } from "./api/time-entry-routes.js"
import { userRoutes } from "./api/user-routes.js"
import type { Db } from "./persistence/db.js"

export type AppOptions = {
  db: Db
  sessionSecret: string
  secureCookies: boolean
  trustProxyHops?: number
  /** How long purchasing needs for a follow-up order; the forecast says when to start (ADR 0015). */
  purchasingLeadTimeWeeks?: number
}

export function createApp({ db, sessionSecret, secureCookies, trustProxyHops = 0, purchasingLeadTimeWeeks = 4 }: AppOptions) {
  const app = express()
  // Makes req.ip the client's address behind a reverse proxy (see TRUST_PROXY_HOPS in .env.example).
  app.set("trust proxy", trustProxyHops)
  // API documentation (ADR 0009): the spec as JSON, and Swagger UI to try the routes in the browser.
  // Mounted before the audit log on purpose: reading the docs (and their CSS/JS files) is not a user action.
  const openApiDocument = buildOpenApiDocument()
  app.get("/api/openapi.json", (_req, res) => {
    res.json(openApiDocument)
  })
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument))

  app.use(express.json())
  app.use(loadUser(db, sessionSecret))
  // Before all routes, so every request is recorded – including rejected and failed ones.
  app.use(auditLog(db))

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" })
  })
  app.use("/api/auth", rememberMountPath, authRoutes(db, { sessionSecret, secureCookies }))
  app.use("/api/users", rememberMountPath, userRoutes(db))
  app.use("/api/suppliers", rememberMountPath, supplierRoutes(db))
  app.use("/api/time-entries", rememberMountPath, timeEntryRoutes(db))
  app.use("/api/orders", rememberMountPath, orderRoutes(db, purchasingLeadTimeWeeks))
  app.use("/api/project-managers", rememberMountPath, projectManagerRoutes(db))
  app.use("/api/public-holidays", rememberMountPath, publicHolidayRoutes())
  app.use("/api/audit-events", rememberMountPath, auditRoutes(db))

  // Must stay last: turns DomainError into 422 and hides internal errors.
  app.use(errorHandler)
  return app
}
