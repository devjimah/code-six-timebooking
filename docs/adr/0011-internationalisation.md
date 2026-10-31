# 0011 · Internationalisation: react-i18next, German first, English second

- **Status:** accepted
- **Date:** 2026-10-31
- **Deciders:** TODO (team names)

## Context

The client is a German company. Its staff and many consultants work in German, but international consultants
and the hackathon jury may prefer English. German conventions differ: dates `27.10.2026`, decimal comma `3,5 h`,
money `1.234,56 €`, calendar weeks (KW). Texts must not be hard-coded in components, or translating later
means touching every screen.

## Options considered

1. **No library, hard-coded German** – nothing to learn. / English is impossible later without a rewrite.
2. **react-intl (FormatJS)** – ICU message syntax, strong formatting. / More verbose API; fewer beginner examples.
3. **i18next + react-i18next + i18next-browser-languagedetector** – the most used React option, simple `t("key")`,
   JSON files per language, language detection and plurals built in. / Three dependencies; keys can be mistyped
   unless we add type checking.

## Decision

We choose **option 3**. German (`de`) is the default and fallback language, English (`en`) the second.
Translations live in `apps/web/src/i18n/locales/{de,en}.json`. Dates, numbers and money are formatted with the
browser's `Intl` API for the active language, never by hand.
The API stays language-neutral: it returns a stable error `code` plus an English `message`
([ADR 0005](0005-error-handling.md)); the UI translates the code and falls back to the message.

## Consequences

- Every user-facing text in the web app goes through `t()`; pull request reviews check for hard-coded strings.
- Error codes from the API need a translation entry under `errors.<CODE>`.
- The chosen language is stored in `localStorage` (`i18nextLng`); no personal data.
- New dependencies in `apps/web`: `i18next`, `react-i18next`, `i18next-browser-languagedetector`.
