# 0004 · Role model and accounts: fixed roles, accounts created by an admin

- **Status:** proposed
- **Date:** 2026-10-31
- **Deciders:** TODO (team names)
- **Ticket:** [#5](https://github.com/devjimah/code-six-timebooking/issues/5)

## Context

Consultants (supplier side), project managers and admins (client side) need clearly different rights
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
