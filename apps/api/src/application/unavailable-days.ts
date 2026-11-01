// Use cases around the days a consultant is unavailable (ticket #10, ADR 0016). Who sees what is in
// docs/roles-and-privacy.md: the consultant sees their own; a project manager sees upcoming days of the consultants
// currently working on their order, without a reason.
import { PACE_WINDOW_DAYS } from "../domain/forecast.js"
import type { User } from "../domain/models.js"
import { addDays } from "../domain/public-holidays.js"
import { assertNoBookingsThatDay } from "../domain/rules/unavailable-day.js"
import type { Db } from "../persistence/db.js"
import { timeEntryRepository, unavailableDayRepository } from "../persistence/repositories.js"
import { todayInCompanyTimeZone } from "./clock.js"
import { loadOwnOrder } from "./own-order.js"

export async function markUnavailable(db: Db, consultant: User, date: string): Promise<void> {
  const bookedMinutes = await timeEntryRepository(db).sumMinutesForUserOnDate(consultant.id, date)
  assertNoBookingsThatDay({ date, bookedMinutes })
  await unavailableDayRepository(db).mark(consultant.id, date)
}

export async function listOrderUnavailableDays(
  db: Db,
  projectManager: User,
  orderId: number,
  today = todayInCompanyTimeZone(),
): Promise<{ date: string; consultantName: string }[]> {
  const order = await loadOwnOrder(db, projectManager, orderId)
  const since = addDays(today, 1 - PACE_WINDOW_DAYS)
  const people = await timeEntryRepository(db).consultantsPerOrderSince([order.id], since)
  return unavailableDayRepository(db).findForUsersFrom(people.get(order.id) ?? [], today)
}
