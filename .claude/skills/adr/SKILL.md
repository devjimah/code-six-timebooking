---
name: adr
description: Write an Architecture Decision Record in docs/adr. Use whenever a technical decision is made or mentioned - choosing a language, framework, library, database, hosting, cloud vs. on-premise, sign-in / SSO / identity, architecture pattern, data retention, use of AI - even in passing, and when the team asks for an ADR or decision record.
---

# ADR

Goal: every important decision is recorded in `docs/adr/` with real alternatives. Supports criterion 4, building block B in `docs/scoring.md`. Follows guide 2.5.

## Steps

1. List `docs/adr/` and pick the next free number (`0001`, `0002`, …). Never overwrite an existing ADR. If a decision changes, write a new ADR and mark the old one as replaced.
2. Ask the team up to 3 questions if context, alternatives or reasons are unclear. **The team decides; you write.**
3. Follow `docs/adr/0000-template.md`: status, date, deciders, context, at least two real options with pros and cons, the decision with its reason, consequences including negative ones.
4. Keep it to half a page. Do not invent facts about the product.
5. Save as `docs/adr/NNNN-short-title.md` and suggest the commit `docs: add ADR NNNN <title>`.

## Required topics

Check whether these exist. If not, mention them when a related topic comes up:

- **Identity:** how users sign in. The client wants single sign-on with its own identity provider, and each customer may use a different one. Demo approach vs. production approach.
- **Operation:** cloud, at the customer's site, or both; how the product scales to thousands of bookings per month.

## Typical triggers

A new dependency in `package.json`, `pom.xml`, `build.gradle`, `requirements.txt`, `pyproject.toml` or `*.csproj`; a database or service in `compose.yaml`; a choice of hosting; an AI service. Offer an ADR briefly, in one sentence, and continue with the actual task if the team declines.
