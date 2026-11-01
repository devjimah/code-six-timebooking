# 0002 · Identity and sign-in: demo login now, OpenID Connect single sign-on in production

- **Status:** proposed
- **Date:** 2026-10-31
- **Deciders:** TODO (team names)
- **Ticket:** [#6](https://github.com/devjimah/code-six-timebooking/issues/6)

## Context

Users from two sides sign in: consultants of service providers and the client's own staff. A large German
client expects single sign-on with its own identity provider (often Microsoft Entra ID), and every customer
of our product may use a different one. For the hackathon the jury must sign in as each demo user without
any external account.

## Options considered

1. **Email + password, session in a signed httpOnly cookie** – no external service, easy to test, the cookie
   cannot be read by JavaScript (protects against XSS token theft). / Not single sign-on; we store password hashes.
2. **JWT in `localStorage`, sent as a Bearer header** – common in tutorials, stateless. / Any XSS bug can steal
   the token; logout cannot really invalidate it.
3. **OpenID Connect now, with Keycloak in Docker as the identity provider** – real SSO from day one. / Needs
   Docker and realm configuration; risky for the 5-minute run check and new to the whole team.

## Decision

**Demo:** option 1. bcrypt password hashes (already in the seed), a signed httpOnly, `SameSite=Lax` session
cookie, and `requireAuth` / `requireRole` middleware on every protected route.
**Production:** OpenID Connect (authorization code flow with PKCE) against each customer's identity provider.
Roles come from the provider's group claims and map to our roles. Supplier consultants are invited as guest
users of the client's provider, or sign in through their own provider federated by the client.

## Consequences

- The login screen and the middleware stay the same in production; only the way a session is created changes.
- We store password hashes in the demo. In production we store no passwords at all.
- `SESSION_SECRET` must be set in `.env.example` with a dev-only default and replaced in every real installation.
- Next: write the group-to-role mapping into `docs/roles-and-privacy.md`.
- **Update 2026-10-31 – ending sessions:** a signed cookie cannot be taken back, so the server checks on every
  request whether the account is still active (step 4) and whether the cookie's session version still matches the
  account's `session_version`. A password reset or change raises the version, so every older cookie stops working
  at once ([auth/session.ts](../../apps/api/src/auth/session.ts), [auth/middleware.ts](../../apps/api/src/auth/middleware.ts)).
