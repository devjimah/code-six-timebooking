// Who is signed in. Asks the API once on start (GET /api/auth/me) and offers login / logout to every screen.
// This only decides what to show; the API checks every permission again on the server (docs/roles-and-privacy.md).
import * as React from "react"

import { ApiError, api } from "@/lib/api.ts"
import type { User } from "@/lib/api-types.ts"

export type CurrentUser = User

type AuthState = {
  user: CurrentUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = React.createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<CurrentUser | null>(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    api<CurrentUser>("/auth/me")
      .then(setUser)
      .catch((error: unknown) => {
        // 401 simply means "not signed in yet"; anything else is a real problem worth logging.
        if (!(error instanceof ApiError && error.status === 401)) console.error(error)
      })
      .finally(() => setLoading(false))
  }, [])

  const login = React.useCallback(async (email: string, password: string) => {
    setUser(await api<CurrentUser>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }))
  }, [])

  const logout = React.useCallback(async () => {
    await api<void>("/auth/logout", { method: "POST" })
    setUser(null)
  }, [])

  const value = React.useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
