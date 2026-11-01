# Domain model

What our product stores and the words we use for it. The diagram follows the database schema in
[schema.ts](../apps/api/src/persistence/schema.ts); when the schema changes, this page changes in the same pull request.

## Glossary

The words used in the code, the API and the UI (German in brackets, as in the app).

| Term | Meaning |
|---|---|
| Client | The large company that buys project work from external suppliers. Project managers, purchasing and admins work on this side. |
| Supplier (Dienstleister) | A service company the client orders work from. It employs the consultants. |
| Consultant (Berater) | A person employed by a supplier who works on an order and books the time. Belongs to exactly one supplier. |
| Order (Bestellung) | The client's purchase order to one supplier: a code such as `PO-2026-001`, a title, a period, a budget in hours and an hourly rate. Every booked hour belongs to one order. |
| Project manager (Projektleitung) | The person on the client side responsible for an order. Sees the bookings on their orders, as durations only. |
| Booking / time entry (Buchung) | One block of work by one consultant on one order on one day: start, end, break, the worked duration and what was done. `time_entries` in the database. |
| Worked duration (Dauer) | End − start − break of a booking, in minutes. Derived by the server, never typed in ([ADR 0010](adr/0010-time-entry-granularity.md)). |
| Budget | What the client ordered: `budget hours × hourly rate`. *Booked* is the sum of all bookings on the order, *remaining* is budget − booked ([ADR 0008](adr/0008-budget-calculation.md)). |
| Person-day (PD, Personentag) | 8 hours. Budgets are shown in hours and person-days; the database stores hours and minutes. |
| Public holiday (Feiertag) | A day on which nobody may book. Today: the holidays valid in every German state, computed in code, not stored ([public-holidays.ts](../apps/api/src/domain/public-holidays.ts)). |
| Working Time Act (ArbZG) | The German law behind several booking rules: at most 10 hours per day, no work on Sundays and public holidays. |
| Audit event | One row per API request: who did what, when, and whether it was allowed. Append-only ([ADR 0012](adr/0012-audit-log.md)). |

## Entity relationship diagram

Entities we **build now** are marked `(now)`, entities of the **next expansion stage** `(later)`. The later stage is
a proposal from the backlog, to confirm with the team; it is not built.

```mermaid
erDiagram
    SUPPLIER ||--o{ USER : "employs consultants"
    SUPPLIER ||--o{ ORDER : "receives"
    USER ||--o{ ORDER : "manages as project manager"
    USER ||--o{ TIME_ENTRY : "books as consultant"
    ORDER ||--o{ TIME_ENTRY : "is booked on"
    USER |o..o{ AUDIT_EVENT : "acts in (no foreign key)"

    SUPPLIER ||--o{ FRAMEWORK_AGREEMENT : "signs"
    FRAMEWORK_AGREEMENT |o--o{ ORDER : "funds"
    ACCOUNTING_OBJECT ||--o{ ORDER : "pays for"
    ORDER ||--o{ PROOF_OF_WORK : "is approved per month in"
    PROOF_OF_WORK |o--o{ TIME_ENTRY : "covers"
    USER ||--o{ ABSENCE : "is absent"

    SUPPLIER["Supplier (now)"] {
        int id PK
        string name UK
    }
    USER["User (now)"] {
        int id PK
        string email UK
        string name
        string role "consultant | project_manager | purchasing | admin"
        int supplier_id FK "consultants only"
        string password_hash
        string deactivated_at "null = active"
        bool must_change_password
        int session_version
    }
    ORDER["Order (now)"] {
        int id PK
        string code UK "e.g. PO-2026-001"
        string title
        int supplier_id FK
        int project_manager_id FK
        int budget_hours
        int hourly_rate_cents
        string start_date
        string end_date
    }
    TIME_ENTRY["Time entry (now)"] {
        int id PK
        int user_id FK
        int order_id FK
        string work_date "YYYY-MM-DD"
        string start_time "HH:MM, consultant only"
        string end_time "HH:MM, consultant only"
        int break_minutes
        int duration_minutes "derived: end - start - break"
        string description
    }
    AUDIT_EVENT["Audit event (now)"] {
        int id PK
        string occurred_at
        int actor_user_id "no FK: outlives the account"
        string action "e.g. time_entry.create"
        string outcome "success | rejected | denied | error"
        string error_code
        string details "allow-listed JSON, never times or descriptions"
    }
    FRAMEWORK_AGREEMENT["Framework agreement (later)"] {
        int id PK
        int supplier_id FK
        int total_budget_hours
        string start_date
        string end_date
    }
    ACCOUNTING_OBJECT["Accounting object (later)"] {
        int id PK
        string code UK "cost centre or project element"
        string name
    }
    PROOF_OF_WORK["Proof of work (later)"] {
        int id PK
        int order_id FK
        string month "YYYY-MM"
        string status "open | submitted | approved | rejected"
        int approved_by FK
    }
    ABSENCE["Absence (later)"] {
        int id PK
        int user_id FK
        string kind "vacation | sick"
        string from_date
        string to_date
    }
```

The audit event shows only its key columns; the full list is in [schema.ts](../apps/api/src/persistence/schema.ts).

## Notes

- **One role per user, one table for all.** Consultants, project managers, purchasing and admins are all `users`
  with a `role` ([ADR 0004](adr/0004-role-model-and-accounts.md)). Only consultants have a `supplier_id`; the
  client-side roles do not belong to a supplier.
- **Budget is computed, never stored.** Booked = `SUM(duration_minutes)` of the order's time entries; money =
  minutes × hourly rate, in integer euro cents; person-days = hours ÷ 8. Nothing can drift from the bookings
  ([ADR 0008](adr/0008-budget-calculation.md), [budget.ts](../apps/api/src/domain/budget.ts)).
- **Duration is stored although it is derived.** The server calculates it from start, end and break when booking.
  Storing it keeps the budget and the 10-hour sum a plain SQL `SUM` ([ADR 0010](adr/0010-time-entry-granularity.md)).
- **Times stay with the consultant.** Start, end and break are returned only to the consultant who booked them;
  the client side sees durations or sums ([roles-and-privacy.md](roles-and-privacy.md)).
- **Bookings are never deleted with their user.** A deactivated account keeps its bookings, so the order's budget
  stays correct. The audit log has no foreign key on purpose, so it outlives any account.
- **Not stored:** public holidays (computed from the year) and the remaining budget (computed on read).
- **Next stage, in one sentence each** (proposals, not built):
  - *Framework agreement* – a long-term contract with a supplier whose total budget the orders draw from.
  - *Accounting object* – the cost centre or project element that pays for an order.
  - *Proof of work* – the monthly list of an order's hours that the project manager approves before the invoice.
  - *Absence* – vacation or sick days, so nobody books time on them.
