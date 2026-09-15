# Component architecture and glossary

This guide explains Andes NG's vocabulary and responsibility boundaries. It's a reference for anyone building, reviewing or consuming components.

> Current state: the repository contains only the workspace setup. No component, product token or test helper exists yet. The boundaries described here are the contract the first component will have to respect.

## Responsibilities per package

| Package                | Responsibility                                                                                                                                | Must not contain                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `@andes-ng/tokens`     | Framework-agnostic design values: color, typography, spacing scale, radii, shadows and focus. Published as `--andes-*` CSS custom properties. | Angular components, internal selectors or behavior.     |
| `@andes-ng/primitives` | Andes-owned, unstyled, accessible behavior directives — see [ADR 0008](adr/0008-own-behavior-primitives-incrementally.md).                    | Any styling, or a component's public API.               |
| `@andes-ng/ui`         | Public Angular components, their API, composition with behavior primitives, and encapsulated CSS that consumes tokens.                        | Duplicated brand values, or a primitive's public API.   |
| `@andes-ng/testing`    | Stable test helpers built on Andes's public API and semantics.                                                                                | Spartan's or `@andes-ng/primitives`'s internal details. |
| `apps/playground`      | Non-publishable app for checking a real consumer's experience.                                                                                | Code meant to ship as a package.                        |

These boundaries are enforced today: `@nx/enforce-module-boundaries` checks them on every `lint` via the `type:tokens`, `type:ui`, `type:testing` and `type:app` tags.

## Tokens, component CSS and layout

The instinct to use `tokens` for visual identity is correct, with one important nuance about where each decision lives:

- **Tokens** define the reusable decisions: semantic color, spacing scale, radii and typography.
- **`ui`'s CSS** decides how a component applies those tokens: height, `padding-inline`, `gap`, border and variants. It shouldn't hard-code a corporate color or an arbitrary spacing value that already has a token.
- **The application's layout** decides the outer space between components. As a rule, a component doesn't carry its own `margin` — the screen or a form container decides its separation from other elements.

This gets identity without coupling a component to a specific screen. Changing a semantic variable's value can adapt a visual family or a theme; renaming, removing tokens, or changing their meaning is a public API change and must be versioned.

The token catalogue is still empty for exactly that reason: names are public API under semantic versioning, and will be defined alongside the first components rather than guessed ahead of them.

## `clsx`, and why there's no Tailwind CSS or `tw-animate-css`

- **`clsx`** is a small utility for conditionally building CSS class strings. `AndesButton` uses it directly to compose its variant/size/state classes.
- **Tailwind CSS** and **`tw-animate-css`** are not Andes dependencies. They were only ever present because `@spartan-ng/brain` declared them as peer requirements; now that `AndesButton` uses Andes's own `AndesButtonPrimitive` instead (see [ADR 0008](adr/0008-own-behavior-primitives-incrementally.md)), neither package is installed. Andes still doesn't have a Tailwind styling contract of its own: components publish encapsulated CSS built on `@andes-ng/tokens`, so a consuming application never needs to scan Andes's code or configure Tailwind.

If a future component does depend on Spartan Brain, Tailwind and `tw-animate-css` reappear in the install graph as its peers — that's a real, visible cost of that specific choice, not something to hide behind `ignoredDependencies`.

## Dependencies and peers

A normal dependency in `dependencies` gets installed alongside the package that declares it. A **peer dependency** is a different kind of declaration: the package asks the host project to provide a compatible version of another library, so a single instance can be shared.

`@andes-ng/ui` keeps Angular, Angular CDK and RxJS as peers — an application must have a single compatible instance of the Angular runtime — and declares `@andes-ng/primitives`, `@andes-ng/tokens` and `clsx` as real, used dependencies.

The root `package.json` also declares Angular/CDK/RxJS as `devDependencies`, to develop and test the monorepo. That doesn't replace the publishable package's own dependencies — the root doesn't exist when an application installs `@andes-ng/ui` from npm.

## `allowedNonPeerDependencies`

`ng-packagr` builds the Angular library. As a safeguard, it requires reviewing the dependencies the library leaves external instead of bundling them into its output. The `allowedNonPeerDependencies` list in `packages/ui/ng-package.json` records that those exceptions are intentional.

That list doesn't install packages, doesn't change their versions, doesn't turn them into peers, and doesn't inline them into the bundle. The source of truth for what a consumer receives remains `packages/ui/package.json`; the list only lets packaging proceed with those known external dependencies.

## Brand identity and open source

Andes can be an open library while still keeping a consistent identity. Technical identity is expressed through semantic tokens, the components that consume them, documentation, and visual/accessibility tests. The public API should describe design concepts (`primary`, `danger`, `surface`), not an implementation's internal details.

Before publishing, the team must agree on which parts of the brand third parties may reuse — for example name, logo and corporate themes — and document that alongside the chosen contribution policy and license.
