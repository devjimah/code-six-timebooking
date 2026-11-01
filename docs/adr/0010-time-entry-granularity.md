# 0010 · Time entry granularity: duration only, or start and end times

- **Status:** accepted
- **Date:** 2026-10-31 (proposed), 2026-11-01 (accepted in Sprint 2 planning)
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
3. **Option 2 for the consultant, durations for the client** – the consultant records times; the client sees
   durations only. / More work on the permission side.

## Decision

**Option 3.** The consultant records start time, end time and break minutes; the duration is derived from them
(`end − start − break`). The times exist so the server can check the Working Time Act, which is the supplier's
duty as the employer – the client only needs to know that the rules held, not when people worked.

| Role | Sees of a booking |
|---|---|
| Consultant | own bookings with start, end and break |
| Project manager | date, duration, description and name – as before, **no times** |
| Purchasing | sums per order only – as before |

The project manager checks *what* was done and *how much*, not *when*. The API decides this per role; the web
app never receives times it may not show.

## Consequences

- New migration: `start_time`, `end_time` (`HH:MM`, local time of the company) and `break_minutes` on
  `time_entries`. `duration_minutes` stays as a stored, derived value, so budget, 10-hour rule and forecast keep
  working unchanged. Existing entries get times derived from their duration.
- A booking lies within one calendar day (no night shifts across midnight) – a simplification for now.
- New rules with tests: valid times (end after start, break shorter than the working time), no overlap (#54),
  11-hour rest (#55); later the breaks after 6 and 9 hours (#65).
- Booking on the phone gets one more field; the form suggests times to keep it quick.
- [roles-and-privacy.md](../roles-and-privacy.md) lists the times as personal data seen only by the consultant.
