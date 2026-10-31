// Tells TypeScript that loadUser() adds `user` to every Express request.
import type { User } from "../domain/models.js"

declare global {
  namespace Express {
    interface Request {
      user?: User
    }
  }
}

export {}
