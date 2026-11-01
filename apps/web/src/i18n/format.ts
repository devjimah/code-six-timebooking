// Format dates, hours and money for the active language with the browser's Intl API.
// Never build these strings by hand: German uses "27.10.2026", "3,5 h" and "1.234,56 €".
import type de from "./locales/de.json"
import i18n from "./index.ts"

const locale = () => (i18n.resolvedLanguage === "en" ? "en-GB" : "de-DE")

/** "2026-10-27" → "27.10.2026" (de) or "27/10/2026" (en) */
export function formatDate(isoDate: string): string {
  // Parse as a local date; new Date("2026-10-27") would be UTC midnight and can show the day before.
  const [year, month, day] = isoDate.split("-").map(Number)
  return new Intl.DateTimeFormat(locale(), { day: "2-digit", month: "2-digit", year: "numeric" }).format(
    new Date(year!, month! - 1, day!),
  )
}

/** "2026-10-27" → "Di., 27.10." (de) or "Tue 27/10" (en) – for lists grouped by day */
export function formatWeekday(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number)
  return new Intl.DateTimeFormat(locale(), { weekday: "short", day: "2-digit", month: "2-digit" }).format(
    new Date(year!, month! - 1, day!),
  )
}

/** "2026-10-27T14:05:00Z" → "27.10.2026, 15:05" (de, in the browser's time zone) */
export function formatDateTime(isoTimestamp: string): string {
  return new Intl.DateTimeFormat(locale(), { dateStyle: "short", timeStyle: "short" }).format(new Date(isoTimestamp))
}

/** 210 minutes → "3,5 h" (de) or "3.5 h" (en) */
export function formatHours(minutes: number): string {
  const hours = new Intl.NumberFormat(locale(), { maximumFractionDigits: 2 }).format(minutes / 60)
  return `${hours} h`
}

/** 123456 cents → "1.234,56 €" (de) or "€1,234.56" (en). Money is always integer cents (ADR 0008). */
export function formatEuroCents(cents: number): string {
  return new Intl.NumberFormat(locale(), { style: "currency", currency: "EUR" }).format(cents / 100)
}

type ErrorKey = `errors.${keyof typeof de.errors}`

/**
 * The API answers rule violations with { code, message } (ADR 0005).
 * Show our translation of the code; fall back to the API's English message for codes we do not know yet.
 */
export function translateApiError(error: { code: string; message: string }): string {
  const key = `errors.${error.code}`
  return i18n.exists(key) ? i18n.t(key as ErrorKey) : error.message
}
