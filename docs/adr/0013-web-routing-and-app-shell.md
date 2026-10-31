# 0013 · Web routing and app shell: React Router and the shadcn Sidebar

- **Status:** accepted
- **Date:** 2026-10-31
- **Deciders:** TODO (team names)

## Context

The web app grows from one sign-in screen to several screens per role (admin: users, audit log; later
project manager and consultant screens). People must be able to bookmark a screen, use the browser's back
button and reload without losing their place. The app must work on phones as well as on desktops.

## Options considered

1. **No router, switch screens with React state** – no dependency. / No URLs, no back button, no deep links.
2. **React Router 7 (declarative `<Routes>`)** – the most used React router, many examples, easy to explain;
   route guards are plain components. / Route paths are strings, so a typo is not a compile error.
3. **TanStack Router** – fully type-safe routes and search params. / More setup and more concepts for a junior team
   in a four-day hackathon.

For navigation we compared the **shadcn Sidebar** (fixed on desktop, slide-in sheet behind a ☰ button on phones)
with a **top bar with tabs** (simpler, but crowded with more than three or four screens on a phone).

## Decision

We choose **React Router 7** in declarative mode and the **shadcn Sidebar** as the app shell.

- All routes are in [App.tsx](../../apps/web/src/App.tsx); the screens of each role are listed once in
  [navigation.ts](../../apps/web/src/routes/navigation.ts) and drive the sidebar.
- [guards.tsx](../../apps/web/src/routes/guards.tsx) sends signed-out users to `/login` and other roles away from
  admin screens. This is **convenience only**: the API checks the session and the role on every request
  (`requireAuth` / `requireRole`), so typing a URL never shows data the user may not see.
- Mobile first: the sidebar becomes a sheet below 768 px, drawers slide up from the bottom on phones, and tables
  move secondary columns under the main cell instead of scrolling sideways.

## Consequences

- Every screen has a URL; reload and back button work.
- A new screen means: one `<Route>` in `App.tsx` plus one entry in `navigation.ts`.
- In production the web server must answer unknown paths with `index.html` (SPA fallback), or a reload on
  `/admin/users` gives 404. The Vite dev server already does this.
- Route paths are not type-checked; keep them in `navigation.ts` and reuse them instead of retyping strings.
