// Route guards: send people to the right screen. This is convenience, not security –
// the API checks the session and the role on every request (requireAuth / requireRole).
import { Navigate, Outlet, useLocation } from "react-router"

import { useAuth } from "@/auth/auth-context.tsx"
import type { Role } from "@/lib/api-types.ts"
import { LandingPage } from "@/pages/landing/landing-page.tsx"
import { homePathFor } from "@/routes/navigation.ts"

export const CHANGE_PASSWORD_PATH = "/account/password"

/** "/" is the landing page when signed out and the role's home when signed in. Every other path passes through. */
export function LandingIfSignedOut() {
  const { user } = useAuth()
  const { pathname } = useLocation()
  return !user && pathname === "/" ? <LandingPage /> : <Outlet />
}

/**
 * Only for signed-in users; everyone else goes to /login. Someone whose password an admin chose goes to
 * "Choose your own password" first – the API refuses everything else for them (PASSWORD_CHANGE_REQUIRED).
 */
export function RequireAuth() {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return user.mustChangePassword ? <Navigate to={CHANGE_PASSWORD_PATH} replace /> : <Outlet />
}

/** Signed in, nothing more – for the password screen itself. */
export function RequireSession() {
  const { user } = useAuth()
  return user ? <Outlet /> : <Navigate to="/login" replace />
}

/** Only for one role; other signed-in users go to their own start screen. */
export function RequireRole({ role }: { role: Role }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return user.role === role ? <Outlet /> : <Navigate to={homePathFor(user.role)} replace />
}

/** The login screen is pointless once signed in. */
export function RedirectIfSignedIn() {
  const { user } = useAuth()
  return user ? <Navigate to={homePathFor(user.role)} replace /> : <Outlet />
}
