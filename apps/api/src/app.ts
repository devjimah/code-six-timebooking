// Builds the Express app without starting it, so tests can run it against a temporary database.
import express from "express"
import { loadUser } from "./auth/middleware.js"
import { auditRoutes } from "./api/audit-routes.js"
import { authRoutes } from "./api/auth-routes.js"
import { auditLog } from "./audit/audit-log.js"
import { errorHandler } from "./api/error-handler.js"
import { orderRoutes } from "./api/order-routes.js"
import { timeEntryRoutes } from "./api/time-entry-routes.js"
import { userRoutes } from "./api/user-routes.js"
import type { Db } from "./persistence/db.js"

export type AppOptions = {
  db: Db
  sessionSecret: string
  secureCookies: boolean
}

export function createApp({ db, sessionSecret, secureCookies }: AppOptions) {
  const app = express()
  app.use(express.json())
  app.use(loadUser(db, sessionSecret))
  // Before all routes, so every request is recorded – including rejected and failed ones.
  app.use(auditLog(db))

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" })
  })
  app.use("/api/auth", authRoutes(db, { sessionSecret, secureCookies }))
  app.use("/api/users", userRoutes(db))
  app.use("/api/time-entries", timeEntryRoutes(db))
  app.use("/api/orders", orderRoutes(db))
  app.use("/api/audit-events", auditRoutes(db))

  // Must stay last: turns DomainError into 422 and hides internal errors.
  app.use(errorHandler)
  return app
}
