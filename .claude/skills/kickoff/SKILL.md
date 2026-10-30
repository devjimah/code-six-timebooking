---
name: kickoff
description: Start a hackathon team on this repository. Use at the beginning of a session when docs/product-vision.md still contains TODO, when the team says "start", "kickoff", "where do we begin", "help us get started", or asks what to do first.
---

# Kickoff

Goal: the team has a filled product vision, a chosen track and a shared repository (GitHub recommended). Follows guide sections 1.2, 1.3 and 2.1 in `docs/guide.md`.

## Steps

1. **Check the setup.** Run `git remote -v`. We strongly recommend GitHub (not scored, but it makes collaboration and the jury's review easy). If there is no remote, explain guide 1.2: create the repository from the template, invite teammates, make it public or invite the jury.
2. **Read** `docs/challenge.md` and `docs/product-vision.md`.
3. **Interview the team** to fill the vision. Ask one question at a time, at most 8 in total: who uses the product first, which problem it solves, roles on the client and supplier side, the core flow, what makes it special, what they leave out, and the track (code / mockup / concept, see guide 1.3; be honest about the team's experience).
4. **Write** the answers into `docs/product-vision.md`, replacing every `TODO`. Use the team's words.
5. **Suggest the next step:** with the code or mockup track, `stack-advisor` (guide 2.2); with the concept track, `domain-model` (guide 2.3).
6. Suggest a first commit: `docs: add product vision`.

## Rules

- Do not invent the vision. If an answer is vague, ask once more, then write what the team said.
- Keep it short: the whole file fits on one screen.
