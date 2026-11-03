# Product backlog

The single list of everything we may build, ordered by priority. The live version is the
[GitHub Project #2](https://github.com/users/devjimah/projects/2/views/1) board; this page is the snapshot of Mon 2 Nov 2026,
after Sprint 2's work was merged. Stories finished earlier are in the [Sprint 1 review](sprints/sprint-1-review.md).

## How we order it

- **P0** – needed for the sprint goal or the hand-in. **P1** – strengthens the core flow or a scoring criterion.
  **P2** – later, if time is left, or the next stage after the hackathon.
- **Size** XS – XL is a rough guess, refined in sprint planning.
- The areas follow the guardrails of the [challenge](challenge.md). Every story names its source.
- The acceptance criteria in the issues are **proposals**.

## Sprints

| Sprint | Days | Goal | Plan |
|---|---|---|---|
| Sprint 1 | Fri 30 – Sat 31 Oct | A consultant books time; the client sees the budget change | [review](sprints/sprint-1-review.md) |
| Sprint 2 | Sun 1 – Mon 2 Nov | The client checks the work and looks ahead | [backlog](sprints/sprint-2-backlog.md), [review](sprints/sprint-2-review.md) |
| Sprint 3 – Ship | Tue 3 Nov, until 11:00 | The jury runs it from the README | #58, #60 still open |

## Open

### Hand-in (Sprint 3 – Ship)

| Issue | Story | Priority | Size | What is left |
|---|---|---|---|---|
| [#58](https://github.com/devjimah/code-six-timebooking/issues/58) | Product vision, product name and team names in the README and ADRs | P0 | XS | The "Deciders" line in every ADR. The vision, the README and the project facts are done |
| [#60](https://github.com/devjimah/code-six-timebooking/issues/60) | Run check from a fresh clone before the hand-in | P0 | XS | Passed on 2 Nov; must be repeated on Tuesday morning |

### Incident stories from the Product Owner

Added by the Product Owner on 2 Nov, as written in the issues. They describe a faulty working-time calculation, a works
council complaint and a platform with 99 customer companies. They have no priority or sprint yet: **the Product Owner
decides how they relate to this product and the hand-in.**

| Issue | Story |
|---|---|
| [#114](https://github.com/devjimah/code-six-timebooking/issues/114) | Temporary mitigation (feature toggle or hotfix) |
| [#115](https://github.com/devjimah/code-six-timebooking/issues/115) | Crisis communication and works council alignment |
| [#116](https://github.com/devjimah/code-six-timebooking/issues/116) | Sprint cancellation and re-alignment |
| [#117](https://github.com/devjimah/code-six-timebooking/issues/117) | Root-cause calculation fix |
| [#118](https://github.com/devjimah/code-six-timebooking/issues/118) | Historical data audit and correction script |
| [#119](https://github.com/devjimah/code-six-timebooking/issues/119) | Feature scope negotiation for weekend deliverables |
| [#120](https://github.com/devjimah/code-six-timebooking/issues/120) | Blameless post-mortem and process improvement |

### Next stage, after the hackathon

| Issue | Story | Priority | Size | Note |
|---|---|---|---|---|
| [#61](https://github.com/devjimah/code-six-timebooking/issues/61) | Accounting objects: bookings land on an order item and project element | P1 | M | Partly built: an order names one cost centre or project element (#102). Order items are missing |
| [#65](https://github.com/devjimah/code-six-timebooking/issues/65) | ArbZG §4: breaks after 6 and 9 hours of work | P2 | S | The break is recorded, but its length is not checked |
| [#68](https://github.com/devjimah/code-six-timebooking/issues/68) | Show budgets in person-days as well as hours and euros | P2 | S | Partly built: shown on the project manager's order page (#96). Not on the lists, and 1 PD = 8 h is not configurable |
| [#72](https://github.com/devjimah/code-six-timebooking/issues/72) | Forecast: company closure days such as the Christmas shutdown | P2 | S | Today only possible as each person's unavailable days |
| [#74](https://github.com/devjimah/code-six-timebooking/issues/74) | Forecast shows its uncertainty honestly | P2 | S | |
| [#67](https://github.com/devjimah/code-six-timebooking/issues/67) | Highlight unusual bookings for the project manager | P2 | S | |
| [#62](https://github.com/devjimah/code-six-timebooking/issues/62) | Consultants see only the orders they are assigned to | P2 | M | |
| [#64](https://github.com/devjimah/code-six-timebooking/issues/64) | Import bookings from the supplier's own time tracking (CSV) | P2 | L | |
| [#78](https://github.com/devjimah/code-six-timebooking/issues/78) | Sign-in with the customer's identity provider (OpenID Connect) | P2 | L | |
| [#80](https://github.com/devjimah/code-six-timebooking/issues/80) | AI: ask about a budget in plain language | P2 | M | |
| [#81](https://github.com/devjimah/code-six-timebooking/issues/81) | Weekly summary per order, including anything unusual | P2 | S | |
| [#82](https://github.com/devjimah/code-six-timebooking/issues/82) | Accessibility check of the main screens | P2 | S | |

## Done in Sprint 2

| Issue | Story | Priority | Size | Pull request |
|---|---|---|---|---|
| [#20](https://github.com/devjimah/code-six-timebooking/issues/20) | Decision: store start and end times on time entries | P1 | S | #84 |
| [#54](https://github.com/devjimah/code-six-timebooking/issues/54) | One person cannot book two overlapping times | P1 | S | #84 |
| [#55](https://github.com/devjimah/code-six-timebooking/issues/55) | ArbZG §5: at least 11 hours rest between two working days | P1 | S | #85 |
| [#52](https://github.com/devjimah/code-six-timebooking/issues/52) | Domain model: glossary and ER diagram | P0 | S | #89, #97 |
| [#56](https://github.com/devjimah/code-six-timebooking/issues/56) | CI: typecheck, lint and tests on every pull request | P1 | S | #90 |
| [#50](https://github.com/devjimah/code-six-timebooking/issues/50) | Check and approve | P0 | L | #91 |
| [#53](https://github.com/devjimah/code-six-timebooking/issues/53) | Consultants correct or delete their own bookings | P1 | S | #92 |
| [#51](https://github.com/devjimah/code-six-timebooking/issues/51) | Budget forecast | P0 | L | #93 |
| [#10](https://github.com/devjimah/code-six-timebooking/issues/10) | Days a consultant is unavailable, without a reason | – | – | #95 |
| [#59](https://github.com/devjimah/code-six-timebooking/issues/59) | Demo data and script for "how long will the budget last?" | P0 | S | #96 |
| [#57](https://github.com/devjimah/code-six-timebooking/issues/57) | Docker Compose starts the API and the web app | P1 | S | #98 |
| [#75](https://github.com/devjimah/code-six-timebooking/issues/75) | Monthly proof of work per order | P1 | M | #103 |
| [#76](https://github.com/devjimah/code-six-timebooking/issues/76) | Invoice check | P2 | L | #103 |
| [#63](https://github.com/devjimah/code-six-timebooking/issues/63) | Repeat a booking or copy last week | P2 | M | #104 |
| [#66](https://github.com/devjimah/code-six-timebooking/issues/66) | Public holidays per federal state | P2 | M | #105 |
| [#70](https://github.com/devjimah/code-six-timebooking/issues/70) | Follow-up order proposal from the early warning | P2 | M | #106 |
| [#69](https://github.com/devjimah/code-six-timebooking/issues/69) | Framework agreements | P2 | L | #107 |
| [#71](https://github.com/devjimah/code-six-timebooking/issues/71) | Supplier overview | P2 | S | #107 |
| [#73](https://github.com/devjimah/code-six-timebooking/issues/73) | Forecast scenarios | P2 | M | #108 |
| [#77](https://github.com/devjimah/code-six-timebooking/issues/77) | Supplier manager role | P2 | M | #109 |
| [#79](https://github.com/devjimah/code-six-timebooking/issues/79) | Fill in a booking from a sentence, with a mock switch | P2 | M | #113 |

Built without a ticket, from the team's feature list: the landing page (#100), hours short and week numbers for purchasing
and a date filter for the audit log (#101), closing orders (#106), in-app notifications (#110) and importing user accounts
from a file (#111).

## Left out on purpose (for now)

Proposals the team can confirm or change in [product-vision.md](product-vision.md) *What we leave out on purpose*:
the supplier's own payroll and vacation approval (the supplier is the employer), and paying invoices – the product
stops at a checked invoice.
