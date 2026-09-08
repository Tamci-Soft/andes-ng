# 4. Keep Spartan Brain behind Andes adapters

## Status

Accepted with constraint

## Context

Spartan Brain provides accessible, headless Angular behavior and supports Angular 21 and 22. Andes should benefit from those primitives without exposing `Brn*` selectors, types or inputs as its public API. However, `@spartan-ng/brain` 1.4.1 declares Angular CDK, Angular packages, RxJS, `clsx`, Tailwind CSS 4 and `tw-animate-css` as peers. `ng-packagr` does not inline a normal dependency, and `allowedNonPeerDependencies` only permits packaging; it does not bundle the dependency.

## Decision

Declare `@spartan-ng/brain` as an implementation dependency of `@andes-ng/ui`. When components are built, they will import only its narrow secondary entry points, wrap the primitives in Andes components/directives, and export only Andes names from `packages/ui/src/index.ts`.

Do not import Spartan's Tailwind preset or copied Helm styles. Andes visual CSS remains authored locally against `@andes-ng/tokens`. To make installation deterministic across package managers, Brain's non-Angular required peers are direct implementation dependencies; Angular CDK, Angular and RxJS remain peers to avoid duplicate framework runtimes.

Every Brain upgrade requires compatibility, accessibility and bundle regression tests. If Brain's peer graph makes the install cost unacceptable, the replacement options are an upstream peer split, an isolated behavior package or copy-owned primitives under their original MIT attribution—not a hard fork of the full Spartan repository.

## Current state

No adapter exists yet, because no component exists yet. Brain and its required peers are installed and declared in `packages/ui/package.json` so the dependency contract above is reserved and verified by the build, but nothing in `packages/ui/src` imports them. `@nx/dependency-checks` therefore lists them under `ignoredDependencies` in `packages/ui/eslint.config.mjs`; those exceptions are removed as each dependency comes into real use.

The first component is what turns this decision into code. Until then the cost of the choice is visible — Tailwind-related packages sit in the installation graph without providing anything — and that is accepted deliberately.

## Consequences

- Consumers program only against Andes APIs, so Brain can be upgraded or replaced internally.
- Tailwind configuration and generated CSS are not required by consumers.
- Tailwind-related packages still appear in the installation graph because Brain 1.4.1 declares them as peers. This is installation overhead and must not be misrepresented as complete dependency independence.
- `allowedNonPeerDependencies` documents intentional packaging exceptions but provides no bundling or isolation.
- Direct imports from `@spartan-ng/brain` outside `packages/ui` are prohibited by convention and review.

## Sources

- [Spartan Brain package](https://www.npmjs.com/package/@spartan-ng/brain)
- [Spartan installation documentation](https://www.spartan.ng/documentation/installation)
- [ng-packagr dependency guidance](https://github.com/ng-packagr/ng-packagr/blob/main/docs/dependencies.md)
- [Angular Package Format](https://angular.dev/tools/libraries/angular-package-format)
