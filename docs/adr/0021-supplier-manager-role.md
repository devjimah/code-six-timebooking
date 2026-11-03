# 0021 · Supplier manager: the employer sees its own consultants, with times

- **Status:** accepted
- **Date:** 2026-11-02
- **Deciders:** Kamaldeen Fadatoyo, Abdulrashid, Jimah Abraham Zorwi, Fazail Osuman, Anwaar Ibrahim, Mansura Bawah
- **Ticket:** [#77](https://github.com/devjimah/code-six-timebooking/issues/77)

## Context

The supplier employs the consultants and is responsible for working-time law. The client must stay out of that, or it
starts to look like their employer ([roles-and-privacy.md](../roles-and-privacy.md)). Until now, nobody on the supplier
side could see more than their own bookings. We must decide what this role sees.

## Options considered

1. **All bookings of the own company, with start, end and break, read only** – the employer can check the rest periods
   and daily limits it is responsible for. / More personal data for one more role.
2. **Durations only** – less personal data. / The 11-hour rest cannot be checked without times.
3. **Leave the role out** – one role less to explain. / The supplier's responsibility stays on paper only.

## Decision

We choose **option 1**. The role `supplier_manager` belongs to one supplier, like a consultant.

- `GET /api/supplier/bookings?month=YYYY-MM` returns the bookings of that supplier's consultants, with times.
- The supplier comes from the manager's own account, never from the request, so no other company can be asked for.
- Read only: they cannot book, approve or correct.
- No money, and nothing else of the client's: no budgets, rates, order overviews or users.

## Consequences

- Start and end times now have two readers: the consultant and their employer. The client still never sees them.
- The server already refuses what breaks the Working Time Act, so this view is for the employer's own records, not a
  second check.
- One more role to keep out of every route: `requireRole` does that by default, and a test tries the client's routes.
