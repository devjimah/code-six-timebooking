// Demo data for the challenge's worked example "how long will the budget last?" (ticket #59): an order of 140
// person-days with 84 used, at 6 person-days per week, worked by two consultants with vacation ahead.
// Dates count from the day of seeding, because the forecast looks at the last 4 weeks: fixed dates would slowly
// fall out of that window, and the demo would show a different story on the day of the jury.
import { addDays } from "../domain/public-holidays.js"
import { isWorkingDay } from "../domain/rules/working-day.js"
import type { Db } from "./db.js"
import { orderRepository, timeEntryRepository, unavailableDayRepository } from "./repositories.js"

const PERSON_DAY_MINUTES = 8 * 60
const DAYS_EACH = 42 // 84 person-days used, shared equally
const PROJECT_WEEKS_LEFT = 17 // the challenge's project runs on for about that long
const OPEN_FOR_DAYS = 14 // the last two weeks still wait for the project manager's check; older work is approved

const WORK = [
  "Migrate customer accounts to the new portal",
  "Reconcile legacy order data",
  "Implement the document upload",
  "Fix findings from the acceptance test",
]

export async function seedBudgetExample(
  db: Db,
  people: { projectManagerId: number; supplierId: number; annaId: number; benId: number },
  today: string,
): Promise<void> {
  // Anna works Monday to Wednesday and Ben Wednesday to Friday: 6 person-days per week together.
  const anna = workDaysBackFrom(today, [1, 2, 3])
  const ben = workDaysBackFrom(today, [3, 4, 5])

  const order = await orderRepository(db).create({
    code: "PO-2026-004",
    title: "Customer portal migration",
    supplierId: people.supplierId,
    projectManagerId: people.projectManagerId,
    budgetHours: (140 * PERSON_DAY_MINUTES) / 60,
    hourlyRateCents: 9500,
    startDate: [anna.at(-1)!, ben.at(-1)!].sort()[0]!,
    endDate: addDays(today, PROJECT_WEEKS_LEFT * 7),
    accountingObject: "P-2026-0902.01",
  })

  const booking = (userId: number) => (workDate: string, index: number) => ({
    userId,
    orderId: order.id,
    workDate,
    startTime: "09:00",
    endTime: "17:30",
    breakMinutes: 30,
    durationMinutes: PERSON_DAY_MINUTES,
    description: WORK[index % WORK.length]!,
    status: workDate < addDays(today, -OPEN_FOR_DAYS) ? ("approved" as const) : ("open" as const),
    returnReason: null,
  })
  await timeEntryRepository(db).createMany([...anna.map(booking(people.annaId)), ...ben.map(booking(people.benId))])

  const days = unavailableDayRepository(db)
  const away = async (userId: number, from: string, to: string) => {
    for (let day = from; day <= to; day = addDays(day, 1)) if (isWorkingDay(day)) await days.mark(userId, day)
  }
  // The challenge's vacation blocks: two weeks of Anna's soon, a week of Ben's later.
  await away(people.annaId, addDays(today, 14), addDays(today, 27))
  await away(people.benId, addDays(today, 35), addDays(today, 41))
  // The Christmas shutdown: nobody works, so no budget is used, but calendar time passes.
  const year = Number((today > `${today.slice(0, 4)}-12-24` ? addDays(today, 30) : today).slice(0, 4))
  for (const userId of [people.annaId, people.benId]) await away(userId, `${year}-12-24`, `${year + 1}-01-01`)
}

/** The newest DAYS_EACH working days up to today that fall on these weekdays (0 = Sunday). */
function workDaysBackFrom(today: string, weekdays: number[]): string[] {
  const dates: string[] = []
  for (let day = today; dates.length < DAYS_EACH; day = addDays(day, -1)) {
    if (weekdays.includes(new Date(`${day}T00:00:00Z`).getUTCDay()) && isWorkingDay(day)) dates.push(day)
  }
  return dates
}
