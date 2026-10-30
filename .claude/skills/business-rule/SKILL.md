---
name: business-rule
description: Implement a business rule in the domain with server-side enforcement, a clear error message and unit tests for accept and reject cases. Use when the team implements or discusses a validation or rule - budget limits, remaining budget, overlapping bookings, working time act (ArbZG) limits such as 10 hours per day or 11 hours rest, vacation, sick leave, public holidays, approvals - or writes tests for them.
---

# Business rule

Goal: each rule lives in one place in the domain, is enforced on the server, explains itself, and is covered by unit tests. Supports criterion 2, the one with the most points, in `docs/scoring.md`. Follows guide 3.2.

## Steps

1. Restate the rule in one sentence and confirm it with the team, including edge cases (e.g. exactly the remaining budget, a booking across midnight).
2. Put the rule into the domain object or a domain service (e.g. `Order.book(hours)`), not into the controller and not only into the UI.
3. Make the API reject violating requests with HTTP 4xx and a message a user understands, e.g. "Booking rejected: only 2.5 PD left on order 4500012345."
4. Write unit tests named as sentences:
   - one case where the rule accepts,
   - one case where the rule rejects,
   - one edge case.
5. Run the test command from the README and show that it passes.
6. Optionally show the error nicely in the UI too.
7. Explain the code in a few sentences so the team can explain it to the jury.

## Check existing rules

When asked, list all rules found in the code and whether each has an accept test and a reject test. Point out rules that exist only in the UI.

## Done when

- Every implemented rule has accept and reject tests, and the test command runs green.
