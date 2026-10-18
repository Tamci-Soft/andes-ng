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
