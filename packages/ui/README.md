# @andes-ng/ui

Accessible Angular components for the Andes NG design system: standalone, signal-based, `OnPush`, styled only through CSS custom properties.

## Install

```bash
npm install @andes-ng/ui @andes-ng/tokens
```

Peer dependencies: Angular 22 (`@angular/core`, `common`, `forms`, `cdk`) and RxJS 7.

## Use

Load the tokens once in the application's global stylesheet, then import the components you need:

```css
@import '@andes-ng/tokens/fonts.css'; /* optional: Geist */
@import '@andes-ng/tokens/theme.css';
```

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

The package exports every component from its single entry point, `@andes-ng/ui`. This release ships `AndesButton` (variants, colors, shapes, the 24 / 32 / 40px sizes, loading state, and `AndesButtonGroup`). New components are added in each release; see the changelog and the Storybook for the current list.

Components follow the WAI-ARIA authoring practices, support right-to-left layouts and honor `prefers-reduced-motion`.

## Related packages

- [`@andes-ng/tokens`](https://www.npmjs.com/package/@andes-ng/tokens): design tokens as CSS custom properties.
- [`@andes-ng/primitives`](https://www.npmjs.com/package/@andes-ng/primitives): the behavior directives the components are built on.
- [`@andes-ng/testing`](https://www.npmjs.com/package/@andes-ng/testing): helpers for testing applications that use Andes NG.

## License

MIT
