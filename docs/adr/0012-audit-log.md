# 0012 · Audit log: one append-only database row per API request

- **Status:** accepted
- **Date:** 2026-10-31
- **Deciders:** TODO (team names)
- **Ticket:** [#23](https://github.com/devjimah/code-six-timebooking/issues/23)

## Context

The client must be able to trace who booked, changed, approved or looked at what, for example when an invoice
is disputed or a sign-in is misused. At the same time, a log of "everything a person does" is personal data and
can be used to monitor staff. For the client's own employees, a system able to monitor behaviour needs the
works council's consent in Germany (BetrVG §87 (1) no. 6), and GDPR requires a clear purpose and a deletion period.

## Options considered

1. **Text log to the console / a file (e.g. pino)** – no schema work. / Cannot be searched by user or route
   from the app; lost or rotated with the container; easy to change by anyone with server access.
2. **Database triggers on each table** – catches every data change, even outside the API. / SQLite triggers do
   not know the signed-in user; sign-ins and denied requests change no data and would be missing.
3. **Middleware writes one row per request into an `audit_events` table** – knows the user, the route and the
   result, including rejected and denied requests; survives restarts; searchable. / Records *that* something
   happened, not the old and new values; the write happens after the response, so a crash in between loses one event.

## Decision

We choose **option 3**. Stored per event: time (UTC), user id and role (or none), method, route pattern,
path, status code, outcome (`success` · `rejected` · `denied` · `error`) and duration.
**Never stored:** request bodies, query strings, cookies, passwords. The health check is not recorded.
The application can only insert and read events (no update or delete); there is no foreign key to `users`,
so the trail outlives a deleted account. Only admins can read it (`GET /api/audit-events`).

## Consequences

- Failed sign-ins are visible (outcome `denied`, no user), which makes guessing passwords detectable.
- Purpose is limited to security and traceability of bookings and approvals. It must not be used to measure
  how much or when a person works; `docs/roles-and-privacy.md` has to say so.
- Retention: a clean-up job deletes read events (GET) after 90 days and all other events (bookings, sign-ins,
  account changes) after 365 days. It runs when the API starts and then daily (`apps/api/src/audit/retention.ts`);
  both periods are set in `.env.example` (`AUDIT_RETENTION_READ_DAYS`, `AUDIT_RETENTION_CHANGE_DAYS`). It is the
  only code that deletes audit events. The 365 days are a placeholder: the client's data protection officer
  confirms the real period before production. With several API instances, the job should run in only one.
- Tables grow by one row per request. For production: indexes on `occurred_at` and `actor_user_id`, a
  transaction or outbox so business change and audit event are written together, and export to the
  customer's SIEM. Changes to field values (old → new) need explicit domain events later.
