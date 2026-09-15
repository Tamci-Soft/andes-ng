# Radio Group

## 1. Anatomy / compound structure

### shadcn/ui
- `RadioGroup` — root container; manages shared selection state and (via a hidden native `<input>` per item) form participation. Imported as `import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"`.
- `RadioGroupItem` — one selectable option; renders a `<span>` plus a hidden native `<input type="radio">`.
- Underlying primitive: **Base UI** (`@base-ui-components/react`), specifically its `RadioGroup` and `Radio` (`Radio.Root`, `Radio.Indicator`) parts — as of the current (2026) docs. The page also documents alternate registry builds on **React Aria** and **Radix UI** for teams that need those instead, so verify which build is actually installed; the default/primary tab is Base UI.
- Composition parts shown in the docs examples (not exported *by* radio-group itself, but from sibling registry components frequently paired with it):
  - `Label` (`@/components/ui/label`) — associates text with an item via `htmlFor`.
  - `Field` / `FieldLabel` (`@/components/ui/field`) — `FieldLabel` wraps an entire row/card so the whole card is clickable (choice-card pattern); `Field` exposes `data-invalid`/`data-disabled` styling hooks driven by the item's state.
  - `FieldSet` / `FieldLegend` — groups multiple radio items under a `<fieldset>`/`<legend>` for accessible group labelling.

### Ant Design
- `Radio` — a single radio input/label.
- `Radio.Group` — static property; container that gives a set of `Radio`/`Radio.Button` children shared `value`/`onChange` state (mutually exclusive selection), or can generate radios itself from an `options` array.
- `Radio.Button` — not a separate export in the strict sense but the `optionType="button"` / `buttonStyle` rendering of `Radio.Group`'s children — documented as `Radio.Button`, a button-styled radio (segmented-control look).

## 2. Props / API

### shadcn/ui

**`RadioGroup`** (Base UI `RadioGroup` root)

| Prop | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | — | Identifies the field when a form is submitted |
| `defaultValue` | `Value` | — | Initial selected value (uncontrolled) |
| `value` | `Value` | — | Currently selected value (controlled) |
| `onValueChange` | `(value, event) => void` | — | Called when the selected value changes |
| `form` | `string` | — | Associates the group with a `<form>` by id |
| `disabled` | `boolean` | `false` | Ignores user interaction for the whole group |
| `readOnly` | `boolean` | `false` | User cannot select a different item, but the group is not disabled |
| `required` | `boolean` | `false` | User must choose a value before submitting the form |
| `inputRef` | `React.Ref` | — | Ref to the hidden native input |
| `className` | `string \| (state) => string` | — | Static or state-derived class |
| `style` | `CSSProperties \| (state) => CSSProperties` | — | Static or state-derived inline style |
| `render` | `ReactElement \| (props, state) => ReactElement` | — | Replace/compose the rendered element |

Data attribute on `RadioGroup`: `data-disabled`.

**`RadioGroupItem`** (Base UI `Radio.Root`)

| Prop | Type | Default | Description |
|---|---|---|---|
| `value` | `Value` | — | Unique identifying value of this radio within the group |
| `nativeButton` | `boolean` | `false` | Render a native `<button>` element when combined with `render` |
| `disabled` | `boolean` | — | Ignores user interaction for this item |
| `readOnly` | `boolean` | — | User cannot select this item, without disabling it |
| `required` | `boolean` | — | User must choose a value before submitting |
| `inputRef` | `React.Ref` | — | Ref to the hidden native input |
| `id` | `string` | — | id attribute forwarded to the hidden input |
| `className` / `style` / `render` | same shapes as above | — | Standard Base UI customization props |

**`Radio.Indicator`** (rendered internally by `RadioGroupItem`'s dot)

| Prop | Type | Default | Description |
|---|---|---|---|
| `keepMounted` | `boolean` | `false` | Keep the indicator element in the DOM even when the radio is unchecked (useful for CSS exit animations) |
| `className` / `style` / `render` | same shapes as above | — | Standard Base UI customization props |

### Ant Design

**`Radio` / `Radio.Button`**

| Property | Description | Type | Default |
|---|---|---|---|
| `checked` | Whether the radio is selected | `boolean` | `false` |
| `defaultChecked` | Initial selected state | `boolean` | `false` |
| `disabled` | Disable this radio | `boolean` | `false` |
| `value` | Value compared against the group's value to determine selection | `any` | — |
| `classNames` | Semantic class overrides (object or function of props) | `Record<SemanticDOM, string> \| (info: {props}) => Record<SemanticDOM, string>` | — (v6.0.0) |
| `styles` | Semantic inline-style overrides (object or function of props) | `Record<SemanticDOM, CSSProperties> \| (info: {props}) => Record<SemanticDOM, CSSProperties>` | — (v6.0.0) |

**`Radio.Group`**

| Property | Description | Type | Default | Version |
|---|---|---|---|---|
| `block` | Fit the group's width to its parent | `boolean` | `false` | 5.21.0 |
| `buttonStyle` | Style of button-style radios | `outline \| solid` | `outline` | — |
| `classNames` | Semantic class overrides | `Record \| (info) => Record` | — | 6.0.0 |
| `defaultValue` | Default selected value | `any` | — | — |
| `disabled` | Disable all radios in the group | `boolean` | `false` | — |
| `name` | `name` applied to every child `input[type=radio]`; auto-generated if unset | `string` | — | — |
| `options` | Generate children from data instead of composing them manually | `string[] \| number[] \| CheckboxOptionType[]` | — | — |
| `optionType` | Render style of generated options | `default \| button` | `default` | 4.4.0 |
| `orientation` | Layout orientation | `horizontal \| vertical` | `horizontal` | — |
| `size` | Size, applies to button-style radios | `large \| medium \| small` | `small` | — |
| `styles` | Semantic inline-style overrides | `Record \| (info) => Record` | — | 6.0.0 |
| `value` | Currently selected value (controlled) | `any` | — | — |
| `vertical` | Force vertical layout; if both `vertical` and `orientation` are set, `orientation` wins | `boolean` | `false` | — |
| `onChange` | Fired when the selected value changes | `function(e: Event)` | — | — |

**`CheckboxOptionType`** (shape of an entry in `Radio.Group`'s `options` array)

| Property | Description | Type | Default | Version |
|---|---|---|---|---|
| `label` | Text shown for the option | `string` | — | 4.4.0 |
| `value` | Value associated with the option | `string \| number \| boolean` | — | 4.4.0 |
| `style` | Inline style for the option | `React.CSSProperties` | — | 4.4.0 |
| `className` | Class name for the option | `string` | — | 5.25.0 |
| `disabled` | Disable this specific option | `boolean` | `false` | 4.4.0 |
| `title` | `title` attribute value | `string` | — | 4.4.0 |
| `id` | `id` attribute value | `string` | — | 4.4.0 |
| `onChange` | Fired when this option's value changes the group's value | `(e: CheckboxChangeEvent) => void` | — | 4.4.0 |
| `required` | Whether the option is required | `boolean` | `false` | 4.4.0 |

## 3. Variants, sizes and states

### shadcn/ui
- No `variant` prop exists — visual style is a single look driven by Tailwind utility classes on the registry component, not a `cva` variant set (unlike Button).
- No dedicated `size` prop; sizing is done by editing the registry file's classes directly.
- States and how they're expressed (all as `data-*` attributes on both `RadioGroupItem`/`Radio.Root` and its `Radio.Indicator`, since Indicator mirrors the item's state):
  - Checked / unchecked → `data-checked` / `data-unchecked`
  - Disabled → `data-disabled` (also `data-disabled` on the `RadioGroup` root when the whole group is disabled)
  - Read-only → `data-readonly`
  - Required → `data-required`
  - Validity (only inside a `Field.Root` wrapper) → `data-valid` / `data-invalid`, plus `data-dirty`, `data-touched`, `data-filled`, `data-focused`
  - Indicator mount/unmount animation → `data-starting-style` / `data-ending-style` (present while the indicator is animating in/out, relevant when `keepMounted` is used)
  - Plain invalid marking on the item itself uses the ARIA attribute `aria-invalid` (set by the consumer), separate from the Field-driven `data-invalid`.

### Ant Design
- Variants: `optionType="default"` (plain circular radio) vs `optionType="button"` (segmented-control look), the latter with `buttonStyle="outline"` (default) or `buttonStyle="solid"`.
- Sizes: `large`, `middle`, `small` (default `small`) — primarily affects button-style radios.
- States: `checked`/`defaultChecked`, `disabled` (per-item or whole-group via `Radio.Group`'s `disabled`), `block` (full width).

## 4. Accessibility

### shadcn/ui (via Base UI)
- The current docs excerpt does not spell out an explicit ARIA role table for `RadioGroup`/`Radio.Root`; Base UI relies on the real hidden `<input type="radio">` rendered by each item for native radio/radiogroup semantics (role and grouping come from the browser's native radio-input behavior, matching the WAI-ARIA Radio Group pattern), rather than hand-rolled `role="radiogroup"`/`role="radio"` attributes on the visible `<span>` wrapper.
- No keyboard interaction table is published on the shadcn/Base UI radio-group page itself. Because the real interactive element is a native radio input, the standard native behavior applies: Tab moves focus into/out of the group as a whole, and Arrow Up/Down/Left/Right move selection between radios in the same `name` group (browser-native, not custom JS).
- The docs explicitly flag that accessible names must come from real `<label>` elements (or `Field`/`Field.Label`/`Fieldset`/`FieldLegend`), i.e. don't rely on visually-adjacent text alone.

### Ant Design
- No explicit ARIA role/attribute documentation is present on the Radio page. This is a stated documentation gap, not a confirmed absence of ARIA support in the implementation — verify in the rendered DOM before relying on it.

## 5. Design tokens

### shadcn/ui
No component-specific tokens exist. Global CSS variables referenced:
- Checked dot → `--primary` (fill of the indicator)
- Unchecked ring/border and the item's resting border → `--border` / `--input`
- Focus-visible ring → `--ring`
- Invalid state (`aria-invalid`) → `--destructive` (border/ring tinted red)
- Disabled state → reduced opacity, no dedicated variable

### Ant Design
Full component Design Token table (from the Radio docs page):

| Token | Description | Default value |
|---|---|---|
| `buttonBg` | Background color of Radio button | `#ffffff` |
| `buttonCheckedBg` | Background color of checked Radio button | `#ffffff` |
| `buttonCheckedBgDisabled` | Background color of checked and disabled Radio button | `rgba(0,0,0,0.15)` |
| `buttonCheckedColorDisabled` | Color of checked and disabled Radio button text | `rgba(0,0,0,0.25)` |
| `buttonColor` | Color of Radio button text | `rgba(0,0,0,0.88)` |
| `buttonPaddingInline` | Horizontal padding of Radio button | `15` |
| `buttonSolidCheckedActiveBg` | Background of checked solid Radio button when active | `#0958d9` |
| `buttonSolidCheckedBg` | Background of checked solid Radio button | `#1677ff` |
| `buttonSolidCheckedColor` | Color of checked solid Radio button text | `#fff` |
| `buttonSolidCheckedHoverBg` | Background of checked solid Radio button on hover | `#4096ff` |
| `dotColorDisabled` | Color of disabled Radio dot | `rgba(0,0,0,0.25)` |
| `dotSize` | Size of Radio dot | `8` |
| `radioSize` | Radio size | `16` |
| `wrapperMarginInlineEnd` | Margin right of Radio wrapper | `8` |

These derive from global tokens: `colorPrimary` (→ `buttonSolidCheckedBg`/`buttonSolidCheckedActiveBg`/`buttonSolidCheckedHoverBg`), `colorBgContainer`/base white (→ `buttonBg`/`buttonCheckedBg`), `colorText`/`colorTextDisabled` (→ `buttonColor`/`buttonCheckedColorDisabled`/`dotColorDisabled`), `controlHeight`/`sizeStep`/`sizeUnit` (→ `radioSize`, `dotSize`, `buttonPaddingInline`), and `borderRadius` for the button-style corner rounding (not itself a Radio component token, applied via the shared control-height/radius algorithm).

## 6. Notes for andes-ng implementation
- Native `<input type="radio">` elements grouped by a shared `name` already give free roving-tabindex/arrow-key behavior in the browser, so a full custom "roving-tabindex" primitive is *not* strictly required if andes-ng renders a real native radio input per item (recommended, and it's what both Base UI and Ant Design do under the hood). What *is* worth centralizing in `@andes-ng/primitives` is a small `AndesRadioGroupPrimitive` that: (a) generates/propagates a shared `name` across all items in a group instance, (b) implements `ControlValueAccessor` for the group's selected value, and (c) exposes the checked/disabled/readonly/required/invalid state as host bindings so item components can derive `data-*`/`aria-*` without duplicating logic — mirroring how `AndesButtonPrimitive` centralizes host-tag-driven semantics.
- Token mapping to `packages/tokens/src/theme.css`: checked dot fill → `--andes-color-primary`; resting border/ring → `--andes-color-border`/`--andes-color-input`; focus ring → `--andes-color-focus-ring`; invalid state → `--andes-color-danger`; disabled → `--andes-color-muted-foreground` (text) with reduced opacity for the control. For an Ant-style button/segmented radio variant: unchecked bg → `--andes-color-background`, checked-solid bg → `--andes-color-primary`, checked-solid text → `--andes-color-primary-foreground`. No new tokens appear strictly necessary for the default (dot) style; the button-style variant reuses existing primary/secondary tokens and needs no additions either.
- Accessibility pitfall to flag: ARIA/validity attributes (`aria-invalid`, `aria-required`, `aria-checked`, `disabled`) must land on the actual native `<input type="radio">` inside each item, not on a decorative wrapping `<span>`/host element — this is the same class of bug already found and fixed in `AndesButton` (attributes applied to a non-interactive host not reaching the real control). Also apply `booleanAttribute` transforms on `disabled`/`required`/`readOnly`/`checked` Angular `@Input()`s so bare-attribute usage (`<andes-radio-item disabled>`) works, matching the `<x-switch checked>` pattern called out for Switch.
