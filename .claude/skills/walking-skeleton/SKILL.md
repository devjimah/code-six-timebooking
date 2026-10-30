---
name: walking-skeleton
description: Set up a hackathon project as a walking skeleton - layered structure (API DTOs, domain, persistence), persistent database, seed data, demo users per role, .env.example, one test, README commands, optional OpenAPI and Docker Compose. Use when the team creates or scaffolds the project, sets up the backend, frontend or database, or builds the first end-to-end flow.
---

# Walking skeleton

Goal: the smallest version of the core flow runs end to end from documented commands. Supports criteria 1, 4 (blocks A, D, E) and 5 in `docs/scoring.md`. Follows guide 3.1.

## Steps

Work in small steps. After each step, give the exact command to verify it and wait for the team.

1. Read `docs/product-vision.md`, `docs/domain.md` (entities marked `now`), `docs/roles-and-privacy.md` and the stack ADR.
2. Create the project with the framework's official starter.
3. Create a structure that keeps apart: API DTOs, domain objects (with the business logic) and persistence entities. Folder names make it visible (e.g. `api/`, `domain/`, `persistence/`).
4. Persist the core entities in the chosen database. Data survives a restart.
5. Seed data on first start (a few orders, consultants, bookings) and **one demo user per role**. A simple sign-in or role switch is enough for the demo.
6. Implement the core flow thinly: a consultant books time on an order, the client sees the remaining budget.
7. Put all configuration in `.env.example` with safe defaults and read it at startup.
8. Add one unit test and a single command that runs all tests.
9. Optional, ask first: OpenAPI / Swagger UI (block D), `compose.yaml` for all components (block E).
10. Update the README sections *Prerequisites, Setup, Run, Test, Demo users* with exact commands, versions and ports, and the *Project facts* in `AGENTS.md`.
11. Suggest small commits along the way.

## Done when

- A fresh clone starts with the README commands in under 5 minutes, shows seed data, and the test command passes.
