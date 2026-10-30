<!-- ===== TEMPLATE NOTE: delete this block once your team has started ===== -->
> **Article26 Hackathon 2026 · Team template**
>
> This repository is your starting point. It contains **no code and no required technology**, only guidance:
>
> 1. **Start here:** read the [Build Guide](docs/guide.md) and the [challenge](docs/challenge.md).
> 2. Fill in [docs/product-vision.md](docs/product-vision.md) together.
> 3. Keep this README up to date as you build. The technical jury starts your product **from this README alone** ([how they check](docs/scoring.md#run-check-for-the-juror)).
>
> Using an AI coding agent (GitHub Copilot, Claude Code, Cursor …)? It reads [AGENTS.md](AGENTS.md) and the skills in `.claude/skills/` automatically. In GitHub Copilot Chat (agent mode) or Claude Code, type `/kickoff` to begin, or `/hackathon-review` at any time.
>
> Looking for an example? The `blueprint` branch contains a small Next.js + PostgreSQL app from an earlier edition. It is one possible approach, not a requirement.
<!-- ===== END OF TEMPLATE NOTE ===== -->

# TODO Product name

TODO – one sentence: what the product does and for whom. Link to [product vision](docs/product-vision.md).

## Prerequisites

| Tool | Version | Check |
|---|---|---|
| Node.js | 20.19 or newer | `node --version` |
| npm | 11.x | `npm --version` |

No database server is needed: SQLite is a file in `apps/api/data/` (see [ADR 0001](docs/adr/0001-database-and-api-stack.md)).

## Setup

From a fresh clone:

```bash
npm install
cp apps/api/.env.example apps/api/.env   # PowerShell: Copy-Item apps/api/.env.example apps/api/.env
npm run db:migrate -w api                # creates the database and seeds demo data
```

## Run

```bash
npm run dev -w api   # API on http://localhost:3001 (migrates + seeds automatically on start)
```

Check: open http://localhost:3001/api/health → `{"status":"ok"}`.

### Database commands

| Command | What it does |
|---|---|
| `npm run db:migrate -w api` | Apply pending migrations, then seed demo data (if empty) |
| `npm run db:seed -w api` | Seed demo data only |
| `npm run db:reset -w api` | Delete the local database and rebuild it from migrations + seed |
| `npm run db:generate -w api -- --name <change>` | After editing `schema.ts`: create a new SQL migration in `apps/api/drizzle/` |

## Test

```bash
npm test -w api   # Vitest: unit + integration tests of the API
```

## Demo users

All demo users have the password `demo1234` (demo data only).

| Role | Sign in with | What to try |
|---|---|---|
| Admin | `admin@demo.local` | Manage users (coming in #5) |
| Project manager | `pm@demo.local` | See bookings on your orders (coming in #6) |
| Consultant (Acme Consulting) | `consultant@demo.local` | Book time on an order (coming next sprint) |

## Evidence map

Where the technical jury finds the evidence for each [technical criterion](docs/scoring.md).

| Criterion | Evidence |
|---|---|
| 1 · Persistence and data model | [schema.ts](apps/api/src/persistence/schema.ts), [migrations](apps/api/drizzle/), [seed.ts](apps/api/src/persistence/seed.ts), [ER diagram](docs/domain.md) |
| 2 · Business rules and unit tests | TODO – domain rule files, test folder |
| 3 · Roles, permissions and privacy | [Permission concept](docs/roles-and-privacy.md), TODO – mockup views / enforcement code |
| 4 · Architecture and engineering | TODO – A structure · B [ADRs](docs/adr/) · C Git history · D API docs · E compose file · F [mockup](docs/mockup/) |

## Team

TODO – names and GitHub handles.
