# Combobox / AutoComplete

## 1. Anatomy / compound structure

### shadcn/ui
The shadcn docs page is titled "Combobox" — "Autocomplete input with a list of suggestions." This is one of the clearest examples of the Base UI migration: historically (Radix era) shadcn's Combobox recipe was built by hand-composing **Radix UI's `Popover`** with **`cmdk`**'s `Command` component (cmdk is a separate, non-Radix library) — there was no single first-party "Combobox" primitive. As of the current docs, the default tab is **Base UI**, and Base UI now ships a purpose-built **`Autocomplete`** primitive (`base-ui.com/react/components/autocomplete`) that shadcn's "Combobox" recipe is built directly on top of. The three-way switcher (Base UI default, React Aria, Radix UI) is present here too; the Radix UI tab presumably still reflects the older Popover+cmdk-style composition, but the *default* documented recipe no longer uses cmdk at all.

Sub-components shown across the page's examples (shadcn-level names, single-select and multi-select/chips and grouped variants combined):
| Part | Role |
|---|---|
| `Combobox` | Root — owns open/value/filter state |
| `ComboboxInput` | The editable text input (single-select / free-text search) |
| `ComboboxContent` | Popup surface wrapper |
| `ComboboxEmpty` | "No results" state, shown when the filtered list is empty |
| `ComboboxList` | Scrollable list container inside the popup |
| `ComboboxItem` | Individual selectable suggestion |
| `ComboboxGroup` | Groups related items under a heading |
| `ComboboxLabel` | Heading label for a group |
| `ComboboxCollection` | Items collection within a group (data-driven rendering) |
| `ComboboxSeparator` | Visual divider between groups |
| `ComboboxChips` | Wrapper for the multi-select "chips" input variant |
| `ComboboxValue` | Renders the current value(s) |
| `ComboboxChip` | A single removable chip/tag in multi-select mode |
| `ComboboxChipsInput` | The text input embedded inside the chips row for multi-select |

Underlying Base UI `Autocomplete` parts (for reference): `Root`, `Input`, `InputGroup`, `Trigger`, `Icon`, `Clear`, `Value`, `Portal`, `Positioner`, `Popup`, `Arrow`, `Status` (live-region announcements), `Empty`, `List`, `Row` (grid layouts), `Item`, `Group`, `GroupLabel`, `Collection`, `Separator`.

### Ant Design
- `AutoComplete` — single top-level component. Internally it composes Ant's own `Select` (in single/search-input mode) with an `Input` as the default rendered child.
- No `AutoComplete.Option`/`AutoComplete.OptGroup` static sub-exports are documented — suggestions are supplied via the `options` prop (`{ label, value }[]`), and a fully custom input element can be supplied via the `children` prop (default is `<Input />`, can be swapped for `<Input.Search />`, a plain `<textarea>`, etc.).

## 2. Props / API

### shadcn/ui (Base UI `Autocomplete`-backed)

**Combobox (Root)**
| Prop | Type | Default | Description |
|---|---|---|---|
| `items` | `array \| grouped object` | — | Data source for suggestions |
| `value` / `onValueChange` | — | — | Controlled selected value(s) |
| `multiple` | `boolean` | `false` | Enables the chips/multi-select variant |
| `itemToStringValue` | `(item) => string` | — | Converts an object item to its display/filter string |
| `filter` | `function` | — | Custom filter predicate |
| `mode` | `"list" \| "both" \| "inline" \| "none"` | — | Filtering/autocomplete behavior mode |
| `autoHighlight` | `boolean` | — | Auto-highlights the first filtered match |
| `limit` | `number` | — | Caps the number of rendered results |
| `open` / `onOpenChange` | — | — | Controlled popup open state |
| `disabled` / `readOnly` / `required` | `boolean` | `false` | Standard form-control states |
| `aria-invalid` | `boolean` | — | Drives the invalid/error visual state |

**ComboboxInput / ComboboxChipsInput**: standard text-input props (`placeholder`, `disabled`), plus the input is the element that actually carries the ARIA combobox role (see §4).
**ComboboxItem**: `value`, `disabled`.
**ComboboxEmpty**: renders only when the filtered result set is empty; accepts arbitrary children as the empty-state message.
**ComboboxChip**: represents one selected value in multi-select mode, typically with a remove/close affordance.

### Ant Design (AutoComplete) — full props table
| Property | Description | Type | Default |
|---|---|---|---|
| `allowClear` | Show a clear button | `boolean \| { clearIcon?: ReactNode }` | `false` (5.8.0 object form) |
| `backfill` | Backfill the highlighted suggestion into the input via keyboard navigation | `boolean` | `false` |
| `children` | Custom input element to render instead of the default `<Input />` | `HTMLInputElement \| HTMLTextAreaElement \| React.ReactElement<InputProps>` | `<Input />` |
| `classNames` | Semantic DOM class customization | `Record<SemanticDOM, string> \| (info) => Record<...>` | — |
| ~~`dataSource`~~ | *(deprecated)* Use `options` | `DataSourceItemType[]` | — |
| `defaultActiveFirstOption` | Actively highlight the first option by default | `boolean` | `true` |
| `defaultOpen` | Initial open state | `boolean` | — |
| `defaultValue` | Initial value | `string` | — |
| `disabled` | Disable the control | `boolean` | `false` |
| ~~`dropdownClassName`~~ | *(deprecated)* Use `classNames.popup.root` | `string` | — |
| ~~`dropdownMatchSelectWidth`~~ | *(deprecated)* Use `popupMatchSelectWidth` | `boolean \| number` | `true` |
| ~~`dropdownRender`~~ | *(deprecated 4.24.0)* Use `popupRender` | `(originNode) => ReactNode` | — |
| `popupRender` | Customize dropdown content | `(originNode) => ReactNode` | — |
| ~~`dropdownStyle`~~ | *(deprecated)* Use `styles.popup.root` | `CSSProperties` | — |
| ~~`popupClassName`~~ | *(deprecated 4.23.0)* Use `classNames.popup.root` | `string` | — |
| `popupMatchSelectWidth` | Match popup width to the input | `boolean \| number` | `true` |
| ~~`filterOption`~~ | *(deprecated)* Use `showSearch.filterOption` | `boolean \| function(inputValue, option)` | `true` |
| `getPopupContainer` | Parent node for the popup | `function(triggerNode)` | `() => document.body` |
| `notFoundContent` | Content shown when no results match | `ReactNode` | — |
| `open` | Controlled popup open state | `boolean` | — |
| `options` | Suggestion data | `{ label, value }[]` | — |
| `placeholder` | Placeholder text | `string` | — |
| `showSearch` | Search behavior config | `true \| object` | `true` |
| `status` | Validation status | `"error" \| "warning"` | — (4.19.0) |
| `size` | Control size | `"large" \| "middle" \| "small"` | `"middle"` (inherited from Select; not independently overridden for AutoComplete) |
| `value` | Controlled value | `string` | — |
| `styles` | Semantic DOM inline style customization | `Record<SemanticDOM, CSSProperties> \| (info) => Record<...>` | — |
| `variant` | Visual variant | `"outlined" \| "borderless" \| "filled" \| "underlined"` | `"outlined"` (5.13.0) |
| `virtual` | Enable virtual scrolling | `boolean` | `true` (4.1.0) |
| `onBlur` | Blur handler | `function()` | — |
| `onChange` | Fires on selection or input value change | `function(value)` | — |
| ~~`onDropdownVisibleChange`~~ | *(deprecated)* Use `onOpenChange` | `(open: boolean) => void` | — |
| `onOpenChange` | Fires when popup open state changes | `(open: boolean) => void` | — |
| `onFocus` | Focus handler | `function()` | — |
| ~~`onSearch`~~ | *(deprecated)* Use `showSearch.onSearch` | `function(value)` | — |
| `onSelect` | Fires when a suggestion is selected | `function(value, option)` | — |
| `onClear` | Fires when cleared | `function` | (4.6.0) |
| `onInputKeyDown` | Keydown handler | `(event) => void` | — |
| `onPopupScroll` | Fires on popup scroll | `(event) => void` | — |

**`showSearch` object form**
| Property | Type | Default | Description |
|---|---|---|---|
| `filterOption` | `boolean \| function(inputValue, option)` | `true` | Enable/customize filtering |
| `onSearch` | `function(value)` | — | Search text change handler |

**Methods**: `blur()`, `focus()`.

> Note: the official page presents AutoComplete as thin sugar over `Select` in single/search mode — nearly every prop above is identical in name and shape to `Select`'s (see `select.md`), which is expected since AutoComplete literally reuses Select's internals with a plain-text `Input` as the default trigger instead of a button-like selector box.

## 3. Variants, sizes and states

### shadcn/ui
- No named `variant` prop; visual variation is Tailwind-class driven, consistent with the rest of the current shadcn docs generation.
- Single-select (`ComboboxInput` + `ComboboxContent`/`ComboboxList`) vs. multi-select/chips (`ComboboxChips` + `ComboboxChip` + `ComboboxChipsInput`) are two distinct composition recipes, not a single boolean toggle at the JSX level (though the underlying `multiple` prop drives which recipe applies).
- States: open/closed (popup), empty (`ComboboxEmpty` renders when the filter yields nothing), disabled, invalid (`aria-invalid`), item-highlighted (keyboard/mouse active item, distinct from selected).

### Ant Design
- Variants: `outlined` (default), `borderless`, `filled`, `underlined` — identical set to `Select`/`Input`.
- Sizes: `large`, `middle` (default), `small`.
- Status: `error`, `warning`.
- States: open/closed, disabled, `allowClear`-driven clearable state, `backfill` (keyboard-highlighted suggestion temporarily fills the input text), no built-in `loading` prop on AutoComplete itself (unlike `Select`) — if a loading affordance is needed it must be composed via `notFoundContent` or a custom child input.

## 4. Accessibility

### shadcn/ui (via Base UI `Autocomplete`, default tab)
- Base UI's Autocomplete API surface references ARIA attributes directly in its prop/state documentation: `aria-autocomplete`, `aria-setsize`, `aria-posinset` (on items, for position-in-set announcements), and `aria-busy` (likely on `Status`/the list while results are loading/filtering).
- This matches the standard WAI-ARIA "Editable Combobox with List Autocomplete" pattern: the `Input` carries `role="combobox"` with `aria-autocomplete="list"` (or `"both"` depending on `mode`) and `aria-expanded`/`aria-controls` pointing at the popup; the popup/list behaves as a listbox; items behave as options. This structural inference is consistent with the documented attributes but the page does not spell out the full role assignment table explicitly — flagging this as inferred-from-structure rather than verbatim-documented.
- No dedicated keyboard-interaction table is published on the Base UI Autocomplete page (verified directly — the page's visible content ends at the API reference without a separate "Accessibility"/keyboard section). Standard combobox keyboard conventions (ArrowDown/Up to move the active item, Enter to commit, Escape to close) are implied by the widget pattern but not laid out key-by-key in the docs, so this is stated explicitly rather than invented.

### Ant Design
- No dedicated ARIA documentation on the AutoComplete page, consistent with `Select`/`Input`/`Button`.
- Because AutoComplete is a fully custom-rendered combobox (not a native `<input list="...">`), the actual `role="combobox"`/`aria-expanded`/`aria-activedescendant` wiring is undocumented and should be verified in the rendered DOM rather than assumed correct.

## 5. Design tokens

### shadcn/ui
No Combobox-specific custom properties exist. Global CSS variables referenced:
- `--popover` / `--popover-foreground` — the suggestion popup
- `--border` / `--input` — the text-input field border
- `--ring` — focus ring on the input
- `--accent` / `--accent-foreground` — highlighted/active suggestion row
- `--destructive` — invalid state (`aria-invalid`)
- `--secondary` / `--secondary-foreground` — plausible candidate for chip/tag styling in the multi-select `ComboboxChip` recipe (not a dedicated variable — chips are just styled with the existing palette)
- `--radius` — corner radius on the input and popup

### Ant Design (component-level Design Token, from the AutoComplete docs page)
AutoComplete shares Select's token namespace in full — the page publishes the same table:
| Token | Description | Default value |
|---|---|---|
| `activeBorderColor` | Border color when active/focused | `#1677ff` |
| `activeOutlineColor` | Outline/shadow color when active | `rgba(5,145,255,0.1)` |
| `clearBg` | Background of the clear button | `#ffffff` |
| `hoverBorderColor` | Border color on hover | `#4096ff` |
| `multipleItemBg` | Background of a selected tag (multiple/tags mode, inherited from Select's shape even though AutoComplete itself is single-value) | `rgba(0,0,0,0.06)` |
| `multipleItemBorderColor` | Border color of a selected tag | `transparent` |
| `multipleItemBorderColorDisabled` | Border color of a disabled tag | `transparent` |
| `multipleItemColorDisabled` | Text color of a disabled tag | `rgba(0,0,0,0.25)` |
| `multipleItemHeight` | Height of a tag | `24` |
| `multipleItemHeightLG` | Height of a tag (large) | `32` |
| `multipleItemHeightSM` | Height of a tag (small) | `16` |
| `multipleSelectorBgDisabled` | Background of the selector when disabled | `rgba(0,0,0,0.04)` |
| `optionActiveBg` | Background of the actively-highlighted suggestion | `rgba(0,0,0,0.04)` |
| `optionFontSize` | Font size of a suggestion row | `14` |
| `optionHeight` | Height of a suggestion row | `32` |
| `optionLineHeight` | Line height of a suggestion row | `1.5714285714285714` |
| `optionPadding` | Padding of a suggestion row | `5px 12px` |
| `optionSelectedBg` | Background of the selected suggestion | `#e6f4ff` |
| `optionSelectedColor` | Text color of the selected suggestion | `rgba(0,0,0,0.88)` |
| `optionSelectedFontWeight` | Font weight of the selected suggestion | `600` |
| `selectorBg` | Background of the input/selector box | `#ffffff` |
| `showArrowPaddingInlineEnd` | Extra inline-end padding reserved for an arrow icon | `18` |
| `singleItemHeightLG` | Height of the content row (large) | `40` |
| `zIndexPopup` | z-index of the popup | `1050` |

Derived from the same global Seed/Alias tokens as `Select`: `colorPrimary` (→ `activeBorderColor`/`activeOutlineColor`), `colorBgContainer`/`colorBgContainerDisabled` (→ `selectorBg`/`clearBg`/`multipleSelectorBgDisabled`), `controlHeight`/`sizeStep` (→ `optionHeight`/`multipleItemHeight*`/`singleItemHeightLG`), `fontSize`/`lineHeight` (→ `optionFontSize`/`optionLineHeight`), `zIndexPopupBase` (→ `zIndexPopup`).

## 6. Notes for andes-ng implementation

- This needs the most sophisticated behavior primitive of the four components reviewed in this batch. Beyond the `AndesListboxPrimitive`/positioning primitive proposed for `Select` (see `select.md`), Combobox layers on: live text filtering, a free-text-editable input that keeps real DOM focus at all times, and **`aria-activedescendant`-based highlight tracking** instead of roving `tabindex` — i.e. the highlighted suggestion is communicated purely via ARIA while focus never leaves the `<input>`. This is a materially different focus-management technique from `Select`'s (and `Checkbox.Group`'s) roving/discrete-item focus, and should be modeled as a distinct mode of the shared listbox primitive rather than assumed identical.
- Token mapping mirrors `Select`: `--andes-color-popover`, `--andes-color-border`/`--andes-color-input`, `--andes-color-focus-ring`, `--andes-color-accent`(-hover) for the highlighted row. Same **gap** as Select applies here: no dedicated "selected suggestion" token distinct from hover/active exists yet (Ant's `optionSelectedBg` vs `optionActiveBg`).
- If multi-select "chips" mode (`ComboboxChips`/`ComboboxChip`) is in scope, it needs the same chip/tag token gap flagged in `select.md` — `--andes-color-secondary` is the nearest existing candidate but untested for a small pill/tag use case.
- Accessibility pitfalls to flag for the Angular implementation:
  - Never move real DOM focus into the popup/list while navigating suggestions with the keyboard — focus must stay on the `<input>` and the active item communicated solely via `aria-activedescendant` pointing at the highlighted item's `id`. A CDK-overlay-based implementation can easily regress this if list items are made independently focusable.
  - If the popup is portaled (e.g. via Angular CDK Overlay) outside the host element's DOM subtree, `aria-controls`/`aria-owns`/`aria-activedescendant` need explicit `id`-based wiring, since implicit DOM containment no longer satisfies the ARIA relationship once content is portaled to `document.body` — the same caveat noted for Select.
  - Apply `booleanAttribute` transforms to boolean inputs (`disabled`, `multiple`, `autoHighlight`, `allowClear`) so bare-attribute usage like `<andes-combobox disabled>` resolves correctly, consistent with the existing guidance from `input.md`/`button.md`.
