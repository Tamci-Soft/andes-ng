# @andes-ng/primitives

Andes NG's own accessible, unstyled Angular behavior directives — the layer `@andes-ng/ui` builds components on top of.

Grown incrementally: a primitive is added here only when an `@andes-ng/ui` component needs it, never speculatively ahead of one.

## Choice group

`AndesChoiceGroup` + `AndesChoiceItem` are the shared behavior of every "choose from a set" control: one tab stop, arrow keys move between items, `Space`/`Enter` (or focus itself) select. They own the selection and the roving focus, publish the ARIA that goes with them, and set no CSS. Roving focus is [`AndesListNavigation`](src/lib/listbox)'s — the group provides its own instance — so arrow keys, `Home`/`End`, wrap-around and disabled-item skipping are not re-implemented per component.

One primitive serves every pattern because the pattern is data. The group's `role` selects a role mapping:

| `role`       | item `role` | selected state  | `data-state` | selection follows focus | arrows     | deselects on re-press |
| ------------ | ----------- | --------------- | ------------ | ----------------------- | ---------- | --------------------- |
| `radiogroup` | `radio`     | `aria-checked`  | checked      | yes                     | all four   | no                    |
| `tablist`    | `tab`       | `aria-selected` | active       | yes (automatic tabs)    | horizontal | no                    |
| `toolbar`    | `button`    | `aria-pressed`  | on           | no                      | horizontal | yes                   |
| `group`      | `button`    | `aria-pressed`  | on           | no                      | horizontal | yes                   |
| `listbox`    | `option`    | `aria-selected` | selected     | no                      | vertical   | no                    |

Every column is a default: `selectionFollowsFocus`, `orientation`, `deselectable` and `roleMapping` override it per group (manual-activation tabs are `selectionFollowsFocus=false`; a vertical tablist is `orientation="vertical"`). In `multiple` mode items always toggle and moving focus never selects.

```ts
@Component({
  selector: 'app-view-switcher',
  imports: [AndesChoiceGroup, AndesChoiceItem],
  template: `
    <div
      andesChoiceGroup
      role="tablist"
      aria-label="View"
      [(value)]="view"
      [selectionFollowsFocus]="false"
      (changed)="viewChanged.emit($event)"
    >
      @for (tab of tabs; track tab.value) {
        <button
          type="button"
          andesChoiceItem
          [value]="tab.value"
          [disabled]="tab.disabled"
          [controls]="'panel-' + tab.value"
        >
          {{ tab.label }}
        </button>
      }
    </div>
  `,
})
export class ViewSwitcher {
  readonly view = model<unknown>('list');
  readonly viewChanged = output<unknown>();
}
```

- **State.** `value` is a `model()`: one item's value or `null` in `single` mode, an array in `multiple` mode. `required` stops a `single` group from being cleared (and publishes `aria-required` on roles that support it). `compareWith` compares object values. `disabled` (or `setDisabledState()` for a `ControlValueAccessor` wrapper) disables the whole group.
- **Output.** `changed` emits the new value when the _user_ changes the selection (click, `Space`/`Enter`, or navigation that selects). Writing `value` is silent, so a wrapper can tell form writes from user input. The imperative `select()`/`deselect()`/`toggle()`/`clear()` act as the user would and do emit.
- **Items** expose `selected`, `disabled` and `active` signals and the `data-state`, `data-disabled` and `data-active` host attributes as styling hooks; `[controls]` publishes `aria-controls` for a tab's panel. Put `andesChoiceItem` on the focusable element — a `<button>` also gets native `disabled`; any other element gets `aria-disabled` only.
- **Right-to-left** is read from the surrounding `dir` (CDK `Directionality`), or forced with `textDirection`.
- **Activation.** The group handles `Space`/`Enter` itself and cancels the default action, so a `<button>` does not also fire a click and a `<div role="radio">` behaves the same as a button. The tab stop returns to the selected item whenever focus leaves the group, so manual-activation tabs and toggle groups re-enter where the choice is.

### Which components should adopt this

Paths are under `packages/ui/src/lib/`.

- **`segmented/`** — `segmented.ts` `onKeydown` (filters enabled options, mirrors left/right for RTL, wraps, handles `Home`/`End`, then focuses and selects), the `tabbable` computed and `AndesSegmentedOption.tabIndex`/`button` role="radio" logic. Replace with `andesChoiceGroup role="radiogroup"` on the host and `andesChoiceItem` on the option's `<button>`; keep the sliding thumb measuring against `group.items()`/`selectedItem()`. Keep the hidden form input and `compareWith` pass-through.
- **`toggle/`** — `toggle-group.ts` (`onKeydown` focus-only roving, `tabbable`, `toggle()`, `isPressed`, the `single`/`multiple` + `allowEmpty` value rules) and `toggle.ts` `tabIndex`. Replace with `andesChoiceGroup role="group"` + `[mode]` + `[required]` (`allowEmpty` is the inverse of `required`), and `andesChoiceItem` on the inner `<button>`. A standalone `<andes-toggle>` stays as it is.
- **`tabs/`** — `tabs-trigger.ts` (the automatic-activation `effect` that selects when the trigger becomes the active item, plus its `aria-selected`/`aria-controls` bindings) and the tab-stop sync in `tabs.ts` (`syncActiveItem`, the effect around line 475). `AndesTabsList` already forwards keys to `AndesListNavigation`; swap that for `andesChoiceGroup role="tablist"` (`selectionFollowsFocus` = `activationMode() === 'automatic'`) and the trigger's `<button>` for `andesChoiceItem`. The fallback-to-first-enabled-tab rule, overflow menu, drag-reorder and editable-card removal stay in `AndesTabs`.
- **`radio-group/`** — a lower-priority adopter: it uses native `<input type="radio">`, which already provide roving focus and form participation, so there is no hand-written `keydown` to remove. Adopt only for the `optionType="button"` face if it should stop depending on hidden native inputs.

Not a fit, deliberately: **`rate/`** is a `role="slider"` over a number (`onKeydown` steps a value by 1 or 0.5, and digit keys set it) — a different pattern with no item set to choose from. **`accordion/`** triggers keep every trigger in the natural tab order and optionally move focus with the arrows (`accordion.ts` `onKeydown`); there is no selection, only `aria-expanded` per item, so it should adopt `AndesListNavigation` directly rather than this.

## Selection model

`AndesSelectionModel<T>` and `AndesCheckedTree<T, K>` hold the selection state that lists, tables, trees, transfer panes, cascaders and multi-selects each used to re-implement. They are plain signal-based classes: no DOM, no injection context, no teardown. Create one in a component field and bind its signals in the template.

### `AndesSelectionModel<T>`

```ts
readonly rows = signal<readonly Row[]>([]);

readonly selection = new AndesSelectionModel<Row>({
  mode: 'multiple',                       // or 'single'; may be a Signal
  max: this.maxSelected,                  // number | undefined; may be a Signal
  keyOf: (row) => row.id,                 // identity by key (or compareWith for custom equality)
  isDisabled: (row) => row.locked,        // blocks user changes
  onChange: (change) => {                 // { added, removed, source }
    if (change.source === 'interaction') this.selectionChange.emit(change);
  },
});

readonly headerState = computed(() => this.selection.stateOf(this.rows())); // 'none' | 'some' | 'all'

onRowClick(row: Row, event: MouseEvent) {
  const anchor = this.selection.anchor();
  if (event.shiftKey && anchor) {
    this.selection.selectRange(this.rows(), anchor, row, !this.selection.isSelected(row));
  } else {
    this.selection.toggle(row);
  }
}
```

- Signals: `selected()` (in selection order), `size()`, `isEmpty()`, `mode()`, `max()`, `anchor()`, `changes()`.
- Queries: `isSelected(item)`, `isDisabled(item)`, `stateOf(items)`, `allSelected(items)`, `someSelected(items)` (strictly partial, i.e. indeterminate).
- Interaction methods (honor `isDisabled` and `max`, report `source: 'interaction'`): `select`, `deselect`, `toggle`, `clear`, `selectAll(items)`, `deselectAll(items)`, `toggleAll(items)`, `invert(items)`, `selectRange(items, from, to, selected = true)`. Each returns whether the selection changed.
- Programmatic methods (ignore `isDisabled`, report `source: 'programmatic'`): `setSelection(items)` for form writes and two-way bindings, `retainOnly(items)` to drop entries that left the source list.
- Locked items stay put: `clear()` and "select all" never touch them, and `stateOf` ignores them so the header checkbox cannot get stuck in the mixed state.
- `mode` and `max` can be signals; narrowing them shows only the earliest items selected, so a component can bind them straight to inputs.

### `AndesCheckedTree<T, K>`

```ts
readonly tree = new AndesCheckedTree<Folder, string>({
  nodes: this.folders,                    // array or signal of root nodes
  childrenOf: (folder) => folder.children,
  keyOf: (folder) => folder.id,
  isDisabled: (folder) => folder.locked,
  strict: this.checkStrictly,             // true = no propagation; may be a Signal
});
// [checked]="tree.stateOf(id) === 'checked'"  [indeterminate]="tree.stateOf(id) === 'mixed'"
```

- Checking a node checks everything below it; a parent is checked once all its unlocked children are and is `mixed` while only some are. Unchecking clears the subtree and the ancestors that depended on the node.
- A locked node keeps its state and takes no part in propagation: a cascade neither reaches it nor anything below it, and a parent aggregates only its unlocked children. A parent whose children are all locked behaves like a leaf.
- Signals: `checked()`, `halfChecked()`, `checkedKeys()` (tree order, then keys that match no node), `overallState()`, `strict()`, `changes()`. Queries: `stateOf(key)`, `isChecked`, `isHalfChecked`, `isDisabled`, `has`, `parentKeyOf`, `childKeysOf`, `checkedKeysByStrategy('all' | 'parent' | 'child')`.
- Methods: `check`, `uncheck`, `toggle`, `checkAll`, `clear`, `setChecked(keys)` (programmatic), `prune()`.
- The value is a list of keys. Keys that match no node (a lazy branch not loaded yet, a page that is not rendered) are kept until `prune()`, and come back to life when the node reappears.
- The tree is indexed once per `nodes` change; every update is a single linear pass without recursion, so thousands of nodes (or a very deep chain) are fine. Treat nodes as immutable: replace the array or the node rather than mutating `children` in place.

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
