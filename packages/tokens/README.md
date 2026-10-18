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

## Color scheme

`:root` declares `color-scheme: light` and the dark rule declares `color-scheme: dark`, so what the
browser draws itself (scrollbars, date/time pickers, autofill, native checkboxes, resize handles)
follows the active theme.

## Colors and contrast

Each semantic color (`primary`, `danger`, `success`, `warning`, `info`) has a fill with `-hover` and
`-active` states, a `-foreground` that is readable on those fills, and a `-text` shade for standing
alone on a surface. Every pairing below reads at 4.5:1 or more (WCAG AA for body text) in both
themes, and the base shades keep 3:1 against the page for borders and icons.

| Token                                                            | Use it for                                             | Light                             | Dark                              |
| ---------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------- | --------------------------------- |
| `--andes-color-primary` / `-hover` / `-active`                   | Primary fills carrying `-primary-foreground` (white)   | `#2563eb` / `#1d4ed8` / `#1e40af` | same: hover and press darken      |
| `--andes-color-danger` / `-hover` / `-active`                    | Danger fills carrying `-danger-foreground` (white)     | `#dc2626` / `#b91c1c` / `#991b1b` | same: hover and press darken      |
| `--andes-color-success` / `-hover` / `-active`                   | Success fills carrying `-success-foreground` (white)   | `#15803d` / `#166534` / `#14532d` | same                              |
| `--andes-color-info` / `-hover` / `-active`                      | Info fills carrying `-info-foreground` (white)         | `#0369a1` / `#075985` / `#0c4a6e` | same                              |
| `--andes-color-warning` / `-hover` / `-active`                   | Warning fills carrying `-warning-foreground`           | `#f59e0b` / `#d97706` / `#b45309` | `#f59e0b` / `#fbbf24` / `#fcd34d` |
| `--andes-color-warning-foreground`                               | Text on warning and `-hover` (7:1 and 4.7:1)           | `#451a03`                         | `#451a03`                         |
| `--andes-color-success-solid` / `-solid-hover` / `-solid-active` | Aliases of the success fills, for "a filled surface"   | the success states                | the success states                |
| `--andes-color-info-solid` / `-solid-hover` / `-solid-active`    | Aliases of the info fills                              | the info states                   | the info states                   |
| `--andes-color-primary-text`                                     | Primary as standalone text (links, selected labels)    | `#2563eb`                         | `#60a5fa`                         |
| `--andes-color-danger-text`                                      | Danger as standalone text (destructive items, errors)  | `#b91c1c`                         | `#f87171`                         |
| `--andes-color-success-text`                                     | Success as standalone text                             | `#15803d`                         | `#4ade80`                         |
| `--andes-color-warning-text`                                     | Warning as standalone text                             | `#b45309`                         | `#fbbf24`                         |
| `--andes-color-info-text`                                        | Info as standalone text                                | `#0369a1`                         | `#38bdf8`                         |
| `--andes-color-primary-subtle`                                   | Selected rows, options and date ranges                 | `#eaf1fe`                         | `#1d3478`                         |
| `--andes-color-muted-foreground`                                 | Placeholders, helper text, secondary labels            | `#5f6f86`                         | `#94a3b8`                         |
| `--andes-color-ghost` / `--andes-color-ghost-foreground`         | Ghost buttons on colored or dark backdrops, not themed | `#ffffff` / `#111827`             | same                              |

The `-text` tokens and `--andes-color-muted-foreground` are checked against the page background and
the card, popover and muted surfaces. Primary and danger fills carry white text on their base,
`-hover` and `-active` shades in both themes, which is why the dark theme darkens them on hover and
press instead of lightening them: a lighter step would drop white text below 4.5:1. Warning keeps
its amber fill and pairs it with a near-black foreground; a pressed amber fill should stay on
`-hover`, because `-active` is too dark for that foreground. The `-solid` tokens point at the base
fills and are repeated in the dark rule, so they follow the theme wherever `data-andes-theme` is
set.

## Elevation

The shadow ink is a fixed dark color rather than a theme color; the dark theme only strengthens it.

| Token               | Use it for                                                    |
| ------------------- | ------------------------------------------------------------- |
| `--andes-shadow-sm` | Resting raised surfaces (cards, a lifted control)             |
| `--andes-shadow-md` | Panels anchored to a trigger: menus, selects, popovers, dates |
| `--andes-shadow-lg` | Free-standing raised surfaces: dialogs, drawers, toasts       |

## Motion

Short and settling, never bouncy, and not themed. Components honour `prefers-reduced-motion`
themselves, so one can still keep an opacity-only fade.

| Token                                       | Value                                  | Use it for                                 |
| ------------------------------------------- | -------------------------------------- | ------------------------------------------ |
| `--andes-motion-duration-fast`              | `120ms`                                | Hover and press color, exits               |
| `--andes-motion-duration-mid`               | `150ms`                                | Overlay entries and small movements        |
| `--andes-motion-duration-slow`              | `200ms`                                | Larger travel: dialogs, drawers, collapses |
| `--andes-motion-ease-out`                   | `cubic-bezier(0.2, 0, 0, 1)`           | Entries: decelerates into place            |
| `--andes-motion-ease-in`                    | `cubic-bezier(0.4, 0, 1, 1)`           | Exits: accelerates away                    |
| `--andes-motion-ease-in-out`                | `cubic-bezier(0.645, 0.045, 0.355, 1)` | Moves that ease at both ends               |
| `--andes-duration-fast` / `-base` / `-slow` | alias                                  | The `-motion-duration-` fast / mid / slow  |
| `--andes-ease-out` / `--andes-ease-in`      | alias                                  | The `-motion-ease-` out / in               |

## Controls, component text and focus

Every form control and button shares one height, padding, type size and radius per size, so a
field, a select and a button of the same size line up.

| Token                                                 | Value                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `--andes-control-height-sm` / `-md` / `-lg`           | 1.5rem / 2rem / 2.5rem (24 / 32 / 40px)                            |
| `--andes-control-padding-x-sm` / `-md` / `-lg`        | 0.4375rem / 0.6875rem / 0.6875rem                                  |
| `--andes-control-font-size-sm` / `-md` / `-lg`        | The `sm` / `sm` / `md` type steps (14 / 14 / 16px)                 |
| `--andes-control-line-height`                         | 1.375rem (22px)                                                    |
| `--andes-control-radius-sm` / `-md` / `-lg`           | 0.25rem / 0.375rem / 0.5rem                                        |
| `--andes-text-font-size` / `--andes-text-line-height` | 14px / 22px, the body text of components                           |
| `--andes-focus-halo`                                  | One 2px ring at 20% of `--andes-color-focus-ring`, for text fields |
