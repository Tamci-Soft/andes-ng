# @andes-ng/primitives

Andes NG's own accessible, unstyled Angular behavior directives and signals: the layer `@andes-ng/ui` builds its components on. They set no styling and no ARIA beyond the pattern they implement, so they can also be used on their own.

## What is in the package

| Primitive                                           | What it does                                                                                        | Used today by                 |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------- |
| `AndesButtonPrimitive`                              | Disabled state and anchor click prevention for button-like elements                                 | `AndesButton`                 |
| `AndesOverlayPrimitive` (+ trigger, content, close) | Portal, anchored or centered positioning, focus handling, inert background, exit animation          | Panels in upcoming components |
| `AndesListNavigation`                               | Roving tabindex or `aria-activedescendant` keyboard navigation with typeahead                       | Upcoming components           |
| [Choice group](#choice-group)                       | One tab stop, arrow keys, single or multiple selection for radio, tabs, toggle and listbox patterns | Upcoming components           |
| [Tree navigation](#tree-navigation)                 | Keyboard model of trees, cascaders and menus                                                        | Upcoming components           |
| [Viewport](#viewport)                               | Element size, media query and breakpoint signals                                                    | Upcoming components           |
| [Form control](#form-control)                       | `ControlValueAccessor` base that works with reactive, template-driven and signal forms              | Upcoming components           |
| [Selection model](#selection-model)                 | Single, multiple and checked-tree selection signals                                                 | Upcoming components           |

Everything is exported from `@andes-ng/primitives`.

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
