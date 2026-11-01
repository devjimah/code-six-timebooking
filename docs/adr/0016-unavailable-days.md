# 0016 · Unavailable days: that a consultant is away, never why, for all orders

- **Status:** accepted
- **Date:** 2026-11-01
- **Deciders:** TODO (team names)
- **Ticket:** [#10](https://github.com/devjimah/code-six-timebooking/issues/10)

## Context

The challenge says planned absences belong in the answer to how long a budget lasts. But sick days are health data
(GDPR Art. 9), and a client that manages the absences of a supplier's staff starts to look like their employer. We must
decide whether to build this at all, what we store, and whether a day applies to one order or to all.

## Options considered

1. **Leave it out** – saves time and data. / The forecast ignores absences, which the challenge names explicitly.
2. **One list per consultant, for all orders, without a reason** – simple, and it is true of the person, not the
   order. / A consultant on two orders cannot say "away from this one only".
3. **Per order, without a reason** – more exact for people on several orders. / More clicks and more data.

## Decision

We choose **option 2**. A consultant marks a date as unavailable. There is **no reason field**: not vacation, not sick.

- Only the consultant marks and removes their own days.
- A day is either marked or booked: booking on a marked day and marking a booked day are both refused.
- A **project manager** sees upcoming days of the consultants who booked on their order in the last 4 weeks, with the
  name and without a reason. **Purchasing** sees only the effect on the forecast, no names and no dates.
- The **forecast** assumes everyone on an order works about the same share: with two of four away, a day counts half
  ([ADR 0015](0015-budget-forecast.md)).

## Consequences

- The challenge's effect is a unit test: half the team away for two weeks moves the end of the budget from week 50
  to week 51.
- The forecast is rough when one person works far more on an order than the others.
- Someone joining an order has no bookings yet, so their days count neither for the project manager nor the forecast.
- Days stay stored after they have passed; deleting them is a proposal for the retention period
  ([roles-and-privacy.md](../roles-and-privacy.md)).
