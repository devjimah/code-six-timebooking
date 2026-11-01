// The date picker of the booking form: a month calendar (shadcn Calendar) that shows, before anyone presses "Book",
// where a booking would be refused:
// - greyed out: days the server never accepts – in the future, outside the order's period, Sundays, public holidays,
//   days the consultant marked as unavailable;
// - hours under the day number: what is already booked that day;
// - red: the chosen start and end overlap a booking of that day (#54), or the worked time would push that day
//   over the 10-hour limit.
// The server checks every rule again when booking.
import * as React from "react"
import { useTranslation } from "react-i18next"
import { de, enGB } from "react-day-picker/locale"

import { Calendar, CalendarDayButton } from "@workspace/ui/components/calendar"
import { formatHours } from "@/i18n/format.ts"
import type { BookableOrder, TimeEntry, UnavailableDay } from "@/lib/api-types.ts"
import { findOverlap } from "@/lib/dates.ts"
import { useApi } from "@/lib/use-api.ts"
import { DAILY_LIMIT_MINUTES } from "@/pages/consultant/booking-list.tsx"

type PublicHoliday = { date: string; name: string }

type Props = {
  value: string // "YYYY-MM-DD"
  onChange: (isoDate: string) => void
  order: BookableOrder | undefined
  today: string
  entries: TimeEntry[]
  unavailableDays: UnavailableDay[]
  /** The times chosen in the form; days where they overlap a booking or exceed the daily limit turn red */
  startTime: string
  endTime: string
  durationMinutes: number
}

// The calendar works with local Date objects, the API with "YYYY-MM-DD".
const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
const toDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y!, m! - 1, d!)
}

export function BookingCalendar({
  value,
  onChange,
  order,
  today,
  entries,
  unavailableDays,
  startTime,
  endTime,
  durationMinutes,
}: Props) {
  const { t, i18n } = useTranslation()
  const [month, setMonth] = React.useState(() => toDate(value))
  // Holidays come from the API – the same list the booking rule uses (GET /api/public-holidays).
  const holidays = useApi<PublicHoliday[]>(
    `/public-holidays?year=${month.getFullYear()}`
  )

  const entriesByDay = React.useMemo(() => {
    const map = new Map<string, TimeEntry[]>()
    for (const e of entries) map.set(e.workDate, [...(map.get(e.workDate) ?? []), e])
    return map
  }, [entries])
  const holidayName = (iso: string) =>
    holidays.data?.find((h) => h.date === iso)?.name
  const lastDay = order && order.endDate < today ? order.endDate : today

  /** Why the server would refuse any booking on this day, or null when the day is bookable. */
  function blockedReason(date: Date): string | null {
    const iso = toIso(date)
    if (iso > today) return t("calendar.future")
    if (order && (iso < order.startDate || iso > order.endDate))
      return t("calendar.outsidePeriod")
    if (date.getDay() === 0) return t("calendar.sunday")
    if (unavailableDays.some((d) => d.date === iso)) return t("calendar.unavailable")
    const holiday = holidayName(iso)
    return holiday ? t("calendar.holiday", { name: holiday }) : null
  }
  const dayEntries = (date: Date) => entriesByDay.get(toIso(date)) ?? []
  const booked = (date: Date) =>
    dayEntries(date).reduce((sum, e) => sum + e.durationMinutes, 0)
  const overlap = (date: Date) =>
    findOverlap(startTime, endTime, dayEntries(date))
  const overLimit = (date: Date) =>
    booked(date) > 0 && booked(date) + durationMinutes > DAILY_LIMIT_MINUTES
  const conflict = (date: Date) =>
    blockedReason(date) === null &&
    (overlap(date) !== undefined || overLimit(date))

  return (
    <DayInfo.Provider
      value={{ blockedReason, booked, overlap, conflict, durationMinutes }}
    >
      <Calendar
        mode="single"
        required
        selected={toDate(value)}
        onSelect={(date) => date && onChange(toIso(date))}
        month={month}
        onMonthChange={setMonth}
        startMonth={order ? toDate(order.startDate) : undefined}
        endMonth={toDate(lastDay)}
        locale={i18n.resolvedLanguage === "en" ? enGB : de}
        disabled={(date) => blockedReason(date) !== null}
        modifiers={{ conflict, booked: (date) => booked(date) > 0 }}
        modifiersClassNames={{
          conflict:
            "[&_button]:bg-destructive/15 [&_button]:text-destructive [&_button]:font-semibold",
        }}
        className="w-full p-0 [--cell-size:--spacing(10)]"
        components={{ DayButton: BookingDayButton }}
      />
    </DayInfo.Provider>
  )
}

type DayInfoValue = {
  blockedReason: (date: Date) => string | null
  booked: (date: Date) => number
  overlap: (date: Date) => TimeEntry | undefined
  conflict: (date: Date) => boolean
  durationMinutes: number
}
const DayInfo = React.createContext<DayInfoValue | null>(null)

/**
 * One day: the shadcn day button plus the hours already booked, and a tooltip that explains why the day cannot be
 * booked or would clash. Defined outside the calendar, so React keeps the same buttons between renders.
 */
function BookingDayButton({
  children,
  ...props
}: React.ComponentProps<typeof CalendarDayButton>) {
  const { t } = useTranslation()
  const info = React.useContext(DayInfo)!
  const reason = info.blockedReason(props.day.date)
  const minutes = info.booked(props.day.date)
  const clash = info.overlap(props.day.date)
  const title =
    reason ??
    (clash && info.conflict(props.day.date)
      ? t("calendar.overlap", { start: clash.startTime, end: clash.endTime })
      : info.conflict(props.day.date)
      ? t("calendar.conflict", {
          booked: formatHours(minutes),
          total: formatHours(minutes + info.durationMinutes),
        })
      : minutes > 0
        ? t("calendar.booked", { booked: formatHours(minutes) })
        : undefined)
  return (
    <CalendarDayButton {...props} title={title}>
      {children}
      {minutes > 0 && !props.day.outside && (
        <span className="tabular-nums">{formatHours(minutes)}</span>
      )}
    </CalendarDayButton>
  )
}
