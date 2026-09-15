# 3. Use CSS Custom Properties as the styling contract

## Status

Accepted

## Context

Product applications may use Tailwind CSS 4, but a reusable Angular library cannot assume that every consumer runs Tailwind, scans library source or shares the same build pipeline. Andes also needs stable semantic tokens and predictable encapsulation.

## Decision

Publish semantic CSS Custom Properties from `@andes-ng/tokens/theme.css`. Angular components ship encapsulated CSS that consumes those properties. Consumers import the token stylesheet once.

Tailwind CSS 4 may be used by documentation or product applications, but Tailwind directives, utility generation and `@source` configuration are not part of the Andes runtime styling contract. Andes will not implement a PrimeNG-style dynamic theme engine initially. Token changes are public API changes governed by semantic versioning.

## Current state

The stylesheet entry point is in place and packaged: `packages/tokens/src/theme.css` is copied to `packages/tokens/dist/theme.css` and exposed through the `./theme.css` export, and `apps/playground` imports it the way a consumer would. The naming contract is fixed by `ANDES_TOKEN_PREFIX` (`--andes-`) and `ANDES_THEME_ATTRIBUTE` (`data-andes-theme`).

The token catalogue now covers the categories a real component needs: background/foreground, card, popover, primary/secondary/danger/success/warning/info/muted/accent (each with a foreground pair), border, input, focus-ring, an overlay scrim color, a z-index scale for layered UI (dropdown/overlay/modal/popover/tooltip/toast), a radius scale and a spacing scale. Dark mode is implemented via `ANDES_THEME_ATTRIBUTE` — `[data-andes-theme='dark']` redefines every color token; consumers toggle it on `<html>` or any ancestor, there is no automatic `prefers-color-scheme` fallback.

## Consequences

- Consumers can use Andes with or without Tailwind.
- Styling works from published package artifacts rather than source scanning.
- Product branding is constrained to documented token overrides instead of internal selectors.
- Dark mode is opt-in and explicit (`data-andes-theme="dark"`), not automatic from the OS/browser preference — a deliberate choice to keep theme switching under the consuming application's control rather than guessing intent from `prefers-color-scheme`.

## Sources

- [MDN: Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties)
- [Tailwind CSS: detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [Angular component styling](https://angular.dev/guide/components/styling)
