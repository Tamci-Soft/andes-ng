# Textarea

## 1. Anatomy / compound structure

### shadcn/ui
- `Textarea` — single component, no compound sub-parts of its own.
- As of the current (2026) docs, every shadcn component page — including this one — ships a three-way tabs switcher at the top for the underlying primitive implementation: **Base UI** (default/first tab), **React Aria**, **Radix UI**. For Textarea specifically this switcher is largely cosmetic: a textarea needs no interactive behavior layer (no focus trap, no listbox, no positioning), so all three tabs render a plain native `<textarea>` with the same styling — there is no meaningful behavioral primitive underneath, unlike Select/Combobox/Checkbox. Still, per the task's instruction to verify rather than assume, the default tab is confirmed as **Base UI**.
- Commonly composed with the shared, non-Textarea-specific **Field** primitives for labeling/validation: `Field`, `FieldLabel`, `FieldDescription` (and `FieldError` in the broader Field family used across Input/Select/Checkbox).
- No built-in auto-resize/`autoSize` behavior — shadcn's Textarea does not grow with content out of the box (contrast with Ant's `Input.TextArea` `autoSize` prop below).

### Ant Design
- `Input.TextArea` — a static property of the `Input` component family (not a standalone top-level export). No further sub-parts.
- Semantic DOM sections documented for styling hooks: `root` (wrapper — border, radius, transitions), `textarea` (the actual `<textarea>` element — font, padding, color, background), `clear` (clear button, 6.4.0+), `count` (character counter).

## 2. Props / API

### shadcn/ui (Textarea)
Thin wrapper over the native `<textarea>` — most "props" are native passthrough attributes plus a few styling conventions shared with Input:

| Prop / attribute | Type | Description |
|---|---|---|
| `disabled` | `boolean` | Native disabled; styled via `data-disabled` |
| `aria-invalid` | `boolean` | Drives the invalid/error visual state (and `data-invalid` on the `Field` wrapper) |
| `required` | `boolean` | Native required, paired with `FieldLabel`'s required indicator |
| `rows` | native `<textarea>` attribute | Controls initial visible height (no auto-grow) |
| className / all native `<textarea>` props | — | Fully passthrough since it's a thin native wrapper |

### Ant Design (Input.TextArea)
TextArea-specific props (in addition to the full set of shared `Input` props — `allowClear`, `defaultValue`, `disabled`, `id`, `maxLength`, `showCount`, `status`, `size`, `value`, `variant`, `onChange`, `onPressEnter`, `onClear` — all of which also apply to TextArea):

| Prop | Description | Type | Default |
|---|---|---|---|
| `autoSize` | Height auto-size feature | `boolean \| { minRows?: number, maxRows?: number }` | `false` |
| `classNames` | Customize classes for semantic structures (`root`, `textarea`, `clear`, `count`) | `Record<SemanticDOM, string> \| function` | — |
| `styles` | Customize inline styles per semantic structure | `Record<SemanticDOM, CSSProperties> \| function` | — |
| `allowClear` | Show a clear icon | `boolean \| { clearIcon?: ReactNode }` | `false` |
| `showCount` | Show character counter | `boolean \| object` | `false` |
| `maxLength` | Max character count | `number` | — |
| `status` | Validation status | `error \| warning` | — |
| `size` | Size (affects padding/font, not row count) | `large \| middle \| small` | `middle` |
| `variant` | Visual variant | `outlined \| borderless \| filled \| underlined` | `outlined` |
| `onResize` | Callback fired when the textarea is resized (manually or via `autoSize`) | `function({ width, height })` | — |
| `value` / `defaultValue` | Controlled / initial value | `string` | — |
| `onChange` | Change handler | `function` | — |

All native `<textarea>` HTML attributes (`rows`, `cols`, `placeholder`, `readOnly`, etc.) are also forwarded.

## 3. Variants, sizes and states

### shadcn/ui
- No named `variant` prop (unlike `Button`) — visual variation comes from Tailwind class overrides or `Field` state classes.
- No size scale — height is either the native `rows` attribute or CSS; no built-in auto-grow.
- States: `disabled` (native + `data-disabled`), `aria-invalid`/`data-invalid` (error styling), `required` (paired with `FieldLabel` asterisk).

### Ant Design
- Variants: `outlined` (default), `borderless`, `filled`, `underlined` — same variant set as `Input`.
- Sizes: `large`, `middle` (default), `small` — affects padding/font, not the number of visible rows.
- Auto-size states: fixed height (default), auto-grow unconstrained (`autoSize={true}`), auto-grow clamped between `minRows`/`maxRows`.
- States: `disabled`, `status="error"|"warning"`, clearable (`allowClear`, shows a clear affordance only when there is content), character-count (`showCount` + `maxLength` combo, renders a counter in the `count` semantic slot), resizable (native browser resize handle, generally disabled/overridden when `autoSize` is active).

## 4. Accessibility

### shadcn/ui (via Base UI, default tab)
- Relies entirely on native `<textarea>` semantics — no ARIA role reinvention (there is no interactive-widget behavior to layer on a plain text area).
- `aria-invalid` is the documented mechanism for the error state and is what assistive tech uses to announce invalid fields, not merely a CSS hook.
- `FieldDescription` is meant to be wired to the textarea via `aria-describedby` so screen readers read the hint/help text; `FieldLabel` provides the accessible name via `htmlFor`/`id` association.
- No keyboard interaction table is published for Textarea (none is needed — a native `<textarea>` has standard browser text-editing keyboard behavior with no custom widget semantics).

### Ant Design
- No dedicated ARIA documentation beyond native `<textarea>` semantics on the component page.
- `status="error"|"warning"` is a purely visual signal — the docs do not state that it also sets `aria-invalid`; a consumer would need to wire that themselves (same gap already noted for plain `Input`).
- `showCount`'s live counter text is not documented as being announced via `aria-live`; verify in the rendered DOM rather than assuming it's accessible out of the box.

## 5. Design tokens

### shadcn/ui
No Textarea-specific custom properties exist. Global CSS variables referenced (identical set to `Input`, since both are thin native-element wrappers):
- `--input` — border color baseline
- `--ring` — focus ring
- `--destructive` — error state (`aria-invalid`)
- `--background` / `--foreground` — fill and text color
- `--radius` — corner radius

### Ant Design (component-level Design Token, from the Input docs page — TextArea shares the same token namespace as Input)
| Token | Description | Default value |
|---|---|---|
| `activeBg` | Background when active/focused | `#ffffff` |
| `activeBorderColor` | Active border color | `#1677ff` |
| `activeShadow` | Box-shadow when active | `0 0 0 2px rgba(5,145,255,0.1)` |
| `addonBg` | Addon background (not used by TextArea — TextArea has no `addonBefore`/`addonAfter`; token exists only for shared-namespace consistency with Input) | `rgba(0,0,0,0.02)` |
| `errorActiveShadow` | Box-shadow when active + error | `0 0 0 2px rgba(255,38,5,0.06)` |
| `hoverBg` | Background on hover | `#ffffff` |
| `hoverBorderColor` | Border color on hover | `#4096ff` |
| `inputFontSize` | Font size | `14` |
| `inputFontSizeLG` | Font size (large) | `16` |
| `inputFontSizeSM` | Font size (small) | `14` |
| `paddingBlock` | Vertical padding | `4` |
| `paddingBlockLG` | Vertical padding (large) | `7` |
| `paddingBlockSM` | Vertical padding (small) | `0` |
| `paddingInline` | Horizontal padding | `11` |
| `paddingInlineLG` | Horizontal padding (large) | `11` |
| `paddingInlineSM` | Horizontal padding (small) | `7` |
| `warningActiveShadow` | Box-shadow when active + warning | `0 0 0 2px rgba(255,215,5,0.1)` |

Derived from global Seed/Alias tokens: `colorPrimary` (→ `activeBorderColor`/`activeShadow`), `colorError`/`colorWarning` (→ the two `*ActiveShadow` variants), `controlHeight`/`sizeStep` (→ `paddingBlock*`/`paddingInline*`), `fontSize` (→ `inputFontSize*`). These are exactly the same Alias-token derivations as plain `Input`, confirming TextArea is not a separately-tokenized component in Ant's system.

## 6. Notes for andes-ng implementation

- No listbox/focus-trap/positioning primitive is needed — both libraries treat this as a plain native element with no interactive-widget behavior layered on top, same conclusion as `Input`.
- The one piece of real *behavior* worth a small utility (not a full `@andes-ng/primitives` behavior primitive, but a reusable internal helper) is Ant's `autoSize` auto-grow: measuring scrollHeight against `minRows`/`maxRows` and resizing on input/resize events. shadcn has no equivalent — if andes-ng wants Ant-parity auto-grow, this needs to be built from scratch; consider a small `resizeToContent` directive/utility shared by nothing else in the library today.
- Token mapping: reuse `--andes-color-input` (border baseline), `--andes-color-focus-ring` (focus/active state — covers both shadcn's `--ring` and Ant's `activeBorderColor`/`activeShadow` roles), `--andes-color-danger`/`--andes-color-danger-hover` (error state, covers shadcn's `--destructive` and Ant's `errorActiveShadow`), `--andes-space-*` for block/inline padding scale, `--andes-radius-md` for corner radius. **Gap**: no dedicated warning-tier color exists yet (Ant's `warningActiveShadow` implies a `colorWarning` seed token andes-ng doesn't have at all — would need a new `--andes-color-warning` token if the two-tier error/warning status is adopted).
- Accessibility pitfall to flag: same as Input — if the Angular component wraps a native `<textarea>` inside a custom-element host, make sure `aria-invalid`, `aria-describedby`, `required`, and `disabled` land on the actual inner `<textarea>` and not just the outer host element (the exact class of bug already found and fixed on `AndesButton`, where ARIA/attribute forwarding to the real interactive element needed explicit handling). Also apply Angular's `booleanAttribute` transform to `disabled`/`required`/`readonly`/`autoSize` inputs so bare-attribute usage like `<andes-textarea disabled>` (no `="true"`) resolves correctly.
