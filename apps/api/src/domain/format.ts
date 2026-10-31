// Formatting for rule messages. The API answers in English; the web app translates by error code (ADR 0011).

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "2026-10-27" → "Tue 27 Oct 2026". Computed in UTC, so the server's time zone cannot shift the day. */
export function formatDay(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  const date = new Date(Date.UTC(year!, month! - 1, day!))
  return `${WEEKDAYS[date.getUTCDay()]} ${day} ${MONTHS[month! - 1]} ${year}`
}

/** 150 → "2.5 h", 15 → "0.25 h", 0 → "0 h" */
export function formatHours(minutes: number): string {
  return `${Number((minutes / 60).toFixed(2))} h`
}

/** Person-days, 1 PD = 8 h (challenge glossary). 120 → "0.25 PD" */
export function formatPersonDays(minutes: number): string {
  return `${Number((minutes / 60 / 8).toFixed(2))} PD`
}
