// Consultant home: the own working time at a glance (today against the 10-hour limit, this week, this month),
// the latest bookings and the orders one may book on. Only own data: GET /api/time-entries/mine and
// GET /api/orders/bookable (no money).
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { ArrowRight, CircleAlert, Clock } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Progress } from "@workspace/ui/components/progress"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useAuth } from "@/auth/auth-context.tsx"
import { formatDate, formatHours, translateApiError } from "@/i18n/format.ts"
import type { BookableOrder, TimeEntry } from "@/lib/api-types.ts"
import { daysBetween, startOfWeek, todayInCompanyTimeZone } from "@/lib/dates.ts"
import { useApi } from "@/lib/use-api.ts"
import { BookingList, DAILY_LIMIT_MINUTES } from "@/pages/consultant/booking-list.tsx"

const ENDING_SOON_DAYS = 30

export function ConsultantHome() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const entries = useApi<TimeEntry[]>("/time-entries/mine")
  const orders = useApi<BookableOrder[]>("/orders/bookable")
  const today = todayInCompanyTimeZone()

  const sumFrom = (from: string) =>
    (entries.data ?? []).filter((e) => e.workDate >= from && e.workDate <= today).reduce((s, e) => s + e.durationMinutes, 0)
  const todayMinutes = sumFrom(today)
  const stats = [
    ["home.consultant.today", todayMinutes],
    ["home.consultant.week", sumFrom(startOfWeek(today))],
    ["home.consultant.month", sumFrom(`${today.slice(0, 8)}01`)],
  ] as const

  /** Where the order stands in its period – the consultant can only book inside it. */
  function periodBadge(order: BookableOrder) {
    if (order.startDate > today) return <Badge variant="outline">{t("home.startsOn", { date: formatDate(order.startDate) })}</Badge>
    if (order.endDate < today) return <Badge variant="outline">{t("home.ended")}</Badge>
    const daysLeft = daysBetween(today, order.endDate)
    return daysLeft <= ENDING_SOON_DAYS ? <Badge>{t("home.endsIn", { count: daysLeft })}</Badge> : null
  }

  const error = entries.error ?? orders.error

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t("home.welcome", { name: user?.name })}</h2>
          <p className="text-muted-foreground text-sm">{t("home.consultant.intro")}</p>
        </div>
        <Button asChild>
          <Link to="/time">
            <Clock aria-hidden />
            {t("nav.bookTime")}
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{t("home.loadFailed")}</AlertTitle>
          <AlertDescription>{translateApiError(error)}</AlertDescription>
        </Alert>
      )}

      {/* Own totals only – nobody on the client side sees totals per person and day. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map(([label, minutes]) => (
          <Card key={label} className="gap-1 py-3 sm:py-4">
            <CardHeader className="px-3 sm:px-4">
              <CardDescription className="text-xs sm:text-sm">{t(label)}</CardDescription>
              <CardTitle className="text-sm tabular-nums sm:text-xl">
                {entries.loading ? <Skeleton className="h-7 w-16" /> : formatHours(minutes)}
              </CardTitle>
            </CardHeader>
            {label === "home.consultant.today" && (
              <CardContent className="px-3 sm:px-4">
                <Progress
                  value={Math.min((todayMinutes / DAILY_LIMIT_MINUTES) * 100, 100)}
                  aria-label={t("booking.dayProgress")}
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  {t("home.consultant.ofLimit", { limit: formatHours(DAILY_LIMIT_MINUTES) })}
                </p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("home.consultant.latest")}</CardTitle>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/time">
                  {t("home.all")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {entries.loading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <BookingList entries={entries.data ?? []} orders={orders.data ?? []} maxDays={3} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("home.consultant.orders")}</CardTitle>
            <CardDescription>{t("home.consultant.ordersDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.loading && <Skeleton className="h-24 w-full" />}
            {orders.data?.length === 0 && <p className="text-muted-foreground text-sm">{t("booking.noOrders")}</p>}
            <ul className="grid gap-3">
              {orders.data?.map((order) => (
                <li key={order.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="text-muted-foreground block font-mono text-xs">{order.code}</span>
                    <span className="block font-medium">{order.title}</span>
                    <span className="text-muted-foreground block text-xs">
                      {formatDate(order.startDate)} – {formatDate(order.endDate)}
                    </span>
                  </span>
                  {periodBadge(order)}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
