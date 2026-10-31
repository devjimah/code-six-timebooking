# 0006 · Business rules as pure functions in the domain

- **Status:** accepted
- **Date:** 2026-10-31
- **Deciders:** TODO (team names)
- **Ticket:** [#13](https://github.com/devjimah/code-six-timebooking/issues/13)

## Context

Our rules: at most 10 hours of work per person and day (German Working Time Act, ArbZG §3), and no booking
beyond the free budget of an order. More will follow (breaks, rest periods, public holidays). Scoring criterion 2
gives the most points when rules live in one place, are enforced on the server and every rule has tests for
the accepting and the rejecting case.

## Options considered

1. **Check rules in the route handler** – fast to write. / Rules are spread across controllers; testing needs
   HTTP and a database.
2. **Check rules in the database (constraints, triggers)** – impossible to bypass. / A 10-hour sum over several
   rows is hard to express in SQLite; error messages are not readable; hard for juniors to test.
3. **Pure functions in `apps/api/src/domain/rules/`** that get all data as arguments and throw `DomainError` –
   no database, no HTTP. / The caller must load the right data first (e.g. the minutes already booked that day).

## Decision

We choose **option 3**, one file per rule: `daily-limit.ts`, `order-budget.ts` and `duration.ts`, with tests in
`apps/api/test/domain/`. The use case loads the
data and calls the rules before saving ([ADR 0007](0007-booking-use-case-and-validation.md)).

## Consequences

- Unit tests run in milliseconds: accepts below, accepts exactly at the limit, rejects above.
- Each rule is one short file the team can explain to the jury.
- A rule is only safe if every write path calls it; the use case is the only place that saves time entries.
- Two bookings saved at the same moment could both pass the 10-hour check. Acceptable for the demo; production
  needs a transaction around check and insert.
