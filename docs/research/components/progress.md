# Progress

## 1. Anatomy / compound structure

### shadcn/ui
The canonical doc URL `https://ui.shadcn.com/docs/components/progress` redirects to `https://ui.shadcn.com/docs/components/base/progress` — confirmed by following the redirect (`curl -L`, `200` at `.../components/base/progress`). This page shows a **single** implementation (no Radix UI / React Aria alternate tabs on this component's page, unlike e.g. Switch).

- **Underlying primitive: Base UI** (`@base-ui/react/progress`), verified from the live registry source served on the docs page: `import { Progress as ProgressPrimitive } from "@base-ui/react/progress"`.
- Exported parts (registry file `components/ui/progress.tsx`):
  - `Progress` — wraps `ProgressPrimitive.Root`; the top-level container, accepts `value`, forwards `data-slot="progress"`.
  - `ProgressTrack` — wraps `ProgressPrimitive.Track`; the background rail (`data-slot="progress-track"`).
  - `ProgressIndicator` — wraps `ProgressPrimitive.Indicator`; the filled bar (`data-slot="progress-indicator"`).
  - `ProgressLabel` — wraps `ProgressPrimitive.Label`; an accessible text label associated with the progress bar (`data-slot="progress-label"`).
  - `ProgressValue` — wraps `ProgressPrimitive.Value`; renders the formatted numeric value, accepts a render-prop `children` (`data-slot="progress-value"`).
- Default composition: `Progress` internally renders `ProgressTrack > ProgressIndicator`; `ProgressLabel`/`ProgressValue` are opt-in children placed as siblings of the track, e.g. for an "Upload progress … 56%" layout.

Note: an older/legacy shadcn registry style (`new-york-v4`) still ships a simpler Radix-UI-based `Progress` (`import { Progress as ProgressPrimitive } from "radix-ui"`, only `Root` + `Indicator`, no `Track`/`Label`/`Value`). That style is **not** what the current canonical docs page shows or recommends; it is documented here only so implementers aren't confused if they encounter it in older project scaffolds.

### Ant Design
Single component, `Progress` — no compound sub-parts or static properties (`import { Progress } from 'antd'`). Internally it renders a `role="progressbar"` container with a rail, a track (or step blocks), and an info/indicator area (percentage text or a success/exception icon), but none of these are separately exported.

## 2. Props / API

### shadcn/ui

**`Progress` (⇒ Base UI `Progress.Root`)**

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `number \| null` | — | Current value; `null` puts the progress bar in the indeterminate state |
| `min` | `number` | `0` | Minimum value |
| `max` | `number` | `100` | Maximum value |
| `locale` | `Intl.LocalesArgument` | — | Locale passed to `Intl.NumberFormat` for value formatting |
| `format` | `Intl.NumberFormatOptions` | — | Number-formatting options for the displayed value |
| `getAriaValueText` | `(formattedValue: string \| null, value: number \| null) => string` | — | Returns a human-readable `aria-valuetext` |
| `aria-valuetext` | `string` | — | Explicit accessible value text (alternative to `getAriaValueText`) |
| `className` | `string \| ((state) => string)` | — | Static or state-derived class name |
| `style` | `React.CSSProperties \| ((state) => CSSProperties)` | — | Static or state-derived inline style |
| `render` | `ReactElement \| ((props, state) => ReactElement)` | — | Replace the rendered element while keeping behavior |
| `children` | `ReactNode` | — | shadcn's wrapper additionally accepts children (e.g. `ProgressLabel`, `ProgressValue`) rendered before the track |

State object exposed to `className`/`style`/`render` callbacks on every part: `{ status: 'indeterminate' | 'progressing' | 'complete' }` (Base UI `Progress.Status`).

**`ProgressTrack` (⇒ `Progress.Track`)**, **`ProgressIndicator` (⇒ `Progress.Indicator`)**, **`ProgressLabel` (⇒ `Progress.Label`)**

| Prop | Type | Default | Description |
|---|---|---|---|
| `className` / `style` / `render` | same shapes as above | — | Static or state-derived customization |

**`ProgressValue` (⇒ `Progress.Value`)**

| Prop | Type | Default | Description |
|---|---|---|---|
| `children` | `(formattedValue: string \| null, value: number \| null) => ReactNode` | — | Render-prop to customize how the value text is displayed (e.g. custom locale/RTL formatting) |
| `className` / `style` / `render` | same shapes as above | — | Static or state-derived customization |

### Ant Design

Common props (all `type`s):

| Prop | Type | Default | Description |
|---|---|---|---|
| `classNames` | `Record<SemanticDOM, string> \| (info: { props }) => Record<SemanticDOM, string>` | – | Customize class name for each semantic DOM section (6.0.0+) |
| `format` | `function(percent, successPercent)` | `(percent) => percent + '%'` | Template function for the displayed content |
| `percent` | `number` | `0` | Completion percentage |
| `railColor` | `string` | – | Color of the unfilled part |
| `showInfo` | `boolean` | `true` | Whether to display the progress value and the status icon |
| `status` | `string` | – | Status of the Progress: `success`, `exception`, `normal`, `active` (line only) |
| `strokeColor` | `string` | – | Color of the progress bar |
| `strokeLinecap` | `round \| butt \| square` | `round` | Style of the progress linecap |
| `styles` | `Record<SemanticDOM, CSSProperties> \| (info: { props }) => Record<SemanticDOM, CSSProperties>` | – | Customize inline style for each semantic DOM section (6.0.0+) |
| `success` | `{ percent: number, strokeColor: string }` | – | Config of the successfully-completed segment |
| `trailColor` *(deprecated)* | `string` | – | Use `railColor` instead |
| `type` | `line \| circle \| dashboard` | `line` | Progress type |
| `size` | `number \| [number \| string, number] \| { width: number, height: number } \| "small" \| "medium"` | `"medium"` | Progress size (number/object form: 5.3.0+; object form: 5.18.0+) |

`type="line"`-only props:

| Prop | Type | Default | Description |
|---|---|---|---|
| `steps` | `number` | – | Total step count |
| `rounding` | `(step: number) => number` | `Math.round` | Function used to round the value (5.24.0+) |
| `strokeColor` | `string \| string[] \| { from: string; to: string; direction: string }` | – | Bar color; renders a linear-gradient when given an object, can be `string[]` when `steps` is set |
| `percentPosition` | `{ align: 'start' \| 'end', type: 'inner' \| 'outer' }` | `{ align: "end", type: "outer" }` | Position of the percent value relative to the bar (5.18.0+) |

`type="circle"`-only props:

| Prop | Type | Default | Description |
|---|---|---|---|
| `steps` | `number \| { count: number, gap: number }` | – | Total step count; when an object, `count` is the number of steps and `gap` the distance between them (5.16.0+) |
| `strokeColor` | `string \| { [percent: string]: string }` | – | Color of the circular progress; renders a gradient when given an object |
| `strokeWidth` | `number` | `6` | Width of the circular progress, as a percentage of canvas width |

`type="dashboard"`-only props:

| Prop | Type | Default | Description |
|---|---|---|---|
| `steps` | `number \| { count: number, gap: number }` | – | Same semantics as circle's `steps` (5.16.0+) |
| `gapDegree` | `number` | `75` | Gap degree of the half-circle, `0`–`295` |
| `gapPlacement` | `top \| bottom \| start \| end` | `bottom` | Gap placement |
| `gapPosition` *(deprecated)* | `top \| bottom \| left \| right` | `bottom` | Use `gapPlacement` instead |
| `strokeWidth` | `number` | `6` | Width of the dashboard progress, as a percentage of canvas width |

## 3. Variants, sizes and states

### shadcn/ui
- No `type`/`variant` prop at all — the registry component only renders a horizontal line-style bar. Circle/dashboard/step visuals are not built in; a consumer would need to compose their own using Base UI's lower-level parts or SVG.
- No `size` prop; sizing is controlled purely via `className` (e.g. height utilities on `ProgressTrack`).
- States, exposed as `data-*` attributes on every part (from Base UI's `Progress.Status`):
  - `data-progressing` — while `0 < value < max` (actively progressing)
  - `data-complete` — when `value` reaches `max`
  - `data-indeterminate` — when `value` is `null` (indeterminate/loading-without-a-known-percentage state)
- RTL: supported via the standard shadcn RTL configuration (`dir` prop flows through to the primitive); the docs' RTL example formats the numeral text itself (e.g. Arabic-Indic digits) inside a custom `ProgressValue` render function, since Base UI does not localize digits itself.

### Ant Design
- Types: `line` (default), `circle`, `dashboard` (a circle with a gap at the bottom by default).
- Sizes: `"small" | "medium"` (string presets) or an explicit `number` / `[width, height]` / `{ width, height }`.
- States via `status`: `normal` (default, primary color), `success` (green), `exception` (red), `active` (line only — adds a moving/animated highlight sweeping across the bar).
- `steps` turns the line/circle/dashboard bar into discrete step blocks instead of a continuous fill.
- No built-in "indeterminate" concept (unlike shadcn/Base UI) — `active` status is the closest analogue (a perpetual sweep animation), but it still requires a known `percent`.

## 4. Accessibility

### shadcn/ui (via Base UI)
- ARIA role: Base UI's `Progress.Root` renders with the ARIA `progressbar` role and manages `aria-valuenow`/`aria-valuemin`/`aria-valuemax` from `value`/`min`/`max`; when `value` is `null` (indeterminate), `aria-valuenow` is omitted per the ARIA spec for indeterminate progress meters. `aria-valuetext` (or the `getAriaValueText` callback) supplies a human-readable equivalent (e.g. "56 of 100 uploaded" instead of a bare percentage).
- `ProgressLabel` is meant to be referenced by the root for an accessible name (associates a visible label with the progress meter); `ProgressValue` is a purely visual text mirror of the value and is not itself an ARIA-relevant node.
- Keyboard interaction: none — Progress is a non-interactive, read-only meter, not a focusable widget. Base UI's docs do not publish a keyboard table for this component (there is nothing to navigate).

### Ant Design
- The rendered root element carries `role="progressbar"` with `aria-valuenow`, `aria-valuemin="0"`, `aria-valuemax="100"` — confirmed directly in the rendered demo markup on the docs page.
- No `aria-valuetext` or accessible-name attribute is documented; the docs page does not mention an ARIA-specific accessibility section for Progress beyond this — treat anything beyond the three `aria-value*` attributes as unconfirmed rather than assumed.
- Not a keyboard-interactive control; no keyboard behavior is documented (consistent with it being a passive indicator).

## 5. Design tokens

### shadcn/ui
Global CSS variables referenced (from the actual registry source):
- Track background → `bg-muted` (i.e. `--muted`)
- Filled indicator → `bg-primary` (i.e. `--primary`)
- Label text → default foreground (`text-sm font-medium`, inherits `--foreground`)
- Value text → `text-muted-foreground` (i.e. `--muted-foreground`), `tabular-nums` for stable digit width
- No `--destructive`/`--ring` usage — Progress has no error or focus-visible state since it isn't focusable.

(The legacy Radix-based `new-york-v4` style instead used `bg-primary/20` for the track and `bg-primary` for the indicator — i.e. a tinted-primary rail rather than `--muted`. Only relevant if a project is still on that older style.)

### Ant Design

Component-specific Design Token table (full, from the Progress docs page):

| Token | Description | Type | Default value |
|---|---|---|---|
| `circleIconFontSize` | Icon size of circular progress bar | `string` | `1.1666666666666667em` |
| `circleTextColor` | Text color of circular progress bar | `string` | `rgba(0,0,0,0.88)` |
| `circleTextFontSize` | Text size of circular progress bar | `string` | `1em` |
| `defaultColor` | Default color of the progress bar | `string` | `#1677ff` |
| `lineBorderRadius` | Border radius of the line progress bar | `number` | `100` |
| `remainingColor` | Color of the remaining (unfilled) part | `string` | `rgba(0,0,0,0.06)` |

Global Seed/Alias tokens this component's tokens and behavior derive from (per the docs page and the shared `customize-theme` reference):

| Token | Description | Default value |
|---|---|---|
| `colorBgContainer` | Container background (contrasted against `defaultColor`) | `#ffffff` |
| `colorError` | Backs the `exception` status color | `#ff4d4f` |
| `colorSuccess` | Backs the `success` status color; also the seed for success-state visuals system-wide | `#52c41a` |
| `colorText` | Default text color (percent/label text) | `rgba(0,0,0,0.88)` |
| `colorWhite` | Pure white, theme-invariant | `#fff` |
| `fontFamily` | Base font stack | (system stack) |
| `fontSize` / `fontSizeSM` | Text sizing for percent/info text | `14` / `12` |
| `lineHeight` | Text line-height | `1.5714285714285714` |
| `marginXS` / `marginXXS` | Spacing around the info/icon area | `8` / `4` |
| `motionDurationSlow` | Drives the fill transition and the `active`-status sweep animation | `0.3s` |
| `motionEaseInOutCirc` / `motionEaseOutQuint` | Easing curves for the same animations | `cubic-bezier(0.78,0.14,0.15,0.86)` / `cubic-bezier(0.23,1,0.32,1)` |
| `paddingXXS` | Fine spacing | `4` |

`defaultColor` itself is effectively `colorPrimary`'s role for this component (the seed `colorPrimary`, default `#1677ff`, is what `defaultColor`'s default value matches) — i.e. Progress's "primary" bar color tracks the theme's `colorPrimary` seed rather than being hardcoded, even though the table lists it as a flat component token.

## 6. Notes for andes-ng implementation
- No dedicated roving-focus or state-machine primitive is needed — Progress is a non-interactive meter. What's worth centralizing in `@andes-ng/primitives` (or a small internal directive) is just the ARIA wiring: `role="progressbar"`, `aria-valuenow`/`aria-valuemin`/`aria-valuemax` computed from `value`/`min`/`max`, omitting `aria-valuenow` when the value is indeterminate (`null`/`undefined`), and an optional `aria-valuetext` input — this mirrors Base UI's `Progress.Root` contract and is cheap to implement directly as `@HostBinding`s on an `AndesProgress` component.
- Token mapping to `packages/tokens/src/theme.css`: track background → `--andes-color-muted` (matches shadcn's current `bg-muted` choice, a change from the older `bg-primary/20` tinted-rail look); filled indicator → `--andes-color-primary`; success state → `--andes-color-primary` is already "primary green"-free in andes-ng (no dedicated success color token exists yet — Ant Design's `success` status needs a **new** token, e.g. `--andes-color-success`, if visual parity with Ant Design's green success bar is desired); exception/error state → `--andes-color-danger` (exists already). Rounded track/indicator → `--andes-radius-full` (exists, matches AntD's `lineBorderRadius: 100`).
- Missing token to flag: andes-ng's `theme.css` has **no animation-duration/easing tokens at all** (no `--andes-motion-*`). Both the `active`-status sweep animation (Ant Design) and the fill-transition (`transition-all` in shadcn) need one. Recommend adding something like `--andes-motion-duration-slow: 0.3s` and `--andes-motion-ease-standard: cubic-bezier(0.4, 0, 0.2, 1)` (or mirror AntD's exact curves for closer parity) as new tokens shared across Progress, Accordion, and Tabs rather than inventing a one-off value per component.
- Accessibility pitfall: don't let `aria-valuenow="0"` leak through for the indeterminate case — `0` and "unknown/indeterminate" are different states to assistive tech, and the ARIA spec explicitly says to omit `aria-valuenow` (not set it to `0` or the min) when progress is indeterminate. If andes-ng wants a visual indeterminate/striped-loading variant (Ant Design has no indeterminate progress at all, but Base UI's does), the `data-indeterminate` state attribute is the right hook to drive that CSS animation.
