# Sprint 1 review (Fri 30 – Sat 31 Oct 2026)

Plan: [Sprint 1 backlog](../sprint-1-backlog.md) · Board: [GitHub Project #2](https://github.com/users/devjimah/projects/2/views/1), iteration *Sprint 1*.

**Sprint goal:** an external consultant books working time on one of the client's orders, and the client sees what
that does to the order's budget – the core flow of the [challenge](../challenge.md).

**Result:** goal reached, sprint closed on Sun 1 Nov 2026 after the last PRs were merged. The core flow works end to
end in the web app: Carl Consultant books time in a calendar, and Paula Projectmanager sees the budget of the order
change and can check each booking.

## Delivered

| Story | What works | PR |
|---|---|---|
| #8, #3 Data storage and migrations | SQLite with Drizzle, versioned migrations, seed data with one demo user per role | #14, #15 |
| #5 Accounts and roles | Only admins create accounts; consultants belong to a supplier | #34 |
| #6 Sign-in | Signed session cookie, 401 / 403 checked on the server | #24 |
| #13, #9 Booking rules | 10 h per day, order budget, valid duration, no future dates, no Sundays or public holidays | #27, #37 |
| #11, #18 Orders and budget | Each role sees only its own orders; booked and remaining budget in hours and € | #30, #31 |
| #17, #19 Engineering | Domain errors with clear messages, one `npm test`, Swagger UI from the zod DTOs | #21, #33 |
| #23, #35 Audit log | Every request recorded with action and key facts; old events deleted automatically | #25, #36, #40 |
| Web app | Sign-in, German / English, admin screens with users and audit log | #22, #38, #39 |
| #46 Purchasing role | Suppliers and orders with budget and period, managed by purchasing | #42 |
| #47 Check the work | Project managers see each booking on their own orders, no totals per person | #43 |
| #48 Account management | Edit, deactivate and reactivate accounts; password reset with forced change | #44 |
| #12 Book time | Booking screen with a conflict calendar; a home screen for every role | #49 |

Evidence for the jury: 13 ADRs in [docs/adr/](../adr/), the [role matrix](../roles-and-privacy.md) with no planned rows
left, 260 API tests (`npm test`).

## Not finished in the sprint

- #46, #47, #48 and #12 waited in review until Sunday (stacked PRs #42 → #43 → #44 → #49, merged on 1 Nov). They count
  for Sprint 1, but the sprint ran one morning long.
- Not started, moved to Sprint 2: #10 (days a consultant is unavailable) and #20 / [ADR 0010](../adr/0010-time-entry-granularity.md)
  (start and end times) – both wait for a team decision.
- Still `TODO`: [product vision](../product-vision.md), [domain model](../domain.md), the product name in the README,
  a compose file (evidence map E). Each is now a story: #58, #52, #57.

## Retrospective

Written on Tue 3 Nov from the pull requests, commits and board, not at the end of the sprint.

**What helped most**

- **One story per pull request.** 21 pull requests in two days, each with its tests, and 260 API tests at the end.
- **Decisions written down.** 13 ADRs, so the reasons did not depend on anyone's memory.
- **Fast review on Saturday.** Most pull requests that day were merged within about an hour or two of being opened.

**What slowed us down**

- **A long chain late in the sprint.** #42 → #43 → #44 → #49 were opened on Saturday evening and merged on Sunday
  morning, so the sprint ran one morning long.
- **Decisions without an owner.** #10 and #20 waited for a team decision and moved to Sprint 2.
- **Documents left for later.** The product vision, the domain model and the compose file were still open at the end.
- **Uneven review.** 13 of the 21 pull requests have a teammate's approval; the other 8 have only Copilot's automated review.

**What changed in Sprint 2**

- The open questions were listed in the plan, under *Decisions for sprint planning*.
- The missing documents became stories: #58, #52 and #57.
- CI runs on every pull request (#56).
