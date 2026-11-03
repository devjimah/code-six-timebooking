# 0018 · Proof of work and invoice check: computed from the bookings, CSV, nothing stored

- **Status:** accepted
- **Date:** 2026-11-02
- **Deciders:** Kamaldeen, Abdulrashid, Jimah Abraham Zorwi, Fazail Osuman, Anwaar Ibrahim, Mansura Bawah
- **Tickets:** [#75](https://github.com/devjimah/code-six-timebooking/issues/75), [#76](https://github.com/devjimah/code-six-timebooking/issues/76)

## Context

The client approves work per booking ([ADR 0014](0014-booking-approval.md)). Invoices arrive per month, so the
project manager needs a monthly list and purchasing needs to compare an invoice with what was approved. We must decide
how much of this we store and which file format we offer.

## Options considered

1. **Compute both from the bookings, CSV download, store nothing** – cannot drift from the bookings, no new tables, no
   new library. / No record of which invoices were checked, and no signed document.
2. **A table of invoices, CSV download** – differences stay on record. / More to build, and invoices become data to
   protect and keep.
3. **Compute both, CSV and PDF** – a PDF looks like the document people expect. / A new dependency and layout work,
   for a similar result in a demo.

## Decision

We choose **option 1**. The calculation lives in `domain/proof-of-work.ts`.

- The **proof of work** is one order's bookings in one month, with totals per status, for the order's project manager.
  It has no start or end times ([ADR 0010](0010-time-entry-granularity.md)).
- The **CSV** is made for the German Excel the client uses: semicolons, decimal comma, byte order mark. A description
  starting with `=`, `+`, `-` or `@` gets a leading apostrophe, so Excel cannot run it as a formula.
- The **invoice check** is for purchasing, who type an amount and see the difference from approved hours × rate. They
  get sums only, and the amount is not stored or logged.

## Consequences

- A correction or a later approval changes the proof of that month: it shows today's state, not what was invoiced then.
- Hours that are open or returned count as not approved, so an invoice higher than the approved amount is often a
  sign that the check is simply not finished. The screen shows those hours next to the result.
- If the client needs a record of checked invoices, or a signed proof, that is a table and a document on top of this.
