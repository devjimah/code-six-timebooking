# 0015 · Budget forecast: the pace of the last 4 weeks and one fixed lead time

- **Status:** accepted
- **Date:** 2026-11-01
- **Deciders:** TODO (team names)
- **Ticket:** [#51](https://github.com/devjimah/code-six-timebooking/issues/51)

## Context

The challenge asks how long a budget lasts at the current pace, and when to order more. We must decide what "the
current pace" means and how long purchasing needs to place a follow-up order.

## Options considered

1. **Pace of the last 4 weeks, one fixed lead time** – reacts when a team grows or shrinks, simple to explain and
   to configure. / One unusual week moves the forecast; every supplier gets the same lead time.
2. **Pace of the last 8 weeks, one fixed lead time** – steadier. / Reacts slowly when the team changes.
3. **Pace of the last 4 weeks, a lead time per supplier** – more realistic. / A schema and form change that the demo
   hardly shows.

## Decision

We choose **option 1**: the pace is the hours booked on the order in the last 4 weeks, per week, and the lead time
is `PURCHASING_LEAD_TIME_WEEKS` (4 weeks, as in the challenge's example). The calculation lives in
`apps/api/src/domain/forecast.ts` and is computed on read, like the budget ([ADR 0008](0008-budget-calculation.md)).

- The remaining budget is used up day by day on **Monday to Saturday**, without public holidays: the same calendar
  as the booking rule. Saturday counts as a working day, as it does in the Working Time Act.
- An order younger than 4 weeks is averaged over the days it has existed, at least one week.

## Consequences

- The challenge's worked example is a unit test: at the same pace the budget is used up in week 50.
- A team that works Monday to Friday gets a date that is close but not exact, because the weekly pace is spread over
  six days. The end date can fall on a Saturday.
- Only nationwide public holidays count, not those of a single state. The forecast does not yet know about
  vacations ([#10](https://github.com/devjimah/code-six-timebooking/issues/10)).
- With no bookings in the last 4 weeks there is no forecast, and the screen says so instead of guessing.
