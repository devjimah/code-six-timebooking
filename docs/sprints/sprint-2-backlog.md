# Sprint 2 backlog (Sun 1 – Mon 2 Nov 2026)

Board: [GitHub Project #2](https://github.com/users/devjimah/projects/2/views/1), iteration *Sprint 2*.
Previous sprint: [Sprint 1 review](sprint-1-review.md). All stories: [product backlog](../product-backlog.md).
After this sprint comes *Sprint 3 – Ship* (Tuesday until 11:00).

**Sprint goal:** the client checks the work and looks ahead. Project managers approve bookings before an invoice is
paid, and project managers and purchasing see how long a budget lasts at the current pace.

## Committed

| Rank | Issue | Story | Size | Why now |
|---|---|---|---|---|
| 1 | [#20](https://github.com/devjimah/code-six-timebooking/issues/20) | Decision: start and end times ([ADR 0010](../adr/0010-time-entry-granularity.md)) | S | Changes the booking data; decide before building on it |
| 2 | [#10](https://github.com/devjimah/code-six-timebooking/issues/10) | Decision: days a consultant is unavailable | – | The forecast needs to know about absences |
| 3 | [#52](https://github.com/devjimah/code-six-timebooking/issues/52) | Domain model: glossary and ER diagram | S | Criterion 1 evidence; `docs/domain.md` is still TODO |
| 4 | [#50](https://github.com/devjimah/code-six-timebooking/issues/50) | Check and approve | L | Challenge guardrail *Check and approve* – not built yet |
| 5 | [#53](https://github.com/devjimah/code-six-timebooking/issues/53) | Consultants correct or delete open bookings | S | A returned booking (#50) must be fixable |
| 6 | [#51](https://github.com/devjimah/code-six-timebooking/issues/51) | Budget forecast | L | Challenge guardrail *Look ahead* and its worked example |

## Stretch

Only when the committed stories are done. Label `stretch` on the board.

| Issue | Story | Size | Condition |
|---|---|---|---|
| [#54](https://github.com/devjimah/code-six-timebooking/issues/54) | No overlapping bookings of one person | S | Only if #20 decides for start and end times |
| [#55](https://github.com/devjimah/code-six-timebooking/issues/55) | ArbZG §5: 11 hours rest | S | Only if #20 decides for start and end times |
| [#56](https://github.com/devjimah/code-six-timebooking/issues/56) | CI: typecheck, lint and tests on every PR | S | – |

## Decisions for sprint planning

Each one is a real choice for the team; the issues list the options.

1. **#20 / ADR 0010:** duration only, or start and end times? ADR 0010 recommends option 3: the consultant records
   times, the client sees totals. The choice decides whether #54 and #55 can be built.
2. **#10:** do we need unavailable days for the demo? If yes: per order or for all orders, and who sees them?
3. **#50:** approve booking by booking, or a whole week per order? Can a returned booking be corrected (#53)?
4. **#51:** how many past weeks define "the current pace", and is the purchasing lead time fixed or per supplier?

## Next: Sprint 3 – Ship (Tue 3 Nov, until 11:00)

Already on the board: #58 product vision and team names, #57 Docker Compose, #59 demo data with the challenge's
budget example, #60 run check from a fresh clone.

## Definition of Done (unchanged)

- Code reviewed and merged via a feature branch (`feat: …` commits).
- Tests pass; every business rule has an accepting and a rejecting unit test.
- Permissions checked on the server and listed in [roles-and-privacy.md](../roles-and-privacy.md).
- README and evidence map updated.
- Demo-able after a fresh setup.
