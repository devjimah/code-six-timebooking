// All screens and who may open them (ADR 0013: React Router). The API checks permissions again on every request.
import { BrowserRouter, Navigate, Route, Routes } from "react-router"

import { useAuth } from "@/auth/auth-context.tsx"
import { AppLayout } from "@/components/app-layout.tsx"
import { AuditPage } from "@/pages/admin/audit-page.tsx"
import { UsersPage } from "@/pages/admin/users-page.tsx"
import { HomePage } from "@/pages/home-page.tsx"
import { LoginPage } from "@/pages/login-page.tsx"
import { RedirectIfSignedIn, RequireAuth, RequireRole } from "@/routes/guards.tsx"
import { homePathFor } from "@/routes/navigation.ts"

export function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return null // avoids flashing the login form while GET /api/auth/me is still running
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RedirectIfSignedIn />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            {/* Admins have no general start screen; they land on the user list. */}
            <Route index element={user?.role === "admin" ? <Navigate to={homePathFor("admin")} replace /> : <HomePage />} />
            <Route element={<RequireRole role="admin" />}>
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/audit" element={<AuditPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
