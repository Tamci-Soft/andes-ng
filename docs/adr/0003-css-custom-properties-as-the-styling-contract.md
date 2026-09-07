# 3. Use CSS Custom Properties as the styling contract

## Status

Accepted

## Context

Product applications may use Tailwind CSS 4, but a reusable Angular library cannot assume that every consumer runs Tailwind, scans library source or shares the same build pipeline. Andes also needs stable semantic tokens and predictable encapsulation.

## Decision

Publish semantic CSS Custom Properties from `@andes-ng/tokens/theme.css`. Angular components ship encapsulated CSS that consumes those properties. Consumers import the token stylesheet once.

Tailwind CSS 4 may be used by documentation or product applications, but Tailwind directives, utility generation and `@source` configuration are not part of the Andes runtime styling contract. Andes will not implement a PrimeNG-style dynamic theme engine initially. Token changes are public API changes governed by semantic versioning.

## Consequences

- Consumers can use Andes with or without Tailwind.
- Styling works from published package artifacts rather than source scanning.
- Product branding is constrained to documented token overrides instead of internal selectors.
- Light/dark and brand theme orchestration remain future work; the first release defines a light semantic token set only.

## Sources

- [MDN: Using CSS custom properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_cascading_variables/Using_CSS_custom_properties)
- [Tailwind CSS: detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [Angular component styling](https://angular.dev/guide/components/styling)
