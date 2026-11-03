#!/usr/bin/env bash
# Carga cada reporte de docs/issues/ como GitHub Issue, con su etiqueta de severidad.
# Requiere gh con sesión iniciada (gh auth login). Correrlo una sola vez, desde la raíz del repo.
set -euo pipefail

REPO="erikhernandez9/taskflow_2026_s2_erik_ignacio"

gh label create critica --repo "$REPO" --color B60205 --force
gh label create alta --repo "$REPO" --color D93F0B --force
gh label create media --repo "$REPO" --color FBCA04 --force
gh label create baja --repo "$REPO" --color 0E8A16 --force

for file in docs/issues/[0-9]*.md; do
  title=$(sed -n '1s/^# //p' "$file")
  severity=$(sed -n 's/^\*\*Severidad:\*\* //p' "$file")
  body=$(mktemp)
  tail -n +3 "$file" > "$body"
  gh issue create --repo "$REPO" --title "$title" --body-file "$body" --label "$severity"
  rm -f "$body"
done
