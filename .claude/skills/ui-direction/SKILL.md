---
name: ui-direction
description: Help a hackathon team find its own visual direction and build screens or a clickable mockup, with one view per role. Use when the team works on UI, design, layout, colours, screens, a dashboard, a prototype, wireframes or a mockup.
---

# UI direction

Goal: the product has its own look that fits its users, and there is a screen or mockup view per role. Supports criterion 4 (block F) and criterion 3 (role views) in `docs/scoring.md`. Follows guide 3.3.

## Steps

1. Read `docs/product-vision.md` and `docs/roles-and-privacy.md`.
2. For each main role, ask: what one thing must they see within 3 seconds?
3. Propose **three clearly different visual directions**: name, feeling, colour palette (hex), font pairing, layout of the main screen. Avoid generic admin-dashboard templates and the default look of the component library.
4. Let the team choose. Record the choice briefly in `docs/mockup/README.md`.
5. **Mockup track, or before coding:** create a clickable prototype as plain HTML/CSS files in `docs/mockup/` (no build tools, opens in the browser), one screen per role, linked along the core flow, with realistic fake data from the domain. Or help the team structure its Figma / Penpot work and export it to `docs/mockup/` daily.
6. **Code track:** apply the direction consistently (colour and font tokens in one place). Check basic accessibility: contrast, labels, keyboard use.

## Done when

- Every role has a screen or mockup view, committed to the repository.
