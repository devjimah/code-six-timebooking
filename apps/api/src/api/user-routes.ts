// GET /api/users – admin only (ADR 0004). Creating users (POST) follows in ticket #5.
import { Router } from "express"
import { requireRole } from "../auth/middleware.js"
import type { Db } from "../persistence/db.js"
import { userRepository } from "../persistence/repositories.js"
import { toUserResponse } from "./dto.js"

export function userRoutes(db: Db) {
  const router = Router()

  router.get("/", requireRole("admin"), async (_req, res) => {
    res.json((await userRepository(db).findAll()).map(toUserResponse))
  })

  return router
}
