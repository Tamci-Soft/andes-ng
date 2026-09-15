# Switch

## 1. Anatomy / compound structure

### shadcn/ui

- Single exported component, `Switch` — `import { Switch } from "@/components/ui/switch"`. No compound sub-parts are exported from the registry file itself.
- Underlying primitive: **Base UI** (`@base-ui-components/react`), specifically its `Switch` parts (`Switch.Root` + `Switch.Thumb`), which the shadcn registry component wraps into one component. As of the current (2026) docs this is the primary/default tab; the page also documents alternate registry builds on **React Aria** and **Radix UI**.
- Composition parts shown in the usage examples (from sibling registry components, not part of `switch.tsx` itself): `Field`, `FieldLabel`, `FieldContent`, `FieldGroup` — used to lay out a label + description next to the switch and to surface `data-disabled`/`data-invalid` styling hooks.

### Ant Design

- Single component, `Switch` — no compound sub-parts or static properties. Typically used standalone or inside `Form.Item`.

## 2. Props / API

### shadcn/ui

The registry `Switch` wraps Base UI's `Switch.Root` (outer control) and `Switch.Thumb` (moving indicator).

**`Switch` (⇒ Base UI `Switch.Root`)**

| Prop                                  | Type                          | Default     | Description                                                               |
| ------------------------------------- | ----------------------------- | ----------- | ------------------------------------------------------------------------- |
| `name`                                | `string`                      | —           | Identifies the field when a form is submitted                             |
| `checked`                             | `boolean`                     | —           | Current on/off state (controlled)                                         |
| `defaultChecked`                      | `boolean`                     | `false`     | Initial on/off state (uncontrolled)                                       |
| `onCheckedChange`                     | `(checked, event) => void`    | —           | Called when the switch is activated or deactivated                        |
| `value`                               | `string`                      | —           | Value submitted with the form when the switch is on                       |
| `uncheckedValue`                      | `string`                      | —           | Value submitted with the form when the switch is off                      |
| `form`                                | `string`                      | —           | Associates the switch with a `<form>` by id                               |
| `nativeButton`                        | `boolean`                     | `false`     | Render a native `<button>` when combined with `render`                    |
| `disabled`                            | `boolean`                     | `false`     | Ignores user interaction                                                  |
| `readOnly`                            | `boolean`                     | `false`     | User cannot activate/deactivate the switch, without disabling it          |
| `required`                            | `boolean`                     | `false`     | User must activate the switch before submitting the form                  |
| `inputRef`                            | `React.Ref<HTMLInputElement>` | —           | Ref to the hidden native input                                            |
| `id`                                  | `string`                      | —           | id for the hidden input (or the root element when `nativeButton` is true) |
| `className` / `style` / `render`      | usual Base UI shapes          | —           | Static or state-derived customization                                     |
| `size` (documented in usage examples) | `"small" \| "default"`        | `"default"` | Visual size                                                               |

**`Switch.Thumb`** (the moving indicator, rendered internally by the registry component)

| Prop                             | Type                 | Default | Description                           |
| -------------------------------- | -------------------- | ------- | ------------------------------------- |
| `className` / `style` / `render` | usual Base UI shapes | —       | Static or state-derived customization |

### Ant Design

| Property            | Description                                            | Type                         | Default  |
| ------------------- | ------------------------------------------------------ | ---------------------------- | -------- |
| `checked`           | Whether the switch is checked                          | `boolean`                    | `false`  |
| `checkedChildren`   | Content shown inside the switch when checked           | `ReactNode`                  | —        |
| `classNames`        | Semantic class overrides (object or function of props) | `Record \| (info) => Record` | —        |
| `defaultChecked`    | Initial state                                          | `boolean`                    | `false`  |
| `defaultValue`      | Alias for `defaultChecked`                             | `boolean`                    | —        |
| `disabled`          | Disable the switch                                     | `boolean`                    | `false`  |
| `loading`           | Loading state                                          | `boolean`                    | `false`  |
| `size`              | Size of the switch                                     | `medium \| small`            | `medium` |
| `styles`            | Semantic inline-style overrides                        | `Record \| (info) => Record` | —        |
| `unCheckedChildren` | Content shown inside the switch when unchecked         | `ReactNode`                  | —        |
| `value`             | Alias for `checked`                                    | `boolean`                    | —        |
| `onChange`          | Fired when the checked state changes                   | `function(checked, event)`   | —        |
| `onClick`           | Fired on click                                         | `function(checked, event)`   | —        |

## 3. Variants, sizes and states

### shadcn/ui

- No `variant` prop; single visual style, styled via the registry file's Tailwind classes.
- `size`: `"default" \| "small"` (per the docs' usage examples).
- States, expressed as `data-*` attributes on both `Switch.Root` and `Switch.Thumb`:
  - Checked / unchecked → `data-checked` / `data-unchecked`
  - Disabled → `data-disabled`
  - Read-only → `data-readonly`
  - Required → `data-required`
  - Validity (inside `Field.Root`) → `data-valid` / `data-invalid`, plus `data-dirty`, `data-touched`, `data-filled`, `data-focused`
  - Plain invalid marking on the switch itself uses the ARIA attribute `aria-invalid` set by the consumer (separate from the Field-driven `data-invalid`)
  - No built-in `loading` state (unlike Ant Design) — would need to be composed manually (e.g. disable the switch and overlay a spinner).

### Ant Design

- Sizes: `medium` (default), `small`.
- States: `checked`/`defaultChecked`, `disabled`, `loading` (shows a spinner on the handle and implicitly disables interaction).
- Content variants: `checkedChildren`/`unCheckedChildren` let text or icons render inside the track depending on state.

## 4. Accessibility

### shadcn/ui (via Base UI)

- Base UI's `Switch.Root` renders a hidden native `<input>` alongside the styled `<span>`, so accessible state should be reachable via that native control; the fetched docs excerpt does not explicitly quote a `role="switch"`/`aria-checked` attribute pairing, so treat the exact ARIA role as **not independently verified from the page text** — Base UI generally follows the WAI-ARIA "switch" widget pattern (role `switch` + `aria-checked`) for this kind of control, but implementers should confirm against the rendered DOM rather than assume.
- No explicit keyboard interaction table is published on the page. The WAI-ARIA APG default for a switch (Space toggles the control; it is a single stop in the Tab order) is the applicable convention absent contrary documentation — flagging this as inferred-from-pattern rather than quoted-from-docs.
- `aria-invalid` is used the same way as elsewhere in the registry (Radio, etc.) to mark validation errors, paired with `data-invalid` on a wrapping `Field`.

### Ant Design

- No ARIA role or attribute documentation is present on the Switch page — a stated documentation gap, not a confirmed absence of ARIA support. Verify in the rendered DOM before relying on any specific role/attribute.

## 5. Design tokens

### shadcn/ui

No component-specific tokens exist. Global CSS variables referenced:

- Checked track → `--primary`
- Unchecked track → `--input` (or `--switch-background`-equivalent role filled by `--input` in the shared palette)
- Thumb → `--background` (white/near-white fill, contrasting with the track)
- Focus-visible ring → `--ring`
- Invalid state (`aria-invalid`) → `--destructive`
- Disabled → reduced opacity, no dedicated variable

### Ant Design

Full component Design Token table (from the Switch docs page):

| Token              | Description                                       | Default value                   |
| ------------------ | ------------------------------------------------- | ------------------------------- |
| `handleBg`         | Background color of the Switch handle             | `#fff`                          |
| `handleShadow`     | Shadow of the Switch handle                       | `0 2px 4px 0 rgba(0,35,11,0.2)` |
| `handleSize`       | Size of the Switch handle                         | `18`                            |
| `handleSizeSM`     | Size of the small Switch handle                   | `12`                            |
| `innerMaxMargin`   | Maximum margin of the content area                | `24`                            |
| `innerMaxMarginSM` | Maximum margin of the small Switch's content area | `18`                            |
| `innerMinMargin`   | Minimum margin of the content area                | `9`                             |
| `innerMinMarginSM` | Minimum margin of the small Switch's content area | `6`                             |
| `trackHeight`      | Height of the Switch                              | `22`                            |
| `trackHeightSM`    | Height of the small Switch                        | `16`                            |
| `trackMinWidth`    | Minimum width of the Switch                       | `44`                            |
| `trackMinWidthSM`  | Minimum width of the small Switch                 | `28`                            |
| `trackPadding`     | Padding of the Switch                             | `2`                             |

These derive from global tokens: `colorPrimary`/`colorPrimaryHover` (checked-track background and its hover state — not separate component tokens, applied via the shared control color algorithm), `colorText` (label text when `checkedChildren`/`unCheckedChildren` are used), `fontSize` (content text size), and `controlHeight`/`sizeStep`/`sizeUnit` (the base sizing scale that `trackHeight*`/`handleSize*` are derived proportions of).

## 6. Notes for andes-ng implementation

- A dedicated behavior primitive is not strictly required — Switch is fundamentally a styled `<input type="checkbox">` (or a `role="switch"` control backed by one) plus a `ControlValueAccessor`. What is worth centralizing in `@andes-ng/primitives` is making sure the interactive host applies `role="switch"`, `aria-checked`, and the click/Space key handling directly on the real focusable element, so multiple andes-ng components (Switch, and any future toggle-like control) share one implementation rather than each re-deriving it.
- Token mapping to `packages/tokens/src/theme.css`: checked track → `--andes-color-primary`; unchecked track → `--andes-color-input` (existing token, reused — no new "track" token needed for the default look); thumb → `--andes-color-background`/white; focus ring → `--andes-color-focus-ring`; invalid → `--andes-color-danger`; disabled → reduced opacity combined with `--andes-color-muted`. If a closer Ant Design visual (distinct disabled-track color, loading spinner tint) is wanted, flag that andes-ng currently has **no** disabled-track-specific token — would need something like `--andes-color-input-disabled` if the plain reduced-opacity approach isn't sufficient.
- Accessibility pitfall to flag: this is exactly the case the task description calls out — `disabled`/`checked`/`required`/`readOnly` Angular `@Input()`s must use the `booleanAttribute` transform so bare-attribute usage like `<andes-switch checked>` and `<andes-switch disabled>` (no `="true"`) works as expected, matching Angular's native boolean-attribute semantics. Additionally, `role="switch"` and `aria-checked` must be set on the actual interactive host element (the one receiving click/keydown), not on a purely decorative wrapper — the same class of bug already found and fixed in `AndesButton` where attributes on a non-interactive host failed to reach the real control.
