---
name: run-check
description: Check that the application starts from the README alone, as the jury will do - fresh clone, exact commands, demo users, evidence map. Use when the team edits the README, prepares the hand-in or demo, says "done", "submit", "hand in", or asks whether someone else can start the project.
---

# Run check

Goal: a person outside the team, or a coding agent, starts the application from the README alone within 5 minutes. This is criterion 5 in `docs/scoring.md` (section *Run check for the juror*). Follows guide 4.1.

## Steps

1. Read `README.md`. Check that the sections *Prerequisites, Setup, Run, Test, Demo users, Evidence map* exist and contain no `TODO`, and that the template note at the top has been removed.
2. Check every step for exactness: versions, commands (not prose), ports, environment variables (`.env.example` must exist and be complete), seed data, a demo user per role.
3. **If you can run commands:** clone the repository into a temporary folder, follow the README **literally**, and record for each step: ok / failed / ambiguous. Do not fix things silently, do not guess missing steps, do not use knowledge from the working copy. Note roughly how long it takes. Delete the temporary folder afterwards.
4. **If you cannot run commands:** do a desk check of the README against `git ls-files` and the build files.
5. Check that every link in the evidence map points to a file that exists.
6. Report what worked, the first step that failed and why, and the exact README fix. Offer to apply the README fixes.

## Rules

- No paid accounts or API keys may be needed. AI features must work with a mock switch.
- Never change application code during the check. Report instead.

## Done when

- The fresh clone runs with seed data and demo users, using only the README.
