# code-six timebooking

A web app for booking and checking external consultants' working time. Project managers at the client see each order's booked and remaining budget the moment a consultant books, and how long it will last. More in the [product vision](docs/product-vision.md).

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 20.19 or newer | `node --version` |
| npm | 11.x | `npm --version` |
| Docker (optional, only for `docker compose up` under *Run*) | Compose v2 | `docker compose version` |

No database server is needed: SQLite is a file in `apps/api/data/` (see [ADR 0001](docs/adr/0001-database-and-api-stack.md)).

## Setup

From a fresh clone:

```bash
npm install
cp apps/api/.env.example apps/api/.env   # PowerShell: Copy-Item apps/api/.env.example apps/api/.env
npm run db:migrate -w api                # creates the database and seeds demo data
```

## Run

```bash
npm run dev -w api   # API on http://localhost:3001 (migrates + seeds automatically on start)
npm run dev -w web   # in a second terminal: web app on http://localhost:5173 (forwards /api to the API)
```

**Or with Docker**, without installing Node ([compose.yaml](compose.yaml)):

```bash
docker compose up --build    # web app and API on http://localhost:5173, the API at /api
```

Demo users and demo data are created on the first start. The database lives in a Docker volume, so it survives `docker compose down`; `docker compose down -v` deletes it. Settings: [.env.example](.env.example). With Docker, the addresses below use port 5173 instead of 3001, for example http://localhost:5173/api/docs.

Check: open http://localhost:3001/api/health → `{"status":"ok"}`. Then open http://localhost:5173, choose *Sign in* on the landing page and sign in with a demo user. With `npm run dev` the sign-in page also has one-click demo buttons; with Docker, type the email and password.

**API documentation:** open http://localhost:3001/api/docs (Swagger UI). Sign in with `POST /api/auth/login` there first; the browser keeps the cookie, so *Try it out* works for the other routes. The raw spec is at http://localhost:3001/api/openapi.json.

Sign in from the command line (the session is an httpOnly cookie, see [ADR 0002](docs/adr/0002-identity-and-sign-in.md)):

```bash
curl -c cookies.txt -H "Content-Type: application/json" -d '{"email":"pm@demo.local","password":"demo1234"}' http://localhost:3001/api/auth/login
curl -b cookies.txt http://localhost:3001/api/auth/me
```

Book time as the consultant (the API enforces 10 h per day, the order budget and the other rules):

```bash
curl -c cookies.txt -H "Content-Type: application/json" -d '{"email":"consultant@demo.local","password":"demo1234"}' http://localhost:3001/api/auth/login
curl -b cookies.txt -H "Content-Type: application/json" -d '{"orderId":1,"workDate":"2026-10-27","startTime":"17:00","endTime":"20:00","breakMinutes":0,"description":"Legacy data reconciliation"}' http://localhost:3001/api/time-entries
# → 422 "Booking rejected: only 2.5 h left on Tue 27 Oct 2026 (max. 10 h per day, German Working Time Act §3)."
```

See the effect on the order's budget as its project manager:

```bash
curl -c pm.txt -H "Content-Type: application/json" -d '{"email":"pm@demo.local","password":"demo1234"}' http://localhost:3001/api/auth/login
curl -b pm.txt http://localhost:3001/api/orders/managed
# → all orders you manage, each with its budget
curl -b pm.txt http://localhost:3001/api/orders/1/budget
# → budget, booked and remaining in hours, person-days and euro cents
```

### Database commands

| Command | What it does |
|---|---|
| `npm run db:migrate -w api` | Apply pending migrations, then seed demo data (if empty) |
| `npm run db:seed -w api` | Seed demo data only |
| `npm run db:reset -w api` | Delete the local database and rebuild it from migrations + seed |
| `npm run db:generate -w api -- --name <change>` | After editing `schema.ts`: create a new SQL migration in `apps/api/drizzle/` |

## Test

```bash
npm test          # all tests of all workspaces (Turbo runs Vitest in apps/api)
```

GitHub Actions runs typecheck, lint, these tests and the build on every pull request and on pushes to master ([ci.yml](.github/workflows/ci.yml)).

## Demo users

All demo users have the password `demo1234` (demo data only). Demo data is only created in an empty database: if a demo user is missing after an update, run `npm run db:reset -w api`.

| Role | Sign in with | What to try |
|---|---|---|
| Admin | `admin@demo.local` | Web app: **Home** – accounts, sign-ins and refused requests of the last 24 hours, no business data; **Users** (list, tap a name for the profile drawer with *Edit*, *Reset password* and *Deactivate*; try deactivating Paula – refused, she still has orders; *Import from file* for many accounts at once; *New user*, then sign in as that person in a private window: they must choose their own password first; try a consultant without a company; *Change password* in your own profile) and **Audit log** (filter by user or date range). API: `GET /api/users` lists all users; `POST /api/users` creates an account (try it in [Swagger UI](http://localhost:3001/api/docs)); `GET /api/audit-events` shows the audit log (admin only) |
| Project manager | `pm@demo.local` | Web app: **Home** – budget of your orders and those with 80 % or more used; **My orders** with the budget of each order; choose a month on an order for its proof of work and *Download CSV*; open PO-2026-001 to see how long the budget lasts at the current pace and to check each booking (date, consultant, work, hours – no totals per person), *Approve* one, *Return* one with a reason, or *Approve all open*; sign in as the consultant to see the status and the reason, and correct the returned booking under **Book time**. API: `GET /api/orders/managed` lists your orders with their budget; `GET /api/orders/1/budget` shows booked and remaining budget of your order; `GET /api/users` is refused with 403 |
| Purchasing | `purchasing@demo.local` | Web app: **Invoice check** – choose PO-2026-004 and a month, type an amount, see the difference from the approved hours; **Home** – orders whose budget runs out before they end, with the date to order more by, and orders running low on budget or ending within 30 days; **Orders** – totals of all orders, *New order* (budget preview in €), the button on each order proposes a follow-up order; tap one to *Close* it, which is refused while bookings wait to be approved; tap PO-2026-001 and try a budget below its 15.5 booked hours (rejected; supplier locked because time is booked). **Framework agreements** – FA-2026-01 with what its orders take; try an order of 100,000 hours on it (rejected). **Suppliers** – the share of everything ordered per supplier; create one, try a name that already exists in other spelling (`acme consulting gmbh` → rejected), tap a supplier to rename it. API: `POST /api/suppliers`, `PATCH /api/suppliers/{id}`; the admin may only read suppliers |
| Supplier manager (Nordic Dev) | `supplier@demo.local` | Web app: **Home** – all bookings of the own company's consultants in a month, with start, end and break, as the employer. Read only, no money, nothing of other suppliers. API: `GET /api/supplier/bookings?month=2026-10` |
| Consultants on the budget example (Nordic Dev) | `anna@demo.local`, `ben@demo.local` | Web app: the bookings on PO-2026-004 and their vacation under **Book time** |
| Consultant (Acme Consulting, works in Bavaria) | `consultant@demo.local` | Web app: **Home** shows today, this week and this month against the 10-hour day. **Book time**: choose PO-2026-001 and 09:00 to 12:00 (3 hours): the calendar greys out Sundays, holidays (3 Oct) and future days and marks 26 and 27 Oct red, because 3 more hours would pass 10 h there (hover a day for the reason); book on a free weekday. The server checks every rule again. In the sentence field, type `yesterday 9-5 on SAP data migration, 30 min lunch` and it fills in the form, without a model or a key ([ADR 0022](docs/adr/0022-use-of-ai.md), switch: `AI_MODE`). *Copy last week* passes every rule, and each booking has a repeat button. *Days I am unavailable*: mark one, without a reason, and it is greyed out in the calendar, the project manager sees it on the order, and the forecast counts it. API: `GET /api/orders/bookable`, `POST /api/time-entries`, `GET /api/time-entries/mine`, `GET /api/public-holidays?year=2026` |

**Notifications:** the bell in the header shows what needs attention, per role: a booking sent back (consultant), bookings to check and budgets running out (project manager), orders to follow up (purchasing). They are computed each time, never stored, so they go away when the cause does.

## Demo script (5 minutes)

The demo data reproduces the challenge's example *how long will the budget last?* in order **PO-2026-004**: 140 person-days ordered, 84 used, 6 per week, two consultants with vacation ahead and a Christmas shutdown. Its dates count from the day the database was seeded, so run `npm run db:reset -w api` shortly before a demo.

1. **Purchasing sees it coming** (`purchasing@demo.local`). **Home**, *Budget runs out before the order ends*: PO-2026-004, the day it is used up, the hours short and the date and calendar week to order more by. **Orders**: approved and not yet approved hours per order, as sums without single bookings.
2. **The project manager steers** (`pm@demo.local`). **My orders**, PO-2026-004: 140, 84 and 56 PD, the pace of 6 PD per week, the warning and what is missing. Under *What if?*, add a consultant or weeks and see the answer move. *Upcoming unavailable days* shows who is away, never why. Below, the bookings: *Return* one of the open ones with a reason, then *Approve all open*.
3. **The consultant fixes it** (`anna@demo.local`, or `ben@demo.local` if the returned booking is Ben's). **Book time**: the returned booking shows the reason. Correct it with the pencil; it is open again. Try a time that overlaps another booking: the form warns, and the server refuses. Mark a coming day as unavailable: there is no reason field. The project manager sees the day, and the forecast counts it. With two consultants, one person's day off is half a working day for the budget, so one day alone may not move the date.
4. **The rules and the trail** (`admin@demo.local`). **Audit log**: the return, the correction and the approvals, without the free text. The admin sees no budgets or prices.

## Evidence map

Where the technical jury finds the evidence for each [technical criterion](docs/scoring.md).

| Criterion | Evidence |
|---|---|
| 1 · Persistence and data model | [schema.ts](apps/api/src/persistence/schema.ts), [migrations](apps/api/drizzle/), [seed.ts](apps/api/src/persistence/seed.ts), [ER diagram](docs/domain.md) |
| 2 · Business rules and unit tests | Rules in [domain/rules/](apps/api/src/domain/rules/) (10 h per day · 11 h rest between working days · no overlapping bookings of one person · only open bookings can be approved or returned, with a reason · approved bookings can no longer be changed · an order cannot exceed its framework agreement · no booking or change on a closed order, and only checked work can be closed · no booking on a day marked unavailable · order budget · valid start, end and break · own company's orders · no future dates · no Sundays or public holidays · inside the order's period · consultants belong to a supplier · unique supplier names · accounts: role change only while nothing depends on it, no own role change or self-deactivation, project managers with orders stay active · passwords: an admin-chosen password must be replaced, the current password is needed and the new one must differ, no reset of your own · orders: unique code, valid period, a real project manager, budget not below booked hours, supplier fixed after the first booking, period keeps all bookings), used by [book-time.ts](apps/api/src/application/book-time.ts), unit tests in [test/domain/](apps/api/test/domain/), API tests in [booking.test.ts](apps/api/test/booking.test.ts), errors as 422 via [error-handler.ts](apps/api/src/api/error-handler.ts) ([ADR 0005](docs/adr/0005-error-handling.md), [ADR 0006](docs/adr/0006-business-rules-in-the-domain.md)); run with `npm test` |
| 3 · Roles, permissions and privacy | [Permission concept](docs/roles-and-privacy.md), enforcement in [auth/middleware.ts](apps/api/src/auth/middleware.ts) (roles; only admins create accounts, [ADR 0004](docs/adr/0004-role-model-and-accounts.md), [users.test.ts](apps/api/test/users.test.ts); password reset and sessions ending at once, [passwords.test.ts](apps/api/test/passwords.test.ts)) and [get-order-budget.ts](apps/api/src/application/get-order-budget.ts) and [list-orders.ts](apps/api/src/application/list-orders.ts) (only your own orders), tests in [auth.test.ts](apps/api/test/auth.test.ts) and [order-list.test.ts](apps/api/test/order-list.test.ts), the supplier manager sees only their own consultants, as the employer ([ADR 0021](docs/adr/0021-supplier-manager-role.md), [supplier-manager.test.ts](apps/api/test/supplier-manager.test.ts)), audit log [ADR 0012](docs/adr/0012-audit-log.md) / [audit-log.ts](apps/api/src/audit/audit-log.ts) with automatic deletion after 90 / 365 days ([retention.ts](apps/api/src/audit/retention.ts)), role views in the web app: admin [users](apps/web/src/pages/admin/users-page.tsx) and [audit log](apps/web/src/pages/admin/audit-page.tsx), one sidebar per role in [navigation.ts](apps/web/src/routes/navigation.ts) ([ADR 0013](docs/adr/0013-web-routing-and-app-shell.md)), every role starts on its own home ([home-page.tsx](apps/web/src/pages/home-page.tsx)) with only the data it may see; consultant [booking screen](apps/web/src/pages/consultant/book-time-page.tsx) with totals per day for the consultant only |
| 4 · Architecture and engineering | A structure: [api/](apps/api/src/api/) · [domain/](apps/api/src/domain/) · [persistence/](apps/api/src/persistence/) · B [ADRs](docs/adr/), incl. [identity](docs/adr/0002-identity-and-sign-in.md) and [operation](docs/adr/0003-operation-and-scaling.md) · C Git history · D [Swagger UI](http://localhost:3001/api/docs) generated from the zod DTOs in [openapi.ts](apps/api/src/api/openapi.ts) ([ADR 0009](docs/adr/0009-api-documentation.md)), kept in sync by [openapi.test.ts](apps/api/test/openapi.test.ts) · E [compose.yaml](compose.yaml), started and restarted on every pull request by [ci.yml](.github/workflows/ci.yml) |

## Team

| Name | GitHub | Role |
|---|---|---|
| Kamaldeen Fadatoyo | [@kamaldeenfadatoyo99-code](https://github.com/kamaldeenfadatoyo99-code) | Product Owner |
| Abdul Rashid Fadilatu | [@abdulrashidfadila](https://github.com/abdulrashidfadila) | Scrum Master |
| Jimah Abraham Zorwi | [@devjimah](https://github.com/devjimah) | Developer |
| Fazail Osuman | [@fazail-creator](https://github.com/fazail-creator) | Developer |
| Anwaar Ibrahim | [@ibanwaaar-del](https://github.com/ibanwaaar-del) | Developer |
| Mansura Bawah | [@MansuraBawah](https://github.com/MansuraBawah) | Developer |

How we plan: the [project board](https://github.com/users/devjimah/projects/2/views/1), the [product backlog](docs/product-backlog.md), the [Sprint 1 review](docs/sprints/sprint-1-review.md), the [Sprint 2 backlog](docs/sprints/sprint-2-backlog.md) and the [Sprint 2 review](docs/sprints/sprint-2-review.md).
