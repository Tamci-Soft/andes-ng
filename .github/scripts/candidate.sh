#!/usr/bin/env bash
# Release-candidate bookkeeping for the three npm packages (they share one version).
#
# A candidate vX.Y.Z-rc.N is a GitHub pre-release whose body carries a JSON record (commit, tree hash, content
# hash, stage). The final vX.Y.Z is created only from a verified candidate whose tree equals the tree of main.
#
#   branch <ref-name>                 X.Y.Z from release/X.Y.Z or hotfix/X.Y.Z
#   next <version> <sha>              "<n> <reused>": the next rc number, or the one already built from <sha>
#   create <json-file>                store the candidate as a pre-release, prints its URL
#   mark <tag> <stage>                set the stage ("pending" -> "verified"), prints the updated JSON
#   find <version> <tree>             the latest verified candidate with that tree hash, as JSON
#   final <json-file> <sha>           publish vX.Y.Z as the latest release, prints its URL
#   pr <head> <base> <title> <file>   open or update a pull request, prints its URL ("" if nothing to merge)
#   automerge <pr-url>                enable auto-merge with a merge commit
#
# Needs: gh (GH_TOKEN), jq, git.
set -euo pipefail

SEMVER='^[0-9]+\.[0-9]+\.[0-9]+$'

die() { echo "candidate.sh: $*" >&2; exit 1; }

record_of() { # <tag> -> the JSON record stored in the release body
  gh release view "$1" --json body --jq .body | sed -n '/^```json$/,/^```$/p' | sed '1d;$d'
}

body_of() { # <json-file> -> release body
  printf 'Release candidate record (do not edit).\n\n```json\n'
  jq -S . "$1"
  printf '```\n'
}

cmd_branch() {
  local ref="$1" version
  version="${ref#release/}"; version="${version#hotfix/}"
  [[ "$version" =~ $SEMVER ]] || die "branch '$ref' must be release/X.Y.Z or hotfix/X.Y.Z"
  echo "$version"
}

cmd_next() {
  local version="$1" sha="$2" max=0 n tag
  while read -r tag; do
    [ -n "$tag" ] || continue
    n="${tag##*-rc.}"
    if [ "$(record_of "$tag" | jq -r .commit)" = "$sha" ]; then echo "$n true"; return; fi
    [ "$n" -gt "$max" ] && max="$n"
  done < <(gh api "repos/$GITHUB_REPOSITORY/git/matching-refs/tags/v$version-rc." --jq '.[].ref | sub("refs/tags/"; "")')
  echo "$((max + 1)) false"
}

cmd_create() {
  local file="$1" tag commit notes
  tag=$(jq -r .tag "$file"); commit=$(jq -r .commit "$file")
  notes=$(mktemp); body_of "$file" > "$notes"
  if gh release view "$tag" >/dev/null 2>&1; then
    gh release edit "$tag" --notes-file "$notes" --prerelease >/dev/null
  else
    gh release create "$tag" --target "$commit" --prerelease --title "$tag" --notes-file "$notes" >/dev/null
  fi
  gh release view "$tag" --json url --jq .url
}

cmd_mark() {
  local tag="$1" stage="$2" file notes
  file=$(mktemp); notes=$(mktemp)
  record_of "$tag" | jq --arg stage "$stage" '.stage = $stage' > "$file"
  body_of "$file" > "$notes"
  gh release edit "$tag" --notes-file "$notes" >/dev/null
  cat "$file"
}

cmd_find() {
  local version="$1" tree="$2" tag json found=""
  while read -r tag; do
    [ -n "$tag" ] || continue
    json=$(record_of "$tag")
    if [ "$(jq -r .tree <<<"$json")" = "$tree" ] && [ "$(jq -r .stage <<<"$json")" = verified ]; then
      found="$json" # tags come in ascending order, so the last match is the latest candidate
    fi
  done < <(gh api "repos/$GITHUB_REPOSITORY/git/matching-refs/tags/v$version-rc." --jq '.[].ref | sub("refs/tags/"; "")')
  [ -n "$found" ] || die "no verified candidate of $version has tree $tree: main differs from what was verified"
  echo "$found"
}

cmd_final() {
  local file="$1" sha="$2" version
  version=$(jq -r .version "$file")
  gh release create "v$version" --target "$sha" --title "v$version" --generate-notes --latest >/dev/null
  gh release view "v$version" --json url --jq .url
}

cmd_pr() {
  local head="$1" base="$2" title="$3" file="$4" number
  if [ "$(gh api "repos/$GITHUB_REPOSITORY/compare/$base...$head" --jq .ahead_by)" = 0 ]; then echo ""; return; fi
  number=$(gh pr list --head "$head" --base "$base" --state open --json number --jq '.[0].number // empty')
  if [ -n "$number" ]; then
    gh pr edit "$number" --title "$title" --body-file "$file" >/dev/null
    gh pr view "$number" --json url --jq .url
  else
    gh pr create --head "$head" --base "$base" --title "$title" --body-file "$file"
  fi
}

cmd_automerge() {
  if gh pr merge "$1" --auto --merge >/dev/null 2>&1; then echo "auto-merge on"; else echo "auto-merge unavailable"; fi
}

sub="${1:-}"; shift || true
case "$sub" in
  branch) cmd_branch "$@" ;;
  next) cmd_next "$@" ;;
  create) cmd_create "$@" ;;
  mark) cmd_mark "$@" ;;
  find) cmd_find "$@" ;;
  final) cmd_final "$@" ;;
  pr) cmd_pr "$@" ;;
  automerge) cmd_automerge "$@" ;;
  *) die "unknown command '$sub'" ;;
esac
