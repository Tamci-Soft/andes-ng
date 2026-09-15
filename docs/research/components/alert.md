# Alert

## 1. Anatomy / compound structure

### shadcn/ui
Compound component:
- **Alert** — root container (the callout box).
- **Icon** — an optional leading icon slot (rendered as a direct child, positioned by the root's layout — not necessarily a separately-exported component, but shown as a distinct slot in the composition diagram).
- **AlertTitle** — the heading line.
- **AlertDescription** — the body/description text.
- **AlertAction** — an optional trailing interactive element/action area (e.g. a dismiss button or a call-to-action), a newer addition to the composition alongside the older Title/Description pair.

No headless primitive is required — Alert is plain styled markup (a `<div>` and children), consistent with it having no complex interactive/async state machine (unlike Avatar). The docs site's Base UI / React Aria / Radix UI switcher is a site-wide implementation-flavor toggle rather than evidence that Alert itself depends on one of those packages; Alert's own behavior doesn't call for a headless primitive under any of the three flavors.

### Ant Design
- **Alert** — the main component; a banner-style callout supporting `type` (success/info/warning/error), optional icon, optional close button, optional banner mode, and an optional action area.
- **Alert.ErrorBoundary** — a distinct static property: a React error boundary that renders an `Alert` (styled as an error) when a rendering error is caught in its subtree, with its own `description`/`message` overrides for the caught-error display.

## 2. Props / API

### shadcn/ui
| Prop (on `Alert`) | Type | Default | Description |
|---|---|---|---|
| `variant` | `"default" \| "destructive"` | `"default"` | Visual style |
| `className` | `string` | — | Style override |

| Sub-component | Prop | Type | Default | Description |
|---|---|---|---|---|
| `AlertTitle` | `className` | `string` | — | Style override |
| `AlertDescription` | `className` | `string` | — | Style override |
| `AlertAction` | `className` | `string` | — | Style override; holds action content (e.g. a dismiss button) |

Only two variants are documented; there is no first-class `success`/`warning`/`info` variant — those are achieved, per the docs' own custom-color examples, by manually overriding classes (e.g. `bg-amber-50 dark:bg-amber-950` for a warning-styled alert), not via a built-in prop value.

### Ant Design
| Prop | Type | Default | Description |
|---|---|---|---|
| `action` | `ReactNode` | — | Custom action area, e.g. extra buttons |
| `afterClose` | `() => void` | — | Callback after the close animation finishes |
| `banner` | `boolean` | `false` | Renders in banner mode (top-of-page style); when set, defaults `type` to `warning` and `showIcon` to `true` |
| `closable` | `boolean \| { closeIcon?: ReactNode; ... }` (`ClosableType`) | `false` | Whether the alert can be dismissed; can pass an object to customize the close icon/behavior |
| `closeIcon` | `ReactNode` | — | (legacy/simple form) custom close icon — current docs express this primarily via the `closable` object shape |
| `description` | `ReactNode` | — | Additional descriptive content below the message/title |
| `icon` | `ReactNode` | — | Custom icon, used when `showIcon` is enabled |
| `message` / `title` | `ReactNode` | — | Main content/heading of the alert (the fetched docs list this as `title`; Ant's Alert has historically used `message` for this same role — treat `message` as the stable long-standing prop name and `title` as its current documented alias/label; verify exact prop name against the installed Ant version) |
| `showIcon` | `boolean` | `false` (`true` in banner mode) | Whether to display the type icon |
| `type` | `'success' \| 'info' \| 'warning' \| 'error'` | `'info'` (`'warning'` in banner mode) | Alert severity/style |
| `variant` | `'outlined' \| 'filled'` | `'outlined'` | Visual presentation style |
| `onClose` | `(e) => void` | — | Callback when the alert is closed |
| `classNames` | `Record<SemanticDOM, string>` or function | — | Semantic DOM class customization |
| `styles` | `Record<SemanticDOM, CSSProperties>` or function | — | Semantic DOM inline-style customization |

**`ClosableType`** (shape of the `closable` prop when passed as an object):
| Prop | Description |
|---|---|
| `closeIcon` | Custom close button icon |
| `onClose` | Close callback (alternative to top-level `onClose`) |
| `afterClose` | Callback fired after the close animation completes |

**Alert.ErrorBoundary** props: `message`/`title` and `description` overrides for the caught-error display (same shape of content props as `Alert` itself, applied when an error is caught in the wrapped subtree).

## 3. Variants, sizes and states

### shadcn/ui
- Variants (exact strings): `default`, `destructive`. No `size` prop is documented — Alert has a single fixed size/density.
- States: no built-in dismiss/close behavior documented as a prop (unlike Ant's `closable`) — a dismiss control, if needed, is composed manually into the `AlertAction` slot by the consumer rather than provided as a toggle prop.
- Banner/inline: no distinct "banner mode" prop documented (unlike Ant's `banner`) — positioning at the top of a page is left to the consumer's layout.

### Ant Design
- Types (exact strings): `success`, `info`, `warning`, `error`.
- Variants: `outlined` (default), `filled`.
- Modes: normal (inline callout) vs. `banner` (full-width top-of-page style, which also flips the `type`/`showIcon` defaults).
- States: `closable` (dismissible, with `afterClose` lifecycle hook), custom `icon`/`action` content, `showIcon` toggle.

## 4. Accessibility

### shadcn/ui
The fetched docs do not explicitly confirm `role="alert"` in the visible page content — this must be treated as **undocumented/unverified** rather than assumed, despite Alert's description as "a callout for user attention" which would normally imply live-region semantics. Given no confirmation was found, do not assume shadcn's Alert self-announces to screen readers; verify directly against the installed component's source before relying on it. No keyboard interactions are documented (Alert itself is not focusable; if `AlertAction` contains a button, that button follows normal native button keyboard semantics).

### Ant Design
No explicit ARIA role or live-region attribute (`aria-live`, `role="alert"`/`role="status"`) is documented on the Alert component's own docs page in the fetched content — this is **undocumented** and should not be assumed; Ant's accessibility documentation is generally thin on this point, unlike Notification (see toast-notification.md) which does document a `role` prop defaulting to `alert`. Treat Alert as a static, non-live-region callout unless verified otherwise in the rendered DOM. The close button, when `closable` is enabled, is a real interactive element but no explicit accessible-name documentation was found for it — verify it carries an accessible label (e.g. "Close") rather than assuming.

## 5. Design tokens

### shadcn/ui
No dedicated Alert tokens exist. Based on the component's variants and the (partially confirmed) example classes:
- `default` variant → `--card` / `--card-foreground` (or `--background`/`--foreground`) for the neutral surface, `--border` for the outline.
- `destructive` variant → `--destructive` (background at reduced opacity, e.g. `bg-destructive/10`) paired with `--destructive`-colored text (`text-destructive`).
- `--radius` — corner rounding of the callout box.
- No dedicated success/warning/info tokens exist (same documented gap as Badge/Tag) — the docs' own "custom colors" example for Alert uses arbitrary Tailwind utility colors (`bg-amber-50 dark:bg-amber-950`) rather than a semantic warning variable, because none exists.

### Ant Design (full component Design Token table)
| Token | Description | Default value |
|---|---|---|
| `borderRadius` | (Also referred to as `borderRadiusLG` in some releases) corner rounding of the alert box | `8` |
| `defaultPadding` | Standard padding (no description) | `8px 12px` |
| `withDescriptionIconSize` | Icon size when a `description` is present | `24` |
| `withDescriptionPadding` | Padding when a `description` is present | `20px 24px` |
| `colorError` | Error type icon/text/border color source | `#ff4d4f` |
| `colorErrorBg` | Error type background | `#fff2f0` |
| `colorErrorBorder` | Error type border | `#ffccc7` |
| `colorSuccess` | Success type icon/text/border color source | `#52c41a` |
| `colorSuccessBg` | Success type background | `#f6ffed` |
| `colorSuccessBorder` | Success type border | `#b7eb8f` |
| `colorWarning` | Warning type icon/text/border color source | `#faad14` |
| `colorWarningBg` | Warning type background | `#fffbe6` |
| `colorWarningBorder` | Warning type border | `#ffe58f` |
| `colorInfo` | Info type icon/text/border color source | `#1677ff` |
| `colorInfoBg` | Info type background | `#e6f4ff` |
| `colorInfoBorder` | Info type border | `#91caff` |

These derive directly from the four global Seed/status tokens `colorError`, `colorSuccess`, `colorWarning`, `colorInfo` (each with an auto-derived `*Bg`/`*Border` pair via Ant's Map Token algorithm), plus the base `borderRadius` seed token for corner rounding.

## 6. Notes for andes-ng implementation
- Not yet implemented in `packages/ui/src/lib` — greenfield.
- **Behavior primitive**: none strictly required beyond what a plain dismiss button needs (a controlled/uncontrolled "visible" boolean plus an exit-animation hook for `afterClose`-style callbacks). If andes-ng wants Ant's animated-dismiss + `afterClose` lifecycle, a small `createDismissible()` helper (visible state + fade/collapse transition + completion callback) could live in `@andes-ng/primitives` and be shared with Tag's closable behavior — but this is a nice-to-have, not a hard requirement the way Avatar's image-load state machine is.
- Token mapping to `packages/tokens/src/theme.css`:
  - `error`/destructive type → `--andes-color-danger` / `--andes-color-danger-foreground` (already exists) plus a light background tint (does not exist yet — andes-ng has no `-bg`/tint variants for danger, only solid/hover/active/foreground; consider adding `--andes-color-danger-bg`/`--andes-color-danger-border` similar to Ant's `colorErrorBg`/`colorErrorBorder` pattern for a proper "soft" alert look rather than a solid-fill look).
  - Corner radius → `--andes-radius-md`/`--andes-radius-lg` (Ant defaults to `8`, closest to `--andes-radius-lg` at `0.5rem`).
  - Padding → `--andes-space-2`/`--andes-space-3` for the no-description case, `--andes-space-4`/`--andes-space-5`-ish for the with-description case (Ant's `20px 24px`).
  - **Missing tokens (flag for addition — same gap noted in badge-tag.md)**: andes-ng has no `--andes-color-success`, `--andes-color-warning`, or `--andes-color-info` (and correspondingly no light-bg/border tint variants for any semantic color, including danger). Alert is the component where this gap is most load-bearing: Ant's Alert *requires* all four semantic types (success/info/warning/error) as its core, documented feature, and shadcn's own inability to express success/warning/info natively is explicitly called out in its docs as something consumers must hand-roll. andes-ng should almost certainly add `--andes-color-success(-hover/-active/-foreground/-bg/-border)`, `--andes-color-warning(...)`, and `--andes-color-info(...)` token families (mirroring the existing primary/danger token shape) before or as part of implementing Alert, rather than shipping an Alert that can only do 2 of the 4 standard severities.
- Accessibility pitfall: this is the primary place to get live-region behavior right. An Alert that appears dynamically (e.g. after a form submission) needs `role="alert"` (assertive, interrupts) or `role="status"`/`aria-live="polite"` (non-interrupting) depending on urgency — and per the research above, **neither shadcn nor Ant Design's own docs clearly confirm this is handled automatically** for their base Alert (unlike Ant's Notification, which does document a `role` prop). andes-ng should make this an explicit, tested part of the component (e.g. a `severity`-driven default: `error`→`role="alert"`, others→`role="status"`) rather than assuming either reference library's behavior can simply be copied.
