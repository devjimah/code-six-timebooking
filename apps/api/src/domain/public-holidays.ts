// Public holidays in Germany: those of every state, plus each state's own (ticket #66, ADR 0019).
// Several holidays move with Easter, so Easter Sunday is calculated for each year.
// Whole states only. Holidays of single towns or regions are left out (Augsburg's Peace Festival, Corpus Christi in parts
// of Saxony and Thuringia), with one exception: Assumption Day counts for all of Bavaria, though it only applies in its
// predominantly Catholic municipalities, because those include Munich and most of the state.
import type { GermanState } from "./models.js"

export const GERMAN_STATES = [
  "BW", "BY", "BE", "BB", "HB", "HH", "HE", "MV", "NI", "NW", "RP", "SL", "SN", "ST", "SH", "TH",
] as const satisfies readonly GermanState[]

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

type StateHoliday = (year: number) => [date: string, name: string]

const EPIPHANY: StateHoliday = (year) => [`${year}-01-06`, "Epiphany"]
const WOMENS_DAY: StateHoliday = (year) => [`${year}-03-08`, "International Women's Day"]
const EASTER_SUNDAY: StateHoliday = (year) => [easterSunday(year), "Easter Sunday"]
const WHIT_SUNDAY: StateHoliday = (year) => [addDays(easterSunday(year), 49), "Whit Sunday"]
const CORPUS_CHRISTI: StateHoliday = (year) => [addDays(easterSunday(year), 60), "Corpus Christi"]
const ASSUMPTION: StateHoliday = (year) => [`${year}-08-15`, "Assumption Day"]
const CHILDRENS_DAY: StateHoliday = (year) => [`${year}-09-20`, "World Children's Day"]
const REFORMATION: StateHoliday = (year) => [`${year}-10-31`, "Reformation Day"]
const ALL_SAINTS: StateHoliday = (year) => [`${year}-11-01`, "All Saints' Day"]
/** The Wednesday before 23 November. */
const REPENTANCE: StateHoliday = (year) => {
  const weekday = new Date(`${year}-11-22T00:00:00Z`).getUTCDay() // 0 = Sunday
  return [addDays(`${year}-11-22`, -((weekday + 4) % 7)), "Day of Repentance and Prayer"]
}

const STATE_HOLIDAYS: Record<GermanState, StateHoliday[]> = {
  BW: [EPIPHANY, CORPUS_CHRISTI, ALL_SAINTS],
  BY: [EPIPHANY, CORPUS_CHRISTI, ASSUMPTION, ALL_SAINTS],
  BE: [WOMENS_DAY],
  BB: [EASTER_SUNDAY, WHIT_SUNDAY, REFORMATION],
  HB: [REFORMATION],
  HH: [REFORMATION],
  HE: [CORPUS_CHRISTI],
  MV: [WOMENS_DAY, REFORMATION],
  NI: [REFORMATION],
  NW: [CORPUS_CHRISTI, ALL_SAINTS],
  RP: [CORPUS_CHRISTI, ALL_SAINTS],
  SL: [CORPUS_CHRISTI, ASSUMPTION, ALL_SAINTS],
  SN: [REFORMATION, REPENTANCE],
  ST: [EPIPHANY, REFORMATION],
  SH: [REFORMATION],
  TH: [CHILDRENS_DAY, REFORMATION],
}

/** All public holidays of a year for someone working in this state, in calendar order. Without a state: nationwide only. */
export function publicHolidays(year: number, state?: GermanState | null): Record<string, string> {
  const own = state ? STATE_HOLIDAYS[state].map((holiday) => holiday(year)) : []
  const all = { ...nationwideHolidays(year), ...Object.fromEntries(own) }
  return Object.fromEntries(Object.entries(all).sort(([a], [b]) => a.localeCompare(b)))
}

/** The public holiday on this date for someone working in this state, or null. */
export function publicHoliday(date: string, state?: GermanState | null): string | null {
  return publicHolidays(Number(date.slice(0, 4)), state)[date] ?? null
}

/** The nationwide public holiday on this date ("YYYY-MM-DD"), or null. */
export function nationwideHoliday(date: string): string | null {
  return nationwideHolidays(Number(date.slice(0, 4)))[date] ?? null
}

const isoDate = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`

// "2026-10-27" + 1 → "2026-10-28". Calculated in UTC so a daylight-saving change cannot shift the date.
// Also used by the rest-period rule to find the day before and after a booking.
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}
