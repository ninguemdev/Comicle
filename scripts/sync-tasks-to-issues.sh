#!/usr/bin/env bash
# Cria uma issue no GitHub para cada arquivo docs/tasks/T*.md que ainda não tem issue.
# A fonte de verdade continua sendo docs/tasks/; as issues servem só de espelho.
# Uso: scripts/sync-tasks-to-issues.sh [--dry-run]
set -euo pipefail

dry_run=false
[ "${1:-}" = "--dry-run" ] && dry_run=true

command -v gh >/dev/null || { echo "Instale o GitHub CLI (gh) e rode 'gh auth login'." >&2; exit 1; }

root="$(git rev-parse --show-toplevel)"
cd "$root"

if ! $dry_run; then
  gh label create task --color 1E88E5 --description "Task do backlog (docs/tasks)" >/dev/null 2>&1 || true
fi

existing="$(gh issue list --state all --label task --limit 500 --json title --jq '.[].title')"

for file in docs/tasks/T[0-9][0-9]-*.md; do
  title="$(head -n 1 "$file" | sed 's/^# //')"
  if printf '%s\n' "$existing" | grep -Fxq "$title"; then
    echo "já existe: $title"
    continue
  fi
  if $dry_run; then
    echo "criaria:   $title"
  else
    gh issue create --title "$title" --label task --body-file "$file" >/dev/null
    echo "criada:    $title"
  fi
done
