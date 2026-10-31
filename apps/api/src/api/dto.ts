// API DTOs: what goes over the wire. Requests are validated with zod (ADR 0007);
// responses are built from domain objects, so internal fields never leak by accident.
import { z } from "zod"
import type { User } from "../domain/models.js"

export const loginRequest = z.object({
  email: z.email(),
  password: z.string().min(1),
})
export type LoginRequest = z.infer<typeof loginRequest>

export type UserResponse = {
  id: number
  email: string
  name: string
  role: User["role"]
  supplierId: number | null
}

export const toUserResponse = (user: User): UserResponse => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  supplierId: user.supplierId,
})
