# Contributing to Andes NG

## Local development

1. Use the Node and pnpm versions declared by the repository.
2. Run `corepack enable` and `pnpm install`.
3. Run `pnpm storybook` for component work or `pnpm playground` for consumer integration.
4. Before opening a pull request, run `pnpm format:check`, `pnpm lint`, `pnpm test`, `pnpm build` and `pnpm build:storybook`.

## Branch Structure

We follow **Gitflow**, matching `pegi-web`:

| Branch                  | Purpose                                                                    |
| ----------------------- | -------------------------------------------------------------------------- |
| `main`                  | Production-ready. Only merged from `develop` (tagged, published releases). |
| `develop`               | Integration branch. All features merge here first.                         |
| `feature/<description>` | New component, token, or capability.                                       |
| `bugfix/<description>`  | Fix for a bug found during development.                                    |
| `hotfix/<description>`  | Urgent fix branched from `main` (then merged back to `main` + `develop`).  |
| `release/<version>`     | Stabilization before a release (branched from `develop`).                  |

Only these prefixes are used, including for chore-type work — a `chore` commit still lives on a
`feature/<description>` branch, never a `chore/` branch. Every PR targets `develop`, never `main`
directly, except `hotfix/*`.

## Component contract

- Public names use the `Andes` class prefix and `andes` selector prefix.
- Export public APIs only from the package root `src/index.ts`.
- Do not re-export Spartan Brain, Angular CDK internals or implementation-only types.
- Use semantic CSS Custom Properties from `@andes-ng/tokens`; do not hard-code product-specific values.
- Preserve native HTML semantics before adding ARIA.
- Include unit tests, keyboard behavior tests where applicable and Storybook examples.
- Changes to public tokens, inputs, outputs, selectors or test helpers require release notes and semantic versioning.

## Architecture decisions

Create an ADR under `docs/adr` for decisions that affect package boundaries, the public API, styling, dependencies, accessibility architecture or releases. Use the established Status, Context, Decision, Consequences and Sources structure.

## Releases

The four npm packages (`tokens`, `primitives`, `ui`, `testing`) share one version and are published to the public npm registry under `@andes-ng` ([ADR 0009](../docs/adr/0009-lockstep-versions-and-release-candidates.md)). Add a version plan with `pnpm nx release plan` to any publishable change.

1. **Cut the release.** Branch `release/X.Y.Z` from `develop` (a `hotfix/X.Y.Z` from `main` for an urgent fix) and run `pnpm release:prepare`: it writes the changelog from the version plans and removes them. Push the branch.
2. **Candidate.** Every push to the branch runs CI, publishes `X.Y.Z-rc.N` under the `rc` dist-tag (try it with `npm i @andes-ng/ui@rc`), installs it from npm in an empty project and, if that passes, opens the pull request `release/X.Y.Z → main`. Fixes go on the same branch and produce the next candidate.
3. **Final.** Merging that pull request into `main` (merge commit, not squash) asks for approval in the `npm` environment, publishes `X.Y.Z` under `latest`, tags `vX.Y.Z`, creates its GitHub Release and opens the back-merge into `develop`; merge that one too (merge commit).
4. **Rollback.** Run the `Rollback` workflow with the earlier version to move `latest` back (and optionally deprecate the bad one), then fix forward with a `hotfix/X.Y.Z`.

Publishing stays off until the repository variable `ENABLE_ANDES_PUBLISH` is `true`. One-time setup: the `@andes-ng` npm organization, the `NPM_TOKEN` secret (first publish and rollback), the `npm` environment with a required reviewer, the release GitHub App (`RELEASE_APP_ID` variable, `RELEASE_APP_PRIVATE_KEY` secret), and branch protection on `main` and `develop` requiring the `verify` check. After each package has been published once, add a trusted publisher for it on npmjs.com pointing at this repository and `release.yml`.
