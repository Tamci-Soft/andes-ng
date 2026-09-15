# Slider

## 1. Anatomy / compound structure

### shadcn/ui

- Single exported component, `Slider` — `import { Slider } from "@/components/ui/slider"`. The registry wraps several lower-level parts into one component rather than exporting them individually.
- Underlying primitive: **Base UI** (`@base-ui-components/react`), specifically its `Slider` part set, as of the current (2026) docs. The page also documents alternate registry builds on **React Aria** and **Radix UI**.
- Parts that exist at the Base UI primitive level (collapsed into the single `Slider` wrapper by the shadcn registry file, but relevant to know since andes-ng will likely need equivalents internally):
  - `Slider.Root` — groups all parts, holds `value`/`min`/`max`/`step`/orientation state; renders a `<div>`.
  - `Slider.Control` — the draggable/clickable hit-area container; renders a `<div>`.
  - `Slider.Track` — the full-range background track; renders a `<div>`.
  - `Slider.Indicator` — the filled portion representing the current value(s); renders a `<div>`.
  - `Slider.Thumb` — one draggable handle per value; renders a `<div>` wrapping a real `<input type="range">`. Multi-thumb (range) sliders render one `Thumb` per array entry, disambiguated by `index`.
  - `Slider.Value` — displays the current value(s) as text; renders an `<output>` element.
  - `Slider.Label` — accessible label automatically associated with the thumb(s); renders a `<div>`.

### Ant Design

- Single component, `Slider` — no compound sub-parts or static properties. Range mode (two handles) is a prop (`range`) on the same component, not a separate export. An internal tooltip (SliderTooltip) is used for the value bubble but is not part of the public API.

## 2. Props / API

### shadcn/ui

The registry `Slider` component surfaces the union of `Slider.Root` and `Slider.Thumb` concerns (plus optional `Slider.Track`/`Slider.Indicator` styling) as one component's props:

| Prop                                              | Type                                       | Default        | Description                                                                                              |
| ------------------------------------------------- | ------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------- |
| `value`                                           | `number \| number[]`                       | —              | Current value(s) (controlled); an array of length > 1 renders a multi-thumb/range slider                 |
| `defaultValue`                                    | `number \| number[]`                       | —              | Initial value(s) (uncontrolled)                                                                          |
| `min`                                             | `number`                                   | `0`            | Minimum value                                                                                            |
| `max`                                             | `number`                                   | `100`          | Maximum value                                                                                            |
| `step`                                            | `number`                                   | `1`            | Increment for a single arrow-key press                                                                   |
| `largeStep`                                       | `number`                                   | `10`           | Increment for Page Up/Down and Shift+Arrow                                                               |
| `orientation`                                     | `"horizontal" \| "vertical"`               | `"horizontal"` | Layout axis                                                                                              |
| `disabled`                                        | `boolean`                                  | `false`        | Disables all thumbs                                                                                      |
| `name`                                            | `string`                                   | —              | Name(s) for form submission                                                                              |
| `thumbAlignment`                                  | `"center" \| "edge" \| "edge-client-only"` | `"center"`     | How a thumb aligns to its position at the track's ends                                                   |
| `thumbCollisionBehavior`                          | `"push" \| "swap" \| "none"`               | `"push"`       | How adjacent thumbs behave when dragged into each other in range mode                                    |
| `onValueChange`                                   | `(value, event) => void`                   | —              | Fires continuously while dragging/typing                                                                 |
| `onValueCommitted`                                | `(value, event) => void`                   | —              | Fires once when the drag/keystroke interaction ends                                                      |
| `className` / `style` / `render`                  | usual Base UI shapes                       | —              | Static or state-derived customization                                                                    |
| per-thumb `aria-label` / `getAriaLabel()`         | `string` / function                        | —              | Accessible name for a given thumb (required for multi-thumb sliders since there's no visible text label) |
| per-thumb `aria-valuetext` / `getAriaValueText()` | `string` / function                        | —              | Human-readable value text (e.g. "$20") overriding the raw number                                         |

### Ant Design

| Property           | Description                                                                                                  | Type                                                          | Default       |
| ------------------ | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------- |
| `classNames`       | Semantic class overrides                                                                                     | `Record \| (info) => Record`                                  | —             |
| `defaultValue`     | Default value; `number` when `range` is false                                                                | `number \| [number, number]`                                  | `0 \| [0, 0]` |
| `disabled`         | Disable interaction; can be an array to disable individual handles                                           | `boolean \| boolean[]`                                        | `false`       |
| `keyboard`         | Allow keyboard control of the handles                                                                        | `boolean`                                                     | `true`        |
| `dots`             | Restrict the thumb to only sit on tick marks                                                                 | `boolean`                                                     | `false`       |
| `included`         | With `marks`: `true` = fill from origin to value (containment), `false` = only show the point (coordinative) | `boolean`                                                     | `true`        |
| `marks`            | Tick marks on the slider; key must be a number                                                               | `object`                                                      | —             |
| `max`              | Maximum value                                                                                                | `number`                                                      | `100`         |
| `min`              | Minimum value                                                                                                | `number`                                                      | `0`           |
| `orientation`      | Layout axis                                                                                                  | `horizontal \| vertical`                                      | `horizontal`  |
| `range`            | Enable dual/multi-handle range selection                                                                     | `boolean \| { editable, draggableTrack, minCount, maxCount }` | `false`       |
| `reverse`          | Render the slider reversed                                                                                   | `boolean`                                                     | `false`       |
| `step`             | Granularity of value stepping; `null` allows only `marks` values                                             | `number \| null`                                              | `1`           |
| `styles`           | Semantic inline-style overrides                                                                              | `Record \| (info) => Record`                                  | —             |
| `tooltip`          | Tooltip-related props (see below)                                                                            | object                                                        | —             |
| `value`            | Current value (controlled)                                                                                   | `number \| [number, number]`                                  | —             |
| `vertical`         | Vertical orientation                                                                                         | `boolean`                                                     | `false`       |
| `onChangeComplete` | Fires on mouseup/keyup (end of interaction)                                                                  | `(value) => void`                                             | —             |
| `onChange`         | Fires as the value changes                                                                                   | `(value) => void`                                             | —             |

**Range-mode-specific props** (when `range` is an object)

| Property         | Description                                                                                           | Type      | Default |
| ---------------- | ----------------------------------------------------------------------------------------------------- | --------- | ------- |
| `draggableTrack` | Whether the range track itself can be dragged to move both handles                                    | `boolean` | `false` |
| `editable`       | Allow dynamically adding/removing handles by clicking the track; cannot combine with `draggableTrack` | `boolean` | `false` |
| `minCount`       | Minimum number of handles                                                                             | `number`  | `0`     |
| `maxCount`       | Maximum number of handles                                                                             | `number`  | —       |

**`tooltip` prop shape**

| Property             | Description                                                   | Type                           | Default               |
| -------------------- | ------------------------------------------------------------- | ------------------------------ | --------------------- |
| `autoAdjustOverflow` | Auto-adjust the tooltip position to stay in the viewport      | `boolean`                      | `true`                |
| `open`               | Force the tooltip open/closed                                 | `boolean`                      | —                     |
| `placement`          | Tooltip placement                                             | `string`                       | —                     |
| `getPopupContainer`  | Mount point for the tooltip DOM node                          | `function`                     | `() => document.body` |
| `formatter`          | Format the displayed value; return `null` to hide the tooltip | `(value) => ReactNode \| null` | identity              |

## 3. Variants, sizes and states

### shadcn/ui

- No `variant`/`size` props — a single visual style set via the registry file's Tailwind classes; vertical layout is available via `orientation="vertical"`.
- Multi-thumb/range support: any `value`/`defaultValue` array with length > 1 renders one `Slider.Thumb` per entry.
- States, expressed as `data-*` attributes shared across `Root`/`Control`/`Track`/`Indicator`/`Thumb`/`Value`/`Label`:
  - `data-dragging` — present while a thumb is actively being dragged
  - `data-orientation` — `"horizontal"` or `"vertical"`, always present
  - `data-disabled` — present when disabled
  - Validity (inside `Field.Root`) → `data-valid` / `data-invalid`, plus `data-dirty`, `data-touched`, `data-focused`
  - `Slider.Thumb` additionally carries `data-index` identifying which value in the array it represents.

### Ant Design

- No explicit `size` variant; visual size follows the shared control-height token scale rather than a discrete size prop.
- Layout: `vertical` (boolean) or `orientation` prop.
- Behavioral variants: `dots` (snap-only ticks), `marks` + `included` (labeled ticks, filled vs point-only), `reverse` (flip direction), `range` with `draggableTrack`/`editable`/`minCount`/`maxCount` for multi-handle behavior.
- States: `disabled` (whole slider or per-handle array), keyboard-controllable via `keyboard` (default `true`).

## 4. Accessibility

### shadcn/ui (via Base UI)

- Each `Slider.Thumb` wraps a real native `<input type="range">`, which carries `role="slider"` plus `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, and (when configured) `aria-valuetext` and `aria-label`.
- No formally tabulated keyboard-interaction table is quoted verbatim on the docs page, but the documented props imply the standard ARIA APG slider pattern:

| Key                     | Behavior                                                                                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arrow Right / Arrow Up  | Increase value by `step`                                                                                                                                          |
| Arrow Left / Arrow Down | Decrease value by `step`                                                                                                                                          |
| Page Up                 | Increase value by `largeStep`                                                                                                                                     |
| Page Down               | Decrease value by `largeStep`                                                                                                                                     |
| Shift + Arrow Up/Right  | Increase value by `largeStep`                                                                                                                                     |
| Shift + Arrow Down/Left | Decrease value by `largeStep`                                                                                                                                     |
| Home / End              | Jump to `min`/`max` — implied by the standard slider pattern; not independently confirmed in the fetched docs text, flag as unverified if strict fidelity matters |

- For multi-thumb sliders, each thumb needs its own accessible name (`aria-label`/`getAriaLabel()`) since there is no visible text content to derive one from automatically.

### Ant Design

- The `keyboard` prop (default `true`) confirms arrow-key control exists, but no ARIA role/attribute documentation (e.g. confirmation of `role="slider"`, `aria-valuenow`) is present on the page — a stated documentation gap, not a confirmed absence.

## 5. Design tokens

### shadcn/ui

No component-specific tokens exist. Global CSS variables referenced:

- Rail (full track) → `--muted` (unfilled background)
- Filled indicator (current value's portion) → `--primary`
- Thumb → `--background` fill with a `--primary` border
- Focus-visible ring on a thumb → `--ring`
- Invalid state → `--destructive`
- Disabled → reduced opacity, no dedicated variable

### Ant Design

Full component Design Token table (from the Slider docs page):

| Token                      | Description                                        | Default value          |
| -------------------------- | -------------------------------------------------- | ---------------------- |
| `controlSize`              | Height of the slider                               | `10`                   |
| `dotActiveBorderColor`     | Border color of a tick dot when active             | `#91caff`              |
| `dotBorderColor`           | Border color of a tick dot                         | `#f0f0f0`              |
| `dotSize`                  | Size of a tick dot                                 | `8`                    |
| `handleActiveColor`        | Border color of the handle when active             | `#1677ff`              |
| `handleActiveOutlineColor` | Outline color of the handle when active            | `rgba(22,119,255,0.2)` |
| `handleColor`              | Color of the handle                                | `#91caff`              |
| `handleColorDisabled`      | Color of the handle when disabled                  | `#bfbfbf`              |
| `handleLineWidth`          | Border width of the handle                         | `2`                    |
| `handleLineWidthHover`     | Border width of the handle on hover                | `2.5`                  |
| `handleSize`               | Size of the handle                                 | `10`                   |
| `handleSizeHover`          | Size of the handle on hover                        | `12`                   |
| `railBg`                   | Background color of the rail                       | `rgba(0,0,0,0.04)`     |
| `railHoverBg`              | Background color of the rail on hover              | `rgba(0,0,0,0.06)`     |
| `railSize`                 | Height of the rail                                 | `4`                    |
| `trackBg`                  | Background color of the filled track               | `#91caff`              |
| `trackBgDisabled`          | Background color of the filled track when disabled | `rgba(0,0,0,0.04)`     |
| `trackHoverBg`             | Background color of the filled track on hover      | `#69b1ff`              |

These derive from global tokens: `colorPrimary`/`colorPrimaryBorderHover` (→ `handleActiveColor`, `trackBg`/`trackHoverBg`, `dotActiveBorderColor`), `colorFillContentHover` (→ `railHoverBg`), `colorText`/`colorTextDescription` (label/mark text), `controlHeight`/`controlHeightLG` (overall control sizing context), `borderRadiusXS` (handle/dot corner treatment), and `motionDurationMid`/`motionDurationSlow` (hover/drag transition timing).

## 6. Notes for andes-ng implementation

- Unlike Radio/Switch, Slider genuinely needs a dedicated behavior primitive in `@andes-ng/primitives` — call it e.g. `AndesSliderPrimitive` — handling: pointer-drag tracking on the track/control area and converting pointer position to a clamped value; keyboard stepping (arrow keys by `step`, Page Up/Down and Shift+Arrow by a `largeStep`, Home/End to min/max); multi-thumb value arrays with collision handling equivalent to Base UI's `thumbCollisionBehavior` (`push`/`swap`/`none`); and orientation-aware (horizontal/vertical) coordinate math. This is meaningfully more complex logic than the native-input-backed Radio/Switch and is the clearest "needs a primitive" case among these four components.
- Token mapping to `packages/tokens/src/theme.css`: rail background → reuse `--andes-color-border` or introduce a new lighter-weight token (flag: andes-ng currently has no dedicated "track background" token distinct from `--andes-color-border`, which is used for 1px borders, not a filled bar — a new token such as `--andes-color-track` may be warranted for visual correctness); filled indicator → `--andes-color-primary`; thumb fill → `--andes-color-background` with `--andes-color-primary` border; focus ring → `--andes-color-focus-ring`; disabled → `--andes-color-muted-foreground`/reduced opacity; invalid → `--andes-color-danger`.
- Accessibility pitfall to flag: each thumb must expose `role="slider"` with `aria-valuemin`/`aria-valuemax`/`aria-valuenow` (and ideally `aria-valuetext`) on the actual focusable element (a real `<input type="range">` per thumb is the simplest way to get this for free), not on a decorative `<div >`handle — the same class of bug already found and fixed in `AndesButton` where ARIA/attributes on a non-interactive host failed to reach the real control. For range/multi-thumb sliders, a distinct `aria-label` per thumb (e.g. "Minimum price" / "Maximum price") is mandatory since there is no adjacent text to derive an accessible name from automatically.
