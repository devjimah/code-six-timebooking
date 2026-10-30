---
trigger: always_on
---

# UI & Component Library Rule

- **Always use shadcn/ui components** (`@workspace/ui/components/*` from `packages/ui/src/components/`).
- When new UI primitives are needed (e.g., `card`, `dialog`, `table`, `tabs`, `select`, `input`, `label`, `badge`, `progress`, `sheet`, `dropdown-menu`, `sonner`), add them via the shadcn CLI into `@workspace/ui` (`npx shadcn@latest add <component> -c apps/web`) and import them from `@workspace/ui/components/<component>`.
- Build full-fledged, multi-view application architecture rather than single-file demo UIs.
