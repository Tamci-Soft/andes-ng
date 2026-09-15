# Input

## 1. Anatomy / compound structure

### shadcn/ui
- `Input` is a single, mostly unstyled native `<input>` wrapper — no Base UI/Radix primitive underlies it (a plain input needs no behavior layer, only styling).
- Commonly composed with the separate **Field** primitives for labeling: `Field`, `FieldLabel`, `FieldDescription`, `FieldError` — these are generic form-field wrappers, not Input-specific, and are shared across Input/Textarea/Select/etc.
- No built-in prefix/suffix/addon slot — composed manually (e.g. wrapping icon + input in a flex container) when needed.

### Ant Design
- `Input` (main), with static/related exports: `Input.TextArea`, `Input.Password`, `Input.Search`, `Input.OTP`, `Input.Group` (legacy addon wrapper, largely superseded by `addonBefore`/`addonAfter` props).

## 2. Props / API

### shadcn/ui (Input)
Thin wrapper — most "props" are just passthrough native `<input>` attributes plus a few conventions:
| Prop / attribute | Type | Description |
|---|---|---|
| `type` | native input types incl. `"file"` | `type="file"` gets dedicated file-input styling |
| `disabled` | `boolean` | native disabled, styled via `data-disabled` |
| `aria-invalid` | `boolean` | drives the invalid/error visual state |
| `required` | `boolean` | native required, paired with `FieldLabel`'s required indicator |
| className / all native `<input>` props | — | fully passthrough since it's a thin native wrapper |

### Ant Design (Input)
| Prop | Description | Type | Default |
|---|---|---|---|
| `allowClear` | Show a clear icon | `boolean \| { clearIcon, disabled? }` | — |
| `classNames` | Customize classes per semantic structure | `Record`/function | — |
| `count` | Character count config | `CountConfig` | — |
| `defaultValue` | Initial value | `string` | — |
| `disabled` | Disable input | `boolean` | `false` |
| `id` | Input id | `string` | — |
| `maxLength` | Max characters | `number` | — |
| `prefix` | Prefix icon/node | `ReactNode` | — |
| `showCount` | Show character counter | `boolean \| object` | `false` |
| `status` | Validation status | `error \| warning` | — |
| `styles` | Inline styles per semantic structure | `Record`/function | — |
| `size` | Size | `large \| middle \| small` | — |
| `suffix` | Suffix icon/node | `ReactNode` | — |
| `type` | Native input type | `string` | `text` |
| `value` | Controlled value | `string` | — |
| `variant` | Visual variant | `outlined \| borderless \| filled \| underlined` | `outlined` |
| `onChange` | Change handler | function | — |
| `onPressEnter` | Enter key handler | function | — |
| `onClear` | Clear-button click handler | `() => void` | — |
| `addonBefore` / `addonAfter` | Non-input addon (e.g. "http://", a select) | `ReactNode` | — |

**`Input.TextArea` additional props:** `autoSize` (`boolean | { minRows, maxRows }`, default `false`) for auto-growing height.

## 3. Variants, sizes and states

### shadcn/ui
- No named "variant" prop — visual variation comes from Tailwind utility overrides or wrapping in `Field` states (`data-invalid`).
- Sizes: no explicit size scale on Input itself (unlike Button) — height is controlled via the design's spacing tokens directly.
- States: `disabled` (native + `data-disabled` styling hook), `aria-invalid`/`data-invalid` (error styling), `required` (paired with label asterisk via `FieldLabel`), file-input variant gets distinct styling for the native file-picker button part.

### Ant Design
- Variants: `outlined` (default), `borderless`, `filled`, `underlined`.
- Sizes: `large`, `middle`, `small`.
- States: `disabled`, `status="error"|"warning"` (border + shadow color changes), clearable (`allowClear`), character-count (`showCount`/`maxLength` combo), addon-wrapped (changes the box model: input becomes part of a compound addon+input+addon row).

## 4. Accessibility

### shadcn/ui
- Relies entirely on correct native `<input>` semantics plus explicit `<label htmlFor>` association via the `Field`/`FieldLabel` pair (no ARIA role reinvention needed — this is the whole point of using the platform element).
- `aria-invalid` is the documented mechanism for the error state, which is also what screen readers use to announce invalid fields — not just a visual class.
- `FieldDescription` is meant to be wired to the input via `aria-describedby` so assistive tech reads the hint text.

### Ant Design
- No dedicated ARIA documentation on the component page beyond the native input semantics; `status="error"` is a purely visual signal unless the consumer separately wires `aria-invalid`/`aria-describedby` themselves (worth flagging — this is a real gap vs. shadcn's documented pattern).

## 5. Design tokens

### shadcn/ui
Global variables referenced: `--input` (border color baseline), `--ring` (focus ring), `--destructive` (when `aria-invalid`), `--background`/`--foreground` (fill and text), `--radius`. No Input-specific custom properties exist beyond these shared ones.

### Ant Design (component-level Design Tokens, from the Input docs page)
| Token | Description | Default value |
|---|---|---|
| `activeBg` | Background when active/focused | `#ffffff` |
| `activeBorderColor` | Active border color | `#1677ff` |
| `activeShadow` | Box-shadow when active | `0 0 0 2px rgba(5,145,255,0.1)` |
| `addonBg` | Addon background | `rgba(0,0,0,0.02)` |
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

Derived from Seed/Alias tokens: `colorPrimary` (→ `activeBorderColor`/`activeShadow`), `colorError`/`colorWarning` (→ the two `*ActiveShadow` variants), `controlHeight`/`sizeStep` (→ `paddingBlock*`/`paddingInline*`), `fontSize` (→ `inputFontSize*`).

## 6. Notes for andes-ng implementation

- No behavior primitive needed in `@andes-ng/primitives` — Input is a plain native element with no focus-trap/positioning/roving-tabindex behavior, same conclusion both libraries reach (neither wraps it in a headless primitive).
- Token mapping: `--andes-color-input` already exists (added this session) for the border baseline; will need an **active/focus border color** distinct from `--andes-color-border` (Ant's `activeBorderColor`/shadcn's `--ring` both single out focus explicitly) — currently andes-ng only has `--andes-color-focus-ring` for the box-shadow ring, not a separate active border tint. Worth deciding whether to reuse `--andes-color-focus-ring` for both or add a dedicated one.
- Ant's `status="error"|"warning"` two-tier validation state is richer than shadcn's binary `aria-invalid`. Given `AndesButton` already has a single `ariaInvalid` boolean pattern, decide up front whether Input needs Ant's warning tier too, or whether error-only (matching Button's own `ariaInvalid`) is enough for v1.
- Follow shadcn's explicit `aria-invalid`-drives-the-error-style pattern (not a purely cosmetic class) — Ant's own docs don't guarantee this, and it's cheap to get right from the start, consistent with the ARIA-forwarding rigor already applied to `AndesButton`.
