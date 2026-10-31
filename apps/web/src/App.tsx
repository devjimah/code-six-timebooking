import { useAuth } from "@/auth/auth-context.tsx"
import { HomePage } from "@/pages/home-page.tsx"
import { LoginPage } from "@/pages/login-page.tsx"

// Signed out → sign-in screen. Signed in → the app. Role screens are added here next.
export function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return null // avoids flashing the login form while GET /api/auth/me is still running
  }
  return user ? <HomePage user={user} /> : <LoginPage />
}
