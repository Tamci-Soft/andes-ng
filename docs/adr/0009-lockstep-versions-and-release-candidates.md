# 9. Release the packages in lockstep through release candidates

## Status

Accepted. Supersedes the versioning relationship and the publishing flow of ADR 0006; the registry and provenance decisions of that ADR stand.

## Context

ADR 0006 versioned `tokens`, `primitives`, `ui` and `testing` independently and published from `main` straight to npm. In practice the packages are not independent: `ui` reads tokens and uses primitives, a visual change usually touches several at once, and consumers have to reason about a compatibility matrix between four version numbers. Independent versions also cannot name a release (`release/X.Y.Z`) and give no step where a build is tried before it becomes `latest`.

Established Angular component libraries release every package under one version, tag it `vX.Y.Z` and ship pre-releases (`-next.N`, `-beta.N`) before the stable version.

## Decision

- **One version for the four packages.** The Nx release group `andes` uses a fixed relationship and the tag pattern `v{version}`. Version plans are still required for publishable changes; they may be keyed by project or by the group.
- **Exact dependencies between our packages.** `ui` depends on the exact version of `primitives` and `tokens`, so a pre-release never resolves a mismatched sibling (a range such as `>=0.0.1 <1.0.0` does not match `0.1.0-rc.1`).
- **The version is the name of the release branch.** `release/X.Y.Z` or `hotfix/X.Y.Z`. `pnpm release:prepare` writes the changelog from the version plans and removes them; nothing else is committed to the branch.
- **Every push to a release or hotfix branch publishes a candidate** `X.Y.Z-rc.N` under the `rc` dist-tag, after CI passes. It is recorded as the GitHub pre-release `vX.Y.Z-rc.N` with the commit, the tree hash and a hash of the published files, installed from npm into an empty project, and only then marked verified. A verified candidate opens the pull request `release/X.Y.Z → main`.
- **Merging into `main` publishes the final release.** The workflow looks up the verified candidate whose tree hash equals the tree of `main` (it fails otherwise), waits for approval in the `npm` environment, publishes `X.Y.Z` under `latest`, tags `vX.Y.Z` with its GitHub Release and opens the back-merge into `develop`. npm versions are immutable and carry their version inside the tarball, so the final release is a rebuild of the same tree, compared by file hash with the candidate.
- **One publishing workflow.** npm trusted publishing accepts a single workflow file per package, so `release.yml` holds both the candidate and the final jobs. `rollback.yml` only moves dist-tags.
- **Registry.** The public npm registry, scope `@andes-ng` (npmjs.com/org/andes-ng), with provenance. The first publish of each package uses `NPM_TOKEN`; afterwards each package gets a trusted publisher bound to `release.yml` and the token is kept only for the dist-tag changes of `rollback.yml`.
- **Environments.** The candidate job runs in `npm-rc` (deployment branches `release/**` and `hotfix/**`, no approval); the final publish and the rollback run in `npm` (branch `main`, required reviewer).
- **Switch.** The variable `ENABLE_ANDES_PUBLISH` must be `true` for anything to be published or tagged.

## Consequences

- Consumers install `@andes-ng/*@rc` to try the next release and `@latest` for the stable one.
- A change to one package releases all four; the cost is a few empty patch versions.
- A release needs the release GitHub App (`RELEASE_APP_ID`, `RELEASE_APP_PRIVATE_KEY`) because pull requests opened with `GITHUB_TOKEN` start no workflows.
- The required status check is `verify` (the aggregate job of `ci.yml`).
- The rebuild of the final release is not guaranteed bit-identical; a different file hash is reported as a warning while the tree hash, which proves identical sources, is the hard gate.

## Sources

- [Nx Release versioning](https://nx.dev/features/manage-releases)
- [Nx version plans](https://nx.dev/recipes/nx-release/file-based-versioning-version-plans)
- [Nx Release in CI/CD](https://nx.dev/docs/guides/nx-release/publish-in-ci-cd)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm dist-tags](https://docs.npmjs.com/adding-dist-tags-to-packages)
