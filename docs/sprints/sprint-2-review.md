# Sprint 2 review (Sun 1 – Mon 2 Nov 2026)

Plan: [Sprint 2 backlog](sprint-2-backlog.md) · Board: [GitHub Project #2](https://github.com/users/devjimah/projects/2/views/1), iteration *Sprint 2*. All stories: [product backlog](../product-backlog.md).

**Sprint goal:** the client checks the work and looks ahead. Project managers approve bookings before an invoice is
paid, and project managers and purchasing see how long a budget lasts at the current pace.

**Result:** goal reached. All 6 committed and all 3 stretch stories are merged, and 12 more stories from the backlog
with them. The demo script in the [README](../../README.md) shows the goal on order PO-2026-004.

## Delivered

| Area | What works | PR |
|---|---|---|
| Check and approve (#50, #53) | Project managers approve or return bookings; consultants correct or delete their own until approved | #91, #92 |
| Look ahead (#51, #10) | How long a budget lasts and when to order more; unavailable days, without a reason, count in the forecast | #93, #95 |
| Working time (#20, #54, #55) | Start, end and break; no overlapping bookings; 11 hours rest between working days | #84, #85 |
| Evidence and running it (#52, #56, #57, #59) | Glossary and ER diagram; CI on every pull request; Docker Compose; demo data for the challenge's example | #89, #97, #90, #98, #96 |
| Invoicing (#75, #76) | Monthly proof of work with CSV; invoice check against approved hours | #103 |
| Faster booking (#63, #79) | Copy last week, repeat a booking, fill in the form from a sentence with a mock switch | #104, #113 |
| Purchasing (#70, #69, #71, #73) | Follow-up orders, framework agreements, supplier overview, what-if scenarios | #106, #107, #108 |
| Rules and roles (#66, #77) | Public holidays per federal state; supplier manager role | #105, #109 |
| Without a ticket | Landing page, hours short and week numbers, audit log date filter, closing orders, notifications, user import | #100, #101, #106, #110, #111 |

Evidence for the jury: 22 ADRs in [docs/adr/](../adr/), 562 API tests (260 at the end of Sprint 1), and a fresh-clone run
check that passed on Tue 3 Nov.

## Not finished in the sprint

- **Moved to Sprint 3:** #58 (team names on the ADRs) and #60 (the final run check).
- **Partly built, left for the next stage:** #61 (order items are missing) and #68 (person-days only on the order page).
- **Checked less:** the web app has no automated tests, only checks in a browser. The Docker route ran in CI, but
  had not been tried in a browser by the end of the sprint.

## Retrospective

Written on Tue 3 Nov from the pull requests, commits and board, not at the end of the sprint.

**What helped most**

- **Checks found problems before the merge.** CI failed on a lint error in the landing page (#100). A test found
  notifications getting past the forced password change (#110). Browser checks found the bell covering the language
  switcher and the calendar opening at the wrong month (#110, #113).
- **Deciding first.** #20 came first in the plan, so #54 and #55 could build on start and end times.
- **Small, separate stories.** 28 pull requests in two days, each with one purpose.

**What slowed us down**

- **Wrong target branch.** #87 merged into a feature branch instead of master, so it had to be opened again as #89.
- **Stacks going out of date.** Chains of pull requests had to be brought up to date with master, and the last two
  (#111, #113) contain merge commits because of that.
- **A big batch at the end.** 12 pull requests (#101–#113) merged within one minute on Monday, after the goal was
  reached. That is much to review at once, and it added scope late.

**What we should have done differently**

- **Review:** 17 of the 28 pull requests have a teammate's approval; the other 11 have only Copilot's automated review,
  among them approval (#91) and the forecast (#93). Our Definition of Done asks for a reviewed merge.
- **Sharing the code:** all commits of the hackathon are on one account or the initial team account. The whole team
  still has to be able to explain the code, so that needs time on purpose.
- **Writing last:** the ADR deciders, this review and the Sprint 1 retrospective waited until the last morning.

**What we change in Sprint 3**

- Freeze the code after the final run check. Only a fix for something broken goes in after that.
- A teammate who did not set up the project runs the check, from the README alone.
- Before presenting, split the main areas so that each one has someone who can explain it: domain rules, permissions
  and the main ADRs.
