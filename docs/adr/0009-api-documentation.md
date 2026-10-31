# 0009 · API documentation: OpenAPI generated from zod DTOs, served with Swagger UI

- **Status:** proposed
- **Date:** 2026-10-31
- **Deciders:** TODO (team names)
- **Ticket:** [#19](https://github.com/devjimah/code-six-timebooking/issues/19)

## Context

Scoring criterion 4 (block D) asks for a machine-readable description of the implemented API. Documentation
that is written separately from the code goes out of date within a day in a hackathon.

## Options considered

1. **Hand-written `openapi.yaml`** – no extra library. / Out of date as soon as a route changes.
2. **JSDoc comments on routes (`swagger-jsdoc`)** – close to the code. / Comments are not checked; types are
   written twice (comment and TypeScript).
3. **Generate from the zod DTOs (`@asteasolutions/zod-to-openapi`) + `swagger-ui-express`** – the same schema
   validates requests and documents them. / Two new dependencies; each route must be registered once.

## Decision

We choose **option 3**. The spec is served at `/api/openapi.json` and Swagger UI at `/api/docs`.

## Consequences

- If a DTO changes, the documentation changes with it.
- Every route must also be registered in the OpenAPI registry; the pull request checklist reminds us.
- README and Evidence map link to `http://localhost:3001/api/docs`.
