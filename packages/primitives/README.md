# @andes-ng/primitives

Andes NG's own accessible, unstyled Angular behavior directives — the layer `@andes-ng/ui` builds components on top of.

Grown incrementally: a primitive is added here only when an `@andes-ng/ui` component needs it, never speculatively ahead of one.

## Form control

`AndesFormControlBase`, `AndesValueAccessor`, `provideAndesValueAccessor` and `injectAndesControlStatus` (in `src/lib/form-control/`) are the shared plumbing of every component that holds a value and has to work inside an Angular form: `writeValue`, `registerOnChange`, `registerOnTouched`, `setDisabledState`, the `disabled` input merged with the form's disabled state, touched on blur, and the validation status the `andes-form-field` wrapper needs.

### What it guarantees

- `commit(value)` sets the signal and notifies the form **once**, and only when the value actually changed (`equals`, `Object.is` by default). Re-picking the selected option never marks the control dirty.
- `writeValue(raw)` sets the signal and never calls `onChange`, so `setValue()`, `patchValue()` and `reset()` cannot loop back into the form. `null` / `undefined` become the control's empty value (`''`, `[]`, ...) or go through a `coerce` function.
- `disabled` is the component's own input **or** the form's state. Either side can disable the control and neither can re-enable it for the other.
- `markTouched()` is forwarded on every call: a control with `updateOn: 'blur'` only publishes its pending value from that call.
- One `provideAndesValueAccessor(() => Component)` replaces the `NG_VALUE_ACCESSOR` / `forwardRef` block, and it covers `formControl`, `formControlName`, `ngModel` **and** signal forms' `[formField]`, which binds through a value accessor when one is provided.
- The control's validity is readable as signals (`invalid`, `touched`, `dirty`, `pending`, `errors`, `showError`, ...) from reactive forms, template-driven forms and signal forms alike, without the circular dependency you get from `inject(NgControl)` in a component that also provides `NG_VALUE_ACCESSOR`. The control is looked up from an effect, after construction, and follows a `[formControl]` that is re-bound to another control.

### Usage

When the value is a plain `value` model, extend the base class. It declares `value`, `disabled` and `touch`, so the subclass only renders and commits:

```ts
@Component({
  selector: 'andes-rating',
  providers: [provideAndesValueAccessor(() => AndesRating)],
  template: `
    @for (star of stars(); track star) {
      <button
        type="button"
        [disabled]="isDisabled()"
        [attr.aria-pressed]="star <= value()"
        (click)="commit(star)"
        (blur)="markTouched()"
      >
        {{ star }}
      </button>
    }
  `,
})
export class AndesRating extends AndesFormControlBase<number> {
  readonly total = input(5);
  protected readonly stars = computed(() => range(this.total()));

  protected emptyValue(): number {
    return 0;
  }

  // Optional: normalize what a form writes, and compare non-primitive values.
  protected override coerce(raw: unknown): number {
    return clamp(Number(raw ?? 0), 0, this.total());
  }
}
```

When the signal has another name (`checked`, `pressed`, `targetKeys`) or the component already extends a class, own an `AndesValueAccessor` instead and let the provider pick it, so the component's public API does not gain `writeValue` and friends:

```ts
@Component({
  selector: 'andes-switch',
  providers: [
    provideAndesValueAccessor(
      () => AndesSwitch,
      (self) => self.accessor,
    ),
  ],
})
export class AndesSwitch {
  readonly checked = model(false);
  readonly disabled = input(false, { transform: booleanAttribute });
  protected readonly accessor = new AndesValueAccessor({
    value: this.checked,
    disabled: this.disabled,
    coerce: Boolean,
  });

  protected toggle(): void {
    this.accessor.commit(!this.checked());
  }
}
```

Array and object values supply an `equals` (`andesShallowArrayEquals` for arrays) so committing an equal value is not reported. State derived from a written value that is not the value itself (the text shown in a field, a discarded draft) goes in `onWrite` (or the base class's `onWritten()`); it runs on form writes only.

The validation status lets a component paint its own error state, instead of the page binding `[aria-invalid]` by hand:

```ts
protected readonly invalid = computed(() => this.ariaInvalid() || this.status.showError());
```

`showError` is `invalid && (touched || dirty)`. It does not know about a submitted form; `AndesFormField` still owns that rule.

### Signal forms

`AndesFormControlBase` also satisfies signal forms' custom-control contract (`value` model, `disabled` input, `touch` output). A subclass that **omits** `provideAndesValueAccessor` binds to `[formField]` natively but cannot be used with reactive or template-driven forms; one that **provides** it works with all three, signal forms going through the accessor (a provided accessor wins over the contract). Components that must keep working with `formControl` / `ngModel` should provide it.

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
