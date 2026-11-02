# 0020 · Framework agreements: the total budget is a hard limit

- **Status:** accepted
- **Date:** 2026-11-02
- **Deciders:** TODO (team names)
- **Ticket:** [#69](https://github.com/devjimah/code-six-timebooking/issues/69)

## Context

A framework agreement is a long-term contract with a supplier and a total budget, and individual orders draw from it.
We must decide what happens when a new or changed order would take more than is left.

## Options considered

1. **Refuse the order** – the same behaviour as every other budget rule, with a clear error and tests. / Purchasing must
   raise the agreement first, even for a small overrun they would accept.
2. **Warn only** – flexible, as real contracts sometimes are. / The total is then no limit, and nothing stops an overrun.

## Decision

We choose **option 1**. The rule is in `domain/rules/framework-agreement.ts`.

- An order can belong to one agreement. Without one, it works as it always has.
- It must be with the same supplier, lie inside the agreement's period and fit into what is left.
- The total is in euro cents, because orders in one agreement can have different hourly rates.
- An order takes its whole budget off the agreement when it is placed, not only what has been booked.

## Consequences

- Purchasing sees what its orders take, what has been booked on them and what is left. Sums only.
- An agreement cannot be lowered below its orders, moved away from them or given to another supplier while it has orders.
- A closed order still counts against the agreement, because it was ordered. If unused budget should flow back when an
  order is closed, that is a new rule.
