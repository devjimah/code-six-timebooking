// Consultant: book working time on an order of the own company (POST /api/time-entries, issue #12) and see the own
// bookings (GET /api/time-entries/mine). The form only helps to get it right first time – the server checks every
// rule again and answers with a reason we translate: 10 h per day, no Sundays or public holidays, no future dates,
// inside the order's period, budget left, own company's order.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert, Clock } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@workspace/ui/components/field"
import { Progress } from "@workspace/ui/components/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import { formatDate, formatHours, formatWeekday, translateApiError } from "@/i18n/format.ts"
import { ApiError, api } from "@/lib/api.ts"
import type { BookableOrder, TimeEntry } from "@/lib/api-types.ts"
import { todayInCompanyTimeZone } from "@/lib/dates.ts"
import { useApi } from "@/lib/use-api.ts"
import { BookingCalendar } from "@/pages/consultant/booking-calendar.tsx"
import { BookingList, DAILY_LIMIT_MINUTES } from "@/pages/consultant/booking-list.tsx"

const HOURS = Array.from({ length: 11 }, (_, h) => String(h)) // 0 … 10
const MINUTES = ["0", "15", "30", "45"]
const DESCRIPTION_MIN = 10 // same limits as createTimeEntryRequest in the API
const DESCRIPTION_MAX = 500

export function BookTimePage() {
  const { t } = useTranslation()
  const orders = useApi<BookableOrder[]>("/orders/bookable")
  const entries = useApi<TimeEntry[]>("/time-entries/mine")
  const today = todayInCompanyTimeZone()

  const [form, setForm] = React.useState({ orderId: "", workDate: today, hours: "0", minutes: "0", description: "" })
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const update = (changes: Partial<typeof form>) => setForm((current) => ({ ...current, ...changes }))

  // With only one order there is nothing to choose: pick it.
  if (orders.data?.length === 1 && form.orderId === "") update({ orderId: String(orders.data[0]!.id) })

  const order = orders.data?.find((o) => String(o.id) === form.orderId)
  const durationMinutes = Number(form.hours) * 60 + Number(form.minutes)
  const bookedThatDay = (entries.data ?? [])
    .filter((e) => e.workDate === form.workDate)
    .reduce((sum, e) => sum + e.durationMinutes, 0)
  const overDailyLimit = bookedThatDay + durationMinutes > DAILY_LIMIT_MINUTES

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!order) return
    setError(null)
    setSubmitting(true)
    try {
      await api<TimeEntry>("/time-entries", {
        method: "POST",
        body: JSON.stringify({
          orderId: order.id,
          workDate: form.workDate,
          durationMinutes,
          description: form.description,
        }),
      })
      toast.success(t("booking.saved", { hours: formatHours(durationMinutes), code: order.code }))
      // Keep order and date: the next booking is often for the same day.
      update({ hours: "0", minutes: "0", description: "" })
      entries.reload()
    } catch (caught) {
      setError(caught instanceof ApiError ? translateApiError(caught) : t("errors.INTERNAL_ERROR"))
    } finally {
      setSubmitting(false)
    }
  }

  const loadError = orders.error ?? entries.error

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{t("booking.title")}</CardTitle>
          <CardDescription>{t("booking.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {loadError && (
            <Alert variant="destructive" className="mb-4">
              <CircleAlert aria-hidden />
              <AlertTitle>{t("booking.loadFailed")}</AlertTitle>
              <AlertDescription>{translateApiError(loadError)}</AlertDescription>
            </Alert>
          )}
          {orders.data?.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("booking.noOrders")}</p>
          ) : (
            <form onSubmit={handleSubmit}>
              <FieldGroup>
                {error && (
                  <Alert variant="destructive">
                    <CircleAlert aria-hidden />
                    <AlertTitle>{t("booking.rejected")}</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Field>
                  <FieldLabel htmlFor="booking-order">{t("booking.order")}</FieldLabel>
                  <Select value={form.orderId} onValueChange={(orderId) => update({ orderId })}>
                    <SelectTrigger id="booking-order" className="w-full">
                      <SelectValue placeholder={t("booking.chooseOrder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {orders.data?.map((o) => (
                        <SelectItem key={o.id} value={String(o.id)}>
                          <span className="font-mono text-xs">{o.code}</span> {o.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {order && (
                    <FieldDescription>
                      {t("booking.period", { start: formatDate(order.startDate), end: formatDate(order.endDate) })}
                    </FieldDescription>
                  )}
                </Field>
                {/* Duration before the date: the calendar then shows the days where this duration would clash. */}
                <FieldSet>
                  <FieldLegend variant="label">{t("booking.duration")}</FieldLegend>
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={form.hours} onValueChange={(hours) => update({ hours })}>
                      <SelectTrigger className="w-full" aria-label={t("booking.hours")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((h) => (
                          <SelectItem key={h} value={h}>
                            {t("booking.hoursValue", { count: Number(h) })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={form.minutes} onValueChange={(minutes) => update({ minutes })}>
                      <SelectTrigger className="w-full" aria-label={t("booking.minutes")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MINUTES.map((m) => (
                          <SelectItem key={m} value={m}>
                            {t("booking.minutesValue", { count: Number(m) })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </FieldSet>
                <FieldSet>
                  <FieldLegend variant="label">{t("booking.date")}</FieldLegend>
                  <BookingCalendar
                    value={form.workDate}
                    onChange={(workDate) => update({ workDate })}
                    order={order}
                    today={today}
                    entries={entries.data ?? []}
                    durationMinutes={durationMinutes}
                  />
                  <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <li className="flex items-center gap-1.5">
                      <span className="bg-destructive/15 size-3 rounded-sm" aria-hidden />
                      {t("calendar.legendConflict")}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <span className="bg-muted-foreground/25 size-3 rounded-sm" aria-hidden />
                      {t("calendar.legendBlocked")}
                    </li>
                    <li>{t("calendar.legendHours")}</li>
                  </ul>
                  {/* The selected day at a glance, so the 10-hour limit is no surprise. */}
                  <div className="grid gap-1.5">
                    <p className="text-sm font-medium">{formatWeekday(form.workDate)}</p>
                    <Progress
                      value={Math.min(((bookedThatDay + durationMinutes) / DAILY_LIMIT_MINUTES) * 100, 100)}
                      aria-label={t("booking.dayProgress")}
                    />
                    <FieldDescription className={overDailyLimit ? "text-destructive" : undefined}>
                      {overDailyLimit
                        ? t("booking.overLimit", { booked: formatHours(bookedThatDay) })
                        : t("booking.alreadyBooked", {
                            booked: formatHours(bookedThatDay),
                            limit: formatHours(DAILY_LIMIT_MINUTES),
                          })}
                    </FieldDescription>
                  </div>
                </FieldSet>
                <Field>
                  <FieldLabel htmlFor="booking-description">{t("booking.work")}</FieldLabel>
                  <Textarea
                    id="booking-description"
                    required
                    minLength={DESCRIPTION_MIN}
                    maxLength={DESCRIPTION_MAX}
                    placeholder={t("booking.workPlaceholder")}
                    value={form.description}
                    onChange={(e) => update({ description: e.target.value })}
                  />
                  <FieldDescription className="tabular-nums">
                    {t("booking.workHint", { count: form.description.trim().length, max: DESCRIPTION_MAX })}
                  </FieldDescription>
                </Field>
                <Button type="submit" disabled={submitting || !order || durationMinutes === 0}>
                  <Clock aria-hidden />
                  {submitting ? t("booking.saving") : t("booking.submit")}
                </Button>
              </FieldGroup>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("booking.mine")}</CardTitle>
          <CardDescription>{t("booking.mineDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {entries.loading ? (
            <div className="grid gap-3">
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <BookingList entries={entries.data ?? []} orders={orders.data ?? []} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
