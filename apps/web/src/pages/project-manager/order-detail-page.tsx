// Project manager: one of your orders – its budget and every single booking on it, to check the work
// (GET /api/orders/:id/budget and /time-entries). On purpose without totals per person and day:
// the client checks the work, not the consultant's working hours (docs/roles-and-privacy.md).
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router"
import { ArrowLeft, CircleAlert, ShieldCheck } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Progress } from "@workspace/ui/components/progress"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { formatDate, formatEuroCents, formatHours, translateApiError } from "@/i18n/format.ts"
import type { OrderBooking, OrderBudget } from "@/lib/api-types.ts"
import { useApi } from "@/lib/use-api.ts"

export function OrderDetailPage() {
  const { t } = useTranslation()
  const { orderId } = useParams()
  const budget = useApi<OrderBudget>(`/orders/${orderId}/budget`)
  const bookings = useApi<OrderBooking[]>(`/orders/${orderId}/time-entries`)
  const error = budget.error ?? bookings.error
  const order = budget.data

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link to="/orders">
            <ArrowLeft aria-hidden />
            {t("myOrders.back")}
          </Link>
        </Button>
        {order && (
          <div className="min-w-0">
            <span className="text-muted-foreground block font-mono text-xs">{order.code}</span>
            <h2 className="flex items-center gap-2 font-medium">
              {order.title}
              {order.overBudget && <Badge variant="destructive">{t("orders.overBudget")}</Badge>}
            </h2>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{t("myOrders.loadFailed")}</AlertTitle>
          <AlertDescription>{translateApiError(error)}</AlertDescription>
        </Alert>
      )}

      {/* Budget of the order: one row of figures, like purchasing's totals; hours first, money below. */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {(
          [
            ["myOrders.budget", order?.budgetHours, order?.budgetCents],
            ["orders.totalBooked", order?.bookedHours, order?.bookedCents],
            ["orders.totalRemaining", order?.remainingHours, order?.remainingCents],
          ] as const
        ).map(([label, hours, cents]) => (
          <Card key={label} className="gap-1 py-3 sm:py-4">
            <CardHeader className="px-3 sm:px-4">
              <CardDescription className="text-xs sm:text-sm">{t(label)}</CardDescription>
              <CardTitle className="text-sm tabular-nums sm:text-xl">
                {hours === undefined ? <Skeleton className="h-7 w-20" /> : formatHours(hours * 60)}
              </CardTitle>
              {cents !== undefined && (
                <span className="text-muted-foreground text-xs tabular-nums">{formatEuroCents(cents)}</span>
              )}
            </CardHeader>
          </Card>
        ))}
      </div>
      {order && (
        <Progress
          value={Math.min(order.usedPercent, 100)}
          aria-label={t("orders.usedOf", { percent: order.usedPercent, code: order.code })}
        />
      )}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-base">{t("myOrders.bookings")}</CardTitle>
          <CardDescription className="flex items-start gap-1.5 text-xs">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t("myOrders.privacyNote")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("myOrders.date")}</TableHead>
                {/* On phones, consultant and description move under the date. */}
                <TableHead className="hidden md:table-cell">{t("myOrders.consultant")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("myOrders.work")}</TableHead>
                <TableHead className="pr-4 text-right">{t("myOrders.hours")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.loading &&
                Array.from({ length: 3 }, (_, i) => (
                  <TableRow key={i}>
                    <TableCell className="pl-4" colSpan={4}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {bookings.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
                    {t("myOrders.noBookings")}
                  </TableCell>
                </TableRow>
              )}
              {bookings.data?.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="pl-4 align-top whitespace-normal">
                    <span className="tabular-nums">{formatDate(booking.workDate)}</span>
                    <span className="mt-1 grid gap-0.5 md:hidden">
                      <span>{booking.consultantName}</span>
                      <span className="text-muted-foreground text-xs">{booking.description}</span>
                    </span>
                  </TableCell>
                  <TableCell className="hidden align-top md:table-cell">{booking.consultantName}</TableCell>
                  <TableCell className="text-muted-foreground hidden align-top whitespace-normal md:table-cell">
                    {booking.description}
                  </TableCell>
                  <TableCell className="pr-4 text-right align-top tabular-nums">
                    {formatHours(booking.durationMinutes)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  )
}
