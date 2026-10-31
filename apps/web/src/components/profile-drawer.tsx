// The signed-in user's own profile, opened from the sidebar footer, with sign-out.
import { useTranslation } from "react-i18next"
import { ChevronsUpDown, LogOut } from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import { SidebarMenuButton } from "@workspace/ui/components/sidebar"
import { useAuth, type CurrentUser } from "@/auth/auth-context.tsx"
import { UserDrawer } from "@/components/user-drawer.tsx"
import { initials } from "@/lib/initials.ts"

export function ProfileDrawer({ user }: { user: CurrentUser }) {
  const { t } = useTranslation()
  const { logout } = useAuth()

  return (
    <UserDrawer
      user={user}
      trigger={
        <SidebarMenuButton size="lg" aria-label={t("profile.open")}>
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.name}</span>
            <span className="text-muted-foreground truncate text-xs">{user.email}</span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" aria-hidden />
        </SidebarMenuButton>
      }
      actions={
        <Button onClick={() => void logout()}>
          <LogOut aria-hidden />
          {t("logout")}
        </Button>
      }
    />
  )
}
