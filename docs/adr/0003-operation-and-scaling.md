# 0003 · Operation and scaling: one container image, cloud or on-premise, PostgreSQL in production

- **Status:** proposed
- **Date:** 2026-10-31
- **Deciders:** TODO (team names)

## Context

The client is a large German company. Some customers want a managed cloud service, others insist on running
software in their own data centre because time bookings are personal data. Volume: thousands of bookings per
month per customer, with peaks at month end when proofs of work are approved. Today we run SQLite in one
process ([ADR 0001](0001-database-and-api-stack.md)).

## Options considered

1. **Cloud only (SaaS), multi-tenant, hosted in an EU region** – one installation to operate, fast updates. /
   Some German customers will not accept it; tenant isolation must be perfect.
2. **On-premise only, installed by the customer** – full data control for the customer. / Slow updates, every
   installation differs, high support effort.
3. **Both from one artefact: container images + Docker Compose (small) or Helm chart (Kubernetes)** – the
   same build runs in our EU cloud or at the customer. / We must test two installation paths.

## Decision

We choose **option 3**. The API is stateless (session in a signed cookie, no files on local disk), so it scales
horizontally behind a load balancer. Production uses **PostgreSQL** through the same Drizzle schema; SQLite
stays for development and the demo. In our cloud each customer gets its own database (one tenant per database),
hosted in a German or EU region.

## Consequences

- Thousands of bookings a month is a small load for PostgreSQL; the month-end peak is handled by adding API
  containers, not by changing the code.
- Switching SQLite → PostgreSQL means a new driver and regenerated migrations; we must avoid SQLite-only SQL.
- One database per tenant makes data deletion and on-premise export simple, but costs more than shared tables.
- Next: a `compose.yaml` for api + web (scoring block E), then a PostgreSQL profile in it.
