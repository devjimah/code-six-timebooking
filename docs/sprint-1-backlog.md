# Sprint 1 Backlog

Source: [GitHub Project #2](https://github.com/users/devjimah/projects/2/views/1) (pulled 2026-10-30).
The stories are reworded to fit the challenge: **external consultants book their working time on client orders, and the client sees the effect on the order budget.**

> [!NOTE]
> The role names (Consultant, Project Manager, Admin) are working names. Replace them with the roles from `docs/product-vision.md` once it is filled in.

## Selection

| Rank | Issue | Story | Why now |
|---|---|---|---|
| 1 | [#8](https://github.com/devjimah/code-six-timebooking/issues/8) | 1.1 Time Booking Data Storage | P1. Everything persists here |
| 2 | [#3](https://github.com/devjimah/code-six-timebooking/issues/3) | 1.2 Database Migrations | Schema from #8 must be versioned |
| 3 | [#5](https://github.com/devjimah/code-six-timebooking/issues/5) | US-101 User Accounts & Roles | Users + roles needed before anyone books time |
| 4 | [#6](https://github.com/devjimah/code-six-timebooking/issues/6) | US-102 Secure Sign-In | Server-side permission checks depend on it |

Not selected: #7 (duplicate of #8, close it), #4 (raw notes, source for later stories), #9 and #10 (next sprint).

---

## 1. #8 – Time Booking Data Storage (P1)

> **As the system,** I want to store users, orders, order budgets and time entries in a database,
> **so that** booked hours and remaining budgets are correct and never lost after a restart.

**Acceptance criteria**
- Users, orders (with budget in hours or money) and time entries survive an app restart.
- A time entry belongs to exactly one user and one order, and has a date, a duration and a description.
- Seed data is created automatically: one demo user per role, two or three sample orders with budgets, and a few time entries.
- Persistence entities are kept apart from domain objects and DTOs.

**Tasks**
- [x] Choose a database and write an ADR in `docs/adr/`.
- [x] Data model: `User`, `Role`, `Supplier` (service provider company), `Order`, `TimeEntry`.
- [x] Persistence entities (`/persistence`) and domain objects (`/domain`).
- [x] Repository layer for each entity.
- [x] Seed script (demo users, orders, time entries).
- [x] DB connection settings in `.env.example` with safe defaults.
- [x] Integration test: write → restart → read back.

## 2. #3 – Database Migrations

> **As a developer,** I want the database schema to change only through versioned migrations,
> **so that** every teammate and the jury get the same database with one command.

**Acceptance criteria**
- The schema is created only through migration files in git.
- One command migrates a fresh database and seeds it.

**Tasks**
- [ ] Choose a migration tool and note it in the DB ADR.
- [ ] Initial migration for the #8 schema.
- [ ] `migrate` and `seed` scripts in `package.json`.
- [ ] Update README *Setup* / *Run*.
- [ ] Check: delete the DB, run the migrations, and confirm the app starts with seed data.

## 3. #5 – US-101 User Accounts & Roles

> **As an admin,** I want to create user accounts with a role (Consultant, Project Manager, Admin) and link consultants to their supplier company,
> **so that** each person sees and does only what their role allows.

**Acceptance criteria**
- An account has email, name, password, role and (for consultants) a supplier company.
- Passwords are hashed with bcrypt or argon2.
- Duplicate email or weak password → clear error message from the server.
- Only an admin can create accounts. Checked on the server.

**Tasks**
- [ ] Domain rules: valid email, password policy, unique email, consultant needs a supplier.
- [ ] Unit tests for each rule (accepting + rejecting case).
- [ ] `POST /api/users` with request/response DTO, admin only.
- [ ] Password hashing service.
- [ ] "Users" admin page: shadcn `table`, `dialog`, `input`, `label`, `select`, `button`, `sonner`.
- [ ] Document the roles in `docs/roles-and-privacy.md`.

## 4. #6 – US-102 Secure Sign-In

> **As a consultant or project manager,** I want to sign in and out securely,
> **so that** only I can book time under my name and other companies cannot see our hours.

**Acceptance criteria**
- Login creates a secure session (httpOnly cookie or JWT). Logout ends it.
- Protected API routes return 401 without a session and 403 for the wrong role.
- A consultant only sees their own time entries. A project manager only sees entries on their orders.
- Protected pages redirect to login.

**Tasks**
- [ ] ADR: identity / sign-in approach (required by scoring).
- [ ] `POST /api/auth/login` and `POST /api/auth/logout`.
- [ ] Session middleware + role-check helper (based on `docs/roles-and-privacy.md`).
- [ ] Tests: wrong password, no session (401), wrong role (403), happy path.
- [ ] Login page + logout button (shadcn components).
- [ ] README *Demo users*: list the login for each role.

---

## Coming next (from the notes in #4)
- Consultant books time on an order (mobile-friendly).
- Business rule: **max 10 hours per person per day**. The booking is rejected with a clear message (German working-time law, ArbZG).
- Budget view: booked vs. remaining hours/money per order.
- Rework #9/#10 as "consultant working hours / absences".

## Definition of Done (all items)
- Code reviewed and merged via a feature branch (`feat: …` commits).
- Tests pass.
- README and Evidence map updated.
- Demo-able after a fresh setup.
