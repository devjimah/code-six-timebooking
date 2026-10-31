// Accounts – admin only (ADR 0004, ticket #5). There is no self-registration on purpose.
import { Router } from "express"
import { createUser } from "../application/create-user.js"
import { resetPassword } from "../application/manage-passwords.js"
import { deactivateUser, reactivateUser, updateUser } from "../application/manage-users.js"
import { setAuditContext } from "../audit/audit-log.js"
import { requireRole } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"
import { userRepository } from "../persistence/repositories.js"
import { createUserRequest, resetPasswordRequest, toUserResponse, updateUserRequest, userIdParams } from "./dto.js"

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

  // PUT /api/users/:id – change name, email, role or company (step 4). No password here.
  router.put("/:id", requireRole("admin"), async (req, res) => {
    const { id } = userIdParams.parse(req.params)
    const changes = updateUserRequest.parse(req.body)
    setAuditContext(res, {
      targetType: "user",
      targetId: id,
      details: { email: changes.email, role: changes.role, supplierId: changes.supplierId },
    })
    res.json(toUserResponse(await updateUser(db, req.user!, id, changes)))
  })

  // Accounts are deactivated, never deleted: bookings and audit events keep pointing to the person.
  router.post("/:id/deactivate", requireRole("admin"), async (req, res) => {
    const { id } = userIdParams.parse(req.params)
    setAuditContext(res, { targetType: "user", targetId: id })
    res.json(toUserResponse(await deactivateUser(db, req.user!, id)))
  })

  router.post("/:id/reactivate", requireRole("admin"), async (req, res) => {
    const { id } = userIdParams.parse(req.params)
    setAuditContext(res, { targetType: "user", targetId: id })
    res.json(toUserResponse(await reactivateUser(db, id)))
  })

  // POST /api/users/:id/password – the admin types a new password (step 5). The person is signed out everywhere
  // and must choose their own password at the next sign-in. The audit log records that it happened, never the password.
  router.post("/:id/password", requireRole("admin"), async (req, res) => {
    const { id } = userIdParams.parse(req.params)
    const { password } = resetPasswordRequest.parse(req.body)
    setAuditContext(res, { targetType: "user", targetId: id })
    res.json(toUserResponse(await resetPassword(db, req.user!, id, password)))
  })

  return router
}
