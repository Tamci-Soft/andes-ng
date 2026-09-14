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

The three npm packages version independently through Nx Release version plans. Add a version plan with `pnpm nx release plan` for any publishable change. Publishing remains disabled until the `andes-ng` npm organization and trusted publisher are configured.
