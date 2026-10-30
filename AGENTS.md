# AGENTS.md

Instructions for AI coding agents (GitHub Copilot, Claude Code, Cursor, Codex …) working in this repository.
Humans: this file is for your AI assistant, but it is worth reading too.

## Context

This is a team repository of the **Article26 Hackathon 2026** (Friday 30 Oct, 09:00 – Tuesday 3 Nov, 11:00).
A team of junior developers builds a time booking product for a large company that buys project work
from external service providers.

Read these files before you propose anything substantial:

- `docs/product-vision.md` – what this team builds, for whom, its roles, its track (code / mockup / concept) and stack
- `docs/challenge.md` – the challenge brief
- `docs/scoring.md` – how the technical jury scores (one of three dimensions; business and agile are scored separately with their own criteria)
- `docs/guide.md` – the step-by-step guide the team follows

If `docs/product-vision.md` still contains `TODO`, suggest filling it in first (skill `kickoff`, guide 2.1).

## How to work with this team

- The team members are **junior developers**. Explain briefly *why*, not only *what*. They must be able to explain every file to the jury.
- **Small steps.** One entity, one rule, one screen at a time. After each step, give the exact command to check it works, and wait.
- **Propose, do not decide.** For real choices (technology, architecture, design) show 2–3 options with pros and cons and let the team choose.
- **Keep the product the team's own.** Do not push a default stack or a generic dashboard look. Follow the product vision.
- Do not invent facts about the team's product. Ask.

## Rules for the code and the repository

These rules come from the technical scoring. Follow them without being asked.

1. **Decisions become ADRs.** Whenever a technology, library, database, hosting option or architecture pattern is chosen, offer to write an ADR in `docs/adr/` from `docs/adr/0000-template.md` (skill `adr`). Required topics: identity / sign-in and operation / scaling.
2. **Structure.** Keep API DTOs, domain objects and persistence entities apart, in recognisable folders.
3. **Business rules live in the domain**, are enforced on the server and return an understandable error message. Every rule gets unit tests for the accepting and the rejecting case (skill `business-rule`).
4. **Permissions are checked on the server**, following `docs/roles-and-privacy.md`. Hiding a button is not a permission check.
5. **Data survives a restart.** Seed data and one demo user per role are created automatically.
6. **Configuration** lives in `.env.example` with safe defaults. Never commit secrets or real personal data. Nothing may require a paid account or API key; AI features need a mock switch.
7. **README first.** When a command to install, run or test changes, update the README sections *Prerequisites · Setup · Run · Test · Demo users* in the same step. Keep the *Evidence map* current.
8. **Git.** Suggest small commits with clear messages (`feat|fix|docs|test: …`) and feature branches for larger work. Remind the team to push regularly: commits must be spread over the hackathon days.
9. **Always use shadcn/ui components (`@workspace/ui/components/*`).** Add needed components via `npx shadcn@latest add <component> -c apps/web` into `packages/ui` and import them from `@workspace/ui/components/<component>`. Build a full-fledged application UI rather than single-file demo UIs.

## Skills and guide sections

The skills live in `.claude/skills/`. Claude Code and GitHub Copilot (VS Code agent mode, Copilot CLI and the Copilot cloud agent) load them from there automatically and offer them as slash commands, e.g. `/hackathon-review`. Agents without skill support read the `SKILL.md` file named in the table, or follow the matching guide section.

| When the team … | Skill | Guide |
|---|---|---|
| starts, or the product vision is empty | `kickoff` | 1.2, 1.3, 2.1 |
| talks about language, framework or database | `stack-advisor` | 2.2 |
| talks about entities, tables, data model | `domain-model` | 2.3 |
| talks about roles, login, permissions, personal data | `roles-privacy` | 2.4 |
| makes or mentions a technical decision | `adr` | 2.5 |
| sets up the project or the first end-to-end flow | `walking-skeleton` | 3.1 |
| implements a business rule or validation | `business-rule` | 3.2 |
| works on UI, design or a mockup | `ui-direction` | 3.3 |
| edits the README or prepares the hand-in | `run-check` | 4.1 |
| asks for status, review, "what is missing", or before the deadline | `hackathon-review` | 4.2 |

## Project facts

The team fills this in once the stack is chosen. Keep it short and exact.

- Product: TODO
- Track: TODO (code / mockup / concept)
- Stack: TODO
- Install: `TODO`
- Run: `TODO`
- Test: `TODO`
- Folder structure: TODO
