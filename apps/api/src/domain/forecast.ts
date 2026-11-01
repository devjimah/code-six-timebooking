// How long will the budget last at the current pace? (ticket #51, ADR 0015, the challenge's "look ahead")
// Pace = hours booked in the last 4 weeks, per week. The remaining budget is then used up day by day, on working
// days only: Sundays and public holidays use no budget, the same calendar as the booking rule.
import { addDays } from "./public-holidays.js"
import { isWorkingDay } from "./rules/working-day.js"

export const PACE_WINDOW_DAYS = 28
const WORKING_DAYS_PER_WEEK = 6 // Monday to Saturday, as in the Working Time Act
const MAX_DAYS_AFTER_ORDER_END = 365 // no need to look further: the budget clearly lasts

export type ForecastState =
  | "no_pace" // nothing booked in the last 4 weeks: there is no pace to forecast from
  | "ended" // the order's period is over
  | "lasts" // the budget lasts until the order ends
  | "runs_out_early" // the budget is used up before the order ends

export type BudgetForecast = {
  state: ForecastState
  paceMinutesPerWeek: number
  runsOutOn: string | null // "YYYY-MM-DD"; null without a pace, or when it lasts more than a year past the order's end
  missingMinutes: number // what the budget lacks until the order ends, at this pace
  orderMoreBy: string | null // runsOutOn minus the purchasing lead time; may already lie in the past
  leadTimeWeeks: number
}

export function forecastBudget(input: {
  order: { startDate: string; endDate: string; budgetHours: number }
  bookedMinutes: number
  minutesInPaceWindow: number // booked on this order in the last PACE_WINDOW_DAYS days, up to today
  today: string // "YYYY-MM-DD"
  leadTimeWeeks: number
}): BudgetForecast {
  const { order, today } = input
  const pace = paceMinutesPerWeek(input.minutesInPaceWindow, order.startDate, today)
  const forecast = {
    paceMinutesPerWeek: pace,
    runsOutOn: null,
    missingMinutes: 0,
    orderMoreBy: null,
    leadTimeWeeks: input.leadTimeWeeks,
  }
  if (today > order.endDate) return { ...forecast, state: "ended" }

  const remaining = order.budgetHours * 60 - input.bookedMinutes
  if (remaining > 0 && pace === 0) return { ...forecast, state: "no_pace" }

  const perWorkingDay = pace / WORKING_DAYS_PER_WEEK
  const runsOutOn = remaining <= 0 ? today : dayBudgetRunsOut(remaining, perWorkingDay, today, order.endDate)
  // Used up on the order's last day means it lasted exactly.
  if (runsOutOn === null || runsOutOn >= order.endDate) return { ...forecast, state: "lasts", runsOutOn }

  const neededUntilEnd = perWorkingDay * countWorkingDays(addDays(today, 1), order.endDate)
  return {
    ...forecast,
    state: "runs_out_early",
    runsOutOn,
    missingMinutes: Math.round(neededUntilEnd - Math.max(remaining, 0)),
    orderMoreBy: addDays(runsOutOn, -7 * input.leadTimeWeeks),
  }
}

/** A young order is averaged over the days it has existed (at least a week), so its pace is not understated. */
function paceMinutesPerWeek(minutes: number, startDate: string, today: string): number {
  const windowStart = addDays(today, 1 - PACE_WINDOW_DAYS)
  const firstDay = startDate > windowStart ? startDate : windowStart
  const days = Math.max(daysBetween(firstDay, today) + 1, 7)
  return Math.round((minutes / days) * 7)
}

function dayBudgetRunsOut(remaining: number, perWorkingDay: number, today: string, orderEnd: string): string | null {
  const lastDay = addDays(orderEnd, MAX_DAYS_AFTER_ORDER_END)
  let left = remaining
  for (let day = addDays(today, 1); day <= lastDay; day = addDays(day, 1)) {
    if (isWorkingDay(day)) left -= perWorkingDay
    if (left <= 0) return day
  }
  return null
}

function countWorkingDays(from: string, to: string): number {
  let count = 0
  for (let day = from; day <= to; day = addDays(day, 1)) if (isWorkingDay(day)) count++
  return count
}

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
