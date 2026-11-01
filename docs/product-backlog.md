# Product backlog

The single list of everything we may build, ordered by priority. The live version is the
[GitHub Project #2](https://github.com/users/devjimah/projects/2/views/1) board; this page is the snapshot from the start
of Sprint 2 (Sun 1 Nov 2026). Done stories are in the [Sprint 1 review](sprints/sprint-1-review.md).

## How we order it

- **P0** – needed for the sprint goal or the hand-in. **P1** – strengthens the core flow or a scoring criterion.
  **P2** – later, if time is left, or the next stage after the hackathon.
- **Size** XS – XL is a rough guess, refined in sprint planning.
- The areas follow the guardrails of the [challenge](challenge.md). Every story names its source.
- The acceptance criteria in the issues are **proposals**. Each story with *Open questions* needs a team decision
  before it is built.

## Sprints

| Sprint | Days | Goal | Plan |
|---|---|---|---|
| Sprint 1 | Fri 30 – Sat 31 Oct | A consultant books time; the client sees the budget change | [review](sprints/sprint-1-review.md) |
| Sprint 2 | Sun 1 – Mon 2 Nov | The client checks the work and looks ahead | [backlog](sprints/sprint-2-backlog.md) |
| Sprint 3 – Ship | Tue 3 Nov, until 11:00 | The jury runs it from the README | #57 – #60 |

## Stories by area

### Record the work

| Issue | Story | Priority | Size | Sprint |
|---|---|---|---|---|
| [#20](https://github.com/devjimah/code-six-timebooking/issues/20) | Decision: store start/end times on time entries (overlap and rest rules) | P1 | S | Sprint 2 |
| [#53](https://github.com/devjimah/code-six-timebooking/issues/53) | Consultants correct or delete their own bookings while they are still open | P1 | S | Sprint 2 |
| [#61](https://github.com/devjimah/code-six-timebooking/issues/61) | Accounting objects: bookings land on an order item and project element | P1 | M | – |
| [#63](https://github.com/devjimah/code-six-timebooking/issues/63) | Book faster: repeat a booking or copy last week | P2 | M | – |
| [#64](https://github.com/devjimah/code-six-timebooking/issues/64) | Import bookings from the supplier's own time tracking (CSV) | P2 | L | – |

### Follow the rules

| Issue | Story | Priority | Size | Sprint |
|---|---|---|---|---|
| [#54](https://github.com/devjimah/code-six-timebooking/issues/54) | Rule: one person cannot book two overlapping times | P1 | S | Sprint 2 |
| [#55](https://github.com/devjimah/code-six-timebooking/issues/55) | ArbZG §5: at least 11 hours rest between two working days | P1 | S | Sprint 2 |
| [#65](https://github.com/devjimah/code-six-timebooking/issues/65) | ArbZG §4: breaks after 6 and 9 hours of work | P2 | S | – |
| [#66](https://github.com/devjimah/code-six-timebooking/issues/66) | Public holidays per federal state of the work location | P2 | M | – |

### Track budgets

| Issue | Story | Priority | Size | Sprint |
|---|---|---|---|---|
| [#68](https://github.com/devjimah/code-six-timebooking/issues/68) | Show budgets in person-days as well as hours and euros | P2 | S | – |
| [#69](https://github.com/devjimah/code-six-timebooking/issues/69) | Framework agreements: one total budget shared by several orders | P2 | L | – |
| [#70](https://github.com/devjimah/code-six-timebooking/issues/70) | Follow-up order proposal from the early warning | P2 | M | – |
| [#71](https://github.com/devjimah/code-six-timebooking/issues/71) | Supplier overview: how much we depend on each supplier | P2 | S | – |

### Look ahead

| Issue | Story | Priority | Size | Sprint |
|---|---|---|---|---|
| [#51](https://github.com/devjimah/code-six-timebooking/issues/51) | Budget forecast: how long will the budget last at the current pace? | P0 | L | Sprint 2 |
| [#72](https://github.com/devjimah/code-six-timebooking/issues/72) | Forecast: company closure days such as the Christmas shutdown | P2 | S | – |
| [#73](https://github.com/devjimah/code-six-timebooking/issues/73) | Forecast scenarios: an extra consultant or a longer project | P2 | M | – |
| [#74](https://github.com/devjimah/code-six-timebooking/issues/74) | Forecast shows its uncertainty honestly | P2 | S | – |
| [#10](https://github.com/devjimah/code-six-timebooking/issues/10) | Consultants mark days as unavailable, without a reason (needs team decision) | – | – | Sprint 2 |

### Check and approve

| Issue | Story | Priority | Size | Sprint |
|---|---|---|---|---|
| [#50](https://github.com/devjimah/code-six-timebooking/issues/50) | Check and approve: project managers approve or return bookings before invoicing | P0 | L | Sprint 2 |
| [#75](https://github.com/devjimah/code-six-timebooking/issues/75) | Monthly proof of work per order (Leistungsnachweis) | P1 | M | – |
| [#67](https://github.com/devjimah/code-six-timebooking/issues/67) | Highlight unusual bookings for the project manager | P2 | S | – |
| [#76](https://github.com/devjimah/code-six-timebooking/issues/76) | Invoice check: compare invoiced hours with approved hours | P2 | L | – |

### Roles, sign-in and privacy

| Issue | Story | Priority | Size | Sprint |
|---|---|---|---|---|
| [#62](https://github.com/devjimah/code-six-timebooking/issues/62) | Consultants see only the orders they are assigned to | P2 | M | – |
| [#77](https://github.com/devjimah/code-six-timebooking/issues/77) | Supplier manager role: the employer sees its own consultants | P2 | M | – |
| [#78](https://github.com/devjimah/code-six-timebooking/issues/78) | Sign-in with the customer's identity provider (OpenID Connect) | P2 | L | – |

### AI (always with a mock switch)

| Issue | Story | Priority | Size | Sprint |
|---|---|---|---|---|
| [#79](https://github.com/devjimah/code-six-timebooking/issues/79) | AI: type a sentence, get bookings to confirm | P2 | M | – |
| [#80](https://github.com/devjimah/code-six-timebooking/issues/80) | AI: ask about a budget in plain language | P2 | M | – |
| [#81](https://github.com/devjimah/code-six-timebooking/issues/81) | Weekly summary per order, including anything unusual | P2 | S | – |

### Engineering

| Issue | Story | Priority | Size | Sprint |
|---|---|---|---|---|
| [#52](https://github.com/devjimah/code-six-timebooking/issues/52) | Domain model: glossary and ER diagram of what we store now and next | P0 | S | Sprint 2 |
| [#56](https://github.com/devjimah/code-six-timebooking/issues/56) | CI: typecheck, lint and tests on every pull request | P1 | S | Sprint 2 |
| [#57](https://github.com/devjimah/code-six-timebooking/issues/57) | Docker Compose starts the API and the web app with one command | P1 | S | Sprint 3 – Ship |
| [#82](https://github.com/devjimah/code-six-timebooking/issues/82) | Accessibility check of the main screens | P2 | S | – |

### Hand-in

| Issue | Story | Priority | Size | Sprint |
|---|---|---|---|---|
| [#58](https://github.com/devjimah/code-six-timebooking/issues/58) | Product vision, product name and team names in the README and ADRs | P0 | XS | Sprint 3 – Ship |
| [#59](https://github.com/devjimah/code-six-timebooking/issues/59) | Demo data and script for "how long will the budget last?" | P0 | S | Sprint 3 – Ship |
| [#60](https://github.com/devjimah/code-six-timebooking/issues/60) | Run check from a fresh clone before the hand-in | P0 | XS | Sprint 3 – Ship |

## Left out on purpose (for now)

Proposals the team can confirm or change in [product-vision.md](product-vision.md) *What we leave out on purpose*:
the supplier's own payroll and vacation approval (the supplier is the employer), and paying invoices – the product
stops at a checked invoice.
