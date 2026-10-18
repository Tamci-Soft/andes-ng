#!/usr/bin/env bash
# One hash over every file the three packages would publish, ignoring package.json (the only file that carries the
# version). The candidate records it; the final release recomputes it to confirm the rebuild matches.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
find dist/packages/primitives dist/packages/ui dist/packages/testing packages/tokens/dist -type f ! -name package.json -print0 \
  | sort -z | xargs -0 shasum -a 256 | shasum -a 256 | cut -d' ' -f1
