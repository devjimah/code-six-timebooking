# 0007 · Booking flow: application use cases and zod request DTOs

- **Status:** accepted
- **Date:** 2026-10-31
- **Deciders:** TODO (team names)
- **Ticket:** [#12](https://github.com/devjimah/code-six-timebooking/issues/12)

## Context

Booking time is our core flow: check the input, load the order and the day's bookings, apply the rules, save.
Scoring criterion 4 (block A) looks for API DTOs, domain objects and persistence entities kept apart. Something
has to connect them without putting rules in the route handler.

## Options considered

1. **Route handler does everything** – fewest files. / Mixes HTTP, rules and SQL; hard to test without HTTP.
2. **Use case functions in `src/application/`, zod schemas as DTOs in `src/api/`** – the route only validates
   and calls `bookTime(user, input)`; the use case orchestrates repositories and domain rules. / One more layer.
3. **A framework with built-in layers (NestJS)** – structure enforced. / Replaces Express from
   [ADR 0001](0001-database-and-api-stack.md); decorators and dependency injection are new to the team.

## Decision

We choose **option 2**. Folders: `api/` (routes + zod DTOs) → `application/` (use cases) → `domain/` (types and
rules) and `persistence/` (Drizzle tables and repositories). zod rejects malformed input with 400 before any
rule runs.

## Consequences

- The folder structure shows the layers to the jury.
- Use cases can be tested against a temporary SQLite file, like `test/persistence.test.ts`.
- The zod schemas can also generate the OpenAPI documentation ([ADR 0009](0009-api-documentation.md)).
- New dependency: `zod` in `apps/api` (already used in `packages/ui`).
