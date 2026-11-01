// German Working Time Act (Arbeitszeitgesetz, ArbZG) §5: at least 11 hours of rest after the end of the working day
// (ticket #55). Like the 10-hour rule, this is about the person, so the caller passes this person's bookings on ALL
// orders. Bookings stay on one day (ADR 0010), so only the day before and the day after can be closer than 11 hours.
// Both are checked, because time is booked afterwards: Monday evening may be booked when Tuesday morning already is.
import { formatDay, formatHours } from "../format.js"
import { DomainError } from "../errors.js"
import { addDays } from "../public-holidays.js"
import { minutesOfDay } from "./working-times.js"

export const MIN_REST_MINUTES = 11 * 60
const DAY_MINUTES = 24 * 60
const LAW = "min. 11 h rest, German Working Time Act §5"

export function assertRestPeriod(input: {
  workDate: string // "YYYY-MM-DD"
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
  previousDayLastEnd: string | null // when this person's work ended the day before, any order; null = no work
  nextDayFirstStart: string | null // when this person's work starts the day after, any order; null = no work
}): void {
  const { workDate, previousDayLastEnd: before, nextDayFirstStart: after } = input
  const start = minutesOfDay(input.startTime)
  const end = minutesOfDay(input.endTime)

  if (before !== null) {
    const rest = DAY_MINUTES - minutesOfDay(before) + start
    if (rest < MIN_REST_MINUTES) {
      throw new DomainError(
        "REST_PERIOD_TOO_SHORT",
        `Booking rejected: only ${formatHours(rest)} rest after your work ended at ${before} on ` +
          `${formatDay(addDays(workDate, -1))}. Start at ${timeOfDay(minutesOfDay(before) + MIN_REST_MINUTES - DAY_MINUTES)} ` +
          `at the earliest (${LAW}).`,
      )
    }
  }
  if (after !== null) {
    const rest = DAY_MINUTES - end + minutesOfDay(after)
    if (rest < MIN_REST_MINUTES) {
      throw new DomainError(
        "REST_PERIOD_TOO_SHORT",
        `Booking rejected: only ${formatHours(rest)} rest before your work starts at ${after} on ` +
          `${formatDay(addDays(workDate, 1))}. End at ${timeOfDay(minutesOfDay(after) + DAY_MINUTES - MIN_REST_MINUTES)} ` +
          `at the latest (${LAW}).`,
      )
    }
  }
}

/** 540 → "09:00" */
const timeOfDay = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`
