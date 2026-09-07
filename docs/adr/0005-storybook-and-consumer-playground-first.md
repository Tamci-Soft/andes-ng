# 5. Start with Storybook and one consumer playground

## Status

Accepted

## Context

The design system needs fast component iteration and a realistic integration check. Creating a documentation portal at the same time would duplicate navigation, content and deployment work before the component contract is stable.

## Decision

Configure Storybook on `packages/ui` for component states, interaction tests and accessibility checks. Maintain one minimal Angular application at `apps/playground` that imports published package names and token CSS as an external consumer would.

Do not create `apps/docs` initially. Reconsider it when public adoption requires guides, search, versioned documentation or content that Storybook cannot express well.

## Consequences

- Component contributors get an isolated visual workbench immediately.
- The playground detects package-resolution and global-CSS integration failures.
- Documentation is limited to Storybook, package READMEs and ADRs during the initial phase.
- A future docs application must consume public package APIs and must not become a backdoor into source internals.

## Sources

- [Storybook for Angular](https://storybook.js.org/docs/get-started/frameworks/angular)
- [Nx Storybook configuration](https://nx.dev/technologies/test-tools/storybook/introduction)
