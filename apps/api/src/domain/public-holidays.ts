// Public holidays that apply in every German state. States add their own (e.g. Corpus Christi in Bavaria,
// Reformation Day in Saxony); those are not covered yet – see ticket #9.
// Several holidays move with Easter, so Easter Sunday is calculated for each year.

/** Easter Sunday in the Gregorian calendar (anonymous Gregorian algorithm, also called Meeus/Jones/Butcher). */
export function easterSunday(year: number): string {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1
  return isoDate(year, month, day)
}

/** All nationwide public holidays of a year, by date ("YYYY-MM-DD" → name), in calendar order. */
export function nationwideHolidays(year: number): Record<string, string> {
  const easter = easterSunday(year)
  return {
    [`${year}-01-01`]: "New Year's Day",
    [addDays(easter, -2)]: "Good Friday",
    [addDays(easter, 1)]: "Easter Monday",
    [`${year}-05-01`]: "Labour Day",
    [addDays(easter, 39)]: "Ascension Day",
    [addDays(easter, 50)]: "Whit Monday",
    [`${year}-10-03`]: "Day of German Unity",
    [`${year}-12-25`]: "Christmas Day",
    [`${year}-12-26`]: "Boxing Day",
  }
}

/** The nationwide public holiday on this date ("YYYY-MM-DD"), or null. */
export function nationwideHoliday(date: string): string | null {
  return nationwideHolidays(Number(date.slice(0, 4)))[date] ?? null
}

const isoDate = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`

// Calculated in UTC so a daylight-saving change cannot shift the date.
function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
