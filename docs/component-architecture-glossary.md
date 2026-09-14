# Component architecture and glossary

This guide explains Andes NG's vocabulary and responsibility boundaries. It's a reference for anyone building, reviewing or consuming components.

> Current state: the repository contains only the workspace setup. No component, product token or test helper exists yet. The boundaries described here are the contract the first component will have to respect.

## Responsibilities per package

| Package             | Responsibility                                                                                                                                | Must not contain                                    |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `@andes-ng/tokens`  | Framework-agnostic design values: color, typography, spacing scale, radii, shadows and focus. Published as `--andes-*` CSS custom properties. | Angular components, internal selectors or behavior. |
| `@andes-ng/ui`      | Public Angular components, their API, composition with behavior primitives, and encapsulated CSS that consumes tokens.                        | Duplicated brand values, or Spartan's public API.   |
| `@andes-ng/testing` | Stable test helpers built on Andes's public API and semantics.                                                                                | Spartan's internal selectors or types.              |
| `apps/playground`   | Non-publishable app for checking a real consumer's experience.                                                                                | Code meant to ship as a package.                    |

These boundaries are enforced today: `@nx/enforce-module-boundaries` checks them on every `lint` via the `type:tokens`, `type:ui`, `type:testing` and `type:app` tags.

## Tokens, component CSS and layout

The instinct to use `tokens` for visual identity is correct, with one important nuance about where each decision lives:

- **Tokens** define the reusable decisions: semantic color, spacing scale, radii and typography.
- **`ui`'s CSS** decides how a component applies those tokens: height, `padding-inline`, `gap`, border and variants. It shouldn't hard-code a corporate color or an arbitrary spacing value that already has a token.
- **The application's layout** decides the outer space between components. As a rule, a component doesn't carry its own `margin` — the screen or a form container decides its separation from other elements.

This gets identity without coupling a component to a specific screen. Changing a semantic variable's value can adapt a visual family or a theme; renaming, removing tokens, or changing their meaning is a public API change and must be versioned.

The token catalogue is still empty for exactly that reason: names are public API under semantic versioning, and will be defined alongside the first components rather than guessed ahead of them.

## Tailwind CSS, `tw-animate-css` and `clsx`

- **Tailwind CSS** generates CSS from utility classes found in code. It isn't Andes's styling contract: Andes publishes its tokens and its components' encapsulated CSS, so a consuming application doesn't need to scan the library's code or configure Tailwind.
- **`tw-animate-css`** is an animation package built for Tailwind's ecosystem. Andes doesn't import or use it.
- **`clsx`** is a small utility for conditionally building CSS class strings. It also has no direct import in Andes's code.

All three are present because Spartan Brain declares them as ecosystem requirements.

## Dependencies and peers

A normal dependency in `dependencies` gets installed alongside the package that declares it. A **peer dependency** is a different kind of declaration: the package asks the host project to provide a compatible version of another library, so a single instance can be shared.

Spartan Brain declares Angular, Angular CDK, RxJS, `clsx`, Tailwind CSS and `tw-animate-css` as peers. Andes treats these in two ways:

- Angular, CDK and RxJS remain peers of `@andes-ng/ui`: an application must have a single compatible instance of the Angular runtime.
- `@spartan-ng/brain`, `clsx`, Tailwind CSS and `tw-animate-css` are direct implementation dependencies of `@andes-ng/ui`. This satisfies Brain's peer graph deterministically when Andes is installed.

The root `package.json` also declares them as `devDependencies`, to develop and test the monorepo. That doesn't replace the publishable package's own dependencies — the root doesn't exist when an application installs `@andes-ng/ui` from npm.

### Why they're declared without being used yet

`@andes-ng/ui` declares Brain and its requirements even though no file imports them yet. This is deliberate: it reserves the contract from [ADR 0004](adr/0004-spartan-brain-behind-andes-adapters.md) and lets the build verify the installation before the first component exists.

It has a visible cost — Tailwind and `tw-animate-css` show up in the install graph without contributing anything yet — that is accepted on purpose. In the meantime, `@nx/dependency-checks` lists them in `ignoredDependencies` inside `packages/ui/eslint.config.mjs`; each exception is removed once its dependency comes into real use.

## `allowedNonPeerDependencies`

`ng-packagr` builds the Angular library. As a safeguard, it requires reviewing the dependencies the library leaves external instead of bundling them into its output. The `allowedNonPeerDependencies` list in `packages/ui/ng-package.json` records that those exceptions are intentional.

That list doesn't install packages, doesn't change their versions, doesn't turn them into peers, and doesn't inline them into the bundle. The source of truth for what a consumer receives remains `packages/ui/package.json`; the list only lets packaging proceed with those known external dependencies.

## Brand identity and open source

Andes can be an open library while still keeping a consistent identity. Technical identity is expressed through semantic tokens, the components that consume them, documentation, and visual/accessibility tests. The public API should describe design concepts (`primary`, `danger`, `surface`), not an implementation's internal details.

Before publishing, the team must agree on which parts of the brand third parties may reuse — for example name, logo and corporate themes — and document that alongside the chosen contribution policy and license.
