// The start screen after sign-in: one home per role, each showing only what that role may see
// (docs/roles-and-privacy.md). The API checks every request again, whatever this screen shows.
import type * as React from "react"

import { useAuth } from "@/auth/auth-context.tsx"
import type { Role } from "@/lib/api-types.ts"
import { AdminHome } from "@/pages/admin/admin-home.tsx"
import { ConsultantHome } from "@/pages/consultant/consultant-home.tsx"
import { ProjectManagerHome } from "@/pages/project-manager/project-manager-home.tsx"
import { PurchasingHome } from "@/pages/purchasing/purchasing-home.tsx"

const HOMES: Record<Role, () => React.JSX.Element> = {
  admin: AdminHome,
  project_manager: ProjectManagerHome,
  purchasing: PurchasingHome,
  consultant: ConsultantHome,
}

export function HomePage() {
  const { user } = useAuth()
  if (!user) return null
  const Home = HOMES[user.role]
  return <Home />
}
