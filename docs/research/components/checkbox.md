# Checkbox

## 1. Anatomy / compound structure

### shadcn/ui
- `Checkbox` — the only part shadcn itself exports on this page (single flat component, no `Checkbox.Indicator`/`Checkbox.Group` re-exported at the shadcn level).
- The current docs page carries the standard three-way primitive switcher — **Base UI** (default/first tab, verified directly), **React Aria**, **Radix UI**.
- Underneath, Base UI's own `Checkbox` primitive is a two-part compound: `Checkbox.Root` (renders a `<span>` wrapping a visually-hidden native `<input type="checkbox">` for real form semantics) and `Checkbox.Indicator` (the checkmark/dash glyph, rendered conditionally based on checked/indeterminate state). shadcn's flat `Checkbox` component composes both internally but only exposes the combined result.
- Base UI additionally documents a `parent` prop on `Checkbox.Root` and references a separate **"Checkbox Group"** concept for managing a parent ("select all") checkbox whose indeterminate state is derived from a set of child checkboxes — but this group-management piece is not surfaced as its own named export/example on shadcn's Checkbox page (the page's own "Group" example is just "use multiple `Field`s to build a checkbox list," not a dedicated grouping primitive). This is a real gap worth calling out for parity with Ant's `Checkbox.Group`.
- Companion, non-Checkbox-specific form layout parts used alongside it: `Field`, `FieldGroup`, `FieldLabel`, `FieldContent`, `FieldDescription`.

### Ant Design
- `Checkbox` — main component.
- `Checkbox.Group` — static property; manages a set of checkboxes as a single controlled array value, commonly paired with a separate "select all" `Checkbox` driven by the group's `indeterminate` state.

## 2. Props / API

### shadcn/ui (Base UI-backed)

**Checkbox (as rendered; props map to the underlying `Checkbox.Root`)**
| Prop | Type | Default | Description |
|---|---|---|---|
| `checked` | `boolean` | `undefined` | Controlled checked state |
| `defaultChecked` | `boolean` | `false` | Uncontrolled initial checked state |
| `onCheckedChange` | `(checked: boolean) => void` | — | Fires on toggle |
| `indeterminate` | `boolean` | `false` | Renders the mixed/dash visual state (distinct from `checked`) |
| `disabled` | `boolean` | `false` | Disables interaction |
| `readOnly` | `boolean` | `false` | Prevents toggling without visually disabling |
| `required` | `boolean` | `false` | Marks the field required for form validation |
| `name` | `string` | — | Form field name |
| `value` | `string` | — | Value submitted when checked |
| `uncheckedValue` | `string` | — | Value submitted when unchecked (e.g. for hidden-input "false" semantics) |
| `parent` | `boolean` | `false` | Marks this checkbox as a group-parent ("select all") whose own indeterminate/checked state derives from its children |
| `nativeButton` | `boolean` | `false` | Whether the root renders as a native `<button>`-like focusable element |
| `form` | `string` | — | Associates with a `<form>` by id |
| `inputRef` | `React.Ref<HTMLInputElement>` | — | Ref to the underlying hidden native input |
| `aria-invalid` | `boolean` | — | Drives the invalid/error visual state |
| `id` | `string` | — | Element id |
| `render` | `ReactElement \| function` | — | Render-prop for polymorphic rendering (Base UI convention) |

**Checkbox.Indicator** (internal to shadcn's composition, not separately exposed): `keepMounted` (`boolean`, default `false`) — keep the indicator in the DOM even when unchecked, for CSS-driven enter/exit animation.

### Ant Design (Checkbox) — full props table
| Property | Description | Type | Default |
|---|---|---|---|
| `checked` | Specifies whether the checkbox is selected | `boolean` | `false` |
| `classNames` | Customize semantic-structure classes via object/function | `Record<SemanticDOM, string> \| function` | — |
| `defaultChecked` | Initial checked state | `boolean` | `false` |
| `disabled` | Disable the checkbox | `boolean` | `false` |
| `indeterminate` | The indeterminate (mixed) checked state | `boolean` | `false` |
| `onChange` | Callback fired when the state changes | `(e: CheckboxChangeEvent) => void` | — |
| `onBlur` | Called when the component loses focus | `function()` | — |
| `onFocus` | Called when the component gains focus | `function()` | — |
| `styles` | Customize semantic-structure inline styles | `Record<SemanticDOM, CSSProperties> \| function` | — |

**Checkbox methods**: `blur()` (remove focus), `focus()` (set focus), `nativeElement` (returns the underlying DOM node, since v5.17.3).

### Ant Design (Checkbox.Group) — full props table
| Property | Description | Type | Default |
|---|---|---|---|
| `defaultValue` | Default selected values | `(string \| number)[]` | `[]` |
| `disabled` | Disable all checkboxes in the group | `boolean` | `false` |
| `name` | `name` attribute applied to every child `<input>` | `string` | — |
| `options` | Checkbox items to render | `string[] \| number[] \| Option[]` (`Option = { label, value, disabled?, ... }`) | `[]` |
| `value` | Currently selected values (controlled) | `(string \| number \| boolean)[]` | — |
| `onChange` | Callback fired when the selected set changes | `(checkedValue: T[]) => void` | — |

## 3. Variants, sizes and states

### shadcn/ui
- No named `variant` or `size` prop — a single visual treatment, sized via the design's spacing/typography scale rather than a component-level size prop.
- States and how each is expressed:
  - **Checked / unchecked** — `checked`/`defaultChecked` prop; reflected as `data-checked`/`data-unchecked` (Base UI convention) on the root and drives whether `Checkbox.Indicator` renders.
  - **Indeterminate** — separate `indeterminate` boolean prop (not overloading `checked` with a `"indeterminate"` string the way some older Radix-era APIs did); exposed as `data-indeterminate` on the root.
  - **Disabled** — `disabled` prop, `data-disabled` styling hook.
  - **Invalid** — `aria-invalid`, `data-invalid` (typically on the `Field` wrapper).
  - **Group-parent ("select all")** — the `parent` prop, a Base UI-specific mechanism for a checkbox whose own state is computed from a set of children (not exposed as a distinct shadcn example on this page, but present at the primitive level).

### Ant Design
- No `variant` prop; a single visual treatment.
- States: `checked`, `indeterminate` (visually a dash, typically driven manually by computing it from a `Checkbox.Group`'s partial selection — Ant does not auto-derive it the way Base UI's `parent` mechanism claims to), `disabled` (individual checkbox or the whole `Checkbox.Group` via its own `disabled` prop).
- Group behavior: `Checkbox.Group` renders one checkbox per `options` entry and manages the array `value` centrally; a separate top-level "select all" checkbox is a documented manual pattern (compute `indeterminate` = `checkedList.length > 0 && checkedList.length < options.length`), not automatic.

## 4. Accessibility

### shadcn/ui (via Base UI, default tab)
- ARIA role: native `checkbox` role, achieved by rendering a real (visually hidden) `<input type="checkbox">` inside `Checkbox.Root`'s `<span>` wrapper — so the browser's own accessibility mapping is used rather than a hand-rolled `role="checkbox"` on a `<div>`.
- Indeterminate state: the docs confirm a dedicated `indeterminate` prop exists and is reflected via `data-indeterminate`; the exact `aria-checked` value emitted (`"mixed"` is the HTML/ARIA-standard value for indeterminate checkboxes) is **not explicitly spelled out on the page** — stating this as undocumented rather than assuming, though `"mixed"` would be the platform-conventional choice given a real native `<input>` is involved.
- No dedicated keyboard-interaction table is published on the Base UI Checkbox page (verified directly). Standard native-checkbox keyboard behavior applies: Space toggles, the element is in the tab order unless disabled — this follows from using a real `<input type="checkbox">`, not from a documented custom table.

### Ant Design
- No dedicated ARIA/accessibility section on the Checkbox docs page.
- Whether `indeterminate` sets `aria-checked="mixed"` on the rendered element, or is purely a CSS/visual dash with no ARIA counterpart, is **not documented** — flagging explicitly as an open verification item rather than assuming parity with the native platform behavior.
- `Checkbox.Group`: no documentation of `role="group"`/`aria-labelledby` being applied to the group container, or of the manual "select all" pattern's accessibility wiring (e.g. whether the guide expects `aria-controls` from the parent checkbox to the group) — undocumented, verify in the rendered DOM.

## 5. Design tokens

### shadcn/ui
No Checkbox-specific custom properties exist. Global CSS variables referenced:
- **Checked state** → `--primary` / `--primary-foreground` (fill and checkmark color)
- **Unchecked state** → `--background` (fill) with `--border`/`--input` (outline)
- **Focus** → `--ring`
- **Invalid** → `--destructive` (via `aria-invalid`)
- **Disabled** → typically `--muted`/reduced opacity rather than a dedicated variable
- `--radius` — corner rounding of the box (checkboxes conventionally use a smaller radius than buttons/cards, but shadcn does not define a separate token for this — it's a scaled-down use of the same `--radius` variable)

### Ant Design (component-level Design Token, from the Checkbox docs page)
| Token | Description | Default value |
|---|---|---|
| `colorPrimary` | Brand color used for the checked-state fill/checkmark (Checkbox references the global seed token directly rather than defining its own alias) | `#1677ff` |
| `colorBgContainer` | Background of the unchecked box | `#ffffff` |
| `colorBgContainerDisabled` | Background of the box when disabled | `rgba(0,0,0,0.04)` |
| `colorBorder` | Border color of the unchecked box | `#d9d9d9` |
| `controlInteractiveSize` | Size (width/height) of the checkbox box itself | `16` |
| `borderRadiusSM` | Corner radius of the box | `4` |

Derived from global Seed/Alias tokens: `colorPrimary` (checked fill, used directly — the page does not introduce a dedicated `checkedColor`-style alias the way `Button`/`Input` do for their own tokens), `colorBorder` (unchecked outline), `borderRadiusSM` (a smaller sibling of the base `borderRadius` seed, appropriate for a compact control), `controlInteractiveSize` (an Alias Token specifically sized for small interactive controls like Checkbox/Radio, distinct from `controlHeight` which sizes larger controls like Input/Select/Button).

## 6. Notes for andes-ng implementation

- Behavior primitive: mostly not needed for a *single* checkbox — like Input/Textarea, a lone checkbox is just a native `<input type="checkbox">` with styling, matching the "real hidden input inside a styled wrapper" approach both Base UI and (implicitly) Ant use. However, **`Checkbox.Group`** (Ant) / the `parent`-driven group pattern (Base UI) does warrant a small dedicated behavior helper in `@andes-ng/primitives` if group/"select all" support is in scope for v1 — specifically: computing/propagating `indeterminate` across a parent-children set and keeping the controlled array `value` in sync. This is much lighter than the Listbox/positioning primitive needed for Select/Combobox — more of a small state-coordination utility than a focus-management primitive.
- Token mapping: checked state → `--andes-color-primary`/`--andes-color-primary-foreground`; unchecked box → `--andes-color-background` fill with `--andes-color-border`/`--andes-color-input` outline; focus → `--andes-color-focus-ring`; invalid → `--andes-color-danger`; disabled → `--andes-color-muted`/`--andes-color-muted-foreground`-driven reduced-opacity treatment (andes-ng doesn't have a `*-disabled`-suffixed background token the way Ant does with `colorBgContainerDisabled` — worth deciding whether to add one or keep expressing disabled purely via opacity, consistent with how `AndesButton` already handles disabled). Radius → `--andes-radius-sm`. **Gap**: no dedicated "compact control size" token equivalent to Ant's `controlInteractiveSize` (16px) exists in `--andes-space-*`; the closest is `--andes-space-4` (1rem = 16px) which happens to match numerically but isn't semantically named for this purpose — consider whether a checkbox/radio box size should be pulled from spacing tokens directly or deserves its own `--andes-size-control-*` scale if Radio/Switch are planned to share it.
- Accessibility pitfalls to flag for the Angular implementation:
  - Ensure `checked`, `indeterminate`, `disabled`, `required` land on the real inner `<input type="checkbox">`, not just as visual classes on an outer custom-element host — the same class of bug already found and fixed on `AndesButton` (ARIA/state not reaching the actual interactive control).
  - `indeterminate` is **not a reflectable HTML attribute** on native checkboxes (unlike `checked`) — it must be set as a DOM property (`el.indeterminate = true`) via the native element reference, not via an attribute binding; a naive Angular `[attr.indeterminate]` binding will silently do nothing. This is a well-known platform quirk worth calling out explicitly since neither library's docs page states it plainly.
  - Apply Angular's `booleanAttribute` transform to `checked`, `disabled`, `indeterminate`, and `required` inputs so bare-attribute usage like `<andes-checkbox checked>` (no `="true"`) resolves correctly — the same convention flagged in `input.md`.
  - If implementing group "select all" semantics, decide and document explicitly whether `indeterminate` is auto-derived (Base UI's `parent` mechanism) or manually computed by the consumer (Ant's documented pattern) — the two libraries disagree on this, so andes-ng needs its own explicit decision rather than silently picking one.
