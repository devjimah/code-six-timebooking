// Frame around every signed-in screen: sidebar, a top bar with the screen title, and the screen itself.
import { useTranslation } from "react-i18next"
import { Outlet, useLocation } from "react-router"

import { SidebarInset, SidebarProvider, SidebarTrigger } from "@workspace/ui/components/sidebar"
import { Toaster } from "@workspace/ui/components/sonner"
import { useAuth } from "@/auth/auth-context.tsx"
import { AppSidebar } from "@/components/app-sidebar.tsx"
import { LanguageSwitcher } from "@/components/language-switcher.tsx"
import { NAVIGATION } from "@/routes/navigation.ts"

export function AppLayout() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { pathname } = useLocation()

  if (!user) return null // RequireAuth makes sure this does not happen
  const current = NAVIGATION[user.role].find((item) => item.path === pathname)

  return (
    <SidebarProvider>
      <AppSidebar user={user} />
      <SidebarInset>
        <header className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <h1 className="truncate font-medium">{current ? t(current.labelKey) : t("app.title")}</h1>
          <div className="ml-auto">
            <LanguageSwitcher />
          </div>
        </header>
        <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <Outlet />
        </div>
      </SidebarInset>
      <Toaster position="top-center" />
    </SidebarProvider>
  )
}
