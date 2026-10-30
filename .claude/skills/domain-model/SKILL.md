---
name: domain-model
description: Help a hackathon team model its business domain - glossary, entities, relations and an ER diagram in Mermaid. Use when the team talks about entities, tables, database schema, data model, ER diagram, or what data the product stores.
---

# Domain model

Goal: `docs/domain.md` contains a glossary and an ER diagram, with the entities to build now marked. Supports criterion 1 in `docs/scoring.md`. Follows guide 2.3.

## Steps

1. Read `docs/product-vision.md`, the *Terms* section of `docs/challenge.md` and the current `docs/domain.md`.
2. Propose 8–12 business terms with a one-line meaning, in the team's words.
3. Propose entities with key fields and relations. Typical candidates: order (with a budget in person-days), booking, consultant, supplier, accounting object, absence, approval / proof of work, framework agreement. Only include what the vision needs.
4. Draw a Mermaid `erDiagram`. Mark entities `(now)` for the core flow and `(later)` for the next expansion stage.
5. Write everything into `docs/domain.md`, replacing the `TODO`s.
6. If code exists: compare the diagram with the actual schema or entities and point out differences.

## Rules

- As small as possible. Ask before adding anything the vision does not mention.
- A small implementation plus a diagram of the next stage earns full points for criterion 1. Say so, to take pressure off.

## Done when

- `docs/domain.md` has no `TODO` and the diagram renders on GitHub.
