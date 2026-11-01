// The consultant's own bookings, grouped by day with the day's total against the 10-hour limit.
// Only the consultant sees this: the client sees single bookings per order, never totals per person and day
// (docs/roles-and-privacy.md).
import { useTranslation } from "react-i18next"

import { Badge } from "@workspace/ui/components/badge"
import { Separator } from "@workspace/ui/components/separator"
import { formatHours, formatWeekday } from "@/i18n/format.ts"
import type { BookableOrder, TimeEntry } from "@/lib/api-types.ts"

export const DAILY_LIMIT_MINUTES = 10 * 60 // German Working Time Act; the server enforces it (daily-limit.ts)

type Props = {
  entries: TimeEntry[]
  orders: BookableOrder[]
  /** Show only the newest days, e.g. on the home screen */
  maxDays?: number
}

/** Entries arrive newest first from the API; this keeps that order and groups them by work date. */
function groupByDay(entries: TimeEntry[]) {
  const days = new Map<string, TimeEntry[]>()
  for (const entry of entries) days.set(entry.workDate, [...(days.get(entry.workDate) ?? []), entry])
  return [...days].map(([date, dayEntries]) => ({
    date,
    entries: dayEntries,
    minutes: dayEntries.reduce((sum, e) => sum + e.durationMinutes, 0),
  }))
}

export function BookingList({ entries, orders, maxDays }: Props) {
  const { t } = useTranslation()
  const days = groupByDay(entries).slice(0, maxDays)
  const codeOf = (orderId: number) => orders.find((o) => o.id === orderId)?.code ?? `#${orderId}`

  if (days.length === 0) {
    return <p className="text-muted-foreground py-6 text-center text-sm">{t("booking.none")}</p>
  }

  return (
    <div className="grid gap-4">
      {days.map((day, index) => (
        <section key={day.date} aria-label={formatWeekday(day.date)} className="grid gap-2">
          {index > 0 && <Separator />}
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-medium">{formatWeekday(day.date)}</h3>
            <Badge variant={day.minutes >= DAILY_LIMIT_MINUTES ? "default" : "secondary"} className="tabular-nums">
              {t("booking.dayTotal", { booked: formatHours(day.minutes), limit: formatHours(DAILY_LIMIT_MINUTES) })}
            </Badge>
          </div>
          <ul className="grid gap-2">
            {day.entries.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="text-muted-foreground block font-mono text-xs">{codeOf(entry.orderId)}</span>
                  <span className="block break-words">{entry.description}</span>
                  {entry.status !== "open" && (
                    <Badge variant={entry.status === "returned" ? "destructive" : "secondary"} className="mt-1">
                      {t(`booking.status.${entry.status}`)}
                    </Badge>
                  )}
                  {entry.returnReason && (
                    <span className="text-destructive mt-1 block text-xs break-words">
                      {t("booking.returnReason", { reason: entry.returnReason })}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-right tabular-nums">
                  <span className="block">{formatHours(entry.durationMinutes)}</span>
                  <span className="text-muted-foreground block text-xs">
                    {t("booking.timeRange", { start: entry.startTime, end: entry.endTime })}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
