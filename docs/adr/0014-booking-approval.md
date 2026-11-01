# 0014 · Check and approve: a status on each booking, plus "approve all"

- **Status:** accepted
- **Date:** 2026-11-01
- **Deciders:** TODO (team names)
- **Ticket:** [#50](https://github.com/devjimah/code-six-timebooking/issues/50)

## Context

The challenge asks that the client reviews and approves the work before an invoice is paid. We must decide what a
project manager approves, and what happens to a booking they do not accept.

## Options considered

1. **A status on each booking only** – the smallest change, and one bad booking does not hold up the others. /
   Many clicks on a large order.
2. **A status on each booking, plus "approve all open"** – the same data model; the usual case is one click, and a
   single booking can still be returned. / "Approve all" also approves a booking made after the page was loaded.
3. **A proof of work per order and week or month** – closest to how invoices work today. / A new table, about twice
   the work, and one bad booking blocks the whole period.

## Decision

We choose **option 2**. A time entry has a `status` (`open`, `approved`, `returned`) and a `return_reason`.

- New bookings are `open`. Only an open booking can be approved or returned; returning needs a reason.
- A **returned booking is corrected by the consultant** ([#53](https://github.com/devjimah/code-six-timebooking/issues/53)):
  all booking rules run again and it is open again. Deleting and booking again would lose the reason.
- Returned hours **stay in the budget** until they are corrected. They were reported as worked, and hiding them would
  make the budget look better than it is.
- The rules live in `domain/rules/booking-review.ts`; only the order's own project manager may review (`NOT_YOUR_ORDER`).

## Consequences

- Purchasing sees approved and not approved hours per order, as sums, without seeing single bookings.
- The free-text reason is shown to the consultant and the project manager and never written to the audit log.
- **Known gap:** "approve all" approves every booking open at that moment, including one booked after the page was
  loaded. Acceptable for the demo; production would send the ids the project manager actually saw.
- A monthly proof of work (the `(later)` entity in [domain.md](../domain.md)) can be built on these statuses later.
