# 0009 · API documentation: OpenAPI generated from zod DTOs, served with Swagger UI

- **Status:** accepted
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
3. **Generate from the zod DTOs with `@asteasolutions/zod-to-openapi`** – the same schema validates requests
   and documents them. / An extra library that must keep up with zod 4; each route registered in its registry.
4. **Generate from the zod DTOs with zod's built-in `z.toJSONSchema()`** (target `openapi-3.0`) – same benefit
   as option 3, no extra library for the schemas. / We assemble the paths ourselves (one table in `openapi.ts`).

## Decision

We choose **option 4**, plus `swagger-ui-express` to show the spec. Zod 4 already converts schemas to OpenAPI 3.0,
so option 3 would add a dependency without adding anything we need. Response shapes in `dto.ts` became zod
schemas too, so the TypeScript response types are derived from the same source (`z.infer`).

The spec is served at `/api/openapi.json` and Swagger UI at `/api/docs`, both without sign-in and outside the audit log.

## Consequences

- If a DTO changes, the documentation changes with it.
- Every route needs an entry in the `routes` table in `apps/api/src/api/openapi.ts`. `openapi.test.ts` compares
  that table with the routes in the code and fails if one is missing or left over.
- 401 and 403 are added automatically from the route's roles; 400, 404 and 422 are listed per route.
- `swagger-ui-dist` pulls in `@scarf/scarf`, which wants to send install telemetry. Its install script is blocked by
  npm's install-script approval, and we leave it that way.
- The public docs reveal the API's shape, not data. In production they can be switched off or put behind sign-in.
