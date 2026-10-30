@AGENTS.md

## Claude Code specifics

- Skills live in `.claude/skills/`. Use them proactively when their description matches.
- A SessionStart hook in `.claude/settings.json` prints the current state of the repository (empty templates, missing ADRs). Act on it.
