# 6. Release the three npm packages independently with version plans

## Status

Accepted

## Context

Tokens, Angular components and testing helpers can evolve at different rates. Publishing every change under one forced version would create noise, while ad hoc manual publication would make dependency updates and changelogs error-prone.

## Decision

Use Nx Release with an independent relationship for `tokens`, `ui` and `testing`. Require a version plan for publishable changes and generate project changelogs. Packages publish publicly under the `@andes-ng` scope.

Do not add a publishing workflow until the npm organization, provenance/trusted publishing and maintainer permissions exist. CI builds and tests package artifacts but does not publish them.

## Consequences

- Each package communicates change through its own semantic version.
- Cross-package dependency ranges must be updated by the release process and verified with a local registry before initial publication.
- Contributors must add a version plan to package-changing pull requests.
- The first public release remains blocked on external registry and repository administration rather than source setup.

## Sources

- [Nx Release versioning](https://nx.dev/features/manage-releases)
- [Nx version plans](https://nx.dev/recipes/nx-release/file-based-versioning-version-plans)
- [npm trusted publishing](https://docs.npmjs.com/trusted-publishers/)
