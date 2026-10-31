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

We choose **option 3**. Stored per event:

- **Request:** time (UTC), user id and role (or none), method, route pattern, path, status code,
  outcome (`success` · `rejected` · `denied` · `error`) and duration.
- **Meaning** (revision 2, 2026-10-31, migration `0002_audit_details`): a readable **action** name for every route
  (`ACTIONS` in `audit/audit-log.ts`, e.g. `time_entry.create`; a test fails if a documented route has none),
  the **target** (`order` #1, `user` #7), the **error code** that explains a refusal (`DAILY_LIMIT_EXCEEDED`,
  `FORBIDDEN` …), and **key facts** chosen per route from an allow-list (booking: work date and duration;
  new account: email, role, supplier; sign-in: the email that was tried).
- **Source:** client IP address and browser (user agent, first 300 characters). Behind a reverse proxy,
  `TRUST_PROXY_HOPS` must be set so the IP is the client's, not the proxy's.

**Never stored:** request bodies as a whole, query strings, cookies, passwords and free text written by a person
(e.g. booking descriptions). The health check is not recorded.
The application can only insert and read events (no update or delete); there is no foreign key to `users`,
so the trail outlives a deleted account. Only admins can read it (`GET /api/audit-events`, filter by user,
outcome and action).

We chose "key facts" over a full old → new copy of each record: it answers *who did what to what* without
duplicating personal data into a log that is hard to clean up later.

## Consequences

- Failed sign-ins are visible with the email that was tried and the source IP, which makes guessing passwords
  detectable per account and per source.
- IP addresses, emails and user agents are personal data (GDPR). They fall under the retention below and must be
  listed in `docs/roles-and-privacy.md`.
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
- A new route needs an entry in `ACTIONS` (enforced by `audit.test.ts`) and, if it acts on something,
  a `setAuditContext(res, { targetType, targetId, details })` call with allow-listed facts only.
- When a route throws, Express resets `req.baseUrl`; `rememberMountPath` in front of each router keeps the route
  pattern correct for rejected requests (before revision 2 they were recorded as route `/`).
