# 4. Keep Spartan Brain behind Andes adapters

## Status

Accepted with constraint — partially superseded by [ADR 0008](0008-own-behavior-primitives-incrementally.md) for components small enough to own outright; this ADR's adapter boundary and evaluation criteria still apply whenever Spartan Brain is used.

## Context

Spartan Brain provides accessible, headless Angular behavior and supports Angular 21 and 22. Andes should benefit from those primitives without exposing `Brn*` selectors, types or inputs as its public API. However, `@spartan-ng/brain` 1.4.1 declares Angular CDK, Angular packages, RxJS, `clsx`, Tailwind CSS 4 and `tw-animate-css` as peers. `ng-packagr` does not inline a normal dependency, and `allowedNonPeerDependencies` only permits packaging; it does not bundle the dependency.

## Decision

Declare `@spartan-ng/brain` as an implementation dependency of `@andes-ng/ui`. When components are built, they will import only its narrow secondary entry points, wrap the primitives in Andes components/directives, and export only Andes names from `packages/ui/src/index.ts`.

Do not import Spartan's Tailwind preset or copied Helm styles. Andes visual CSS remains authored locally against `@andes-ng/tokens`. To make installation deterministic across package managers, Brain's non-Angular required peers are direct implementation dependencies; Angular CDK, Angular and RxJS remain peers to avoid duplicate framework runtimes.

Every Brain upgrade requires compatibility, accessibility and bundle regression tests. If Brain's peer graph makes the install cost unacceptable, the replacement options are an upstream peer split, an isolated behavior package or copy-owned primitives under their original MIT attribution—not a hard fork of the full Spartan repository.

## Current state

The first component, `AndesButton`, did not end up using Spartan Brain: its one dependency, `BrnButton`, was small enough to own outright, per [ADR 0008](0008-own-behavior-primitives-incrementally.md). `@spartan-ng/brain` and its Tailwind-related peers are no longer declared in `packages/ui/package.json` at all. This ADR's decision — treat Brain as an implementation dependency, never re-export it, evaluate the peer-graph cost honestly — remains the standard to apply the day a component needs behavior complex enough to reach for it.

## Consequences

- Consumers program only against Andes APIs, so Brain can be upgraded or replaced internally.
- Tailwind configuration and generated CSS are not required by consumers.
- Whenever a component does depend on Brain, Tailwind-related packages reappear in the installation graph because Brain 1.4.1 declares them as peers. That cost must not be misrepresented as complete dependency independence.
- `allowedNonPeerDependencies` documents intentional packaging exceptions but provides no bundling or isolation.
- Direct imports from `@spartan-ng/brain` outside `packages/ui` are prohibited by convention and review.

## Sources

- [Spartan Brain package](https://www.npmjs.com/package/@spartan-ng/brain)
- [Spartan installation documentation](https://www.spartan.ng/documentation/installation)
- [ng-packagr dependency guidance](https://github.com/ng-packagr/ng-packagr/blob/main/docs/dependencies.md)
- [Angular Package Format](https://angular.dev/tools/libraries/angular-package-format)
