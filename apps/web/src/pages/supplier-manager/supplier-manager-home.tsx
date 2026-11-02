// Supplier manager: the bookings of the own company's consultants, with times (GET /api/supplier/bookings, ADR 0021).
// The supplier is the employer and responsible for working-time law. Read only, no money, no other company.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert, ShieldCheck } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@workspace/ui/components/table"
import { useAuth } from "@/auth/auth-context.tsx"
import { formatHours, formatWeekday, translateApiError } from "@/i18n/format.ts"
import type { SupplierBooking } from "@/lib/api-types.ts"
import { todayInCompanyTimeZone } from "@/lib/dates.ts"
import { useApi } from "@/lib/use-api.ts"
import { DAILY_LIMIT_MINUTES } from "@/pages/consultant/booking-list.tsx"

export function SupplierManagerHome() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [month, setMonth] = React.useState(todayInCompanyTimeZone().slice(0, 7))
  const bookings = useApi<SupplierBooking[]>(`/supplier/bookings?month=${month}`)

  const dayTotal = (booking: SupplierBooking) =>
    (bookings.data ?? [])
      .filter((b) => b.userId === booking.userId && b.workDate === booking.workDate)
      .reduce((sum, b) => sum + b.durationMinutes, 0)

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold">{t("home.welcome", { name: user?.name })}</h2>
        <p className="text-muted-foreground text-sm">{t("supplierManager.intro")}</p>
      </div>

      <Field className="max-w-48">
        <FieldLabel htmlFor="supplier-month">{t("myOrders.month")}</FieldLabel>
        <Input id="supplier-month" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
      </Field>

      {bookings.error && (
        <Alert variant="destructive">
          <CircleAlert aria-hidden />
          <AlertTitle>{t("supplierManager.loadFailed")}</AlertTitle>
          <AlertDescription>{translateApiError(bookings.error)}</AlertDescription>
        </Alert>
      )}

      <Card className="gap-0 py-0">
        <CardHeader className="border-b px-4 py-3">
          <CardTitle className="text-base">{t("supplierManager.bookings")}</CardTitle>
          <CardDescription className="flex items-start gap-1.5 text-xs">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            {t("supplierManager.note")}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">{t("myOrders.date")}</TableHead>
                <TableHead>{t("myOrders.consultant")}</TableHead>
                <TableHead className="hidden md:table-cell">{t("orders.order")}</TableHead>
                <TableHead>{t("supplierManager.times")}</TableHead>
                <TableHead className="pr-4 text-right">{t("supplierManager.dayTotal")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.loading && (
                <TableRow>
                  <TableCell className="pl-4" colSpan={5}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              )}
              {bookings.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-8 text-center">
                    {t("supplierManager.none")}
                  </TableCell>
                </TableRow>
              )}
              {bookings.data?.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="pl-4 tabular-nums">{formatWeekday(booking.workDate)}</TableCell>
                  <TableCell className="whitespace-normal">{booking.consultantName}</TableCell>
                  <TableCell className="hidden font-mono text-xs md:table-cell">{booking.orderCode}</TableCell>
                  <TableCell className="tabular-nums">
                    {t("booking.timeRange", { start: booking.startTime, end: booking.endTime })}
                    {booking.breakMinutes > 0 && (
                      <span className="text-muted-foreground block text-xs">
                        {t("booking.breakValue", { count: booking.breakMinutes })}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="pr-4 text-right tabular-nums">
                    <Badge variant={dayTotal(booking) >= DAILY_LIMIT_MINUTES ? "default" : "secondary"}>
                      {formatHours(dayTotal(booking))}
                    </Badge>
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
