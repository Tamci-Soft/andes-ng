# @andes-ng/primitives

Andes NG's own accessible, unstyled Angular behavior directives — the layer `@andes-ng/ui` builds components on top of.

Grown incrementally: a primitive is added here only when an `@andes-ng/ui` component needs it, never speculatively ahead of one.

## Tree navigation

`AndesTreeNavigation` is the keyboard model of every hierarchical widget: a tree, a cascading picker, a menu with fly-out submenus. It owns the order of the _visible_ nodes (collapsed subtrees are skipped), the active node, the expanded keys, the WAI-ARIA TreeView keys, and the ARIA facts each node needs. It sets no `role`, owns no selection, and never interprets `Enter` or `Space` — activation stays with the component.

Keys (mirrored for right-to-left): `ArrowDown`/`ArrowUp` move across the visible nodes; `ArrowRight` opens a collapsed parent, then steps into its first child; `ArrowLeft` closes an open parent, then steps to the parent; `Home`/`End` jump to the first/last visible node; `*` opens every sibling of the active node; typing a character moves to the next node whose label matches, across levels. Disabled nodes are skipped.

It is a DI-scoped service, so provide it from the component and let the directives find it. That also covers items rendered into an overlay, which are injector descendants but not DOM descendants.

```ts
@Component({
  selector: 'andes-file-tree',
  imports: [AndesTreeNavigationItem, AndesTreeNavigationKeys],
  providers: [AndesTreeNavigation],
  template: `
    <ul role="tree" andesTreeNavigationKeys aria-label="Files">
      @for (node of nodes(); track node.key) {
        <li
          role="treeitem"
          aria-selected="false"
          [andesTreeNavigationItem]="node.key"
          [parentKey]="node.parentKey"
          [disabled]="node.disabled"
          [hidden]="navigation.visibleIndexOf(node.key) < 0"
        >
          {{ node.title }}
        </li>
      }
    </ul>
  `,
})
export class AndesFileTree {
  protected readonly navigation = inject(AndesTreeNavigation);
  readonly nodes = input.required<readonly FileNode[]>();
  readonly expandedKeys = model<readonly string[]>([]);

  constructor() {
    this.navigation.bindExpanded(this.expandedKeys); // the component keeps owning the state
    this.navigation.expandedChange.subscribe(({ key, expanded }) => {
      if (expanded) this.loadChildren(key); // lazy trees start loading here
    });
  }
}
```

What the item gives the template, all as signals: `ariaLevel`, `ariaPosinset`, `ariaSetsize`, `ariaExpanded`, `tabIndex`, `active`, `expanded`. By default the directive also writes `id`, `tabindex`, `aria-level`, `aria-posinset`, `aria-setsize`, `aria-expanded`, `aria-disabled` and `data-active`/`data-disabled`/`data-expanded` itself; pass `[manageAria]="false"` to bind the ARIA ones from the signals instead. `aria-posinset`/`aria-setsize` count all siblings, collapsed ones included; `level`, `posInSet` and `setSize` inputs override them for partly loaded lists.

### Where the structure comes from

- **From the items** (default). Each item names its `key` and its `parentKey` — or, in nested markup, the enclosing item is the parent. DOM order is the sibling order (call `refreshOrder()` after moving existing elements). A parent whose children are not in the DOM yet (a collapsed subtree rendered with `@if`, lazily loaded children) must say `[expandable]="true"`, because there is nothing to derive it from.
- **From a node source** (`navigation.setNodes(() => nodes())`) — for virtualized trees. The data order drives everything and the nodes need not be mounted: `ArrowDown` onto a row outside the window makes it active, emits `revealRequested` with the row's index so the list can scroll, and the item takes focus the moment it mounts. Bind `[attr.tabindex]="navigation.containerTabIndex()"` on the tree so it stays reachable with Tab while the tab stop sits on an unmounted row.

### Behavior worth knowing

- **Collapse under the cursor.** If the active node ends up hidden — it was collapsed away by `collapse()`, by an arrow key, or by the consumer changing a bound expanded set — the active node moves to the nearest visible ancestor, and real focus goes with it if the tree had focus.
- **Expanded state** lives in the navigation by default (`expandedKeys`, `expand`, `collapse`, `toggle`, `expandAll`, `collapseAll`, `expandTo`). `bindExpanded(signal)` hands ownership to a signal of yours (a `Set` or an array — the shape you give is the shape written back). `expandedChange` reports navigation-driven changes only; `setExpanded` and `configure({ expanded })` are silent.
- **Focus modes.** `roving-tabindex` (default) moves real focus between items; `active-descendant` keeps focus on one element (an input, a popup) and publishes `aria-activedescendant` through `andesTreeNavigationKeys`.
- **Menus and columns.** `scope: 'level'` keeps `Up`/`Down`/`Home`/`End`/typeahead inside the active node's sibling group; `enterOnExpand` makes the open key also step into the first child (waiting for lazy children to arrive); `collapseOnLeave` closes the parent when stepping back out; `orientation: 'horizontal'` swaps the axes for a bar; `wrap` wraps within the scope.
- **Disabled.** Skipped by default (`skipDisabled`). With `skipDisabled: false` they hold focus, and `expandDisabled` decides whether the keyboard may still open them.

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
