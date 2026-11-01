// Ticket #51: how long will the budget last at the current pace?
import { describe, expect, it } from "vitest"
import { forecastBudget } from "../../src/domain/forecast.js"

const HOUR = 60

// A 4-week window with 48 h per week is 8 h per working day (Monday to Saturday).
const forecast = (overrides: Partial<Parameters<typeof forecastBudget>[0]> = {}) =>
  forecastBudget({
    order: { startDate: "2026-07-01", endDate: "2027-01-31", budgetHours: 100 },
    bookedMinutes: 0,
    minutesInPaceWindow: 4 * 48 * HOUR,
    today: "2026-10-05", // a Monday
    leadTimeWeeks: 4,
    ...overrides,
  })

describe("the challenge's worked example", () => {
  // "Customer portal migration": 140 PD ordered, 84 used, 6 PD per week, project ends in week 5 of 2027.
  const example = forecast({
    order: { startDate: "2026-07-01", endDate: "2027-02-05", budgetHours: 140 * 8 },
    bookedMinutes: 84 * 8 * HOUR,
    minutesInPaceWindow: 4 * 6 * 8 * HOUR,
  })

  it("uses the budget up in week 50 at the same pace", () => {
    expect(example.state).toBe("runs_out_early")
    expect(example.paceMinutesPerWeek).toBe(48 * HOUR)
    expect(example.runsOutOn).toBe("2026-12-09") // Wednesday of week 50
  })

  it("says to order more 4 weeks earlier, in week 46", () => {
    expect(example.orderMoreBy).toBe("2026-11-11")
  })

  it("names what is missing until the project ends", () => {
    // 103 working days at 8 h, minus the 56 PD left = 47 PD. The challenge's 31 PD also counts vacations (#10).
    expect(example.missingMinutes).toBe(47 * 8 * HOUR)
  })
})

describe("planned absences (#10)", () => {
  // The same example; half the team is away for two weeks in October (12 working days at half pace = 6 days lost).
  const withVacation = forecast({
    order: { startDate: "2026-07-01", endDate: "2027-02-05", budgetHours: 140 * 8 },
    bookedMinutes: 84 * 8 * HOUR,
    minutesInPaceWindow: 4 * 6 * 8 * HOUR,
    capacityOn: (date) => (date >= "2026-10-12" && date <= "2026-10-24" ? 0.5 : 1),
  })

  it("moves the end of the budget back about a week, to week 51", () => {
    expect(withVacation.runsOutOn).toBe("2026-12-16") // Wednesday of week 51
  })

  it("needs less until the project ends, so less is missing", () => {
    expect(withVacation.missingMinutes).toBe(41 * 8 * HOUR)
  })

  it("uses no budget on a day when everyone is away", () => {
    const result = forecast({
      order: { startDate: "2026-07-01", endDate: "2027-01-31", budgetHours: 8 },
      capacityOn: (date) => (date === "2026-10-06" ? 0 : 1),
    })

    expect(result.runsOutOn).toBe("2026-10-07")
  })
})

describe("the budget's end date", () => {
  it("skips Sundays: 6 working days from Monday end on the next Monday", () => {
    const result = forecast({ order: { startDate: "2026-07-01", endDate: "2027-01-31", budgetHours: 48 } })

    expect(result.runsOutOn).toBe("2026-10-12")
  })

  it("skips public holidays: Christmas uses no budget", () => {
    // 8 h per day from Tue 22 Dec: 22, 23, 24, then 25 and 26 are holidays, 27 a Sunday, so 28 and 29 Dec
    const result = forecast({
      order: { startDate: "2026-07-01", endDate: "2027-01-31", budgetHours: 40 },
      today: "2026-12-21",
    })

    expect(result.runsOutOn).toBe("2026-12-29")
  })
})

describe("whether the budget lasts", () => {
  it("is fine when it lasts until the order ends", () => {
    const result = forecast({ order: { startDate: "2026-07-01", endDate: "2026-10-31", budgetHours: 1000 } })

    expect(result).toMatchObject({ state: "lasts", missingMinutes: 0, orderMoreBy: null })
  })

  it("warns when it runs out one working day before the order ends", () => {
    // Tue 6 to Fri 9 Oct is 4 working days; 3 × 8 h of budget run out on Thu 8 Oct.
    const result = forecast({ order: { startDate: "2026-07-01", endDate: "2026-10-09", budgetHours: 24 } })

    expect(result).toMatchObject({ state: "runs_out_early", runsOutOn: "2026-10-08", missingMinutes: 8 * HOUR })
  })

  it("does not warn when it runs out on the order's last day", () => {
    const result = forecast({ order: { startDate: "2026-07-01", endDate: "2026-10-08", budgetHours: 24 } })

    expect(result).toMatchObject({ state: "lasts", runsOutOn: "2026-10-08", missingMinutes: 0, orderMoreBy: null })
  })

  it("warns at once when the budget is already used up", () => {
    const result = forecast({ bookedMinutes: 100 * HOUR })

    expect(result).toMatchObject({ state: "runs_out_early", runsOutOn: "2026-10-05" })
  })

  it("gives an order-by date that may lie in the past", () => {
    const result = forecast({ order: { startDate: "2026-07-01", endDate: "2027-01-31", budgetHours: 16 } })

    expect(result.orderMoreBy! < "2026-10-05").toBe(true)
  })
})

describe("when there is nothing to forecast", () => {
  it("has no pace without bookings in the last 4 weeks", () => {
    expect(forecast({ minutesInPaceWindow: 0 })).toMatchObject({ state: "no_pace", runsOutOn: null, paceMinutesPerWeek: 0 })
  })

  it("has ended once the order's period is over", () => {
    expect(forecast({ today: "2027-02-01" }).state).toBe("ended")
  })
})

describe("the pace", () => {
  it("averages over 4 weeks", () => {
    expect(forecast({ minutesInPaceWindow: 4 * 10 * HOUR }).paceMinutesPerWeek).toBe(10 * HOUR)
  })

  it("averages a two-week-old order over its two weeks, so the pace is not understated", () => {
    const result = forecast({
      order: { startDate: "2026-09-22", endDate: "2027-01-31", budgetHours: 100 },
      minutesInPaceWindow: 20 * HOUR,
    })

    expect(result.paceMinutesPerWeek).toBe(10 * HOUR)
  })

  it("counts an order started today as one week", () => {
    const result = forecast({
      order: { startDate: "2026-10-05", endDate: "2027-01-31", budgetHours: 100 },
      minutesInPaceWindow: 8 * HOUR,
    })

    expect(result.paceMinutesPerWeek).toBe(8 * HOUR)
  })
})
