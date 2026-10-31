// Which screens each role sees in the sidebar. Add a role's screens here when they are built.
import { House, ScrollText, Users, type LucideIcon } from "lucide-react"

import type { Role } from "@/lib/api-types.ts"

export type NavItem = {
  path: string
  labelKey: "nav.home" | "nav.users" | "nav.audit"
  icon: LucideIcon
}

export const NAVIGATION: Record<Role, NavItem[]> = {
  admin: [
    { path: "/admin/users", labelKey: "nav.users", icon: Users },
    { path: "/admin/audit", labelKey: "nav.audit", icon: ScrollText },
  ],
  project_manager: [{ path: "/", labelKey: "nav.home", icon: House }],
  consultant: [{ path: "/", labelKey: "nav.home", icon: House }],
}

/** The first screen of a role, shown after sign-in. */
export const homePathFor = (role: Role) => NAVIGATION[role][0]!.path
