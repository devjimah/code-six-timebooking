// Use case "a project manager looks at the budget of their order" (ticket #18).
// Only the order's own project manager may see it (docs/roles-and-privacy.md, ADR 0004).
// With the forecast of how long it lasts (ticket #51, ADR 0015).
import { type OrderBudget, calculateOrderBudget } from "../domain/budget.js"
import { type BudgetForecast, PACE_WINDOW_DAYS, forecastBudget } from "../domain/forecast.js"
import { addDays } from "../domain/public-holidays.js"
import type { Order, User } from "../domain/models.js"
import type { Db } from "../persistence/db.js"
import { timeEntryRepository } from "../persistence/repositories.js"
import { todayInCompanyTimeZone } from "./clock.js"
import { loadOwnOrder } from "./own-order.js"

export async function getOrderBudget(
  db: Db,
  user: User,
  orderId: number,
  leadTimeWeeks: number,
  today = todayInCompanyTimeZone(),
): Promise<{ order: Order; budget: OrderBudget; forecast: BudgetForecast }> {
  const order = await loadOwnOrder(db, user, orderId)
  const entries = timeEntryRepository(db)
  const bookedMinutes = await entries.sumMinutesForOrder(order.id)
  const recent = await entries.minutesPerOrderSince([order.id], addDays(today, 1 - PACE_WINDOW_DAYS))
  return {
    order,
    budget: calculateOrderBudget(order, bookedMinutes),
    forecast: forecastBudget({ order, bookedMinutes, minutesInPaceWindow: recent.get(order.id) ?? 0, today, leadTimeWeeks }),
  }
}
