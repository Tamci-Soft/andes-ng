# @andes-ng/tokens

Framework-agnostic CSS Custom Properties used by Andes NG.

```css
@import '@andes-ng/tokens/theme.css';
```

The stylesheet entry point is packaged and resolvable, but **the token catalogue is still empty**. Token names are public API under semantic versioning, so they will be defined together with the first component foundations instead of being guessed ahead of them.

The naming contract is already fixed and exported from the package root:

```ts
import { ANDES_TOKEN_PREFIX, ANDES_THEME_ATTRIBUTE } from '@andes-ng/tokens';
```

The package does not require Tailwind CSS.
