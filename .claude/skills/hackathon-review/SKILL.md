---
name: hackathon-review
description: Review the team repository against the hackathon technical scoring and preconditions and list what is missing - ADRs for technology choices, tests for rules, permission concept, ER diagram, README and evidence map, Git history. Use when the team asks for a review, status, check, "what is missing", "are we ready", "how do we score", before the deadline, or at the end of a hackathon day.
---

# Hackathon review

Goal: show the team, criterion by criterion, which evidence the technical jury will find and what is missing, so they can close the gaps in time. Follows guide 4.2. This review covers only the technical dimension; business and agile are scored separately with their own criteria.

In the report, always name a criterion by its title, with the number only as a reference (e.g. "Business rules and unit tests (criterion 2)"), and say in one phrase what it asks for. The team does not know the numbers by heart.

**Never give points or a score.** That is the jury's job. Report findings and next steps only.

Free AI plans allow few requests: do the whole review in one go and answer in one message.

## Steps

1. Read `docs/scoring.md`, `docs/product-vision.md` (note the track) and `README.md`. List the files with `git ls-files`.
2. **Preconditions**
   - `git remote -v`: a GitHub remote is strongly recommended, not scored. Without any remote, remind the team that the jury must be able to read the repository.
   - `git log --format="%ad %an %s" --date=iso`: the history is spread over the hackathon days, with no single bulk commit and at least two meaningful commits per day. Name days without commits. Do not be strict about exact times.
   - Uncommitted or unpushed work: `git status -sb`.
3. **Criterion 1 · Persistence:** schema, migrations or entities exist; data is stored on the server; `docs/domain.md` has an ER diagram without `TODO`.
4. **Criterion 2 · Rules and tests:** find the business rules in the domain code. For each: is it enforced on the server? Is there an accept test and a reject test? Is there a single test command in the README? Rules that exist only in the UI are a finding. Use the checklist of the `business-rule` skill.
5. **Criterion 3 · Roles and privacy:** `docs/roles-and-privacy.md` is filled, has at least two clearly different roles from different sides and lists personal data. With code: spot-check that protected endpoints check the role on the server. With a mockup: views per role exist.
6. **Criterion 4 · Building blocks:** check each of A–F from `docs/scoring.md` and list which are present.
   - **B · ADRs:** at least three in `docs/adr/` (not counting the template); identity and operation are covered. **Compare with the technologies actually used** (dependency files, `compose.yaml`, hosting configuration, AI services). Every important technology without an ADR is a finding, e.g. "You use PostgreSQL (compose.yaml), but no ADR explains this choice."
7. **Criterion 5 · Run check:** README sections complete, no `TODO`, `.env.example` present, demo users listed, evidence map links resolve. For a full check, offer the `run-check` skill.
8. **Track:** read the findings in the light of the team's track. Do not push a concept team to write code; show what is reachable in their track.

## Output format

One message, in this shape:

```
Hackathon review · <date, time>   Track: <code / mockup / concept>

Preconditions                    ✅ / ⚠️ / ❌  one line each
Criterion 1 · Persistence        ✅ / ⚠️ / ❌  evidence or what is missing, with file names
Criterion 2 · Rules & tests      …
Criterion 3 · Roles & privacy    …
Criterion 4 · Building blocks    present: A, C, … · missing: …
Criterion 5 · Runs from README   …

Next 3 steps (highest value first):
1. … (skill or guide section to use)
2. …
3. …
```

✅ = evidence found · ⚠️ = partly there · ❌ = missing. Be concrete and name files. Be encouraging: say what is already good.
