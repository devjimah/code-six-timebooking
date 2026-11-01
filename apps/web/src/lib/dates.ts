// Calendar dates as "YYYY-MM-DD" strings, the same format the API uses. Strings compare correctly with < and >,
// and they avoid time-zone surprises of Date objects.

/** Today in the client company's time zone – the same "today" the server uses for its rules (clock.ts). */
export function todayInCompanyTimeZone(now = new Date()): string {
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

/** "2026-10-31" + 2 → "2026-11-02". Calculated in UTC, so daylight saving time cannot shift the day. */
export function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

/** The Monday of the week that contains the date (weeks start on Monday in Germany). */
export function startOfWeek(isoDate: string): string {
  const weekday = new Date(`${isoDate}T00:00:00Z`).getUTCDay() // 0 = Sunday
  return addDays(isoDate, -((weekday + 6) % 7))
}

/** Whole days from one date to another; negative when `to` lies before `from`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/**
 * Worked minutes of "HH:MM" start and end minus the break, for the form's preview only – 0 while the input is
 * incomplete or makes no sense. The server derives the real duration and explains what is wrong (working-times.ts).
 */
export function previewWorkedMinutes(startTime: string, endTime: string, breakMinutes: number): number {
  const toMinutes = (time: string) => {
    const match = /^(\d{2}):(\d{2})$/.exec(time)
    return match ? Number(match[1]) * 60 + Number(match[2]) : null
  }
  const start = toMinutes(startTime)
  const end = toMinutes(endTime)
  if (start === null || end === null) return 0
  return Math.max(end - start - breakMinutes, 0)
}
