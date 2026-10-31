# Sprint 2 backlog (Sun 1 – Mon 2 Nov 2026)

Board: [GitHub Project #2](https://github.com/users/devjimah/projects/2/views/1), iteration *Sprint 2*.
Previous sprint: [Sprint 1 review](sprint-1-review.md). After this sprint comes *Sprint 3 – Ship* (Tuesday until 11:00).

**Sprint goal:** the client checks the work and looks ahead. Project managers approve bookings before an invoice is
paid, and project managers and purchasing see how long a budget lasts at the current pace.

## Selection

| Rank | Issue | Story | Why now |
|---|---|---|---|
| 1 | [#20](https://github.com/devjimah/code-six-timebooking/issues/20) | Decision: start and end times ([ADR 0010](../adr/0010-time-entry-granularity.md)) | Changes the booking data; decide before building on it |
| 2 | [#10](https://github.com/devjimah/code-six-timebooking/issues/10) | Decision: days a consultant is unavailable | The forecast needs to know about absences |
| 3 | [#50](https://github.com/devjimah/code-six-timebooking/issues/50) | Check and approve | Challenge guardrail *Check and approve* – not built yet |
| 4 | [#51](https://github.com/devjimah/code-six-timebooking/issues/51) | Budget forecast | Challenge guardrail *Look ahead* and its worked example |

## Decisions for sprint planning

Each one is a real choice for the team; the issues list the options.

1. **#20 / ADR 0010:** duration only, or start and end times? ADR 0010 recommends option 3: the consultant records
   times, the client sees totals. The choice decides whether overlap, 11-hour rest and break rules can be built.
2. **#10:** do we need unavailable days for the demo? If yes: per order or for all orders, and who sees them?
3. **#50:** approve booking by booking, or a whole week per order? Can a returned booking be corrected?
4. **#51:** how many past weeks define "the current pace", and is the purchasing lead time fixed or per supplier?

## Definition of Done (unchanged)

- Code reviewed and merged via a feature branch (`feat: …` commits).
- Tests pass; every business rule has an accepting and a rejecting unit test.
- Permissions checked on the server and listed in [roles-and-privacy.md](../roles-and-privacy.md).
- README and evidence map updated.
- Demo-able after a fresh setup.
