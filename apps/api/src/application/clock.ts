// "Today" for the client company. It sits in Germany, so a booking made at 00:30 in Berlin
// counts for the new day even though it is still yesterday in UTC.
const COMPANY_TIME_ZONE = "Europe/Berlin"

/** Today's date in the company's time zone, e.g. "2026-10-31". */
export function todayInCompanyTimeZone(now = new Date()): string {
  // The en-CA locale formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: COMPANY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}
