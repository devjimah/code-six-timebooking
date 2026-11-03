# 0019 · Public holidays per state, from where a consultant works

- **Status:** accepted
- **Date:** 2026-11-02
- **Deciders:** Kamaldeen, Abdulrashid, Jimah Abraham Zorwi, Fazail Osuman, Anwaar Ibrahim, Mansura Bawah
- **Ticket:** [#66](https://github.com/devjimah/code-six-timebooking/issues/66)

## Context

German public holidays differ between the 16 states, and the Working Time Act forbids work on them. Until now only the
nationwide ones were checked, so a consultant in Munich could book on Corpus Christi. We must decide where the state
comes from.

## Options considered

1. **Per consultant** – right when one supplier has staff in several states. / One more fact stored about a person.
2. **Per supplier** – simple, no extra personal data. / Wrong for a supplier with offices in several states.
3. **Per order** – follows the client's project location. / A consultant's holidays could differ between two orders on
   the same day, and the law is about where the person works.

## Decision

We choose **option 1**. An admin sets a `work_state` on a consultant's account.

- Without a state, the nationwide holidays count, as before. Nothing breaks for existing accounts.
- The booking rule, the booking calendar and the forecast all use the same list in `domain/public-holidays.ts`.
- In the forecast, a holiday in someone's state counts like an unavailable day for that person.
- Only whole states count. Holidays of single towns or regions are left out, except Assumption Day in Bavaria, which
  counts for the whole state although it only applies in its predominantly Catholic municipalities.

## Consequences

- The state is personal data, kept with the account and visible to the person and the admin only.
- Someone in a town with its own holiday, such as Augsburg's Peace Festival on 8 August, is not protected by this rule,
  and someone in a Protestant part of Bavaria is refused on Assumption Day.
- The holiday list is our own code, not an official source. It needs a check if a state changes its law.
