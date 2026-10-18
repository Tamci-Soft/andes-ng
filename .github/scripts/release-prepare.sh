#!/usr/bin/env bash
# Run once on a fresh release/X.Y.Z or hotfix/X.Y.Z branch (pnpm release:prepare): writes the changelog entries of
# X.Y.Z from the version plans, then removes the consumed plans. No manifest, tag or lockfile changes: the version
# lives in the branch name and the git tags, and release.yml stamps it on the packages when it publishes.
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
