# Adopting the primitives in components

Notes for the follow-up migrations: which components should replace their own copy of a behavior with a primitive from `@andes-ng/primitives`, which code each one drops, and the design decisions and limits of each primitive. They were part of the package README and live here because they are working notes, not usage documentation. Paths are under `packages/ui/src/lib/`.

## Choice group

### Which components should adopt this

Paths are under `packages/ui/src/lib/`.

- **`segmented/`** — `segmented.ts` `onKeydown` (filters enabled options, mirrors left/right for RTL, wraps, handles `Home`/`End`, then focuses and selects), the `tabbable` computed and `AndesSegmentedOption.tabIndex`/`button` role="radio" logic. Replace with `andesChoiceGroup role="radiogroup"` on the host and `andesChoiceItem` on the option's `<button>`; keep the sliding thumb measuring against `group.items()`/`selectedItem()`. Keep the hidden form input and `compareWith` pass-through.
- **`toggle/`** — `toggle-group.ts` (`onKeydown` focus-only roving, `tabbable`, `toggle()`, `isPressed`, the `single`/`multiple` + `allowEmpty` value rules) and `toggle.ts` `tabIndex`. Replace with `andesChoiceGroup role="group"` + `[mode]` + `[required]` (`allowEmpty` is the inverse of `required`), and `andesChoiceItem` on the inner `<button>`. A standalone `<andes-toggle>` stays as it is.
- **`tabs/`** — `tabs-trigger.ts` (the automatic-activation `effect` that selects when the trigger becomes the active item, plus its `aria-selected`/`aria-controls` bindings) and the tab-stop sync in `tabs.ts` (`syncActiveItem`, the effect around line 475). `AndesTabsList` already forwards keys to `AndesListNavigation`; swap that for `andesChoiceGroup role="tablist"` (`selectionFollowsFocus` = `activationMode() === 'automatic'`) and the trigger's `<button>` for `andesChoiceItem`. The fallback-to-first-enabled-tab rule, overflow menu, drag-reorder and editable-card removal stay in `AndesTabs`.
- **`radio-group/`** — a lower-priority adopter: it uses native `<input type="radio">`, which already provide roving focus and form participation, so there is no hand-written `keydown` to remove. Adopt only for the `optionType="button"` face if it should stop depending on hidden native inputs.

Not a fit, deliberately: **`rate/`** is a `role="slider"` over a number (`onKeydown` steps a value by 1 or 0.5, and digit keys set it) — a different pattern with no item set to choose from. **`accordion/`** triggers keep every trigger in the natural tab order and optionally move focus with the arrows (`accordion.ts` `onKeydown`); there is no selection, only `aria-expanded` per item, so it should adopt `AndesListNavigation` directly rather than this.

## Tree navigation

### Which components should adopt this

The behavior below is what each migration deletes; all paths are under `packages/ui/src/lib/`.

- `tree/tree.ts` — `onKeydown` (Up/Down/Right/Left/Home/End/`*`), `runTypeahead`, `expandSiblings`, the `activeKey`/`tabbableKey`/`visibleRows`/`visibleIndex` computeds and `focusRow`. The tree keeps selection, checking and drag-and-drop; it feeds `setNodes` from its flat rows (which also makes its virtual mode work, replacing `scrollToKey` for keyboard reveal) and binds `expandedKeys`. Its "disabled but still openable" nodes map to `skipDisabled: false` + `expandDisabled: true`.
- `tree-select/tree-select.ts` — hosts a `tree` and forwards `ArrowDown` into it (`focusTree`); it gets this behavior through `tree` and needs no keyboard code of its own beyond that hand-off.
- `cascader/cascader.ts` — `onKeydown` and `moveSibling`/`expandCursor`/`edgeNode`/`cursorColumn`: Up/Down and Home/End inside a column, Right into the next column (waiting on `ensureLoaded` for lazy columns), Left to the parent. That is `scope: 'level'`, `enterOnExpand`, `focusMode: 'active-descendant'` and a node source built from its `tree().roots`; the pending-expand bookkeeping (`pendingExpand`) goes away.
- `menu/menu.ts`, `menu/sub-menu.ts`, `menu/menu-row.ts` — `keydown` (Up/Down, `forward`/`backward` into and out of submenus, Home/End), `typeahead` with its buffer and timer, `ensureTabStop`/`tabStopSignal` and `navigableRows`. That is `scope: 'level'`, `enterOnExpand`, `collapseOnLeave`, `wrap`. Items in an inline submenu and in popup submenus share one navigation through the injector.
- `menubar/menubar.ts` (`onKeydown`, `jumpTo`, `moveFrom` over the triggers) — a flat `orientation: 'horizontal'` navigation with `Down` as the open key; `menubar/menubar-menu.ts` already forwards panel keys to a list navigation and can switch to a tree navigation per panel when the panel has fly-out submenus.
- `navigation-menu/navigation-menu.ts` — the bar handler (`forward`/`backward`, Home/End, `ArrowDown` to open content, `moveAlongBar`) and the content handler (Arrow/Home/End over `focusables`) are two flat navigations, horizontal for the bar and vertical with `wrap` for the content.
- `accordion/accordion.ts` — `onKeydown` (Up/Down/Home/End over `TRIGGER_CONTROL_SELECTOR`, wrapping): a flat vertical navigation with `wrap: true` and `typeahead: false`; expansion stays with the accordion's own item state because Enter/Space toggle it.
- `breadcrumb/breadcrumb.ts` has no arrow-key code of its own (its overflow dropdown reuses the menu), so it needs nothing until a roving toolbar-style breadcrumb is wanted: then it is a flat horizontal navigation.

## Viewport

### Which components should adopt this

Paths are in `packages/ui/src/lib/`.

Element size (`andesElementSize` / `AndesResizeObserver`), replacing a hand-written `new ResizeObserver` with its `typeof ResizeObserver` guard and `disconnect()`:

- `alert/alert.ts`: marquee track width (`track.offsetWidth` into `marqueeDistance`).
- `avatar/avatar-fallback.ts`: host and text width, to scale the fallback text to fit.
- `descriptions/descriptions.ts`: host width (`getBoundingClientRect().width`) to pick the column count.
- `steps/steps.ts`: host width against `breakpoint()` to switch to the narrow layout (a good fit for `andesContainerBreakpoint`).
- `grid/grid-row.ts`: the container breakpoint (`andesBreakpointForWidth` over `contentRect.width`); becomes `andesContainerBreakpoint(host, ANDES_BREAKPOINTS)`.
- `scroll-area/scroll-area.ts`: viewport and content boxes, to re-measure the scrollbars.
- `collapsible/collapsible-content.ts`: inner `scrollHeight`, to publish the content height variable.
- `masonry/masonry.ts`: host width, to re-run the layout (its own `requestAnimationFrame` coalescing and `window` resize listener also go away).
- `splitter/splitter.ts`: host size, to re-layout panels.
- `table/table.ts`, `card/card.ts`, `tabs/tabs.ts`, `menu/menu.ts`, `segmented/segmented.ts`: container, strip, nav and option sizes, to recompute scroll edges, fades, overflow and the thumb.
- `textarea/textarea.ts`: width/height deduped by hand against the last size (the primitive already de-duplicates).
- `select/select-trigger.ts`, `toast/toast-item.ts`, `spinner/spin.ts`, `typography/typography-base.ts`, `affix/affix.ts`: box, row, scroller and host sizes feeding re-positioning or truncation.
- `tooltip/tooltip.ts`, `hover-card/hover-card.ts`, `popover/popover-base.ts`, `tour/tour.ts`, `navigation-menu/navigation-menu.ts`: observe the floating panel or target to re-position; use `AndesResizeObserver.observe` with a callback.

Media queries (`andesMediaQuery` and the preference helpers), replacing `matchMedia` + `addEventListener('change')` + `removeEventListener`:

- `andesPrefersReducedMotion()`: `button/button.ts`, `carousel/carousel.ts` (kept in sync today), `alert/alert.ts`, `anchor/anchor.ts`, `masonry/masonry.ts`, `scroll-area/scroll-area.ts`, `statistic/countdown.ts`, `float-button/back-top.ts`, `tour/tour.ts`, `navigation-menu/navigation-menu.ts`. Most read it once with a bare `matchMedia(...)` call (some without a guard) and never update.
- `andesMediaQuery` with a width query: `pagination/pagination.ts` (`(max-width: 575.98px)`; better as `AndesBreakpoints.down('sm')`), `navigation-menu/navigation-menu.ts` (`(max-width: <mobileBreakpoint>px)` in an effect), `layout/sidebar-provider.ts` and `layout/layout-sider.ts` (`max-width: <breakpoint>px` below-breakpoint tests; `down(name)`).

Breakpoints (`AndesBreakpoints`, `ANDES_BREAKPOINTS`): `grid/breakpoints.ts` (its `AndesBreakpointService`, `ANDES_BREAKPOINTS` and `andesBreakpointForWidth` move here), `avatar/avatar-size.ts` (`injectAvatarBreakpoint` registers its own queries per avatar), and every consumer of `AndesBreakpointService.atLeast(name)` (`up(name)`).

## Form control

### Which components should adopt this

Every item below re-implements `writeValue` / `registerOnChange` / `registerOnTouched` / `setDisabledState`, a `disabledByForm` / `cvaDisabled` / `formDisabled` signal and an `isDisabled` computed of `disabled() || thatSignal()`, and a `providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(...), multi: true }]` block. Migrating deletes all of it. File names are under `packages/ui/src/lib/`.

| Component (file)                                        | Value signal                     | `writeValue` does today / what stays component-specific                                                      |
| ------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `input/input-base.ts` (`andes-input`, password, search) | `value` (`''`)                   | `null -> ''`, `String(value)`; text commits from `onInput` / `onCompositionEnd`; touched in `onBlur`         |
| `input/input-otp.ts`                                    | `value` (`''`)                   | `null -> ''`, `String(value)`; touched when focus leaves the slots                                           |
| `textarea/textarea.ts`                                  | `value` (`''`)                   | same as input; `onChange('')` on clear                                                                       |
| `mentions/mentions.ts`                                  | `value` (`''`)                   | same, plus `context.set(null)` (use `onWrite`)                                                               |
| `input-number/input-number.ts`                          | `value` (`number\|null`)         | `coerce(value)`, resets `editing`, `syncText()` (use `coerce` + `onWrite`)                                   |
| `rate/rate.ts`                                          | `value` (`0`)                    | `normalizeValue(value, total())` (use `coerce`); `onChangeFn` / `onTouchedFn` naming                         |
| `slider/slider.ts`                                      | `value` + `values` linked signal | number or array, normalized to the range; `setValues` skips equal arrays (use `equals`); touched at drag end |
| `segmented/segmented.ts`                                | `value` (`T\|null`)              | passthrough; commit + touched on pick                                                                        |
| `radio-group/radio-group.ts`                            | `value` (`T\|null`)              | passthrough; `(focusout)` -> touched                                                                         |
| `toggle/toggle-group.ts`                                | `value` (`T\|T[]\|null`)         | passthrough; single or multiple                                                                              |
| `checkbox/checkbox-group.ts`                            | `value` (`T[]`)                  | `value ?? []` (use `emptyValue` + `andesShallowArrayEquals`)                                                 |
| `select/select.ts`                                      | `value` (`unknown`)              | `value ?? ([] or null by mode)` (use `coerce`); commit, touched on select and on close                       |
| `tree-select/tree-select.ts`                            | `value`                          | `value ?? ([] or null by mode)`; touched on close                                                            |
| `cascader/cascader.ts`                                  | `value`                          | passthrough; touched on close                                                                                |
| `combobox/combobox.ts`                                  | `value` (`T\|null`)              | `value ?? null`, also resets the query text and backfill (use `onWrite`)                                     |
| `color-picker/color-picker.ts`                          | `value` (`color\|null`)          | `value ?? null`; touched on close                                                                            |
| `date-picker/date-picker.ts`                            | single or range value            | `applyValue`, clears both drafts (use `onWrite`); touched on close/blur                                      |
| `transfer/transfer.ts`                                  | `targetKeys` (`string[]`)        | `Array.isArray(v) ? [...v] : []` (use `coerce`); array `equals`                                              |
| `upload/upload-base.ts` (`upload`, dragger)             | `fileList` (`File[]`)            | `Array.isArray(v) ? v : []`; commits from many paths (add, remove, status change)                            |
| `checkbox/checkbox.ts`                                  | `checked` (`boolean`)            | `!!value`; also group participation and `indeterminate` stay in the component                                |
| `switch/switch.ts`                                      | `checked` (`boolean`)            | `!!value`; `loading` still gates the toggle                                                                  |
| `toggle/toggle.ts`                                      | `pressed` (`boolean`)            | `!!value`                                                                                                    |

The ones whose signal is not called `value` (`checkbox`, `switch`, `toggle`, `transfer`, `upload-base`) use `AndesValueAccessor` with the provider's second argument; the rest can extend `AndesFormControlBase`, except those that already extend a class (`input-base`, `upload-base`), which also use `AndesValueAccessor`.

Not covered by the primitive and left to the components: the form-field wrapper's `id` / `aria-describedby` forwarding (`form-field/form-control.ts`), which reads `NgControl` through the `andesFormControl` directive and can later read the same signals, and the page-level "submitted" rule.

### Decisions worth knowing

- `model()` cannot be written without emitting its `valueChange` output, so a form write also fires `valueChange` (it keeps a `[(value)]` binding next to a form control in sync). `commit()` and `onChange` are what tell a form about _user_ changes; use the component's own event output for user-only notifications.
- `commit()` does not check `disabled`. Whether an interaction may happen at all is the component's call, since only it knows which interactions count.
- Status updates need one change detection pass to attach. Reads before the first pass see the unbound defaults.

## Selection model

### Which components should adopt this

Each item names the duplicated code in `packages/ui/src/lib/` and what the migration replaces.

| Component                                           | Duplicated code today                                                                                                                                                                                 | Replace with                                                                                                                                                                                                                                     |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `table/table.ts`, `table/table-selection.ts`        | `selectedKeys`, `selectedSet`, `selectAllState`, `toggleSelected` with its own `rangeAnchor` and Shift slice, `toggleAllSelected`, `selectAll`, `invertSelection`, `clearSelection`, `applySelection` | An `AndesSelectionModel<AndesTableRowKey>` (`mode` from `selectionType`; `isDisabled` from the disabled controls; `stateOf(enabledKeys())`, `selectRange`, `toggleAll`, `invert`, `clear`)                                                       |
| `table/table.ts` (`selectionTree`)                  | `partialSet`, `withDescendants`, `reconcileAncestors` and the depth sort                                                                                                                              | An `AndesCheckedTree<AndesTableRowKey>` fed with the existing `childrenOf` map (keys are the nodes)                                                                                                                                              |
| `checkbox/checkbox-group-state.ts`                  | `_value`, `selectableValues`, `selectedCount`, `allSelected`, `someSelected`, `indeterminate`, `toggleItem`, `setAllSelected`                                                                         | An `AndesSelectionModel<AndesCheckboxValue>`; items still register themselves, the group passes their values to `stateOf`/`toggleAll`. Its `order()` (template order instead of click order) is not part of the model: sort, then `setSelection` |
| `transfer/transfer.ts`                              | `selectedKeys`, `selectedSet`, the per-pane `allChecked`/`someChecked`, `toggleItem`, `setListSelection`, `toggleAll`, and the `anchors` record with `selectRange`                                    | One model shared by both panes (or one per pane); `stateOf(pane.items())`, `selectRange`, `deselectAll(pane.items())`, `retainOnly` after items move                                                                                             |
| `list/list.ts`                                      | `selected` with `Object.is` matching, `toggle` for single and multiple, `selectAll`, `clearSelection`                                                                                                 | `AndesSelectionModel<unknown>` with `mode` from `selectable`; `select` for single, `toggle` for multiple                                                                                                                                         |
| `select/select.ts`, `select/select-state.ts`        | `selectedValues`, `compareWith` matching in `isSelected`/`isSelectedValue`, `maxCount` handling in the toggle path, removing a tag                                                                    | `AndesSelectionModel<unknown>` with `compareWith` and `max: maxCount`; `toggle`, `deselect` for tag removal, `setSelection` for the value input                                                                                                  |
| `tree-select/tree-select.ts`                        | `checkedSet`, `fromCheckState`, `strategy` and calls to `andesToggleCheck`/`andesCheckedKeysByStrategy`                                                                                               | The same `AndesCheckedTree` used by the embedded tree, `checkedKeysByStrategy(showCheckedStrategy)`                                                                                                                                              |
| `tree/tree.ts`, `tree/tree-utils.ts`                | `andesConductCheck`, `andesToggleCheck`, `andesCheckedKeysByStrategy`, `checkState`, `halfCheckedKeys`, `setAllChecked`, `toggleCheck`                                                                | `AndesCheckedTree` with `strict` bound to `checkStrictly`; `checked`/`halfChecked`/`checkedKeys` replace the derived sets. Note that a locked node here does not pass a cascade down even when it is itself pre-checked                          |
| `cascader/cascader.ts`, `cascader/cascader-tree.ts` | Multiple-value checking over leaves, branch aggregation and `showCheckedStrategy`/`collectTerminals`                                                                                                  | An `AndesCheckedTree<AndesCascaderNode, string>` keyed by `pathKey`, `checkedKeysByStrategy` for `showCheckedStrategy`                                                                                                                           |
| `color-picker/color-picker.ts`                      | `isPresetSelected` (single preset selection)                                                                                                                                                          | Optional: a `mode: 'single'` model if presets gain multiple selection                                                                                                                                                                            |

### Decisions and limits

- `setSelection` and `setChecked` ignore locking on purpose: a form must be able to pre-select a disabled option. Use the interaction methods for anything the user does.
- A parent aggregates only its unlocked children, so a partially locked parent can read as checked while a locked child is not. This matches how the trees behaved before; change `conduct` if a design needs locked children to count.
- With a `max` smaller than the number of selectable items, `stateOf` can never reach `all`. `toggleAll` handles it by clearing when nothing more can be added.
- Selection order is the order of selection, not the order of the source list; sort before `setSelection` when a stable order is needed.
