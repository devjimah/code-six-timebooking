# 0010 · Time entry granularity: duration only, or start and end times

- **Status:** proposed – the team decides in the next sprint planning
- **Date:** 2026-10-31
- **Deciders:** TODO (team names)
- **Ticket:** [#20](https://github.com/devjimah/code-six-timebooking/issues/20)

## Context

A time entry stores `work_date` and `duration_minutes`. That is enough for the 10-hour rule and the budget.
It is not enough for overlapping bookings or for the 11-hour rest period between two working days (ArbZG §5).
The challenge also warns: if the client controls exactly when external consultants work, it starts to act like
their employer, which German law does not allow; and daily hours are personal data.

## Options considered

1. **Keep duration only** – fastest to book on a phone; the client sees less personal detail. / No overlap or
   rest-period rule; fewer rules to show the jury.
2. **Add `start_time`, `end_time`, `break_minutes`; duration is derived** – enables overlap, rest period and
   break rules (ArbZG §4). / One more field on the phone; more personal data stored.
3. **Option 2 for the consultant, aggregated for the client** – the consultant records times; client roles above
   the project manager only see hours per order and week. / More work on the permission side.

## Decision

Open. Recommendation: **option 3**. It gives the most testable rules and answers the challenge's
"control vs. employer" and "transparency vs. privacy" questions in one design.

## Consequences (if option 3)

- New migration; existing seed entries get start and end times.
- New rules with tests: no overlap, 11-hour rest, break after 6 and 9 hours.
- `docs/roles-and-privacy.md` must state who sees start and end times and who sees only totals.
