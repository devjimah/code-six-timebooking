#!/usr/bin/env bash
# SessionStart hook: prints a short repository status so the agent can suggest the right next step.
# Must never fail the session, so every check is best effort.

cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0

has_todo() { [ -f "$1" ] && grep -q "TODO" "$1"; }

notes=()
has_todo docs/product-vision.md && notes+=("product vision still has TODOs -> suggest skill 'kickoff'")
has_todo docs/domain.md && notes+=("domain model / ER diagram not filled -> skill 'domain-model'")
has_todo docs/roles-and-privacy.md && notes+=("permission concept not filled -> skill 'roles-privacy'")

adr_count=$(ls docs/adr 2>/dev/null | grep -E '^[0-9]{4}-' | grep -v '^0000-' | wc -l | tr -d ' ')
[ "${adr_count:-0}" -lt 3 ] && notes+=("${adr_count:-0} of at least 3 ADRs written (identity and operation are required) -> skill 'adr'")

has_todo README.md && notes+=("README still has TODOs -> keep Setup/Run/Test/Demo users current; skill 'run-check' before hand-in")

echo "Article26 hackathon repository status:"
if [ ${#notes[@]} -eq 0 ]; then
  echo "- templates filled. Suggest 'hackathon-review' at the end of each day."
else
  for n in "${notes[@]}"; do echo "- $n"; done
  echo "Mention the most relevant item briefly when it fits the user's request; do not interrupt their task."
fi
exit 0
