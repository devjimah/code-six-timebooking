// What needs someone's attention, in the app (docs/roles-and-privacy.md). Worked out from the data each time and never
// stored: when the cause is gone, so is the notification, and there is nothing to mark as read or to keep.
// Each role only gets what it may already see elsewhere.
import type { Order, User } from "../domain/models.js"
import type { Db } from "../persistence/db.js"
import { orderRepository, timeEntryRepository } from "../persistence/repositories.js"
import { todayInCompanyTimeZone } from "./clock.js"
import { forecastOrders } from "./forecast-orders.js"

export type Notification =
  | { type: "booking_returned"; timeEntryId: number; workDate: string; reason: string | null }
  | { type: "bookings_to_check"; orderId: number; code: string; count: number }
  | { type: "budget_runs_out"; orderId: number; code: string; runsOutOn: string }
  | { type: "order_more"; orderId: number; code: string; runsOutOn: string; orderMoreBy: string | null }

async function runningOutEarly(db: Db, orders: Order[], leadTimeWeeks: number, today: string) {
  const booked = await timeEntryRepository(db).sumMinutesPerOrder(orders.map((o) => o.id))
  const forecasts = await forecastOrders(db, orders, booked, leadTimeWeeks, today)
  return orders.flatMap((order) => {
    const forecast = forecasts.get(order.id)!
    return forecast.state === "runs_out_early" && forecast.runsOutOn
      ? [{ order, runsOutOn: forecast.runsOutOn, orderMoreBy: forecast.orderMoreBy }]
      : []
  })
}

export async function listNotifications(
  db: Db,
  user: User,
  leadTimeWeeks: number,
  today = todayInCompanyTimeZone(),
): Promise<Notification[]> {
  if (user.role === "consultant") {
    const entries = await timeEntryRepository(db).findByUser(user.id)
    return entries
      .filter((e) => e.status === "returned")
      .map((e) => ({ type: "booking_returned", timeEntryId: e.id, workDate: e.workDate, reason: e.returnReason }))
  }
  if (user.role === "project_manager") {
    const orders = (await orderRepository(db).findByProjectManager(user.id)).filter((o) => o.closedAt === null)
    const open = await timeEntryRepository(db).openCountPerOrder(orders.map((o) => o.id))
    const toCheck = orders.flatMap((o): Notification[] => {
      const count = open.get(o.id) ?? 0
      return count > 0 ? [{ type: "bookings_to_check", orderId: o.id, code: o.code, count }] : []
    })
    const short = await runningOutEarly(db, orders, leadTimeWeeks, today)
    return [
      ...short.map(({ order, runsOutOn }): Notification => ({ type: "budget_runs_out", orderId: order.id, code: order.code, runsOutOn })),
      ...toCheck,
    ]
  }
  if (user.role === "purchasing") {
    const orders = (await orderRepository(db).findAll()).filter((o) => o.closedAt === null)
    const short = await runningOutEarly(db, orders, leadTimeWeeks, today)
    return short
      .sort((a, b) => (a.orderMoreBy ?? "").localeCompare(b.orderMoreBy ?? ""))
      .map(({ order, runsOutOn, orderMoreBy }) => ({ type: "order_more", orderId: order.id, code: order.code, runsOutOn, orderMoreBy }))
  }
  return [] // the admin and the supplier manager have nothing waiting for them yet
}
