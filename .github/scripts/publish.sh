#!/usr/bin/env bash
set -euo pipefail

tag="${1:?usage: publish.sh <dist-tag>}"
provenance="${NPM_PROVENANCE:-true}"
cd "$(git rev-parse --show-toplevel)"

dirs=(packages/tokens dist/packages/primitives dist/packages/ui dist/packages/testing)
flags=(--tag "$tag" --access public)
if [ "$provenance" = true ]; then flags+=(--provenance); fi

for dir in "${dirs[@]}"; do
  name=$(node -p "require('./$dir/package.json').name")
  version=$(node -p "require('./$dir/package.json').version")
  if [ "$(npm view "$name@$version" version 2>/dev/null || true)" = "$version" ]; then
    echo "Skipping $name@$version: already on npm"
    continue
  fi
  npm publish "./$dir" "${flags[@]}"
  echo "Published $name@$version under $tag"
done
