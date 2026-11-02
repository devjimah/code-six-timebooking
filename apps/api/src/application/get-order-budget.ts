// Use case "a project manager looks at the budget of their order" (ticket #18).
// Only the order's own project manager may see it (docs/roles-and-privacy.md, ADR 0004).
// With the forecast of how long it lasts (ticket #51, ADR 0015).
import { type OrderBudget, calculateOrderBudget } from "../domain/budget.js"
import type { BudgetForecast, ForecastScenario } from "../domain/forecast.js"
import type { Order, User } from "../domain/models.js"
import type { Db } from "../persistence/db.js"
import { timeEntryRepository } from "../persistence/repositories.js"
import { addDays } from "../domain/public-holidays.js"
import { todayInCompanyTimeZone } from "./clock.js"
import { forecastOrders } from "./forecast-orders.js"
import { loadOwnOrder } from "./own-order.js"

export async function getOrderBudget(
  db: Db,
  user: User,
  orderId: number,
  leadTimeWeeks: number,
  today = todayInCompanyTimeZone(),
): Promise<{ order: Order; budget: OrderBudget; forecast: BudgetForecast }> {
  const order = await loadOwnOrder(db, user, orderId)
  const bookedMinutes = await timeEntryRepository(db).sumMinutesForOrder(order.id)
  const forecasts = await forecastOrders(db, [order], new Map([[order.id, bookedMinutes]]), leadTimeWeeks, today)
  return { order, budget: calculateOrderBudget(order, bookedMinutes), forecast: forecasts.get(order.id)! }
}

/** What if another consultant joins, or the project runs longer? Only for the order's project manager; nothing is saved. */
export async function getOrderScenario(
  db: Db,
  user: User,
  orderId: number,
  leadTimeWeeks: number,
  scenario: ForecastScenario,
  today = todayInCompanyTimeZone(),
): Promise<{ order: Order; forecast: BudgetForecast }> {
  const order = await loadOwnOrder(db, user, orderId)
  const bookedMinutes = await timeEntryRepository(db).sumMinutesForOrder(order.id)
  const forecasts = await forecastOrders(db, [order], new Map([[order.id, bookedMinutes]]), leadTimeWeeks, today, scenario)
  return { order: { ...order, endDate: addDays(order.endDate, scenario.extraWeeks * 7) }, forecast: forecasts.get(order.id)! }
}
