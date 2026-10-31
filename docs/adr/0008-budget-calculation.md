# 0008 · Budget calculation: computed from bookings on read, money in euro cents

- **Status:** accepted
- **Date:** 2026-10-31
- **Deciders:** TODO (team names)
- **Ticket:** [#18](https://github.com/devjimah/code-six-timebooking/issues/18)

## Context

A project manager wants to see for each order the budget, the booked and the remaining amount, in hours and euros.
The schema stores `budget_hours` and `hourly_rate_cents` per order and `duration_minutes` per time entry. The
challenge counts budgets in person-days (1 PD = 8 h).

## Options considered

1. **Store a running `used_minutes` column on the order and update it on every booking** – fast to read. /
   Can drift from the real bookings (a failed update, a deleted entry); two places hold the same truth.
2. **Compute on read: `SUM(duration_minutes)` per order** – always matches the bookings; no extra column. /
   One query per request; slower with millions of rows.
3. **Money as floating-point euros** – simple to display. / Rounding errors (0.1 + 0.2 ≠ 0.3) in invoices.

## Decision

We choose **option 2** with all money as **integer euro cents** (already in the schema). The calculation lives
in `apps/api/src/domain/budget.ts`; repositories only return the sum of minutes. Person-days are derived as
hours ÷ 8 for display.

## Consequences

- No drift between the budget view and the bookings; easy to unit-test.
- Thousands of bookings per month are a trivial `SUM`; with far more data we add an index on `order_id` or
  a monthly summary table and replace this ADR.
- The UI formats cents as `1.234,56 €` for German users ([ADR 0011](0011-internationalisation.md)).
- The API also returns money as cents (`budgetCents`, `bookedCents`, `remainingCents`), not as euro decimals,
  so no rounding happens on the way to the client. Time is returned as hours and person-days, rounded to 2 decimals.
- An overrun is shown as a negative remainder with `overBudget: true`, never hidden.
