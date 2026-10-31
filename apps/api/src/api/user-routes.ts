// Accounts – admin only (ADR 0004, ticket #5). There is no self-registration on purpose.
import { Router } from "express"
import { createUser } from "../application/create-user.js"
import { setAuditContext } from "../audit/audit-log.js"
import { requireRole } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"
import { userRepository } from "../persistence/repositories.js"
import { createUserRequest, toUserResponse } from "./dto.js"

export function userRoutes(db: Db) {
  const router = Router()

  router.get("/", requireRole("admin"), async (_req, res) => {
    res.json((await userRepository(db).findAll()).map(toUserResponse))
  })

  // POST /api/users – the admin creates an account and hands the initial password to the person.
  router.post("/", requireRole("admin"), async (req, res) => {
    const { password, ...account } = createUserRequest.parse(req.body)
    // Key facts of the new account – recorded even when a rule rejects it. Never the password.
    setAuditContext(res, { details: { email: account.email, role: account.role, supplierId: account.supplierId } })
    const user = await createUser(db, { ...account, initialPassword: password })
    setAuditContext(res, { targetType: "user", targetId: user.id })
    res.status(201).json(toUserResponse(user))
  })

  return router
}
