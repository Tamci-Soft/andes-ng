# Badge / Tag

Ant Design splits this space into two distinct components: **Badge** (a small numeric/dot indicator overlaid on the corner of another element — e.g. a notification count on a bell icon) and **Tag** (a standalone, optionally removable label used for categorization/filtering). shadcn/ui has a single **Badge** component whose actual use case maps onto Ant's **Tag** (a standalone label chip), not onto Ant's Badge (an overlay indicator) — shadcn has no overlay-indicator component at all. This file documents all three: shadcn Badge, Ant Badge, and Ant Tag, keeping the shadcn-vs-Ant-Tag comparison as the primary one since that's the actual functional overlap.

## 1. Anatomy / compound structure

### shadcn/ui

- **Badge** — single component, no compound sub-parts; a styled inline chip. No headless primitive is needed for the base case (it is plain styled markup — a `<span>` by default).
- Polymorphic rendering: supports a `render` prop (Base UI's composition pattern) to render the badge as a different element, e.g. an `<a>` link, instead of wrapping via Radix-style `asChild`/`Slot`. This is a light use of Base UI's render-prop utility, not a full headless-primitive dependency — Badge has no interactive/keyboard/ARIA behavior of its own.
- Icon/spinner support via a `data-icon="inline-start" | "inline-end"` data-attribute convention on a child element (not a distinct sub-component) to get correct spacing for a leading/trailing icon or loading spinner.

### Ant Design — Badge (overlay indicator)

- **Badge** — wraps a child element (e.g. an icon or avatar) and overlays a count, dot, or status indicator at its corner. When used with no wrapped children, it also functions as a small standalone status indicator (dot/text pair).
- **Badge.Ribbon** — a distinct static property rendering a diagonal ribbon banner across the corner of a wrapped block-level element, not a small corner dot/count.

### Ant Design — Tag (standalone label)

- **Tag** — a standalone label/chip, optionally closable (removable) and optionally rendered as a link (`href`).
- **Tag.CheckableTag** — a toggle-style tag that behaves like a checkbox (visually a tag, semantically a toggle), used for filter/selection UIs.
- **Tag.CheckableTagGroup** — a container managing a group of `CheckableTag`s as a single/multiple-selection set (newer addition; provides `value`/`defaultValue`/`onChange`/`multiple` at the group level instead of wiring each tag's `checked` individually).

## 2. Props / API

### shadcn/ui (Badge)

| Prop        | Type                                                     | Default     | Description                                                                                                                                                                                                                                                                                                                    |
| ----------- | -------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `variant`   | `"default" \| "secondary" \| "destructive" \| "outline"` | `"default"` | Visual style (note: some current docs snapshots additionally show `"ghost"`/`"link"` alongside these on the same switcher used by Button — treat those two as inherited from the shared variant switcher rather than confirmed stable Badge-specific variants; the four core ones above are the long-standing, documented set) |
| `className` | `string`                                                 | —           | Style override                                                                                                                                                                                                                                                                                                                 |
| `render`    | function/element                                         | —           | Renders the badge as a different underlying element (e.g. an `<a>`) instead of a `<span>`                                                                                                                                                                                                                                      |
| `data-icon` | `"inline-start" \| "inline-end"`                         | —           | Data attribute set on an icon/spinner child for correct spacing (not a component prop)                                                                                                                                                                                                                                         |

### Ant Design (Badge — overlay indicator)

| Prop            | Type                                                             | Default     | Description                                                                   |
| --------------- | ---------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------- |
| `color`         | `string`                                                         | —           | Customize the dot/indicator color (hex or preset color name)                  |
| `count`         | `ReactNode`                                                      | —           | Number (or custom node) to show                                               |
| `classNames`    | `Record<SemanticDOM, string>` or function                        | —           | Semantic DOM class customization (v5.7.0+)                                    |
| `dot`           | `boolean`                                                        | `false`     | Show a small red dot instead of a count                                       |
| `offset`        | `[number, number]`                                               | —           | `[x, y]` offset of the indicator                                              |
| `overflowCount` | `number`                                                         | `99`        | Max count shown before rendering `${overflowCount}+`                          |
| `showZero`      | `boolean`                                                        | `false`     | Whether to show the badge when `count` is `0`                                 |
| `size`          | `'default' \| 'small'`                                           | `'default'` | Size of the count indicator                                                   |
| `status`        | `'success' \| 'processing' \| 'default' \| 'error' \| 'warning'` | —           | Renders as a status dot (with optional `text`) instead of a count/dot overlay |
| `styles`        | `Record<SemanticDOM, CSSProperties>` or function                 | —           | Semantic DOM inline-style customization (v5.7.0+)                             |
| `text`          | `ReactNode`                                                      | —           | Text shown next to the status dot when `status` is set                        |
| `title`         | `string \| null`                                                 | —           | Tooltip text shown on hover of the count (v6.5.0+)                            |

**Badge.Ribbon** props:

| Prop                    | Type               | Default | Description                                    |
| ----------------------- | ------------------ | ------- | ---------------------------------------------- |
| `color`                 | `string`           | —       | Ribbon color (hex or preset color name)        |
| `placement`             | `'start' \| 'end'` | `'end'` | Which corner the ribbon hangs from (RTL-aware) |
| `text`                  | `ReactNode`        | —       | Ribbon content                                 |
| `classNames` / `styles` | see above          | —       | Semantic DOM customization (v6.0.0+)           |

### Ant Design (Tag — standalone label)

| Prop         | Type                                             | Default      | Description                                                                                           |
| ------------ | ------------------------------------------------ | ------------ | ----------------------------------------------------------------------------------------------------- |
| `classNames` | `Record<SemanticDOM, string>` or function        | —            | Semantic DOM class customization                                                                      |
| `closeIcon`  | `ReactNode \| boolean`                           | `false`      | Custom close (remove) icon; when truthy the tag becomes closable, `onClose` fires on click            |
| `color`      | `string`                                         | —            | Preset or custom color; `'default'` renders the plain solid gray look                                 |
| `disabled`   | `boolean`                                        | `false`      | Disabled state                                                                                        |
| `href`       | `string`                                         | —            | Renders the tag as an `<a>`                                                                           |
| `icon`       | `ReactNode`                                      | —            | Leading icon                                                                                          |
| `onClose`    | `(e) => void`                                    | —            | Called when the close icon is clicked; can be used to prevent removal (e.g. via `e.preventDefault()`) |
| `styles`     | `Record<SemanticDOM, CSSProperties>` or function | —            | Semantic DOM inline-style customization                                                               |
| `target`     | `string`                                         | —            | Anchor `target`, used with `href`                                                                     |
| `variant`    | `'filled' \| 'outlined' \| 'solid'`              | `'outlined'` | Visual variant                                                                                        |

**Tag.CheckableTag** props:

| Prop       | Type                         | Default | Description    |
| ---------- | ---------------------------- | ------- | -------------- |
| `checked`  | `boolean`                    | `false` | Toggled state  |
| `icon`     | `ReactNode`                  | —       | Leading icon   |
| `onChange` | `(checked: boolean) => void` | —       | Toggle handler |

**Tag.CheckableTagGroup** props:

| Prop                    | Type                           | Default | Description                                                 |
| ----------------------- | ------------------------------ | ------- | ----------------------------------------------------------- |
| `classNames` / `styles` | see above                      | —       | Semantic DOM customization                                  |
| `defaultValue`          | `string \| number \| Array`    | —       | Uncontrolled initial selection                              |
| `disabled`              | `boolean`                      | —       | Disables all tags in the group                              |
| `multiple`              | `boolean`                      | —       | Allow multiple selection instead of single                  |
| `options`               | `Array<{ value, label, ... }>` | —       | Tags to render, each item can carry its own className/style |
| `value`                 | `string \| number \| Array`    | —       | Controlled selection                                        |
| `onChange`              | `(value) => void`              | —       | Selection change handler                                    |

## 3. Variants, sizes and states

### shadcn/ui

- Variants (exact strings): `default`, `secondary`, `destructive`, `outline` — no dedicated `size` prop is documented (Badge is a single fixed small size; size differences are achieved via `className` overrides, unlike Button which has a real `size` prop).
- States: no built-in dismiss/close behavior — Badge is non-interactive by default. Icon/spinner content is supported via the `data-icon` attribute convention (e.g. a spinning icon to imply a "loading" tag-like state), but there is no first-class `dismissible`/`onClose` API the way Ant's Tag has.
- Can be rendered as a link via `render`, at which point it participates in normal link keyboard/focus behavior.

### Ant Design — Badge

- Modes: numeric `count` (with `overflowCount` capping and `showZero` control), `dot` (small red dot, no text), `status` + `text` (a colored status dot with a label, used inline rather than as a corner overlay).
- Status values: `success`, `processing` (adds a pulsing animation), `default`, `error`, `warning`.
- Sizes: `default`, `small` (only affects the numeric/dot indicator size).
- Preset colors (for `color`): pink, red, yellow, orange, cyan, green, blue, purple, geekblue, magenta, volcano, gold, lime (same preset palette shared with Tag).
- `Badge.Ribbon` adds a `placement` variant (`start`/`end` corner).

### Ant Design — Tag

- Variants (exact strings): `outlined` (default), `filled`, `solid`.
- Color states: `default` (neutral solid gray), the 5 status colors (`success`, `processing`, `warning`, `error`... actually Tag's status-style colors are `success`, `processing`, `warning`, `error`, `default`), and the same named preset palette as Badge (magenta, red, volcano, orange, gold, lime, green, cyan, blue, geekblue, purple), plus arbitrary custom hex colors.
- States: `disabled`, closable (via `closeIcon`, with `onClose` cancelable), checkable (via `CheckableTag`'s `checked`/`onChange`, or grouped via `CheckableTagGroup`'s `value`/`multiple`), link-rendering (via `href`/`target`).

## 4. Accessibility

### shadcn/ui

No dedicated ARIA role is documented for Badge — it is a plain inline element (`<span>` by default, or whatever element `render` targets), so it inherits the semantics of that element (e.g. link semantics if rendered as `<a>`). No keyboard interaction is documented since it has no built-in dismiss control; if andes-ng adds a closable variant, the close control itself would need to be a real `<button>` with an accessible label (not documented by shadcn since it doesn't offer this feature).

### Ant Design

No dedicated ARIA role is documented on either the Badge or Tag docs pages for the base rendering. For Tag's close (remove) icon, no explicit `aria-label` requirement is documented in the fetched content — this should be treated as **undocumented** rather than assumed to be handled; verify in the rendered DOM before relying on it, and ensure any andes-ng equivalent close button carries its own accessible name (e.g. "Remove tag"). `Tag.CheckableTag` visually and interactively behaves like a checkbox/toggle, but the docs do not confirm it exposes `role="checkbox"`/`aria-pressed` — again undocumented, flag as a verification gap rather than assuming compliance. Badge's `status`+`text` combination is purely presentational text next to a colored dot with no live-region behavior noted (Badge counts are not documented to announce changes to screen readers).

## 5. Design tokens

### shadcn/ui

No dedicated tokens for Badge. Based on its variants, it draws on the shared global palette:

- `default` variant → `--primary` / `--primary-foreground`
- `secondary` variant → `--secondary` / `--secondary-foreground`
- `destructive` variant → `--destructive` (with a foreground/white text pairing)
- `outline` variant → `--border` (border color) with `--foreground`-family text, transparent background
- `--radius` — corner rounding (Badge is typically a pill shape, i.e. maximal rounding, rather than following the base `--radius` scale directly)

Note the real limitation called out for this whole component family: shadcn has **no dedicated success/warning/info tokens** — only `--destructive` exists as a semantic color beyond primary/secondary. A shadcn Badge cannot natively express "success" or "warning" coloring without a consumer manually overriding `className` with arbitrary Tailwind colors (as seen in the docs' own custom-color examples, e.g. `bg-green-50 dark:bg-green-800`), unlike Ant's Tag/Badge which have first-class `success`/`warning`/`processing`/`error` status colors.

### Ant Design — Badge (full component Design Token table)

| Token               | Description                                                         | Default value |
| ------------------- | ------------------------------------------------------------------- | ------------- |
| `dotSize`           | Size of the dot indicator                                           | `6`           |
| `indicatorHeight`   | Height of the default (count) indicator                             | `20`          |
| `indicatorHeightSM` | Height of the small indicator                                       | `14`          |
| `indicatorZIndex`   | z-index of the indicator                                            | `auto`        |
| `paddingInline`     | Horizontal padding when the indicator shows multi-character content | `8`           |
| `statusSize`        | Size of the status dot (used with `status`+`text`)                  | `6`           |
| `textFontSize`      | Font size of the default indicator text                             | `12`          |
| `textFontSizeSM`    | Font size of the small indicator text                               | `12`          |
| `textFontWeight`    | Font weight of the indicator text                                   | `normal`      |

These derive from global tokens: `colorError` (default red count/dot color), `colorBgContainer`/`colorBorderBg` (the white ring separating the badge from its wrapped element), `fontSize`, and `motion`-family tokens (the `processing` status's pulse animation timing).

### Ant Design — Tag (full component Design Token table)

| Token            | Description                                                        | Default value         |
| ---------------- | ------------------------------------------------------------------ | --------------------- |
| `defaultBg`      | Default (no `color`) background                                    | `#fafafa`             |
| `defaultColor`   | Default (no `color`) text color                                    | `rgba(0, 0, 0, 0.88)` |
| `solidTextColor` | Text color used in the `solid` variant across preset/status colors | `#fff`                |

These derive from global tokens: `colorPrimary`/`colorSuccess`/`colorWarning`/`colorError`/`colorInfo` (the status-color family Tag maps `success`/`processing`(info-ish)/`warning`/`error` onto), `colorBorder` (default outlined border), `colorBgContainerDisabled`/`colorTextDisabled` (disabled state), `borderRadiusSM` (Tag's corner rounding is smaller than most components, using the SM step rather than the base `borderRadius`), and `fontSize`/`fontSizeSM`.

## 6. Notes for andes-ng implementation

- Not yet implemented in `packages/ui/src/lib` — greenfield. Given the anatomy mismatch, andes-ng should likely ship **two** separate components mirroring Ant's split (`AndesTag`/`AndesBadge`-as-label for the standalone-chip use case, and a distinct `AndesBadgeIndicator` or similar for the corner-overlay-on-another-element use case) rather than forcing shadcn's single "Badge" concept to cover both — the overlay-indicator behavior (positioning over a wrapped child, offset, dot vs. count vs. status modes) is a meaningfully different component from a standalone removable label.
- **Behavior primitive**: the overlay-indicator variant needs a small positioning primitive (corner-anchor an absolutely-positioned indicator over an arbitrary child, with `offset` support) — this is layout logic, not full a11y/interaction logic, so it can likely live as a simple CSS/directive pattern in `packages/ui` rather than needing a dedicated `@andes-ng/primitives` behavior. The closable Tag's remove button, by contrast, is simple enough (a plain `<button>` with a click handler) that it also needs no dedicated primitive beyond ensuring it's a real focusable button with an accessible label.
- Token mapping to `packages/tokens/src/theme.css`:
  - `default`/primary look → `--andes-color-primary` / `--andes-color-primary-foreground`.
  - `secondary` look → `--andes-color-secondary` / `--andes-color-secondary-foreground`.
  - `destructive`/`error` look → `--andes-color-danger` / `--andes-color-danger-foreground` (already exists).
  - `outline` variant border → `--andes-color-border`.
  - Corner radius → `--andes-radius-full` for pill-shaped tags/badges, or `--andes-radius-sm`/`--andes-radius-md` if a squarer tag style is desired (Ant's Tag actually uses a small radius, not a full pill, worth deciding deliberately rather than defaulting to shadcn's pill look).
  - Padding/gap between icon and text → `--andes-space-1`/`--andes-space-2`.
  - **Missing tokens (flag for addition)**: andes-ng has no `--andes-color-success`, `--andes-color-warning`, or `--andes-color-info` semantic colors (only primary/secondary/danger exist today). Both Ant's Badge `status` prop and Tag's status colors need all four semantic states (success/processing-info/warning/error) natively — without adding success/warning/info tokens, an andes-ng Tag/Badge can only faithfully express the "danger" state and would need ad hoc one-off colors (mirroring shadcn's own documented gap) for success/warning/info. This is a strong candidate to fix at the token level before or alongside building this component, since Alert and Toast/Notification (see their respective docs) hit the exact same gap.
- Accessibility pitfall: if andes-ng's Tag adds a close/remove control, it must be a real `<button>` with an explicit accessible name (e.g. `aria-label="Remove {tag label}"`) — neither shadcn nor Ant Design documents this being handled automatically, so it must be a deliberate addition in andes-ng rather than assumed inherited behavior.
