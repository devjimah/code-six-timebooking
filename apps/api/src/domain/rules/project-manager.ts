// The person responsible for an order must be a project manager of the client: only they can see its budget
// and check its bookings (docs/roles-and-privacy.md). A consultant or an admin in this place would be a data leak.
import { DomainError } from "../errors.js"
import type { User } from "../models.js"

export function assertIsProjectManager(user: Pick<User, "role"> | null, userId: number): void {
  if (!user || user.role !== "project_manager") {
    throw new DomainError("NOT_A_PROJECT_MANAGER", `User ${userId} is not a project manager and cannot be responsible for an order.`)
  }
}
