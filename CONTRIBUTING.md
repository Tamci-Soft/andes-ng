# Contributing to Andes NG

## Local development

1. Use the Node and pnpm versions declared by the repository.
2. Run `corepack enable`, `pnpm install` and `pnpm exec playwright install chromium`.
3. Run `pnpm storybook` for component work or `pnpm playground` for consumer integration.
4. Before opening a pull request, run `pnpm format:check`, `pnpm lint`, `pnpm test`, `pnpm build`, `pnpm build:storybook` and `pnpm nx e2e playground-e2e`.

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
