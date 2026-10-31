// Main navigation. shadcn Sidebar: fixed on desktop, a slide-in sheet on phones (opened by the ☰ button).
import { useTranslation } from "react-i18next"
import { NavLink, useLocation } from "react-router"
import { Clock } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import type { CurrentUser } from "@/auth/auth-context.tsx"
import { ProfileDrawer } from "@/components/profile-drawer.tsx"
import { NAVIGATION } from "@/routes/navigation.ts"

export function AppSidebar({ user }: { user: CurrentUser }) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const { setOpenMobile } = useSidebar()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <NavLink to="/">
                <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Clock className="size-4" aria-hidden />
                </div>
                <span className="truncate font-medium">{t("app.title")}</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t(`roles.${user.role}`)}</SidebarGroupLabel>
          <SidebarMenu>
            {NAVIGATION[user.role].map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton asChild isActive={pathname === item.path} tooltip={t(item.labelKey)}>
                  {/* On phones, close the menu after choosing a screen */}
                  <NavLink to={item.path} onClick={() => setOpenMobile(false)}>
                    <item.icon aria-hidden />
                    <span>{t(item.labelKey)}</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <ProfileDrawer user={user} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
