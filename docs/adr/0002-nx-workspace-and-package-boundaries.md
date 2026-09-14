# 2. Use an integrated Nx workspace with three publishable packages

## Status

Accepted

## Context

The repository needs Angular 22 applications, Angular Package Format libraries, visual development, tests and coordinated releases. Spartan uses Nx and pnpm; shadcn/ui uses Turborepo and pnpm. Those choices reflect their ecosystems and do not establish a requirement for Andes. Angular generators, project graph analysis and module-boundary enforcement are first-class concerns here.

## Decision

Use Nx 23 with pnpm and TypeScript project references. Create:

- `@andes-ng/tokens` as a framework-agnostic CSS/TypeScript package.
- `@andes-ng/ui` as an Angular Package Format library with one root entry point.
- `@andes-ng/testing` as an Angular-packaged set of stable consumer test helpers.
- `apps/playground` as a non-published integration application.

Enforce dependency direction with Nx tags. `ui` may depend on `tokens`; `testing` may depend on the public `ui` and `tokens` contracts; applications may consume `ui` and `tokens`. Secondary entry points for `ui` will be introduced only after bundle analysis, dependency isolation or build scale demonstrates a measurable need.

## Consequences

- The project graph and release tooling share a single source of truth.
- Consumers start with the simple `@andes-ng/ui` import contract.
- A unified entry point can increase build or bundle analysis time as the catalog grows, so tree-shaking and package output must be measured.
- Turborepo is not added because it would duplicate Nx orchestration without addressing an unmet requirement.

## Sources

- [Nx Angular monorepo documentation](https://nx.dev/getting-started/tutorials/angular-monorepo-tutorial)
- [Nx enforce-module-boundaries rule](https://nx.dev/technologies/eslint/eslint-plugin/recipes/enforce-module-boundaries)
- [Angular creating libraries](https://angular.dev/tools/libraries/creating-libraries)
