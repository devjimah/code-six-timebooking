# 0001 · Database and API stack: SQLite + Express + Drizzle

- **Status:** accepted
- **Date:** 2026-10-30
- **Deciders:** TODO (team names)

## Context

Booked hours and order budgets must survive a restart (ticket #8), and the schema must change only
through versioned migrations (ticket #3). The jury must run the product with one command and no paid
account. The team are junior developers with four days, so the stack must be easy to explain.

## Options considered

1. **SQLite + Express + Drizzle ORM** – no install, the database is one file; Express is the most
   documented Node framework; Drizzle schemas are plain TypeScript and drizzle-kit generates SQL
   migration files. / Only one writer at a time; Drizzle is two new tools to learn.
2. **PostgreSQL (Docker) + Fastify + Prisma** – production-grade database, strong scaling story,
   built-in migrations. / Everyone needs Docker; Prisma adds a code-generation step and its generated
   types tend to leak into the domain layer.
3. **PGlite (embedded Postgres) + Hono + Drizzle** – Postgres syntax without install. / Newer tools,
   fewer tutorials, harder to debug.

## Decision

We choose **SQLite (via `@libsql/client`) + Express + Drizzle ORM / drizzle-kit** because it runs with
`npm install` alone, keeps data in a file under `apps/api/data/`, and gives us readable SQL migrations
in git. We use `@libsql/client` instead of `better-sqlite3` because it ships prebuilt binaries
(no C++ build tools needed on Windows).

## Consequences

- Easier: zero setup for teammates and jury; schema reviewable as SQL in `apps/api/drizzle/`.
- Harder: SQLite does not scale to many parallel writers. Drizzle also supports PostgreSQL, so
  switching later means changing the driver and regenerating migrations – see the operation/scaling ADR (TODO).
- Next: keep Drizzle table definitions in `persistence/` only, separate from `domain/` and `dto/`.

## Migration workflow (ticket #3)

- The schema changes **only** through SQL files in `apps/api/drizzle/`, committed to git. Never edit the
  database by hand and never edit a migration that is already merged – add a new one.
- Change `schema.ts` → `npm run db:generate -w api -- --name <what-changed>` → review the SQL → commit both.
- `npm run db:migrate -w api` applies pending migrations and seeds demo data; the API does the same on start.
- `npm run db:reset -w api` deletes the local database and rebuilds it from scratch.
- Alternative considered: `drizzle-kit push` (syncs the schema without migration files). Rejected because
  it leaves no versioned history for teammates and the jury.

