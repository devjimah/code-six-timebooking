---
name: roles-privacy
description: Help a hackathon team write and apply a permission and data privacy concept - roles on client and supplier side, role matrix, personal data, server-side enforcement, demo users. Use when the team talks about roles, users, login, sign-in, permissions, access rights, who may see what, personal data, GDPR or privacy.
---

# Roles and privacy

Goal: `docs/roles-and-privacy.md` documents clearly different roles from both sides, a role matrix and the personal data involved. Supports criterion 3 in `docs/scoring.md`. Follows guide 2.4.

## Steps

1. Read `docs/product-vision.md` and the current `docs/roles-and-privacy.md`.
2. List roles from **both sides**: supplier (e.g. consultant) and client (e.g. project lead, purchasing, finance). Avoid a plain "admin" vs. "user".
3. Fill the role matrix: rows are actions and data, columns are roles. Use `Σ` where a role should only see aggregated values (e.g. purchasing sees hours per order, not per person and day).
4. List the personal data, why it is stored, who needs it and how long it is kept. Apply data minimisation.
5. Name at least one conflict (e.g. transparency vs. privacy, control vs. not becoming the employer) and how the team resolves it.
6. If the team builds code: check that permissions are enforced **on the server** for every endpoint that returns or changes protected data, and that a request with the wrong role fails. Seed one demo user per role and list them in the README.
7. If the team builds a mockup: suggest one screen per role that shows the differences.
8. How real sign-in works (single sign-on with each customer's identity provider) is an ADR topic: offer the `adr` skill.

## Done when

- The concept file has no `TODO`, at least two clearly different roles from different sides, and a list of personal data.
- With code: no endpoint returns data the matrix forbids for that role.
