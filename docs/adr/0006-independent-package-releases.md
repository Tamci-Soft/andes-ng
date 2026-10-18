# 6. Release the three npm packages independently with version plans

## Status

Accepted

## Context

Tokens, Angular components and testing helpers can evolve at different rates. Publishing every change under one forced version would create noise, while ad hoc manual publication would make dependency updates and changelogs error-prone.

## Decision

Use Nx Release with an independent relationship for `tokens`, `ui` and `testing`. Require a version plan for publishable changes and generate project changelogs. Packages publish publicly under the `@andes-ng` scope.

A `version-plan-check.yml` PR check enforces the version-plan requirement. A `release.yml` workflow runs on push to `main` (and on-demand via `workflow_dispatch` with a dry-run input): `nx release --skip-publish` versions and changes the log, `git push --follow-tags` publishes the resulting commit/tags (the combined command commits and tags but does not push), then `nx release publish` publishes to the public npm registry.

Each package's first publish uses a classic `NPM_TOKEN` repo secret, since npm requires a package to already exist before a trusted publisher can be configured for it. Once each package has published once, add a Trusted Publisher on npmjs.com for it (pointing at this repo and `release.yml`), then drop `NPM_TOKEN` in favor of OIDC (`permissions: id-token: write`, already set). Provenance attestations are requested either way (`NPM_CONFIG_PROVENANCE: true`) and become automatic once on OIDC.

## Consequences

- Each package communicates change through its own semantic version.
- Cross-package dependency ranges must be updated by the release process and verified with a local registry before initial publication.
- Contributors must add a version plan to package-changing pull requests.
- The first publish of each package needs `NPM_TOKEN`; maintainers must remember to switch it to a Trusted Publisher afterward.
- The npm organization scope must still be reserved on the real registry before `release.yml` can succeed.

## Sources

- [Nx Release versioning](https://nx.dev/features/manage-releases)
- [Nx version plans](https://nx.dev/recipes/nx-release/file-based-versioning-version-plans)
- [Nx Release in CI/CD](https://nx.dev/docs/guides/nx-release/publish-in-ci-cd)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
- [npm provenance attestations](https://docs.npmjs.com/generating-provenance-statements/)
