<!-- ===== TEMPLATE NOTE: delete this block once your team has started ===== -->
> **Article26 Hackathon 2026 · Team template**
>
> This repository is your starting point. It contains **no code and no required technology**, only guidance:
>
> 1. **Start here:** read the [Build Guide](docs/guide.md) and the [challenge](docs/challenge.md).
> 2. Fill in [docs/product-vision.md](docs/product-vision.md) together.
> 3. Keep this README up to date as you build. The technical jury starts your product **from this README alone** ([how they check](docs/scoring.md#run-check-for-the-juror)).
>
> Using an AI coding agent (GitHub Copilot, Claude Code, Cursor …)? It reads [AGENTS.md](AGENTS.md) and the skills in `.claude/skills/` automatically. In GitHub Copilot Chat (agent mode) or Claude Code, type `/kickoff` to begin, or `/hackathon-review` at any time.
>
> Looking for an example? The `blueprint` branch contains a small Next.js + PostgreSQL app from an earlier edition. It is one possible approach, not a requirement.
<!-- ===== END OF TEMPLATE NOTE ===== -->

# TODO Product name

TODO – one sentence: what the product does and for whom. Link to [product vision](docs/product-vision.md).

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 20.19 or newer | `node --version` |
| npm | 11.x | `npm --version` |

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

Check: open http://localhost:3001/api/health → `{"status":"ok"}`. Then open http://localhost:5173 and sign in with a demo user (the sign-in page has one-click demo buttons in development).

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

## Demo users

All demo users have the password `demo1234` (demo data only). Demo data is only created in an empty database: if a demo user is missing after an update, run `npm run db:reset -w api`.

| Role | Sign in with | What to try |
|---|---|---|
| Admin | `admin@demo.local` | Web app: **Home** – accounts, sign-ins and refused requests of the last 24 hours, no business data; **Users** (list, tap a name for the profile drawer with *Edit*, *Reset password* and *Deactivate*; try deactivating Paula – refused, she still has orders; *New user*, then sign in as that person in a private window: they must choose their own password first; try a consultant without a company; *Change password* in your own profile) and **Audit log** (filter by user). API: `GET /api/users` lists all users; `POST /api/users` creates an account (try it in [Swagger UI](http://localhost:3001/api/docs)); `GET /api/audit-events` shows the audit log (admin only) |
| Project manager | `pm@demo.local` | Web app: **Home** – budget of your orders and those with 80 % or more used; **My orders** with the budget of each order; open PO-2026-001 to check each booking (date, consultant, work, hours – no totals per person). API: `GET /api/orders/managed` lists your orders with their budget; `GET /api/orders/1/budget` shows booked and remaining budget of your order; `GET /api/users` is refused with 403 |
| Purchasing | `purchasing@demo.local` | Web app: **Home** – orders running low on budget or ending within 30 days; **Orders** – totals of all orders, *New order* (budget preview in €), tap PO-2026-001 and try a budget below its 15.5 booked hours (rejected; supplier locked because time is booked). **Suppliers** – create one, try a name that already exists in other spelling (`acme consulting gmbh` → rejected), tap a supplier to rename it. API: `POST /api/suppliers`, `PATCH /api/suppliers/{id}`; the admin may only read suppliers |
| Consultant (Acme Consulting) | `consultant@demo.local` | Web app: **Home** shows today, this week and this month against the 10-hour day; **Book time** – choose PO-2026-001 and 09:00 to 12:00 (3 hours): the calendar greys out Sundays, holidays (3 Oct) and future days and marks 26 and 27 Oct red, because 3 more hours would pass 10 h there (hover a day for the reason); book on a free weekday. The server checks every rule again. API: `GET /api/orders/bookable`, `POST /api/time-entries`, `GET /api/time-entries/mine`, `GET /api/public-holidays?year=2026` |

## Evidence map

Where the technical jury finds the evidence for each [technical criterion](docs/scoring.md).

| Criterion | Evidence |
|---|---|
| 1 · Persistence and data model | [schema.ts](apps/api/src/persistence/schema.ts), [migrations](apps/api/drizzle/), [seed.ts](apps/api/src/persistence/seed.ts), [ER diagram](docs/domain.md) |
| 2 · Business rules and unit tests | Rules in [domain/rules/](apps/api/src/domain/rules/) (10 h per day · no overlapping bookings of one person · order budget · valid start, end and break · own company's orders · no future dates · no Sundays or public holidays · inside the order's period · consultants belong to a supplier · unique supplier names · accounts: role change only while nothing depends on it, no own role change or self-deactivation, project managers with orders stay active · passwords: an admin-chosen password must be replaced, the current password is needed and the new one must differ, no reset of your own · orders: unique code, valid period, a real project manager, budget not below booked hours, supplier fixed after the first booking, period keeps all bookings), used by [book-time.ts](apps/api/src/application/book-time.ts), unit tests in [test/domain/](apps/api/test/domain/), API tests in [booking.test.ts](apps/api/test/booking.test.ts), errors as 422 via [error-handler.ts](apps/api/src/api/error-handler.ts) ([ADR 0005](docs/adr/0005-error-handling.md), [ADR 0006](docs/adr/0006-business-rules-in-the-domain.md)); run with `npm test` |
| 3 · Roles, permissions and privacy | [Permission concept](docs/roles-and-privacy.md), enforcement in [auth/middleware.ts](apps/api/src/auth/middleware.ts) (roles; only admins create accounts, [ADR 0004](docs/adr/0004-role-model-and-accounts.md), [users.test.ts](apps/api/test/users.test.ts); password reset and sessions ending at once, [passwords.test.ts](apps/api/test/passwords.test.ts)) and [get-order-budget.ts](apps/api/src/application/get-order-budget.ts) and [list-orders.ts](apps/api/src/application/list-orders.ts) (only your own orders), tests in [auth.test.ts](apps/api/test/auth.test.ts) and [order-list.test.ts](apps/api/test/order-list.test.ts), audit log [ADR 0012](docs/adr/0012-audit-log.md) / [audit-log.ts](apps/api/src/audit/audit-log.ts) with automatic deletion after 90 / 365 days ([retention.ts](apps/api/src/audit/retention.ts)), role views in the web app: admin [users](apps/web/src/pages/admin/users-page.tsx) and [audit log](apps/web/src/pages/admin/audit-page.tsx), one sidebar per role in [navigation.ts](apps/web/src/routes/navigation.ts) ([ADR 0013](docs/adr/0013-web-routing-and-app-shell.md)), every role starts on its own home ([home-page.tsx](apps/web/src/pages/home-page.tsx)) with only the data it may see; consultant [booking screen](apps/web/src/pages/consultant/book-time-page.tsx) with totals per day for the consultant only |
| 4 · Architecture and engineering | A structure: [api/](apps/api/src/api/) · [domain/](apps/api/src/domain/) · [persistence/](apps/api/src/persistence/) · B [ADRs](docs/adr/), incl. [identity](docs/adr/0002-identity-and-sign-in.md) and [operation](docs/adr/0003-operation-and-scaling.md) · C Git history · D [Swagger UI](http://localhost:3001/api/docs) generated from the zod DTOs in [openapi.ts](apps/api/src/api/openapi.ts) ([ADR 0009](docs/adr/0009-api-documentation.md)), kept in sync by [openapi.test.ts](apps/api/test/openapi.test.ts) · E TODO compose file · F [mockup](docs/mockup/) |

## Team

TODO – names and GitHub handles.
