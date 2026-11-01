// Consultant: book working time on an order of the own company (POST /api/time-entries, issue #12), see the own
// bookings (GET /api/time-entries/mine), and correct or delete them until approved (issue #53). The form only helps to get it right first time – the server checks every
// rule again and answers with a reason we translate: 10 h per day, 11 h rest, no overlapping times, no Sundays or public
// holidays, no future dates, inside the order's period, budget left, own company's order.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { CircleAlert, Clock } from "lucide-react"
import { toast } from "sonner"

import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@workspace/ui/components/alert-dialog"
import { Button } from "@workspace/ui/components/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSet, FieldLegend } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/input"
import { Progress } from "@workspace/ui/components/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Textarea } from "@workspace/ui/components/textarea"
import { formatDate, formatHours, formatWeekday, translateApiError } from "@/i18n/format.ts"
import { ApiError, api } from "@/lib/api.ts"
import type { BookableOrder, TimeEntry } from "@/lib/api-types.ts"
import { findOverlap, previewWorkedMinutes, suggestedStart, todayInCompanyTimeZone } from "@/lib/dates.ts"
import { useApi } from "@/lib/use-api.ts"
import { BookingCalendar } from "@/pages/consultant/booking-calendar.tsx"
import { BookingList, DAILY_LIMIT_MINUTES } from "@/pages/consultant/booking-list.tsx"

const BREAKS = ["0", "15", "30", "45", "60"] // minutes
// After a booking, the times and the text start again; order and date stay for the next booking of the day,
// which then starts where this one ended.
const EMPTY_TIMES = { startTime: "09:00", endTime: "", breakMinutes: "0", description: "" }
const DESCRIPTION_MIN = 10 // same limits as createTimeEntryRequest in the API
const DESCRIPTION_MAX = 500

export function BookTimePage() {
  const { t } = useTranslation()
  const orders = useApi<BookableOrder[]>("/orders/bookable")
  const entries = useApi<TimeEntry[]>("/time-entries/mine")
  const today = todayInCompanyTimeZone()

  const [form, setForm] = React.useState({ orderId: "", workDate: today, ...EMPTY_TIMES })
  const [error, setError] = React.useState<string | null>(null)
  const [submitting, setSubmitting] = React.useState(false)
  const [editing, setEditing] = React.useState<TimeEntry | null>(null)
  const [deleting, setDeleting] = React.useState<TimeEntry | null>(null)
  const update = (changes: Partial<typeof form>) => setForm((current) => ({ ...current, ...changes }))

  // With only one order there is nothing to choose: pick it.
  if (orders.data?.length === 1 && form.orderId === "") update({ orderId: String(orders.data[0]!.id) })

  const order = orders.data?.find((o) => String(o.id) === form.orderId)
  const durationMinutes = previewWorkedMinutes(form.startTime, form.endTime, Number(form.breakMinutes))
  // A booking being corrected must not clash with its own old version, here as on the server.
  const otherEntries = (entries.data ?? []).filter((e) => e.id !== editing?.id)
  const entriesOn = (workDate: string) => otherEntries.filter((e) => e.workDate === workDate)
  const bookedThatDay = entriesOn(form.workDate).reduce((sum, e) => sum + e.durationMinutes, 0)
  const overDailyLimit = bookedThatDay + durationMinutes > DAILY_LIMIT_MINUTES
  const clash = findOverlap(form.startTime, form.endTime, entriesOn(form.workDate))
  // Why "Book" stays disabled: both times are there, but nothing is worked in between.
  const timesInvalid = form.endTime !== "" && durationMinutes === 0

  // A new day starts where the last booking of that day ended – unless the times are already filled in.
  const chooseDate = (workDate: string) =>
    update(form.endTime === "" ? { workDate, startTime: suggestedStart(entriesOn(workDate)) } : { workDate })

  function startEditing(entry: TimeEntry) {
    setEditing(entry)
    setError(null)
    setForm({
      orderId: String(entry.orderId),
      workDate: entry.workDate,
      startTime: entry.startTime,
      endTime: entry.endTime,
      breakMinutes: String(entry.breakMinutes),
      description: entry.description,
    })
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  function stopEditing() {
    setEditing(null)
    setError(null)
    update(EMPTY_TIMES)
  }

  async function confirmDelete() {
    if (!deleting) return
    try {
      await api(`/time-entries/${deleting.id}`, { method: "DELETE" })
      toast.success(t("booking.deleted"))
      if (editing?.id === deleting.id) stopEditing()
      entries.reload()
    } catch (caught) {
      toast.error(caught instanceof ApiError ? translateApiError(caught) : t("errors.INTERNAL_ERROR"))
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!order) return
    setError(null)
    setSubmitting(true)
    try {
      const saved = await api<TimeEntry>(editing ? `/time-entries/${editing.id}` : "/time-entries", {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify({
          orderId: order.id,
          workDate: form.workDate,
          startTime: form.startTime,
          endTime: form.endTime,
          breakMinutes: Number(form.breakMinutes),
          description: form.description,
        }),
      })
      toast.success(
        t(editing ? "booking.corrected" : "booking.saved", { hours: formatHours(durationMinutes), code: order.code }),
      )
      setEditing(null)
      update({ ...EMPTY_TIMES, startTime: saved.endTime })
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
          <CardTitle>{t(editing ? "booking.editTitle" : "booking.title")}</CardTitle>
          <CardDescription>
            {editing?.returnReason
              ? t("booking.returnReason", { reason: editing.returnReason })
              : t(editing ? "booking.editDescription" : "booking.description")}
          </CardDescription>
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
                {/* Times before the date: the calendar then shows the days where this much time would clash. */}
                <FieldSet>
                  <FieldLegend variant="label">{t("booking.workingTime")}</FieldLegend>
                  {/* Phones: start and end side by side, break below – three time fields do not fit in 390 px. */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Field>
                      <FieldLabel htmlFor="booking-start">{t("booking.start")}</FieldLabel>
                      <Input
                        id="booking-start"
                        type="time"
                        step={900}
                        required
                        value={form.startTime}
                        onChange={(e) => update({ startTime: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="booking-end">{t("booking.end")}</FieldLabel>
                      <Input
                        id="booking-end"
                        type="time"
                        step={900}
                        required
                        value={form.endTime}
                        onChange={(e) => update({ endTime: e.target.value })}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="booking-break">{t("booking.break")}</FieldLabel>
                      <Select value={form.breakMinutes} onValueChange={(breakMinutes) => update({ breakMinutes })}>
                        <SelectTrigger id="booking-break" className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BREAKS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {t("booking.breakValue", { count: Number(m) })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>
                  <FieldDescription className="tabular-nums">
                    {t("booking.worked", { hours: formatHours(durationMinutes) })}
                  </FieldDescription>
                  {/* The same checks as the server, before pressing "Book"; the server still decides. */}
                  {clash && (
                    <FieldDescription className="text-destructive">
                      {t("booking.overlap", {
                        start: clash.startTime,
                        end: clash.endTime,
                        code: orders.data?.find((o) => o.id === clash.orderId)?.code ?? "",
                      })}
                    </FieldDescription>
                  )}
                  {timesInvalid && (
                    <FieldDescription className="text-destructive">{t("booking.timesInvalid")}</FieldDescription>
                  )}
                </FieldSet>
                <FieldSet>
                  <FieldLegend variant="label">{t("booking.date")}</FieldLegend>
                  {/* A new key when editing starts or ends, so the calendar opens at the booking's month. */}
                  <BookingCalendar
                    key={editing?.id ?? "new"}
                    value={form.workDate}
                    onChange={chooseDate}
                    order={order}
                    today={today}
                    entries={otherEntries}
                    startTime={form.startTime}
                    endTime={form.endTime}
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
                  {submitting ? t("booking.saving") : t(editing ? "booking.saveCorrection" : "booking.submit")}
                </Button>
                {editing && (
                  <Button type="button" variant="outline" onClick={stopEditing}>
                    {t("booking.cancelEdit")}
                  </Button>
                )}
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
            <BookingList
              entries={entries.data ?? []}
              orders={orders.data ?? []}
              onEdit={startEditing}
              onDelete={setDeleting}
            />
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("booking.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting &&
                t("booking.deleteDescription", {
                  date: formatWeekday(deleting.workDate),
                  hours: formatHours(deleting.durationMinutes),
                })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("booking.cancelEdit")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>{t("booking.deleteConfirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
