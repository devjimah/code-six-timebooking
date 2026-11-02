// No work on Sundays and public holidays (German Working Time Act, ArbZG §9).
// §10 allows exceptions (e.g. emergency repairs); an approved-exception flow is not built yet (ticket #9).
// Saturdays are normal working days under the Act.
import { formatDay } from "../format.js"
import { DomainError } from "../errors.js"
import type { GermanState } from "../models.js"
import { publicHoliday } from "../public-holidays.js"

/**
 * The calendar of this rule, also used by the budget forecast: not a Sunday and not a public holiday.
 * Holidays depend on the state someone works in (ticket #66); without a state, the nationwide ones count.
 */
export function isWorkingDay(date: string, state?: GermanState | null): boolean {
  return new Date(`${date}T00:00:00Z`).getUTCDay() !== 0 && publicHoliday(date, state) === null
}

export function assertWorkingDay(workDate: string, state?: GermanState | null): void {
  const isSunday = new Date(`${workDate}T00:00:00Z`).getUTCDay() === 0
  if (isSunday) {
    throw new DomainError(
      "SUNDAY_OR_HOLIDAY",
      `Booking rejected: ${formatDay(workDate)} is a Sunday. No work on Sundays and public holidays (German Working Time Act §9).`,
    )
  }
  const holiday = publicHoliday(workDate, state)
  if (holiday) {
    throw new DomainError(
      "SUNDAY_OR_HOLIDAY",
      `Booking rejected: ${formatDay(workDate)} is a public holiday (${holiday}). No work on Sundays and public holidays (German Working Time Act §9).`,
    )
  }
}
