# 0004 · Role model and accounts: fixed roles, accounts created by an admin

- **Status:** accepted
- **Date:** 2026-10-31
- **Deciders:** TODO (team names)
- **Ticket:** [#5](https://github.com/devjimah/code-six-timebooking/issues/5)

## Context

Consultants (supplier side), project managers, purchasing and admins (client side) need clearly different rights
(see `docs/roles-and-privacy.md`). The first version of ticket #5 let new users register themselves and choose
their account type. Anyone could then make themselves a project manager and read other people's hours.

## Options considered

1. **Self-registration with a chosen role** – no admin work. / Privilege escalation: the user decides their own
   rights. Not acceptable for personal working-time data.
2. **Admin creates accounts; one fixed role per user stored as text on `users`** – simple, easy to check on the
   server, already in the schema (`ROLES` in `persistence/schema.ts`). / Changing a role needs an admin; a person
   with two roles needs two accounts.
3. **Roles and permissions tables (RBAC)** – flexible, roles configurable per customer. / More tables, more
   code and more tests than four days allow.

## Decision

We choose **option 2**. Only an admin can create accounts (`POST /api/users`, checked on the server). The seed
creates one demo user per role. In production, accounts come from single sign-on ([ADR 0002](0002-identity-and-sign-in.md)),
so this endpoint becomes a fallback.

## Consequences

- Permission checks stay readable: `requireRole("project_manager")`.
- A consultant must belong to a supplier; client-side roles must not. This is a domain rule with tests.
- If customers need their own roles later, we move to option 3 and replace this ADR.
- Implemented with ticket #5: `POST /api/users` and `GET /api/suppliers` (admin only), the rule in
  `apps/api/src/domain/rules/account.ts`. Emails are stored in lower case. The admin sets an initial password
  (10–72 characters; bcrypt ignores everything after 72 bytes) and hands it over; a "change your password on
  first sign-in" step is not built yet.
- **Update 2026-10-31 – fourth role `purchasing`:** the role matrix (`docs/roles-and-privacy.md`) separates
  creating a budget from spending it. Purchasing places orders and manages suppliers; the project manager spends
  the budget and checks the work. Like admins and project managers, purchasing works for the client and has no
  supplier. Adding a role needed no migration (roles are text) – only `ROLES`, the seed and the route checks.
