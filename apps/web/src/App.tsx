// All screens and who may open them (ADR 0013: React Router). The API checks permissions again on every request.
import { BrowserRouter, Navigate, Route, Routes } from "react-router"

import { useAuth } from "@/auth/auth-context.tsx"
import { AppLayout } from "@/components/app-layout.tsx"
import { AuditPage } from "@/pages/admin/audit-page.tsx"
import { UsersPage } from "@/pages/admin/users-page.tsx"
import { BookTimePage } from "@/pages/consultant/book-time-page.tsx"
import { HomePage } from "@/pages/home-page.tsx"
import { MyOrdersPage } from "@/pages/project-manager/my-orders-page.tsx"
import { OrderDetailPage } from "@/pages/project-manager/order-detail-page.tsx"
import { OrdersPage } from "@/pages/purchasing/orders-page.tsx"
import { SuppliersPage } from "@/pages/purchasing/suppliers-page.tsx"
import { ChangePasswordPage } from "@/pages/change-password-page.tsx"
import { LoginPage } from "@/pages/login-page.tsx"
import { CHANGE_PASSWORD_PATH, RedirectIfSignedIn, RequireAuth, RequireRole, RequireSession } from "@/routes/guards.tsx"

export function App() {
  const { loading } = useAuth()

  if (loading) {
    return null // avoids flashing the login form while GET /api/auth/me is still running
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RedirectIfSignedIn />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>

        <Route element={<RequireSession />}>
          <Route path={CHANGE_PASSWORD_PATH} element={<ChangePasswordPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            {/* Every role lands on its own home (pages/home-page.tsx). */}
            <Route index element={<HomePage />} />
            <Route element={<RequireRole role="consultant" />}>
              <Route path="/time" element={<BookTimePage />} />
            </Route>
            <Route element={<RequireRole role="project_manager" />}>
              <Route path="/orders" element={<MyOrdersPage />} />
              <Route path="/orders/:orderId" element={<OrderDetailPage />} />
            </Route>
            <Route element={<RequireRole role="admin" />}>
              <Route path="/admin/users" element={<UsersPage />} />
              <Route path="/admin/audit" element={<AuditPage />} />
            </Route>
            <Route element={<RequireRole role="purchasing" />}>
              <Route path="/purchasing/orders" element={<OrdersPage />} />
              <Route path="/purchasing/suppliers" element={<SuppliersPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
