# 0005 · Error handling: DomainError in the domain, one error handler in the API

- **Status:** accepted
- **Date:** 2026-10-31
- **Deciders:** TODO (team names)
- **Ticket:** [#17](https://github.com/devjimah/code-six-timebooking/issues/17)

## Context

Every business rule (10 hours per day, free budget …) must be enforced on the server and return an error a user
understands (scoring criterion 2). Without a shared approach, each route would build its own error response
with different status codes and shapes, and the UI could not show them consistently.

## Options considered

1. **Each route handler catches errors and builds its response** – explicit. / Duplicated code; easy to forget
   a case; rules start leaking into controllers.
2. **Rules return a result object (`{ ok: false, error }`) instead of throwing** – no exceptions. / Every caller
   must check and pass the result on; more code for juniors to read.
3. **Rules throw `DomainError(code, message)`; one Express error handler maps it to HTTP** – rules stay short,
   one place decides the HTTP shape. / An exception you forget to throw is a silent bug, so tests must cover the
   rejecting case.

## Decision

We choose **option 3**. `apps/api/src/domain/errors.ts` holds `DomainError` with no Express import.
`apps/api/src/api/error-handler.ts` maps it to **422** with `{ "code", "message" }`, invalid JSON to **400**,
and anything else to **500** without internal details. Express 5 forwards errors from async handlers on its own.

## Consequences

- A new rule only needs `throw new DomainError("CODE", "message")` and its tests.
- `code` is stable and machine-readable, so the UI can translate it ([ADR 0011](0011-internationalisation.md)).
- 401 and 403 are not domain errors; the auth middleware sends them ([ADR 0002](0002-identity-and-sign-in.md)).
- Use cases signal "does not exist" and "not yours" with `NotFoundError` (404) and `AccessDeniedError` (403)
  from `apps/api/src/application/errors.ts`; the same error handler maps them (added with ticket #18).
- Covered by `apps/api/test/error-handler.test.ts`.
