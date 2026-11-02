# 0017 · Landing page: Embla carousels through shadcn/ui and photos kept in the repository

- **Status:** accepted
- **Date:** 2026-11-02
- **Deciders:** TODO (team names)

## Context

The public landing page shows carousels with photos: an automatic hero, the steps of the core flow and a tour of the
roles. We must decide which carousel library to use and where the photos come from. Our rules require shadcn/ui
components and forbid anything that needs a paid account or API key. The jury may start the app without internet, and
the client is a German company that cares about personal data.

## Options considered

**Carousel**

1. **Embla through the shadcn/ui `carousel` component** – fits our component rule and styling, small, swiping and
   keyboard included. / A new dependency; autoplay with a progress bar is our own code.
2. **Swiper** – many ready-made effects. / Brings its own look and CSS, and is not part of shadcn/ui.
3. **Our own carousel** – no dependency. / Swiping, looping and accessibility would all be ours to build and test.

**Photos**

1. **Copies from Unsplash in the repository** – works offline, no key, no visitor data goes to a third party, allowed
   by the Unsplash License. / About 1 MB in Git, and we pick and resize photos by hand.
2. **Unsplash API** – search and fresh photos. / Needs an API key, and its terms require loading images from Unsplash
   with a credit on each display.
3. **Direct links to Unsplash** – no files in Git. / Fails without internet, and each visitor's IP address goes to
   Unsplash.

## Decision

We choose **Embla through shadcn/ui** and **copies of the photos in `apps/web/src/assets/landing/`**. It is the only
combination that follows the component rule, needs no key and also works offline. Autoplay lives in
`pages/landing/use-autoplay.ts`, so each carousel can show its progress and offers a way to pause it. It does not start
by itself for people who prefer reduced motion.

## Consequences

- The page has two new dependencies: `embla-carousel-react` in `packages/ui` and `embla-carousel-fade` in `apps/web`.
- The JavaScript bundle grows, for signed-in users too. Loading the landing page separately would fix that; we leave
  it for now because it matters little for the demo.
- [CREDITS.md](../../apps/web/src/assets/landing/CREDITS.md) records the source of each photo, but not the
  photographers, because looking them up needs authorization. The license does not require a credit.
- They are stock photos, not real users of the product. We do not add quotes or customer names to them.
- The demos on the page run only in the browser and repeat a little of the logic in simplified form. The rules stay in
  the API.
