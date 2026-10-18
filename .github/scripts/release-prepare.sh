#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

branch=$(git branch --show-current)
version=$(.github/scripts/candidate.sh branch "$branch")

first=()
git describe --tags --match 'v[0-9]*' --abbrev=0 >/dev/null 2>&1 || first=(--first-release)

pnpm exec nx release changelog "$version" ${first[@]+"${first[@]}"} --git-commit=false --git-tag=false --git-push=false
git rm -q --ignore-unmatch .nx/version-plans/*.md
git add -A
git commit -m "chore(release): prepare $version" -m "- write the $version changelog entries from the version plans
- remove the consumed version plans"
echo "Prepared $version. Push $branch to publish its first release candidate."
