// Loads what the forecast needs for several orders at once (ticket #51, ADR 0015): the pace, and how much of the
// team is away on a coming day (ticket #10, ADR 0016). The calculation itself is in domain/forecast.ts.
import { type BudgetForecast, PACE_WINDOW_DAYS, forecastBudget } from "../domain/forecast.js"
import type { Order } from "../domain/models.js"
import { addDays } from "../domain/public-holidays.js"
import type { Db } from "../persistence/db.js"
import { timeEntryRepository, unavailableDayRepository } from "../persistence/repositories.js"

export async function forecastOrders(
  db: Db,
  orders: Order[],
  bookedMinutes: Map<number, number>,
  leadTimeWeeks: number,
  today: string,
): Promise<Map<number, BudgetForecast>> {
  const ids = orders.map((o) => o.id)
  const since = addDays(today, 1 - PACE_WINDOW_DAYS)
  const entries = timeEntryRepository(db)
  const recentMinutes = await entries.minutesPerOrderSince(ids, since)
  const team = await entries.consultantsPerOrderSince(ids, since)
  const away = await unavailableDayRepository(db).findUserIdsPerDateFrom([...team.values()].flat(), addDays(today, 1))

  return new Map(
    orders.map((order) => {
      const people = team.get(order.id) ?? []
      // Everyone on the team is assumed to work about the same share: two of four away means half the pace that day.
      const capacityOn = (date: string) => {
        const absent = people.filter((id) => away.get(date)?.has(id)).length
        return people.length === 0 ? 1 : 1 - absent / people.length
      }
      const forecast = forecastBudget({
        order,
        bookedMinutes: bookedMinutes.get(order.id) ?? 0,
        minutesInPaceWindow: recentMinutes.get(order.id) ?? 0,
        today,
        leadTimeWeeks,
        capacityOn,
      })
      return [order.id, forecast]
    }),
  )
}
