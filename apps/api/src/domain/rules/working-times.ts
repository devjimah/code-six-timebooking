// A booking records start time, end time and break on one day (ADR 0010); the duration is derived from them.
// The checks here make sure that derived duration is honest: no end before the start, and no break that
// swallows the whole working time.
import { DomainError } from "../errors.js"

export type WorkingTimes = {
  startTime: string // "HH:MM"
  endTime: string // "HH:MM", same day as startTime
  breakMinutes: number
}

const TIME_OF_DAY = /^([01]\d|2[0-3]):([0-5]\d)$/

/** Minutes since midnight of an "HH:MM" time, e.g. "09:30" → 570. */
export function minutesOfDay(time: string): number {
  const match = TIME_OF_DAY.exec(time)
  if (!match) {
    throw new DomainError("INVALID_TIME", `Booking rejected: "${time}" is not a time between 00:00 and 23:59.`)
  }
  return Number(match[1]) * 60 + Number(match[2])
}

/** The worked minutes of a booking: end − start − break. Throws if the times do not make sense. */
export function workedMinutes({ startTime, endTime, breakMinutes }: WorkingTimes): number {
  const start = minutesOfDay(startTime)
  const end = minutesOfDay(endTime)
  if (end <= start) {
    throw new DomainError(
      "END_NOT_AFTER_START",
      `Booking rejected: the end (${endTime}) must be after the start (${startTime}) on the same day.`,
    )
  }
  if (!Number.isInteger(breakMinutes) || breakMinutes < 0 || breakMinutes >= end - start) {
    throw new DomainError(
      "INVALID_BREAK",
      `Booking rejected: the break must be whole minutes, at least 0 and shorter than the ${end - start} minutes ` +
        `between ${startTime} and ${endTime} (got ${breakMinutes}).`,
    )
  }
  return end - start - breakMinutes
}
