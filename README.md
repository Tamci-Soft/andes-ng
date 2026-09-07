# Andes NG

Andes NG is an open-source Angular design system for dense, enterprise applications. It owns its public API and visual language while using proven headless primitives behind internal adapters.

> Status: early development. The npm scope still needs to be reserved before the first public release.

## Packages

| Project            | Published package   | Purpose                                                         |
| ------------------ | ------------------- | --------------------------------------------------------------- |
| `packages/tokens`  | `@andes-ng/tokens`  | Framework-agnostic CSS Custom Properties                        |
| `packages/ui`      | `@andes-ng/ui`      | Standalone Angular components; one public entry point initially |
| `packages/testing` | `@andes-ng/testing` | Stable consumer-facing test helpers                             |
| `apps/playground`  | Not published       | Consumer-style integration application                          |

Storybook is configured on `packages/ui`; there is intentionally no `apps/docs` yet.

## Requirements

- Node.js 22.12 or newer
- pnpm 11.1 or newer

## Get started

```bash
corepack enable
pnpm install
pnpm storybook
```

Useful commands:

```bash
pnpm playground
pnpm build
pnpm test
pnpm lint
pnpm build:storybook
```

## Consume the packages

Import tokens once in the consumer application's global CSS:

```css
@import '@andes-ng/tokens/theme.css';
```

Then import standalone components only from the Andes public entry point:

```ts
import { AndesButton } from '@andes-ng/ui';
```

```html
<button andesButton type="button">Guardar</button>
```

Consumers do not import `@spartan-ng/brain` or its selectors. Brain is an internal behavioral dependency. Andes does not require Tailwind configuration or Tailwind-generated CSS, although Brain currently causes Tailwind-related packages to exist in the installation graph. See [ADR 0004](docs/adr/0004-spartan-brain-behind-andes-adapters.md).

## Architecture decisions

Accepted decisions live in [`docs/adr`](docs/adr/README.md). Changes to package contracts, styling, dependency boundaries or release policy require a new ADR that supersedes the previous one.

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a change. This project is available under the [MIT License](LICENSE).
