# Roles, permissions and data privacy

> See [guide 2.4](guide.md#24-roles-and-privacy).
> Status per row: **built** = enforced by the API today.

## Roles

| Role | Side | Description |
|---|---|---|
| Consultant | supplier | External consultant of a service provider. Books own working time on the orders of their own company. Employed by the supplier, not by the client. |
| Project manager | client | Runs a project and is responsible for its orders. Checks the work booked on own orders and watches their budget. |
| Purchasing | client | Places purchase orders with suppliers and follows up when a budget runs out. Manages the supplier companies. |
| Admin | client IT | Runs the system: creates accounts and reads the audit log. Sees no bookings, budgets or prices. |
| Supplier manager | supplier | *Later stage, not built.* Would see all bookings of their own company's consultants, because the supplier is the employer and responsible for working-time law. |

The roles differ on purpose: the person who **spends** a budget (project manager) is not the person who **creates** it
(purchasing), and the person who **runs the system** (admin) sees no business data. One fixed role per account,
assigned by an admin ([ADR 0004](adr/0004-role-model-and-accounts.md)).

## Role matrix

`✔` = allowed, `–` = not allowed, `Σ` = only aggregated values, `own` = only own records

| Action or data | Consultant | Project manager | Purchasing | Admin | Status |
|---|---|---|---|---|---|
| Book own working time | ✔ own orders of own company | – | – | – | built |
| See own bookings, with own totals per day, week and month | ✔ | – | – | – | built |
| See orders one may book on (code, title, supplier) | ✔ own company, no money | – | – | – | built |
| See single bookings of an order (date, hours, description, consultant's name) | own only | ✔ own orders, no daily totals per person | – | – | built |
| See start time, end time and break of a booking ([ADR 0010](adr/0010-time-entry-granularity.md)) | own only | – | – | – | planned (#20) |
| See budget of an order (booked / remaining hours and €) | – | ✔ own orders | Σ all orders | – | built |
| See hourly rates and money | – | ✔ own orders | ✔ | – | built |
| Create and edit purchase orders | – | – | ✔ | – | built |
| See names of project managers (to assign an order) | – | – | ✔ names only | ✔ (user list) | built |
| Create and edit supplier companies | – | – | ✔ | read only (to assign consultants) | built |
| Create user accounts | – | – | – | ✔ | built |
| Edit and deactivate user accounts (never delete) | – | – | – | ✔ not own role, not self | built |
| Reset a user's password (the person must then choose their own) | – | – | – | ✔ not own | built |
| Change own password | ✔ | ✔ | ✔ | ✔ | built |
| Read the audit log | – | – | – | ✔ | built |

Everything not listed is not allowed. Every signed-in user may read their own account (`GET /api/auth/me`).
As long as an admin-chosen password (new account or reset) has not been replaced, the person may do nothing else:
every route with a role check answers 403 `PASSWORD_CHANGE_REQUIRED`.

## Personal data

| Data | Why we store it | Who needs it | How long we keep it |
|---|---|---|---|
| Name, business email, role, supplier company | Sign-in, permissions, showing who booked | the person, admin; project manager sees the name on bookings of own orders | as long as the account exists. Accounts are deactivated, never deleted, while bookings refer to them; deactivated people cannot sign in and their open sessions end at once |
| Password hash (bcrypt), "must change password" flag, session version | Sign-in; after an admin chose the password, the person replaces it; a password change ends all open sessions | nobody reads the hash, the server only compares; the admin sees whether a password is still the one they set | as long as the account exists |
| Bookings: date, duration, description, consultant | Proof of work for the order, budget, invoice check | the consultant; project manager of the order (per booking); purchasing only as Σ per order |
| Bookings: start time, end time, break | The server checks the Working Time Act: no overlap, 11 hours rest, breaks ([ADR 0010](adr/0010-time-entry-granularity.md)) | the consultant only; nobody on the client side | same as the booking it belongs to | proposal: 10 years for bookings that back an invoice (German tax law, §147 AO); the client's data protection officer confirms before production |
| Audit events: user, time, action, target, key facts, IP address, browser, email tried at sign-in | Security and traceability of bookings and account changes ([ADR 0012](adr/0012-audit-log.md)) | admin only | read events 90 days, all other events 365 days; deleted automatically by a daily job |

Data minimisation: no private addresses, birth dates or photos. Bookings store start and end times only because the
working-time rules need them, and only the consultant sees them; every client role gets the duration. The audit
log never stores passwords, query strings, booking descriptions or booking times.

## Conflicts and how we resolve them

**Checking the work vs. not becoming the consultant's employer.** If the client controls *when* and *how long*
a consultant works each day, it starts to act like their employer, which German law reserves for the supplier.
We resolve it like this:

- The project manager sees each booking on own orders (date, hours, description), because they must check and
  approve the work before an invoice is paid.
- The product shows **no daily or weekly totals per person**, no working-time patterns and no comparison between
  consultants. Purchasing only sees sums per order.
- The consultant records start, end and break, but the client never sees them – the project manager gets the
  duration only ([ADR 0010](adr/0010-time-entry-granularity.md)). The client checks *what* and *how much*, not *when*.
- Working-time limits (10 h per day, no Sundays or public holidays, no overlapping bookings) are checked by the server
  when the consultant books, and the consultant gets the message directly. The client does not need to watch working hours to enforce
  the law, and nobody from the client sees a list of "who worked too much".

**Security traceability vs. monitoring staff.** The audit log records every action, which could be used to watch
how people work. Only the admin can read it, its purpose is limited to security and tracing bookings and account
changes ([ADR 0012](adr/0012-audit-log.md)), and events are deleted after 90 / 365 days. For the client's own
employees, the works council must agree before production (BetrVG §87 (1) no. 6).

**A powerful admin vs. separation of duties.** The admin creates accounts and could otherwise see everything.
We keep business data away from the admin: no bookings, budgets or prices. The admin's own actions are in the
audit log like everyone else's.

## How it is enforced

Permissions are checked **on the server**, in two layers. The web app only hides what a role cannot use;
that is convenience, not security.

1. **Role per route:** `requireAuth` and `requireRole(...)` in
   [auth/middleware.ts](../apps/api/src/auth/middleware.ts) answer 401 without a session and 403 for the wrong role.
   The role is loaded from the database on every request, so a changed role takes effect immediately.
2. **Ownership in the use case:** the role alone is not enough where data belongs to someone:
   - [list-orders.ts](../apps/api/src/application/list-orders.ts): consultants only get orders of their own supplier,
     project managers only their own orders.
   - [own-order.ts](../apps/api/src/application/own-order.ts), used for the budget and the bookings of an order:
     a project manager asking for another manager's order gets 403 `NOT_YOUR_ORDER`.
   - [book-time.ts](../apps/api/src/application/book-time.ts) with
     [order-assignment.ts](../apps/api/src/domain/rules/order-assignment.ts): a consultant cannot book on another
     company's order (`ORDER_NOT_ASSIGNED`).
   - The consultant's order list contains no rates or money ([dto.ts](../apps/api/src/api/dto.ts),
     `bookableOrderResponse`).

| Route | Allowed for | Extra check |
|---|---|---|
| `POST /api/time-entries` | consultant | order belongs to own supplier; booking rules |
| `GET /api/time-entries/mine` | consultant | only own entries |
| `GET /api/public-holidays?year=` | consultant | – (the holidays the booking rule uses, for the calendar) |
| `GET /api/orders/bookable` | consultant | only own supplier's orders, no money; the period, so the form offers only valid dates |
| `GET /api/orders/managed` | project manager | only own orders |
| `GET /api/orders` | purchasing | sums per order, no single bookings |
| `POST /api/orders`, `PUT /api/orders/:id` | purchasing | order rules (code, period, project manager; budget, supplier and period protect booked time) |
| `GET /api/project-managers` | purchasing | names only, no emails |
| `GET /api/orders/:id/budget` | project manager | only own orders |
| `GET /api/orders/:id/time-entries` | project manager | only own orders; name but no email or user id; no totals per person |
| `GET /api/users`, `POST /api/users` | admin | – |
| `PUT /api/users/:id` | admin | role changes only without dependent bookings/orders; not own role |
| `POST /api/users/:id/deactivate`, `.../reactivate` | admin | not yourself; not a project manager with orders |
| `POST /api/users/:id/password` | admin | not your own password; the person is signed out and must choose their own |
| `POST /api/auth/password` | any signed-in user, own account only | current password right; new one differs |
| `GET /api/suppliers` | admin, purchasing | – |
| `POST /api/suppliers`, `PATCH /api/suppliers/:id` | purchasing | unique name (`SUPPLIER_NAME_TAKEN`) |
| `GET /api/audit-events` | admin | – |

Tests: wrong role and no session in [auth.test.ts](../apps/api/test/auth.test.ts),
[users.test.ts](../apps/api/test/users.test.ts), [order-list.test.ts](../apps/api/test/order-list.test.ts),
[order-budget.test.ts](../apps/api/test/order-budget.test.ts), [suppliers.test.ts](../apps/api/test/suppliers.test.ts), [orders.test.ts](../apps/api/test/orders.test.ts), [order-bookings.test.ts](../apps/api/test/order-bookings.test.ts), [manage-users.test.ts](../apps/api/test/manage-users.test.ts), [passwords.test.ts](../apps/api/test/passwords.test.ts), [audit.test.ts](../apps/api/test/audit.test.ts).

One demo user per role is seeded and listed in the README.
