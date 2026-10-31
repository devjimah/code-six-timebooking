// A user's profile in a shadcn Drawer: own profile (sidebar footer) and any user in the admin list.
// On phones it slides up from the bottom (easy to reach with a thumb), on larger screens in from the right.
import * as React from "react"
import { useTranslation } from "react-i18next"

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
import { useIsMobile } from "@workspace/ui/hooks/use-mobile"
import { formatDateTime } from "@/i18n/format.ts"
import type { User } from "@/lib/api-types.ts"
import { initials } from "@/lib/initials.ts"

type UserDrawerProps = {
  user: User | null
  supplierName?: string | null
  /** Element that opens the drawer. Leave out and use open / onOpenChange to control it from outside. */
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Extra buttons in the footer, e.g. sign out */
  actions?: React.ReactNode
}

export function UserDrawer({ user, supplierName, trigger, open, onOpenChange, actions }: UserDrawerProps) {
  const { t } = useTranslation()
  const isMobile = useIsMobile()

  return (
    <Drawer direction={isMobile ? "bottom" : "right"} open={open} onOpenChange={onOpenChange}>
      {trigger && <DrawerTrigger asChild>{trigger}</DrawerTrigger>}
      <DrawerContent>
        {user && (
          <>
            <DrawerHeader className="items-center gap-3 text-center md:items-start md:text-left">
              <Avatar className="size-16">
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {initials(user.name)}
                </AvatarFallback>
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
              {user.deactivatedAt && (
                <>
                  <dt className="text-muted-foreground">{t("users.status")}</dt>
                  <dd>{t("users.deactivatedSince", { date: formatDateTime(user.deactivatedAt) })}</dd>
                </>
              )}
              {supplierName && (
                <>
                  <dt className="text-muted-foreground">{t("profile.company")}</dt>
                  <dd>{supplierName}</dd>
                </>
              )}
            </dl>
          </>
        )}
        <DrawerFooter>
          {actions}
          <DrawerClose asChild>
            <Button variant="outline">{t("profile.close")}</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
