// German Working Time Act (Arbeitszeitgesetz, ArbZG) §3: at most 10 hours of work per working day.
// The limit is per person and day across ALL orders, so the caller passes the minutes already
// booked by this person on this date, on any order.
import { formatDay, formatHours } from "../format.js"
import { DomainError } from "../errors.js"

export const MAX_MINUTES_PER_DAY = 10 * 60

export function assertWithinDailyLimit(input: {
  workDate: string // "YYYY-MM-DD"
  alreadyBookedMinutes: number // this person, this date, all orders
  newMinutes: number
}): void {
  const left = Math.max(0, MAX_MINUTES_PER_DAY - input.alreadyBookedMinutes)
  if (input.newMinutes > left) {
    throw new DomainError(
      "DAILY_LIMIT_EXCEEDED",
      `Booking rejected: only ${formatHours(left)} left on ${formatDay(input.workDate)} ` +
        `(max. 10 h per day, German Working Time Act §3).`,
    )
  }
}
