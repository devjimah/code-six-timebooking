// One person cannot work twice at the same time (ticket #54, ADR 0010). Otherwise the same hour could be
// paid twice, for example on two orders. Like the 10-hour rule, this is per person across ALL orders, so the
// caller passes every booking of this person on this date.
// Bookings that only touch (10:00–12:00 and 12:00–13:00) do not overlap.
import { DomainError } from "../errors.js"
import { minutesOfDay } from "./working-times.js"

export type BookedSlot = {
  startTime: string // "HH:MM"
  endTime: string // "HH:MM"
  orderCode: string // to name the clashing booking in the message
}

export function assertNoOverlap(input: {
  startTime: string
  endTime: string
  sameDayBookings: BookedSlot[] // this person, this date, all orders
}): void {
  const start = minutesOfDay(input.startTime)
  const end = minutesOfDay(input.endTime)
  const clash = input.sameDayBookings.find(
    (booked) => start < minutesOfDay(booked.endTime) && minutesOfDay(booked.startTime) < end,
  )
  if (clash) {
    throw new DomainError(
      "BOOKING_OVERLAP",
      `Booking rejected: ${input.startTime}–${input.endTime} overlaps your booking ` +
        `${clash.startTime}–${clash.endTime} on ${clash.orderCode}.`,
    )
  }
}
