// Use case "a consultant copies last week" (ticket #63). Each copy goes through bookTime, so it passes every booking
// rule like a booking typed by hand. A day that breaks a rule is refused with its reason; the others are still booked.
import { DomainError } from "../domain/errors.js"
import type { TimeEntry, User } from "../domain/models.js"
import { addDays } from "../domain/public-holidays.js"
import type { Db } from "../persistence/db.js"
import { timeEntryRepository } from "../persistence/repositories.js"
import { bookTime } from "./book-time.js"
import { todayInCompanyTimeZone } from "./clock.js"

export type CopyResult = {
  created: TimeEntry[]
  refused: { workDate: string; code: string; message: string }[]
  notYet: number // days of this week still to come: time is booked once it has been worked
}

/** The Monday of the week that contains the date. */
function mondayOf(date: string): string {
  return addDays(date, -((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7))
}

export async function copyLastWeek(db: Db, consultant: User, today = todayInCompanyTimeZone()): Promise<CopyResult> {
  const thisMonday = mondayOf(today)
  const lastMonday = addDays(thisMonday, -7)
  const lastWeek = (await timeEntryRepository(db).findByUser(consultant.id))
    // A returned booking was sent back for a reason, so it is not copied. Oldest first, as the work happened.
    .filter((e) => e.workDate >= lastMonday && e.workDate < thisMonday && e.status !== "returned")
    .reverse()

  const result: CopyResult = { created: [], refused: [], notYet: 0 }
  for (const entry of lastWeek) {
    const workDate = addDays(entry.workDate, 7)
    if (workDate > today) {
      result.notYet++
      continue
    }
    try {
      const { orderId, startTime, endTime, breakMinutes, description } = entry
      result.created.push(await bookTime(db, consultant, { orderId, workDate, startTime, endTime, breakMinutes, description }, today))
    } catch (error) {
      if (!(error instanceof DomainError)) throw error
      result.refused.push({ workDate, code: error.code, message: error.message })
    }
  }
  return result
}
