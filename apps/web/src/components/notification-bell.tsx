// The bell in the header: what needs this person's attention (GET /api/notifications). Computed by the server each time
// and never stored, so there is nothing to mark as read: the notification goes when its cause does.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router"
import { Bell } from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@workspace/ui/components/sheet"
import { formatDate } from "@/i18n/format.ts"
import type { Notification } from "@/lib/api-types.ts"
import { useApi } from "@/lib/use-api.ts"

function targetOf(notification: Notification): string {
  if (notification.type === "booking_returned") return "/time"
  if (notification.type === "order_more") return "/purchasing/orders"
  return `/orders/${notification.orderId}`
}

function NotificationText({ notification }: { notification: Notification }) {
  const { t } = useTranslation()
  switch (notification.type) {
    case "booking_returned":
      return t("notifications.returned", { date: formatDate(notification.workDate), reason: notification.reason ?? "" })
    case "bookings_to_check":
      return t("notifications.toCheck", { code: notification.code, count: notification.count })
    case "budget_runs_out":
      return t("notifications.runsOut", { code: notification.code, date: formatDate(notification.runsOutOn) })
    case "order_more":
      return notification.orderMoreBy
        ? t("notifications.orderMore", { code: notification.code, date: formatDate(notification.orderMoreBy) })
        : t("notifications.runsOut", { code: notification.code, date: formatDate(notification.runsOutOn) })
  }
}

export function NotificationBell() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const notifications = useApi<Notification[]>("/notifications")
  const [open, setOpen] = React.useState(false)
  const list = notifications.data ?? []

  // Fresh after every move through the app: a booking approved a moment ago is no longer waiting.
  const { reload } = notifications
  React.useEffect(() => {
    reload()
  }, [pathname, open, reload])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={t("notifications.open", { count: list.length })}>
          <Bell aria-hidden />
          {list.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] tabular-nums">{list.length}</Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{t("notifications.title")}</SheetTitle>
          <SheetDescription>{t("notifications.description")}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-2 overflow-y-auto px-4 pb-4">
          {list.length === 0 && <p className="text-muted-foreground text-sm">{t("notifications.none")}</p>}
          {list.map((notification, index) => (
            <Link
              key={index}
              to={targetOf(notification)}
              onClick={() => setOpen(false)}
              className="hover:bg-muted rounded-md border p-3 text-sm transition-colors"
            >
              <NotificationText notification={notification} />
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
