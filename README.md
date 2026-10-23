<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="brand/logo-horizontal-dark.svg" />
  <img src="brand/logo-horizontal.svg" alt="Andes NG" width="320" />
</picture>

**Angular components, built to last.**

[![npm](https://img.shields.io/npm/v/@andes-ng/ui?logo=npm&logoColor=white&label=%40andes-ng%2Fui&color=2563eb&labelColor=0f172a)](https://www.npmjs.com/package/@andes-ng/ui)
[![CI](https://img.shields.io/github/actions/workflow/status/andes-ng/andes/ci.yml?branch=develop&logo=github&label=CI&labelColor=0f172a)](https://github.com/andes-ng/andes/actions/workflows/ci.yml)
[![Angular](https://img.shields.io/badge/Angular-22-dd0031?logo=angular&logoColor=white&labelColor=0f172a)](https://angular.dev)
[![Storybook](https://img.shields.io/badge/Storybook-live-ff4785?logo=storybook&logoColor=white&labelColor=0f172a)](https://andes-ng.github.io/andes/)
[![License](https://img.shields.io/badge/license-MIT-2563eb?labelColor=0f172a)](LICENSE)

[Storybook](https://andes-ng.github.io/andes/) · [npm](https://www.npmjs.com/org/andes-ng) · [Architecture decisions](docs/adr/README.md) · [Releasing](docs/releasing.md)

</div>

Andes NG is an open-source Angular design system for dense, enterprise applications. Components are standalone, signal-based and `OnPush`, styled only through CSS custom properties, and built on behavior primitives that Andes owns, so the public API and the visual language stay under one roof.

- **Accessible by default.** WAI-ARIA authoring practices, complete keyboard support, right-to-left layouts and `prefers-reduced-motion` honored.
- **Themeable without a build step.** Every color, radius, size and motion value is a CSS custom property; dark mode is one attribute.
- **No styling toolchain required.** No Tailwind configuration and no generated CSS to wire into the consuming application.
- **Small, typed public API.** Signals for inputs, outputs and models; no runtime dependencies beyond Angular, the CDK and RxJS.

## Packages

| Package                                                                      | Purpose                                                                                   |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [`@andes-ng/ui`](https://www.npmjs.com/package/@andes-ng/ui)                 | Standalone Angular components, exported from a single entry point                         |
| [`@andes-ng/tokens`](https://www.npmjs.com/package/@andes-ng/tokens)         | Design tokens as CSS custom properties, framework-agnostic                                |
| [`@andes-ng/primitives`](https://www.npmjs.com/package/@andes-ng/primitives) | Behavior directives and services the components are built on (overlay, focus, navigation) |
| [`@andes-ng/testing`](https://www.npmjs.com/package/@andes-ng/testing)       | Stable helpers for testing applications that use Andes NG                                 |

The four packages share one version and are released together.

## Install

```bash
npm install @andes-ng/ui @andes-ng/tokens
```

Peer dependencies: Angular 22 (`@angular/core`, `common`, `forms`, `cdk`) and RxJS 7.

Load the tokens once in the application's global stylesheet:

```css
@import '@andes-ng/tokens/fonts.css'; /* optional: Geist */
@import '@andes-ng/tokens/theme.css';
```

Import the components you need from the public entry point:

```ts
import { Component } from '@angular/core';
import { AndesButton } from '@andes-ng/ui';

@Component({
  selector: 'app-save',
  imports: [AndesButton],
  template: `<andes-button variant="primary">Save</andes-button>`,
})
export class Save {}
```

Dark mode is on when `data-andes-theme="dark"` is set on `<html>` or any ancestor.

## Components

Browse every component, state and variant in the [Storybook](https://andes-ng.github.io/andes/). New components land in each release; the changelog lists what changed.

## Develop

Requirements: Node.js 22.12 or newer and pnpm 11.1 or newer.

```bash
corepack enable
pnpm install
pnpm storybook
```

| Command                | What it does                           |
| ---------------------- | -------------------------------------- |
| `pnpm storybook`       | Storybook for `packages/ui`            |
| `pnpm playground`      | Consumer-style integration application |
| `pnpm build`           | Builds every package                   |
| `pnpm test`            | Runs every test suite                  |
| `pnpm lint`            | Lints every project                    |
| `pnpm build:storybook` | Builds the static Storybook            |

The workspace is an Nx monorepo: `packages/tokens`, `packages/primitives`, `packages/ui`, `packages/testing` and `apps/playground`.

## Architecture decisions

Accepted decisions live in [`docs/adr`](docs/adr/README.md). Changes to package contracts, styling, dependency boundaries or release policy need a new ADR that supersedes the previous one. For a contributor-oriented tour of the package boundaries and the terminology, see [the component architecture glossary](docs/component-architecture-glossary.md).

How a release is cut, from release candidates to the `latest` tag, is in [`docs/releasing.md`](docs/releasing.md).

## Contributing

Read [CONTRIBUTING.md](.github/CONTRIBUTING.md) before opening a change. Security issues go through [SECURITY.md](.github/SECURITY.md). Andes NG is available under the [MIT License](LICENSE).
