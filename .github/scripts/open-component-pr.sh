#!/usr/bin/env bash
# Opens the pull request of one component branch, against the right base.
#   open-component-pr.sh feature/dialog-component
# The base is the branch it is stacked on (.github/component-stacks.txt) while that one is unmerged,
# otherwise develop. Needs gh.
set -euo pipefail
branch="${1:?usage: open-component-pr.sh feature/<name>-component}"
root=$(git rev-parse --show-toplevel)
base=develop
parent=$(awk -v b="$branch" '$1 == b {print $2}' "$root/.github/component-stacks.txt")
if [ -n "$parent" ] && ! git merge-base --is-ancestor "origin/$parent" origin/develop 2>/dev/null; then base="$parent"; fi
name=${branch#feature/}; name=${name%-components}; name=${name%-component}
title=$(git log --reverse --format=%s "origin/develop..origin/$branch" | grep -m1 '^feat' || true)
[ -n "$title" ] || title="feat(ui): add the $name component"
body=$(mktemp)
cat > "$body" <<MD
## Description

Adds the \`$name\` component to \`@andes-ng/ui\`: component, stories, specs and a version plan, with its exports in \`packages/ui/src/lib/$name/index.ts\` and one line in the public index.

**Related issue:** n/a

---

## Type of Change

- [x] \`feat\` — new component, token, or capability

---

## Checklist

- [x] Branch name follows \`feature/*\`
- [x] Commits follow Conventional Commits
- [x] \`pnpm format:check\`, \`pnpm lint\`, \`pnpm test\`, \`pnpm build\` and \`pnpm build:storybook\` pass
- [x] Public API changes include a version plan (\`pnpm nx release plan\`)
- [x] Unit tests, keyboard behavior tests where applicable and Storybook examples
- [x] No secrets, credentials, or key material are committed

---

## How to Test

\`pnpm storybook\`, then open the component's stories in light and dark.

## Merge order

$( [ "$base" = develop ] && echo "Independent: merge with a merge commit in any order." || echo "Stacked on \`$base\`: merge that pull request first; this one retargets develop automatically." )
MD
gh pr create --base "$base" --head "$branch" --title "$title" --body-file "$body"
