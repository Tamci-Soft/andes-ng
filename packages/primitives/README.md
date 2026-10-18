# @andes-ng/primitives

Andes NG's own accessible, unstyled Angular behavior directives — the layer `@andes-ng/ui` builds components on top of.

Grown incrementally: a primitive is added here only when an `@andes-ng/ui` component needs it, never speculatively ahead of one.

## Viewport

Signals for "how big is it" and "what does the environment prefer", with the server guard, the missing-API guard and the teardown written once. Everything is a no-op on the server and where `ResizeObserver` / `matchMedia` do not exist, and every listener is removed with the owning injector.

| API                                                                                                      | Answers                                                                                              |
| -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `andesElementSize(target, options?)`                                                                     | An element's `width`, `height` (and `size`, `measured`) as signals.                                  |
| `andesContainerBreakpoint(target, buckets, options?)`                                                    | Which named width bucket an element currently falls in.                                              |
| `andesMediaQuery(query, options?)`                                                                       | Whether a media query matches.                                                                       |
| `andesPrefersReducedMotion()`, `andesPrefersDark()`, `andesPrefersContrast()`                            | Ready-made user-preference queries.                                                                  |
| `AndesBreakpoints`                                                                                       | The viewport breakpoint (`active`) and `up(name)`, `down(name)`, `between(from, to)` signals.        |
| `ANDES_BREAKPOINTS`, `ANDES_BREAKPOINT_NAMES`, `andesBreakpointForWidth`, `ANDES_BREAKPOINT_SSR_DEFAULT` | The shared breakpoint table (`xs 0`, `sm 576`, `md 768`, `lg 992`, `xl 1200`, `xxl 1600`).           |
| `AndesResizeObserver`                                                                                    | The shared observer behind `andesElementSize`, for callers that need a callback instead of a signal. |

```ts
@Component({
  selector: 'app-chart',
  template: `
    <div #frame><canvas [attr.width]="size.width()"></canvas></div>
    @if (!reducedMotion()) {
      <app-sparkle />
    }
    @if (isMobile()) {
      <app-drawer-toggle />
    }
  `,
})
export class Chart {
  private readonly frame = viewChild.required<ElementRef<HTMLElement>>('frame');

  // Re-observes if `frame` is re-created; stops with the component.
  protected readonly size = andesElementSize(this.frame);

  // Collapses on the element's own width, not the window's.
  protected readonly layout = andesContainerBreakpoint(
    this.frame,
    { compact: 0, full: 480 },
    { initial: 'full' },
  );

  protected readonly reducedMotion = andesPrefersReducedMotion();
  protected readonly isMobile = inject(AndesBreakpoints).down('md');
}
```

Behavior worth knowing:

- **One observer, one write per frame.** All elements share a native `ResizeObserver` (created with the first subscription, disconnected with the last). Bursts of changes are reduced to the latest size and delivered in one animation frame; the very first measurement is delivered immediately so the first paint is already correct.
- **`measured` vs. the `initial` size.** Before the browser reports a size (and always on the server) the signals hold `options.initial` (`0 x 0` by default). `measured()` tells a real zero from "not measured yet", and is reset when the element goes away or is swapped.
- **Breakpoint comparisons are half-open.** `up('md')` is true from 768px; `down('md')` is true strictly below it, so `down(x)` is always `!up(x)` and `between('sm', 'lg')` includes `sm` and excludes `lg`. Chained `between` ranges neither overlap nor leave gaps.
- **Server default.** Without a viewport, `AndesBreakpoints.active` is `ANDES_BREAKPOINT_SSR_DEFAULT` (`lg`); override the token to match your most common client. `andesMediaQuery` takes an `ssrDefault`.
- **Container buckets** map a name to the minimum width where it starts (the same shape as `ANDES_BREAKPOINTS`), and the signal changes only when a threshold is crossed. Pass a signal of buckets when the thresholds come from inputs.
- `andesMediaQuery` accepts a `Signal<string>` for queries that depend on an input and moves its listener when the query changes. Each call owns one listener; use `AndesBreakpoints` for viewport widths, which is shared by the whole application.

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
