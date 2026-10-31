// The signed-in user's profile, opened from the header. Built from shadcn Drawer + Avatar.
import { useTranslation } from "react-i18next"
import { LogOut } from "lucide-react"

import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { Button } from "@workspace/ui/components/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@workspace/ui/components/drawer"
import { Separator } from "@workspace/ui/components/separator"
import { useAuth, type CurrentUser } from "@/auth/auth-context.tsx"

// "Paula Projectmanager" → "PP"
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

export function ProfileDrawer({ user }: { user: CurrentUser }) {
  const { t } = useTranslation()
  const { logout } = useAuth()

  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button variant="ghost" size="sm" aria-label={t("profile.open")}>
          <Avatar className="size-6">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <span className="hidden sm:inline">{user.name}</span>
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="items-center gap-3 text-center md:items-start md:text-left">
          <Avatar className="size-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl">{initials(user.name)}</AvatarFallback>
          </Avatar>
          <div>
            <DrawerTitle>{user.name}</DrawerTitle>
            <DrawerDescription>{user.email}</DrawerDescription>
          </div>
        </DrawerHeader>
        <Separator />
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 p-4">
          <dt className="text-muted-foreground">{t("profile.role")}</dt>
          <dd>{t(`roles.${user.role}`)}</dd>
          <dt className="text-muted-foreground">{t("profile.email")}</dt>
          <dd className="truncate">{user.email}</dd>
        </dl>
        <DrawerFooter>
          <Button onClick={() => void logout()}>
            <LogOut aria-hidden />
            {t("logout")}
          </Button>
          <DrawerClose asChild>
            <Button variant="outline">{t("profile.close")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
