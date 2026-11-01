// Project manager home: the budget of the own orders in sum, the orders that need attention (80 % of the budget
// used or more) and all own orders in short. Data: GET /api/orders/managed – only the own orders.
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { ArrowRight, CircleAlert, FileText } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useAuth } from "@/auth/auth-context.tsx"
import { OrderProgressList } from "@/components/order-progress-list.tsx"
import { formatEuroCents, formatHours, translateApiError } from "@/i18n/format.ts"
import type { OrderBudget } from "@/lib/api-types.ts"
import { useApi } from "@/lib/use-api.ts"

export const ATTENTION_PERCENT = 80 // from here on, an order may need a follow-up order soon

export function ProjectManagerHome() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const orders = useApi<OrderBudget[]>("/orders/managed")
  const list = orders.data ?? []

  const booked = list.reduce((s, o) => s + o.bookedHours, 0)
  const budget = list.reduce((s, o) => s + o.budgetHours, 0)
  const stats = [
    ["home.pm.orders", String(list.length)],
    ["home.pm.booked", t("home.pm.bookedOf", { booked: formatHours(booked * 60), budget: formatHours(budget * 60) })],
    ["home.pm.remaining", formatEuroCents(list.reduce((s, o) => s + o.remainingCents, 0))],
  ] as const
  const attention = list
    .filter((o) => o.usedPercent >= ATTENTION_PERCENT)
    .sort((a, b) => b.usedPercent - a.usedPercent)

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t("home.welcome", { name: user?.name })}</h2>
          <p className="text-muted-foreground text-sm">{t("home.pm.intro")}</p>
        </div>
        <Button asChild>
          <Link to="/orders">
            <FileText aria-hidden />
            {t("nav.myOrders")}
          </Link>
        </Button>
      </div>

      {orders.error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{t("home.loadFailed")}</AlertTitle>
          <AlertDescription>{translateApiError(orders.error)}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map(([label, value]) => (
          <Card key={label} className="gap-1 py-3 sm:py-4">
            <CardHeader className="px-3 sm:px-4">
              <CardDescription className="text-xs sm:text-sm">{t(label)}</CardDescription>
              <CardTitle className="text-sm tabular-nums sm:text-xl">
                {orders.loading ? <Skeleton className="h-7 w-20" /> : value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("home.attention")}</CardTitle>
            <CardDescription>{t("home.pm.attentionDescription", { percent: ATTENTION_PERCENT })}</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.loading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <OrderProgressList
                orders={attention}
                linkTo={(o) => `/orders/${o.orderId}`}
                empty={t("home.pm.allFine")}
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("nav.myOrders")}</CardTitle>
            <CardDescription>{t("home.pm.ordersDescription")}</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/orders">
                  {t("home.all")}
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {orders.loading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <OrderProgressList orders={list} linkTo={(o) => `/orders/${o.orderId}`} empty={t("myOrders.empty")} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
