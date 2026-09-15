# Select

## 1. Anatomy / compound structure

### shadcn/ui

Compound component. The current docs page (2026) ships the now-standard three-way primitive switcher — **Base UI** (default/first tab), **React Aria**, **Radix UI** — verified directly rather than assumed. All examples below describe the **Base UI** tab, which underlies each shadcn part as noted:

| shadcn part                                       | Role                                                          | Underlying Base UI part                                                                      |
| ------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `Select`                                          | Root; owns open/value state                                   | `Select.Root`                                                                                |
| `SelectTrigger`                                   | Button that opens the popup, displays the current value       | `Select.Trigger` (+ `Select.Icon` for the chevron)                                           |
| `SelectValue`                                     | Renders selected value or placeholder text inside the trigger | `Select.Value`                                                                               |
| `SelectContent`                                   | Popup surface containing the option list                      | `Select.Portal` + `Select.Positioner` + `Select.Popup` (+ `Select.Backdrop`, `Select.Arrow`) |
| `SelectGroup`                                     | Groups related items under a heading                          | `Select.Group`                                                                               |
| `SelectLabel`                                     | Heading label for a group                                     | `Select.GroupLabel`                                                                          |
| `SelectItem`                                      | Individual selectable option                                  | `Select.Item` (+ `Select.ItemText`, `Select.ItemIndicator` for the check mark)               |
| `SelectSeparator`                                 | Visual divider between items/groups                           | `Select.Separator`                                                                           |
| `SelectScrollUpButton` / `SelectScrollDownButton` | Scroll affordances shown when the option list overflows       | `Select.ScrollUpArrow` / `Select.ScrollDownArrow`                                            |

Base UI's own part inventory (for reference, since not every part is re-exported 1:1 by shadcn): `Select.Root`, `Select.Label`, `Select.Trigger`, `Select.Value`, `Select.Icon`, `Select.Portal`, `Select.Backdrop`, `Select.Positioner`, `Select.Popup`, `Select.List`, `Select.Arrow`, `Select.Item`, `Select.ItemText`, `Select.ItemIndicator`, `Select.Group`, `Select.GroupLabel`, `Select.ScrollUpArrow`, `Select.ScrollDownArrow`, `Select.Separator`.

### Ant Design

- `Select` (main component).
- `Select.Option` — static property; individual option element (legacy/JSX-children API, superseded by the `options` array prop for performance but still supported).
- `Select.OptGroup` — static property; groups a set of `Option`s under a label.

## 2. Props / API

### shadcn/ui (Base UI-backed)

**Select (Root)**

| Prop            | Type                       | Default | Description                                                        |
| --------------- | -------------------------- | ------- | ------------------------------------------------------------------ |
| `value`         | `Value \| Value[] \| null` | —       | Controlled selected value                                          |
| `defaultValue`  | `Value \| Value[] \| null` | —       | Uncontrolled initial value                                         |
| `onValueChange` | `(value) => void`          | —       | Fires on selection change                                          |
| `open`          | `boolean`                  | —       | Controlled open state                                              |
| `defaultOpen`   | `boolean`                  | `false` | Uncontrolled initial open state                                    |
| `onOpenChange`  | `(open: boolean) => void`  | —       | Fires on open/close                                                |
| `disabled`      | `boolean`                  | `false` | Disables the whole control                                         |
| `multiple`      | `boolean`                  | `false` | Enables multi-select                                               |
| `modal`         | `boolean`                  | `true`  | Whether the popup traps focus / blocks outside interaction         |
| `items`         | `object \| array`          | —       | Data-driven items (alternative to composing `SelectItem` children) |
| `name`          | `string`                   | —       | Form field name                                                    |
| `required`      | `boolean`                  | `false` | Marks the field required for form validation                       |

**SelectTrigger**

| Prop           | Type                | Default     | Description                                                       |
| -------------- | ------------------- | ----------- | ----------------------------------------------------------------- |
| `disabled`     | `boolean`           | —           | Disables just the trigger                                         |
| `nativeButton` | `boolean`           | `true`      | Renders a native `<button>` element                               |
| `aria-invalid` | `boolean`           | —           | Drives the invalid/error visual state                             |
| `size`         | `"sm" \| "default"` | `"default"` | shadcn-added convenience sizing class, not part of Base UI itself |

**SelectContent**

| Prop                   | Type              | Default | Description                                                              |
| ---------------------- | ----------------- | ------- | ------------------------------------------------------------------------ |
| `alignItemWithTrigger` | `boolean`         | `true`  | When true, positions the popup so the selected item overlaps the trigger |
| `side` / `align`       | positioning enums | —       | Popup placement relative to the trigger                                  |

**SelectItem**

| Prop       | Type      | Default | Description                               |
| ---------- | --------- | ------- | ----------------------------------------- |
| `value`    | `string`  | `null`  | The option's value                        |
| `disabled` | `boolean` | `false` | Disables this item                        |
| `label`    | `string`  | —       | Text used for keyboard typeahead matching |

**SelectGroup / SelectLabel / SelectSeparator**: no component-specific props beyond `className`/children — purely structural.

### Ant Design (Select) — full props table

| Property                       | Type                                                                         | Default                                        | Description                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `allowClear`                   | `boolean \| { clearIcon?: ReactNode }`                                       | `false`                                        | Show a clear button (object form for custom icon since 5.8.0)                                    |
| ~~`autoClearSearchValue`~~     | `boolean`                                                                    | `true`                                         | _(deprecated)_ Clear search value on select in multiple/tags mode                                |
| ~~`bordered`~~                 | `boolean`                                                                    | `true`                                         | _(deprecated)_ Use `variant` instead                                                             |
| `classNames`                   | `Record<SemanticDOM, string> \| function`                                    | —                                              | Semantic-structure class customization (5.25.0)                                                  |
| `defaultActiveFirstOption`     | `boolean`                                                                    | `true`                                         | Whether to actively highlight the first option by default                                        |
| `defaultOpen`                  | `boolean`                                                                    | —                                              | Initial open state                                                                               |
| `defaultValue`                 | `string \| string[] \| number \| number[] \| LabeledValue \| LabeledValue[]` | —                                              | Initial selected value                                                                           |
| `disabled`                     | `boolean`                                                                    | `false`                                        | Disables the select                                                                              |
| ~~`dropdownClassName`~~        | `string`                                                                     | —                                              | _(deprecated)_ Use `classNames.popup.root`                                                       |
| ~~`dropdownMatchSelectWidth`~~ | `boolean \| number`                                                          | `true`                                         | _(deprecated)_ Use `popupMatchSelectWidth`                                                       |
| ~~`popupClassName`~~           | `string`                                                                     | —                                              | _(deprecated 4.23.0)_ Use `classNames.popup.root`                                                |
| `popupMatchSelectWidth`        | `boolean \| number`                                                          | `true`                                         | Match popup width to the select; `false` disables virtual scroll (5.5.0)                         |
| ~~`dropdownRender`~~           | `(originNode: ReactElement) => ReactNode`                                    | —                                              | _(deprecated)_ Use `popupRender`                                                                 |
| `popupRender`                  | `(originNode: ReactElement) => ReactNode`                                    | —                                              | Customize popup content (5.25.0)                                                                 |
| ~~`dropdownStyle`~~            | `CSSProperties`                                                              | —                                              | _(deprecated)_ Use `styles.popup.root`                                                           |
| `fieldNames`                   | `object`                                                                     | `{ label, value, options, groupLabel: label }` | Custom field names for `options` data (4.17.0)                                                   |
| ~~`filterOption`~~             | `boolean \| function(inputValue, option)`                                    | `true`                                         | _(deprecated)_ Use `showSearch.filterOption`                                                     |
| ~~`filterSort`~~               | `(optionA, optionB, info) => number`                                         | —                                              | _(deprecated)_ Use `showSearch.filterSort` (5.19.0 added `info.searchValue`)                     |
| `getPopupContainer`            | `function(triggerNode)`                                                      | `() => document.body`                          | Parent node for the popup                                                                        |
| `labelInValue`                 | `boolean`                                                                    | `false`                                        | Return `{ value, label }` objects instead of bare values                                         |
| `listHeight`                   | `number`                                                                     | `256`                                          | Popup height config                                                                              |
| `loading`                      | `boolean`                                                                    | `false`                                        | Show loading state                                                                               |
| `loadingIcon`                  | `ReactNode`                                                                  | `<LoadingOutlined spin />`                     | Custom loading icon (6.4.0)                                                                      |
| `maxCount`                     | `number`                                                                     | —                                              | Max number of selectable items in multiple/tags mode (5.13.0)                                    |
| `maxTagCount`                  | `number \| "responsive"`                                                     | —                                              | Max number of tags to render before collapsing; `"responsive"` measures available width (4.10.0) |
| `maxTagPlaceholder`            | `ReactNode \| function(omittedValues)`                                       | —                                              | Placeholder for hidden/collapsed tags                                                            |
| `maxTagTextLength`             | `number`                                                                     | —                                              | Max text length per tag                                                                          |
| `menuItemSelectedIcon`         | `ReactNode`                                                                  | `<CheckOutlined />`                            | Custom selected-item icon (6.4.0)                                                                |
| `mode`                         | `"multiple" \| "tags"`                                                       | —                                              | Selection mode (omit for single-select)                                                          |
| `notFoundContent`              | `ReactNode`                                                                  | `"No data"`                                    | Content shown when no options match                                                              |
| `open`                         | `boolean`                                                                    | —                                              | Controlled popup open state                                                                      |
| ~~`optionFilterProp`~~         | —                                                                            | —                                              | _(deprecated)_ See `showSearch.optionFilterProp`                                                 |
| `optionLabelProp`              | `string`                                                                     | `"children"`                                   | Which option field is rendered as the selected content                                           |
| `options`                      | `{ label, value }[]`                                                         | —                                              | Options data (preferred over JSX `Option` children for performance)                              |
| `optionRender`                 | `(option: FlattenOptionData, info) => ReactNode`                             | —                                              | Customize option rendering (5.11.0)                                                              |
| `placeholder`                  | `ReactNode`                                                                  | —                                              | Placeholder text                                                                                 |
| `placement`                    | `"bottomLeft" \| "bottomRight" \| "topLeft" \| "topRight"`                   | `"bottomLeft"`                                 | Popup placement                                                                                  |
| `prefix`                       | `ReactNode`                                                                  | —                                              | Custom prefix element (5.22.0)                                                                   |
| `removeIcon`                   | `ReactNode`                                                                  | `<CloseOutlined />`                            | Custom remove/tag-close icon (6.4.0)                                                             |
| ~~`searchValue`~~              | `string`                                                                     | —                                              | _(deprecated)_ Use `showSearch.searchValue`                                                      |
| ~~`showArrow`~~                | `boolean`                                                                    | `true`                                         | _(deprecated)_ Use `suffixIcon={null}`                                                           |
| `showSearch`                   | `boolean \| object`                                                          | single: `false`, multiple: `true`              | Enable search input (object form since 6.0.0/6.4.0)                                              |
| `size`                         | `"large" \| "middle" \| "small"`                                             | `"middle"`                                     | Control size                                                                                     |
| `status`                       | `"error" \| "warning"`                                                       | —                                              | Validation status (4.19.0)                                                                       |
| `styles`                       | `Record<SemanticDOM, CSSProperties> \| function`                             | —                                              | Semantic-structure inline style customization (5.25.0)                                           |
| `suffixIcon`                   | `ReactNode`                                                                  | `<DownOutlined />`                             | Custom suffix icon (non-clickable by design)                                                     |
| `tagRender`                    | `(props) => ReactNode`                                                       | —                                              | Customize rendering of each tag (multiple/tags mode)                                             |
| `labelRender`                  | `(props: LabelInValueType) => ReactNode`                                     | —                                              | Customize rendering of the selected label (5.15.0)                                               |
| `tokenSeparators`              | `string[] \| (input: string) => string[]`                                    | —                                              | Characters/function used to split pasted text into tags (function form 6.5.0)                    |
| `value`                        | `string \| string[] \| number \| number[] \| LabeledValue \| LabeledValue[]` | —                                              | Controlled selected value                                                                        |
| `variant`                      | `"outlined" \| "borderless" \| "filled" \| "underlined"`                     | `"outlined"`                                   | Visual variant (`outlined` since 5.13.0, `underlined` since 5.19.0/5.24.0)                       |
| `virtual`                      | `boolean`                                                                    | `true`                                         | Set `false` to disable virtual scrolling                                                         |
| `onActive`                     | `function(value)`                                                            | —                                              | Fires on keyboard/mouse active-option change                                                     |
| `onBlur`                       | `function`                                                                   | —                                              | Blur handler                                                                                     |
| `onChange`                     | `function(value, option)`                                                    | —                                              | Selection-change handler                                                                         |
| `onClear`                      | `function`                                                                   | —                                              | Fires when cleared (4.6.0)                                                                       |
| `onDeselect`                   | `function(value)`                                                            | —                                              | Fires on deselect in multiple/tags mode                                                          |
| ~~`onDropdownVisibleChange`~~  | `(open: boolean) => void`                                                    | —                                              | _(deprecated)_ Use `onOpenChange`                                                                |
| `onOpenChange`                 | `(open: boolean) => void`                                                    | —                                              | Fires when popup open state changes                                                              |
| `onFocus`                      | `(event) => void`                                                            | —                                              | Focus handler                                                                                    |
| `onInputKeyDown`               | `(event) => void`                                                            | —                                              | Keydown handler on the search input                                                              |
| `onPopupScroll`                | `(event) => void`                                                            | —                                              | Fires on popup scroll                                                                            |
| ~~`onSearch`~~                 | `function(value)`                                                            | —                                              | _(deprecated)_ Use `showSearch.onSearch`                                                         |
| `onSelect`                     | `function(value, option)`                                                    | —                                              | Fires when an option is selected                                                                 |

**`showSearch` object form**

| Property               | Type                                      | Default              | Description                                                    |
| ---------------------- | ----------------------------------------- | -------------------- | -------------------------------------------------------------- |
| `autoClearSearchValue` | `boolean`                                 | `true`               | Clear search text after selection (multiple/tags)              |
| `filterOption`         | `boolean \| function(inputValue, option)` | `true`               | Enable/customize filtering                                     |
| `filterSort`           | `(optionA, optionB, info) => number`      | —                    | Sort filtered results (5.19.0)                                 |
| `optionFilterProp`     | `string \| string[]`                      | `"value"`            | Field(s) to filter against; use `"label"` when using `options` |
| `searchValue`          | `string`                                  | —                    | Current search text                                            |
| `onSearch`             | `function(value)`                         | —                    | Search text change handler                                     |
| `searchIcon`           | `ReactNode`                               | `<SearchOutlined />` | Custom search icon (6.4.0)                                     |

**Select.Option props**: `className`, `disabled` (`false`), `title`, `value`.
**Select.OptGroup props**: `key`, `label`, `className`, `title`.
**Methods**: `blur()`, `focus()`.

## 3. Variants, sizes and states

### shadcn/ui

- No named `variant` prop on the Select itself (visual variation is Tailwind-class driven); `SelectTrigger` has an added `size="sm"|"default"` convenience prop from shadcn (not from Base UI).
- States: `open`/`closed` (`data-state` on trigger/popup), `disabled` (`data-disabled`), selected item shown via `Select.ItemIndicator` rendering (`data-state="checked"` on the item), invalid (`aria-invalid`/`data-invalid`).
- Multi-select is supported at the Base UI level (`multiple` prop) though the default shadcn recipe/examples emphasize single-select; multi-select styling (chip rendering) is not baked into `SelectValue` the way Ant's tag rendering is — it would need custom composition.

### Ant Design

- Modes: single (default), `multiple`, `tags` (tags mode allows freeform new values).
- Variants: `outlined` (default), `borderless`, `filled`, `underlined`.
- Sizes: `large`, `middle` (default), `small`.
- Status: `error`, `warning`.
- States: `open`/closed, `disabled`, `loading` (spinner in the popup/suffix), focused, searchable (`showSearch`).

## 4. Accessibility

### shadcn/ui (via Base UI, default tab)

- Base UI's own docs page for Select does not publish a dedicated ARIA-role table or a keyboard-interaction table (verified directly — the page ends at the API reference with no separate "Accessibility" section). The shadcn page in turn just links out to that same Base UI reference rather than adding its own.
- Structurally the pattern follows the standard "select-only" listbox pattern: the trigger acts as a button that opens a popup; the popup content behaves as a listbox with options. Expect (not explicitly documented, but implied by structure and general ARIA select-widget conventions): trigger has `aria-haspopup`/`aria-expanded`, popup/list has listbox semantics, items have option semantics.
- Documented behavior that _is_ explicit: basic keyboard typeahead ("find items by focusing" by typing characters) and Escape closing the popup. No full key-by-key table is provided — stating this explicitly rather than fabricating one, per instructions.
- Invalid state is communicated via `aria-invalid` on the trigger, matching the pattern used by Input/Textarea/Checkbox in this same docs generation.

### Ant Design

- No dedicated ARIA/accessibility documentation section on the Select page (consistent with the rest of Ant's docs, which are generally thinner on accessibility than Base UI/Radix).
- `status="error"|"warning"` is a purely visual signal; nothing on the page states it also sets `aria-invalid`.
- Given Select is a heavily custom-rendered (non-native) widget, verify actual rendered ARIA attributes in the DOM rather than assuming — undocumented gaps here are real risk areas (typeahead, `aria-activedescendant` vs. real focus movement, `aria-multiselectable` for `mode="multiple"`).

## 5. Design tokens

### shadcn/ui

No Select-specific custom properties exist. Global CSS variables it draws on:

- `--popover` / `--popover-foreground` — the dropdown popup surface and text
- `--border` — trigger and popup border
- `--ring` — focus ring on the trigger
- `--accent` / `--accent-foreground` — hovered/highlighted option background
- `--destructive` — invalid state (`aria-invalid`)
- `--radius` — corner radius on trigger and popup

### Ant Design (component-level Design Token, from the Select docs page)

| Token                             | Description                                          | Default value         |
| --------------------------------- | ---------------------------------------------------- | --------------------- |
| `activeBorderColor`               | Border color when active/focused                     | `#1677ff`             |
| `activeOutlineColor`              | Outline/shadow color when active                     | `rgba(5,145,255,0.1)` |
| `clearBg`                         | Background of the clear button                       | `#ffffff`             |
| `hoverBorderColor`                | Border color on hover                                | `#4096ff`             |
| `multipleItemBg`                  | Background of a selected tag (multiple/tags mode)    | `rgba(0,0,0,0.06)`    |
| `multipleItemBorderColor`         | Border color of a selected tag                       | `transparent`         |
| `multipleItemBorderColorDisabled` | Border color of a disabled tag                       | `transparent`         |
| `multipleItemColorDisabled`       | Text color of a disabled tag                         | `rgba(0,0,0,0.25)`    |
| `multipleItemHeight`              | Height of a tag                                      | `24`                  |
| `multipleItemHeightLG`            | Height of a tag (large select)                       | `32`                  |
| `multipleItemHeightSM`            | Height of a tag (small select)                       | `16`                  |
| `multipleSelectorBgDisabled`      | Background of the whole selector when disabled       | `rgba(0,0,0,0.04)`    |
| `optionActiveBg`                  | Background of the actively-highlighted option        | `rgba(0,0,0,0.04)`    |
| `optionFontSize`                  | Font size of an option                               | `14`                  |
| `optionHeight`                    | Height of an option row                              | `32`                  |
| `optionLineHeight`                | Line height of an option row                         | `1.5714285714285714`  |
| `optionPadding`                   | Padding of an option row                             | `5px 12px`            |
| `optionSelectedBg`                | Background of the selected option                    | `#e6f4ff`             |
| `optionSelectedColor`             | Text color of the selected option                    | `rgba(0,0,0,0.88)`    |
| `optionSelectedFontWeight`        | Font weight of the selected option                   | `600`                 |
| `selectorBg`                      | Background of the selector box itself                | `#ffffff`             |
| `showArrowPaddingInlineEnd`       | Extra inline-end padding reserved for the arrow icon | `18`                  |
| `singleItemHeightLG`              | Height of the single-select content row (large)      | `40`                  |
| `zIndexPopup`                     | z-index of the popup                                 | `1050`                |

Derived from global Seed/Alias tokens: `colorPrimary` (→ `activeBorderColor`/`activeOutlineColor`), `colorBgContainer` (→ `selectorBg`/`clearBg`), `colorBgContainerDisabled` (→ `multipleSelectorBgDisabled`), `colorPrimaryBg`-style alias (→ `optionSelectedBg`), `controlHeight`/`sizeStep`/`sizeUnit` (→ `optionHeight`, `multipleItemHeight*`, `singleItemHeightLG`), `fontSize`/`lineHeight` (→ `optionFontSize`/`optionLineHeight`), `zIndexPopupBase` (→ `zIndexPopup`).

## 6. Notes for andes-ng implementation

- This is the first component in this batch that genuinely needs a dedicated behavior primitive in `@andes-ng/primitives`. Recommend an `AndesListboxPrimitive` (or `AndesSelectPrimitive`) covering: roving-tabindex/active-item management inside the popup, typeahead-by-character, open/close state machine, and a shared floating/positioning primitive (trigger-relative placement + collision handling + `Portal`-equivalent) reusable by Select, Combobox, and any future Dropdown/Menu component. Positioning is the biggest net-new surface area — nothing in the existing `AndesButtonPrimitive` covers it.
- Token mapping: `--andes-color-popover`/`--andes-color-popover-foreground` (existing) for the popup surface, `--andes-color-border`/`--andes-color-input` for the trigger border, `--andes-color-focus-ring` for the focus ring, `--andes-color-accent`/`--andes-color-accent-hover` for the highlighted/hovered option. **Gap**: andes-ng has no distinct "selected option" token — Ant clearly separates `optionActiveBg` (hover/keyboard-active) from `optionSelectedBg` (the chosen option, tinted with the primary color). Consider adding something like `--andes-color-selected-bg` derived from `--andes-color-primary` at low opacity, rather than overloading `--andes-color-accent` for both roles.
- Multi-select tag/chip styling has no andes-ng token today (Ant's `multipleItemBg`, `multipleItemHeight*`). If multi-select is in scope for v1, `--andes-color-secondary` is the closest existing candidate for the tag background but would need a dedicated review since it's currently tuned for the Secondary button variant, not a small pill.
- Accessibility pitfall to flag explicitly for the Angular implementation: ARIA attributes (`aria-expanded`, `aria-haspopup`, `aria-activedescendant`, `aria-invalid`) must land on the actual focusable trigger element (a real `<button>`), not on a non-interactive custom-element host — this is exactly the bug class already found and fixed in `AndesButton`, and Select's compound nature (host component → inner trigger) makes it easy to repeat. Also: if the popup is rendered into a CDK/Portal overlay outside the component's DOM subtree, `aria-controls`/`aria-activedescendant` need explicit `id` wiring since implicit containment no longer holds once content is portaled to `document.body`.
