# @andes-ng/tokens

Framework-agnostic CSS Custom Properties used by Andes NG.

```css
@import '@andes-ng/tokens/fonts.css'; /* optional: Geist + Geist Mono */
@import '@andes-ng/tokens/theme.css';
```

Token names are public API under semantic versioning. Dark mode is enabled by setting
`data-andes-theme="dark"` on `<html>` (or any ancestor).

The naming contract is exported from the package root:

```ts
import { ANDES_TOKEN_PREFIX, ANDES_THEME_ATTRIBUTE } from '@andes-ng/tokens';
```

The package does not require Tailwind CSS.

## Typography

Andes uses [Geist](https://vercel.com/font) for text and Geist Mono for code, both under the SIL
Open Font License 1.1. `fonts.css` registers the variable versions of both (weights 100-900) from
files bundled with the package, so no third-party CDN is contacted at runtime. Without it, the
font tokens fall back to the platform's system fonts.

| Token                                               | Value                                     |
| --------------------------------------------------- | ----------------------------------------- |
| `--andes-font-family`                               | Geist, then the system UI font            |
| `--andes-font-family-mono`                          | Geist Mono, then the system monospace     |
| `--andes-font-size-xs` / `--andes-line-height-xs`   | 0.75rem / 1rem                            |
| `--andes-font-size-sm` / `--andes-line-height-sm`   | 0.875rem / 1.25rem (component default)    |
| `--andes-font-size-md` / `--andes-line-height-md`   | 1rem / 1.5rem                             |
| `--andes-font-size-lg` / `--andes-line-height-lg`   | 1.125rem / 1.75rem                        |
| `--andes-font-size-xl` / `--andes-line-height-xl`   | 1.25rem / 1.75rem                         |
| `--andes-font-size-2xl` / `--andes-line-height-2xl` | 1.5rem / 2rem                             |
| `--andes-font-weight-regular` … `-bold`             | 400 / 500 (medium) / 600 (semibold) / 700 |

For the crispest rendering on macOS, apply grayscale antialiasing once at the application root:

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```
