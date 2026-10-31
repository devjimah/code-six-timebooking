// Which screens each role sees in the sidebar. Every role starts on its own home (pages/home-page.tsx).
import { Building2, Clock, FileText, House, ScrollText, Users, type LucideIcon } from "lucide-react"

import type { Role } from "@/lib/api-types.ts"

export type NavItem = {
  path: string
  labelKey: "nav.home" | "nav.users" | "nav.audit" | "nav.suppliers" | "nav.orders" | "nav.myOrders" | "nav.bookTime"
  icon: LucideIcon
}

const HOME: NavItem = { path: "/", labelKey: "nav.home", icon: House }

export const NAVIGATION: Record<Role, NavItem[]> = {
  admin: [
    HOME,
    { path: "/admin/users", labelKey: "nav.users", icon: Users },
    { path: "/admin/audit", labelKey: "nav.audit", icon: ScrollText },
  ],
  project_manager: [HOME, { path: "/orders", labelKey: "nav.myOrders", icon: FileText }],
  purchasing: [
    HOME,
    { path: "/purchasing/orders", labelKey: "nav.orders", icon: FileText },
    { path: "/purchasing/suppliers", labelKey: "nav.suppliers", icon: Building2 },
  ],
  consultant: [HOME, { path: "/time", labelKey: "nav.bookTime", icon: Clock }],
}

/** The first screen of a role, shown after sign-in: the role's home. */
export const homePathFor = (role: Role) => NAVIGATION[role][0]!.path

/** True for the screen itself and its sub-pages, e.g. "/orders" is active on "/orders/3". */
export const isActivePath = (itemPath: string, pathname: string) =>
  pathname === itemPath || (itemPath !== "/" && pathname.startsWith(`${itemPath}/`))
