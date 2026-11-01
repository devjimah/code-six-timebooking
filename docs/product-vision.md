# Product vision

> Every AI prompt in the [guide](guide.md) uses this file as context. Keep it short.

## Product name

**code-six timebooking**

## In one sentence

For **project managers at the client company**, who **learn how much of an order's budget is used only when the
monthly invoice arrives**, our product **code-six timebooking** is a **web app for booking and checking external
consultants' working time** that **shows each order's booked and remaining budget the moment a consultant books**.
Unlike spreadsheets and the old tool, it **checks every booking against the order and the German Working Time Act
before it counts, and tells the consultant why if it does not**.

## Who we build for first

The **project manager** on the client side. They spend an order's budget, so they need to see every booked hour on
their orders and what is left, in hours, person-days and euros, without waiting for the invoice or asking the supplier.

## Roles

| Role | Side (client / supplier) | What they want from the product |
|---|---|---|
| Project manager | client | See the bookings and the budget of their own orders at once, and which orders are running low. |
| Consultant | supplier | Book their working time on their company's orders quickly, and know at once if a booking breaks a rule. |
| Purchasing | client | Place orders with suppliers and see across all orders which budgets run out or end soon, to order more in time. |
| Admin | client IT | Manage accounts and see who did what (audit log), without seeing bookings, budgets or prices. |

Details and the full permission matrix: [roles-and-privacy.md](roles-and-privacy.md).

## The core flow

1. **Purchasing** creates an order for a supplier: budget in hours, hourly rate, period, and the responsible project manager.
2. The **consultant** signs in, picks one of their own company's orders and books a day's work with a short description.
3. The **server checks the rules** (own company's order, inside the order's period, budget left, at most 10 hours a
   day, no Sundays or public holidays, no future dates) and refuses with a clear reason if one is broken.
4. The **project manager** sees the booking on the order right away, and the booked and remaining budget in hours,
   person-days and euros changes with it. Their home page lists orders with 80 % or more used.
5. **Purchasing** sees the totals of all orders and which ones are running low or ending within 30 days.

## What makes us special

- **Rules before the booking counts.** The calendar shows the days where a booking would be refused, and the server
  explains every refusal ("only 2.5 h left on Tue 27 Oct …") instead of a later correction.
- **Each role sees what it needs, no more.** The project manager sees durations, not a consultant's start and end
  times; purchasing sees totals; the admin sees no business data at all.

## What we leave out on purpose

- The supplier's own payroll, vacation approval and sick-leave management: the supplier is the employer.
- Paying invoices: the product stops at checked hours.
- Real single sign-on: the demo uses its own sign-in; production would use the company's identity provider
  ([ADR 0002](adr/0002-identity-and-sign-in.md)).

## Our track

**Working code**: a web app with an API and a database (see [guide 1.3](guide.md#13-choose-your-track)).

## Our stack

TypeScript monorepo: **Express API with SQLite (Drizzle ORM)**, **React web app with shadcn/ui**, tests with Vitest.
Decision: [ADR 0001](adr/0001-database-and-api-stack.md); web app: [ADR 0013](adr/0013-web-routing-and-app-shell.md).

## Team

| Name | GitHub | Role |
|---|---|---|
| Kamaldeen | [@kamaldeenfadatoyo99-code](https://github.com/kamaldeenfadatoyo99-code) | Product Owner |
| Abdulrashid | [@abdulrashidfadila](https://github.com/abdulrashidfadila) | Scrum Master |
| Jimah Abraham Zorwi | [@devjimah](https://github.com/devjimah) | Developer |
| Fazail Osuman | [@fazail-creator](https://github.com/fazail-creator) | Developer |
| Anwaar Ibrahim | [@ibanwaaar-del](https://github.com/ibanwaaar-del) | Developer |
| Mansura Bawah | [@MansuraBawah](https://github.com/MansuraBawah) | Developer |
