// Purchasing home: what needs a follow-up order – orders running out of budget and orders whose period ends soon –
// plus the money in sum. Data: GET /api/orders (sums per order, no single bookings) and GET /api/suppliers.
import { useTranslation } from "react-i18next"
import { Link } from "react-router"
import { ArrowRight, Building2, CircleAlert, FileText } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { useAuth } from "@/auth/auth-context.tsx"
import { OrderProgressList } from "@/components/order-progress-list.tsx"
import { formatDate, formatEuroCents, translateApiError } from "@/i18n/format.ts"
import type { OrderOverview, Supplier } from "@/lib/api-types.ts"
import { daysBetween, todayInCompanyTimeZone } from "@/lib/dates.ts"
import { useApi } from "@/lib/use-api.ts"
import { ATTENTION_PERCENT } from "@/pages/project-manager/project-manager-home.tsx"

const ENDING_SOON_DAYS = 30

export function PurchasingHome() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const orders = useApi<OrderOverview[]>("/orders")
  const suppliers = useApi<Supplier[]>("/suppliers")
  const today = todayInCompanyTimeZone()
  const list = orders.data ?? []

  const running = list.filter((o) => o.startDate <= today && today <= o.endDate)
  const budgetCents = list.reduce((s, o) => s + o.budgetCents, 0)
  const bookedCents = list.reduce((s, o) => s + o.bookedCents, 0)
  const stats = [
    ["home.purchasing.running", String(running.length), orders.loading],
    ["home.purchasing.suppliers", String(suppliers.data?.length ?? 0), suppliers.loading],
    [
      "home.purchasing.used",
      t("home.purchasing.usedOf", { booked: formatEuroCents(bookedCents), budget: formatEuroCents(budgetCents) }),
      orders.loading,
    ],
  ] as const

  const lowBudget = list
    .filter((o) => o.usedPercent >= ATTENTION_PERCENT)
    .sort((a, b) => b.usedPercent - a.usedPercent)
  const endingSoon = running
    .filter((o) => daysBetween(today, o.endDate) <= ENDING_SOON_DAYS)
    .sort((a, b) => a.endDate.localeCompare(b.endDate))
  const endNote = (o: { orderId: number }) => {
    const order = list.find((x) => x.orderId === o.orderId)!
    return t("home.endsOn", { date: formatDate(order.endDate), count: daysBetween(today, order.endDate) })
  }
  const byEndDate = [...list].sort((a, b) => a.endDate.localeCompare(b.endDate))
  const periodNote = (o: { orderId: number }) => {
    const order = list.find((x) => x.orderId === o.orderId)!
    return `${order.supplierName} · ${formatDate(order.startDate)} – ${formatDate(order.endDate)}`
  }

  const error = orders.error ?? suppliers.error

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">{t("home.welcome", { name: user?.name })}</h2>
          <p className="text-muted-foreground text-sm">{t("home.purchasing.intro")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link to="/purchasing/orders">
              <FileText aria-hidden />
              {t("nav.orders")}
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/purchasing/suppliers">
              <Building2 aria-hidden />
              {t("nav.suppliers")}
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{t("home.loadFailed")}</AlertTitle>
          <AlertDescription>{translateApiError(error)}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {stats.map(([label, value, loading]) => (
          <Card key={label} className="gap-1 py-3 sm:py-4">
            <CardHeader className="px-3 sm:px-4">
              <CardDescription className="text-xs sm:text-sm">{t(label)}</CardDescription>
              <CardTitle className="text-sm tabular-nums sm:text-xl">
                {loading ? <Skeleton className="h-7 w-20" /> : value}
              </CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("home.purchasing.lowBudget")}</CardTitle>
            <CardDescription>{t("home.purchasing.lowBudgetDescription", { percent: ATTENTION_PERCENT })}</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.loading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <OrderProgressList orders={lowBudget} empty={t("home.purchasing.noLowBudget")} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("home.purchasing.endingSoon")}</CardTitle>
            <CardDescription>{t("home.purchasing.endingSoonDescription", { days: ENDING_SOON_DAYS })}</CardDescription>
          </CardHeader>
          <CardContent>
            {orders.loading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <OrderProgressList orders={endingSoon} note={endNote} empty={t("home.purchasing.noneEnding")} />
            )}
          </CardContent>
        </Card>

        {/* All orders in short, the ones ending first on top – the full table is on the orders page. */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("nav.orders")}</CardTitle>
            <CardDescription>{t("home.purchasing.allDescription")}</CardDescription>
            <CardAction>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/purchasing/orders">
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
              <OrderProgressList orders={byEndDate} note={periodNote} empty={t("orders.empty")} />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
