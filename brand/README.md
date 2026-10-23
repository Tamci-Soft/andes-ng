# Andes NG brand

The mark is a summit with an inner peak: an "A" that reads as a mountain, in the primary blue of the design tokens.

| File                                                  | Use                                                            |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| `logo-mark.svg`, `logo-mark-dark.svg`                 | Symbol only, for light and dark backgrounds                    |
| `logo-horizontal.svg`, `logo-horizontal-dark.svg`     | Symbol and wordmark side by side (READMEs, headers)            |
| `logo-stacked.svg`, `logo-stacked-dark.svg`           | Symbol above the wordmark                                      |
| `logo-mono-black.svg`, `logo-mono-white.svg`          | One-color symbol                                               |
| `logo-horizontal-mono-black.svg`, `…-mono-white.svg`  | One-color horizontal lockup                                    |
| `favicon.svg`, `favicon-32.png`, `favicon-180.png`    | Browser tab and touch icons (the SVG follows the color scheme) |
| `app-icon.svg`, `icon-512.png`, `org-avatar-500.png`  | Square icon, for app icons and the GitHub organization avatar  |
| `social-preview.png` (1280×640), `social-preview.svg` | Repository social preview card                                 |

The wordmark is drawn as paths, so every file renders the same without fonts. Colors: `#2563eb` (primary), `#1e40af` (inner peak), `#0f172a` (wordmark on light), `#60a5fa` (primary on dark).

## Embedding with light and dark variants

```html
<picture>
  <source
    media="(prefers-color-scheme: dark)"
    srcset="brand/logo-horizontal-dark.svg"
  />
  <img src="brand/logo-horizontal.svg" alt="Andes NG" width="320" />
</picture>
```

## Uploading to GitHub

- Repository social preview: Settings → General → Social preview → `brand/social-preview.png`.
- Organization avatar: organization Settings → Profile → `brand/org-avatar-500.png`.
