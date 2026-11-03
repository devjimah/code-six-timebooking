# 0022 · Use of AI: a rule-based mock behind a switch, and no data leaves the system

- **Status:** accepted
- **Date:** 2026-11-02
- **Deciders:** Kamaldeen Fadatoyo, Abdul Rashid Fadilatu, Jimah Abraham Zorwi, Fazail Osuman, Anwaar Ibrahim, Mansura Bawah
- **Ticket:** [#79](https://github.com/devjimah/code-six-timebooking/issues/79)

## Context

A consultant should be able to type "yesterday 9 to 5 on the portal migration, 1 h lunch" and get a booking to confirm.
The hackathon rules say nothing may need a paid account or API key, and that AI features need a mock switch. A booking
sentence is also personal data: it says who worked when, on what.

## Options considered

1. **A rule-based parser as the mock, behind `AI_MODE`** – runs without a key or internet, and no data leaves the system.
   / It only understands the patterns we wrote, and it is not really AI.
2. **A hosted language model, with the rule-based parser as the mock** – understands far more. / Needs a key, and the
   sentence and the list of orders would go to a third party, which needs a contract and the client's consent.
3. **Leave it out** – nothing to explain. / The challenge names this idea, and booking in one sentence saves time.

## Decision

We choose **option 1**. `AI_MODE=mock` (the default) uses `domain/booking-sentence.ts`; `AI_MODE=off` switches the
feature off. **There is no real model in this product, and we say so.**

- It only proposes. It fills the form, and the consultant confirms; nothing is saved before that.
- Every proposal goes through the normal booking rules when the consultant books.
- It only knows the orders this consultant may book on, so it cannot reveal another company's.
- What it does not understand stays empty, rather than being guessed. Two orders that match equally give no order.

## Which data leaves the system

**None.** The parser runs inside the API. The sentence is not stored, and it is left out of the audit log because it is
free text.

## Consequences

- The run check needs no key, and the feature works offline.
- It understands set patterns in English and German, so an unusual sentence fills in less.
- A real model could replace one function, `parseBookingSentence`, and would need a new mode, a data processing agreement
  and a new version of this ADR before any sentence leaves the system.
