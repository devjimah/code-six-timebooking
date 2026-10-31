// An order runs for a period: work is only bought – and booked – between its start and end date.
// ISO dates ("2026-10-31") sort like text, so string comparison is enough.
import { DomainError } from "../errors.js"
import { formatDay } from "../format.js"
import type { Order } from "../models.js"

type Period = Pick<Order, "startDate" | "endDate">

export function assertValidOrderPeriod(period: Period): void {
  if (period.startDate > period.endDate) {
    throw new DomainError(
      "ORDER_PERIOD_INVALID",
      `The order cannot end (${formatDay(period.endDate)}) before it starts (${formatDay(period.startDate)}).`,
    )
  }
}

/** Booking rule: the work date lies inside the order's period. */
export function assertWithinOrderPeriod(input: { order: Period & Pick<Order, "code">; workDate: string }): void {
  const { order, workDate } = input
  if (workDate < order.startDate || workDate > order.endDate) {
    throw new DomainError(
      "OUTSIDE_ORDER_PERIOD",
      `Booking rejected: order ${order.code} runs from ${formatDay(order.startDate)} to ${formatDay(order.endDate)}; ` +
        `${formatDay(workDate)} is outside this period.`,
    )
  }
}

/**
 * Editing rule: a new period must still contain every booking already made on the order.
 * `booked` is the first and last work date booked so far, or null if nothing is booked yet.
 */
export function assertPeriodCoversBookings(period: Period, booked: { first: string; last: string } | null): void {
  if (booked && (booked.first < period.startDate || booked.last > period.endDate)) {
    throw new DomainError(
      "PERIOD_EXCLUDES_BOOKINGS",
      `Time is already booked from ${formatDay(booked.first)} to ${formatDay(booked.last)}; ` +
        "the period must include these days.",
    )
  }
}
