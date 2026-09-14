## Description

<!-- What does this PR change and why? -->

**Related issue:** <!-- e.g., Closes #12 -->

---

## Type of Change

- [ ] `feat` — new component, token, or capability
- [ ] `fix` — bug fix
- [ ] `refactor` — code change without behavior change
- [ ] `test` — tests only
- [ ] `docs` — documentation only
- [ ] `build` / `ci` — build, dependencies, or CI/CD
- [ ] `chore` — maintenance

---

## Checklist

<!-- See .github/CONTRIBUTING.md for the full convention -->

- [ ] Branch name follows `feature/*`, `bugfix/*`, or `hotfix/*`
- [ ] Commits follow Conventional Commits
- [ ] `pnpm format:check`, `pnpm lint`, `pnpm test`, `pnpm build`, and `pnpm build:storybook` pass locally
- [ ] Public API changes (selectors, inputs, outputs, tokens, test helpers) include a version plan (`pnpm nx release plan`)
- [ ] New/changed components: unit tests, keyboard behavior tests where applicable, and a Storybook example
- [ ] Components only import Spartan Brain from inside `packages/ui` (see ADR 0004) — no `Brn*` names re-exported
- [ ] No secrets, credentials, or key material are committed

---

## How to Test

<!-- Steps for a reviewer to verify the change, e.g. via `pnpm storybook` or `pnpm playground` -->

## Notes / Screenshots (optional)
