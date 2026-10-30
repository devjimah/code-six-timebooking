---
name: stack-advisor
description: Help a hackathon team choose a simple technology stack (language, framework, database, test runner, API docs). Use when the team asks which language, framework or database to use, how to set up the project technically, or compares technologies.
---

# Stack advisor

Goal: the team picks a stack it can handle in four days and records the decision as an ADR. Follows guide 2.2 in `docs/guide.md`.

## Steps

1. Read `docs/product-vision.md` (track, roles, core flow).
2. Ask, if not known: what does each team member already know (languages, frameworks)? Which operating systems are on the laptops? Is Docker installed?
3. Propose **three different stacks**. For each: language and framework, database, test runner and test command, how API documentation is produced (OpenAPI / Swagger), setup effort for beginners, risks.
4. Principles: one language if possible; frameworks that do a lot for you; **SQLite unless there is a reason not to**; nothing that needs a paid account; everything runs offline on a laptop once installed. The `blueprint` branch (Next.js + PostgreSQL + Swagger) is one example, never the default answer.
5. **Do not choose for the team.** End with 2–3 questions that help them decide.
6. When they decide: draft `docs/adr/0001-<stack>.md` with the `adr` skill, and fill the *Project facts* in `AGENTS.md` and the *Our stack* section in `docs/product-vision.md`.
7. Remind them to download all dependencies now, while the internet works.

## Done when

- One stack is chosen, recorded in an ADR, and its runtime runs on every laptop.
