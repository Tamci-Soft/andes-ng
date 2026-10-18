# Acknowledgments — Andes NG

Andes NG thanks the people, tools, and open-source projects that make it possible.

## Technologies and Frameworks

| Project                                                | Use in Andes NG                                                       |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| [Angular](https://angular.dev)                         | Application framework, Angular Package Format for published libraries |
| [Nx](https://nx.dev)                                   | Monorepo tooling — task caching, generators, independent releases     |
| [ng-packagr](https://github.com/ng-packagr/ng-packagr) | Builds `@andes-ng/*` packages to the Angular Package Format           |
| [Spartan Brain](https://www.spartan.ng)                | Headless, accessible Angular behavior primitives (see ADR 0004)       |
| [Angular CDK](https://material.angular.dev/cdk)        | Low-level building blocks Spartan Brain itself relies on              |
| [Storybook](https://storybook.js.org)                  | Component development and visual documentation                        |
| [Vitest](https://vitest.dev)                           | Unit test runner                                                      |
| [ESLint](https://eslint.org) (`@nx/eslint-plugin`)     | Linting and module-boundary enforcement                               |
| [Prettier](https://prettier.io)                        | Code formatting                                                       |
| [Verdaccio](https://verdaccio.org)                     | Local npm registry for testing the release/publish flow               |
| [TypeScript](https://www.typescriptlang.org)           | Language                                                              |

Note: this list reflects tooling actually adopted so far. It will grow as the workspace does —
entries are added only once a decision is real, not in anticipation of one.

## Reference Methodologies

- [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
- [Semantic Versioning](https://semver.org/)
