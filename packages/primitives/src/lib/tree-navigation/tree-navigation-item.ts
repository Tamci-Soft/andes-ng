import {
  afterNextRender,
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  Signal,
} from '@angular/core';

import { AndesTreeNavigation } from './tree-navigation';
import {
  AndesTreeNavigationItemRef,
  AndesTreeNavigationKey,
} from './tree-navigation-types';

let nextId = 0;

/** Accepts `undefined`, a number or a numeric attribute string; anything else means "unset". */
function optionalNumber(
  value: number | string | null | undefined,
): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Keeps "not set" distinct from `false`, so an unset input can fall back to the children. */
function optionalBoolean(
  value: boolean | string | null | undefined,
): boolean | undefined {
  return value === undefined || value === null
    ? undefined
    : booleanAttribute(value);
}

/**
 * One node of a tree governed by {@link AndesTreeNavigation}: a tree item, a menu item with a
 * submenu, a cascader option. It tells the navigation who it is (`key`), where it sits
 * (`parentKey`, or the enclosing item when items are nested in the template), whether it is
 * `disabled` or `expandable`, and in return receives everything a node needs as signals:
 * `ariaLevel`, `ariaPosinset`, `ariaSetsize`, `ariaExpanded`, `tabIndex`, `active`.
 *
 * It registers on init and unregisters on destroy, so `@if`/`@for`-driven trees and
 * windowed lists, whose items come and go as the user scrolls, need no bookkeeping.
 *
 * By default it also writes those facts to the host (`id`, `tabindex`, `aria-level`,
 * `aria-posinset`, `aria-setsize`, `aria-expanded`, `aria-disabled`, and `data-active`,
 * `data-disabled`, `data-expanded` hooks for styling). Roles and selection attributes
 * (`role="treeitem"`, `aria-selected`, `aria-checked`) stay with the consuming component.
 * Turn the ARIA attributes off with `[manageAria]="false"` when the component binds them itself.
 *
 * ```html
 * <!-- Flat rows, as a virtual list renders them -->
 * <div role="treeitem"
 *      [andesTreeNavigationItem]="row.key"
 *      [parentKey]="row.parentKey"
 *      [expandable]="row.hasChildren">
 *   {{ row.title }}
 * </div>
 *
 * <!-- Nested markup: the parent is the enclosing item -->
 * <li role="treeitem" [andesTreeNavigationItem]="'docs'">
 *   Docs
 *   <ul role="group">
 *     <li role="treeitem" [andesTreeNavigationItem]="'docs/api'">API</li>
 *   </ul>
 * </li>
 * ```
 */
@Directive({
  selector: '[andesTreeNavigationItem]',
  exportAs: 'andesTreeNavigationItem',
  host: {
    '[attr.id]': 'itemId',
    '[attr.tabindex]': 'tabIndex()',
    '[attr.aria-level]': 'manageAria() ? ariaLevel() : null',
    '[attr.aria-posinset]': 'manageAria() ? ariaPosinset() : null',
    '[attr.aria-setsize]': 'manageAria() ? ariaSetsize() : null',
    '[attr.aria-expanded]': 'manageAria() ? ariaExpanded() : null',
    '[attr.aria-disabled]': 'manageAria() && nodeDisabled() ? "true" : null',
    '[attr.data-active]': 'active() ? "" : null',
    '[attr.data-disabled]': 'nodeDisabled() ? "" : null',
    '[attr.data-expanded]': 'expanded() ? "" : null',
    '(focusin)': 'onFocusin()',
    '(focusout)': 'onFocusout($event)',
  },
})
export class AndesTreeNavigationItem
  implements AndesTreeNavigationItemRef, OnInit, OnDestroy
{
  /**
   * The node's unique key. Bound through the directive's own selector so the common case needs
   * no extra attribute: `[andesTreeNavigationItem]="node.key"`.
   */
  readonly key = input.required<AndesTreeNavigationKey>({
    alias: 'andesTreeNavigationItem',
  });

  /**
   * Key of the parent node, or `null` for a root. Leave it unset when items are nested in the
   * template, in which case the enclosing item is the parent; set it for flat markup, where
   * nesting is expressed by data rather than by the DOM.
   */
  readonly parentKey = input<AndesTreeNavigationKey | null | undefined>(
    undefined,
  );

  /** Whether navigation skips the node. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Whether the node can be expanded. Leave it unset to derive it from "has registered
   * children"; set it for a parent whose children are not rendered yet (collapsed subtrees
   * that are not in the DOM, lazily loaded children), so that `ArrowRight` can open it.
   */
  readonly expandable = input<
    boolean | undefined,
    boolean | string | null | undefined
  >(undefined, { transform: optionalBoolean });

  /**
   * Text typeahead matches against. Defaults to the item's own text content, which is usually
   * right; set it when the visible text is decorative or split across elements.
   */
  readonly typeaheadLabel = input<string>();

  /**
   * Overrides `aria-level` for trees that render only a slice of the hierarchy and so cannot
   * count ancestors. By default the level is derived from the parent chain.
   */
  readonly level = input<
    number | undefined,
    number | string | null | undefined
  >(undefined, { transform: optionalNumber });

  /** Overrides `aria-posinset`, e.g. a server-side position in a paged list of siblings. */
  readonly posInSet = input<
    number | undefined,
    number | string | null | undefined
  >(undefined, { transform: optionalNumber });

  /** Overrides `aria-setsize`, e.g. the total sibling count of a partly loaded list. */
  readonly setSize = input<
    number | undefined,
    number | string | null | undefined
  >(undefined, { transform: optionalNumber });

  /**
   * Whether the directive writes `aria-level`, `aria-posinset`, `aria-setsize`,
   * `aria-expanded` and `aria-disabled` to the host. Turn it off when the component binds
   * them itself, from the signals below.
   */
  readonly manageAria = input(true, { transform: booleanAttribute });

  /** @internal Mirrors {@link key} under the name the navigation's item contract uses. */
  readonly itemKey: Signal<AndesTreeNavigationKey> = this.key;

  /** @internal Mirrors {@link disabled} under the name the navigation's item contract uses. */
  readonly isDisabled: Signal<boolean> = this.disabled;

  /** @internal Mirrors {@link expandable} under the name the navigation's item contract uses. */
  readonly isExpandable: Signal<boolean | undefined> = this.expandable;

  private readonly navigation = inject(AndesTreeNavigation);

  /** The enclosing item of the same tree, when the markup is nested. */
  private readonly enclosingItem = inject(AndesTreeNavigationItem, {
    optional: true,
    skipSelf: true,
  });

  readonly element: HTMLElement =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** The item's DOM `id` — its own, when it has one, so authored ids are never clobbered. */
  readonly itemId: string =
    this.element.id || `andes-tree-navigation-item-${nextId++}`;

  /** @internal The parent's key as the navigation should see it. */
  readonly itemParentKey: Signal<AndesTreeNavigationKey | null> = computed(
    () => {
      const explicit = this.parentKey();
      if (explicit !== undefined) {
        return explicit;
      }
      const enclosing = this.enclosingItem;
      return enclosing && enclosing.navigation === this.navigation
        ? enclosing.key()
        : null;
    },
  );

  private readonly info = computed(() => this.navigation.nodeInfo(this.key()));

  /** Whether this is the navigation's active node. */
  readonly active: Signal<boolean> = computed(
    () => this.navigation.activeKey() === this.key(),
  );

  /** Whether the navigation treats this node as disabled. */
  readonly nodeDisabled: Signal<boolean> = computed(
    () => this.info()?.disabled ?? this.disabled(),
  );

  /** Whether the node can be expanded: declared, or because it has children. */
  readonly isExpandableNode: Signal<boolean> = computed(
    () => this.info()?.expandable ?? false,
  );

  /** Whether the node is expanded. */
  readonly expanded: Signal<boolean> = computed(() =>
    this.navigation.expandedKeys().has(this.key()),
  );

  /** `aria-level`: 1 for a root. */
  readonly ariaLevel: Signal<number> = computed(
    () => this.level() ?? this.info()?.level ?? 1,
  );

  /** `aria-posinset`: 1-based position among all siblings, collapsed ones included. */
  readonly ariaPosinset: Signal<number> = computed(
    () => this.posInSet() ?? this.info()?.posInSet ?? 1,
  );

  /** `aria-setsize`: number of siblings, this node included. */
  readonly ariaSetsize: Signal<number> = computed(
    () => this.setSize() ?? this.info()?.setSize ?? 1,
  );

  /** `aria-expanded`: `true`/`false` on a parent, `null` on a leaf (the attribute is omitted). */
  readonly ariaExpanded: Signal<boolean | null> = computed(() =>
    this.isExpandableNode() ? this.expanded() : null,
  );

  /**
   * `0` on the one roving-tabindex target, `-1` on every other node, and absent entirely in
   * `active-descendant` mode, where nodes are not focusable at all.
   */
  readonly tabIndex: Signal<number | null> = computed(() => {
    if (this.navigation.focusMode() === 'active-descendant') {
      return null;
    }
    return this.navigation.tabbableKey() === this.key() ? 0 : -1;
  });

  constructor() {
    // Runs in the browser only. By then the element is attached, which is what a node the
    // navigation reached before it mounted needs in order to take focus.
    afterNextRender(() => this.navigation.onItemRendered(this));
  }

  ngOnInit(): void {
    this.navigation.register(this);
  }

  ngOnDestroy(): void {
    this.navigation.unregister(this);
  }

  getLabel(): string {
    return this.typeaheadLabel() ?? (this.element.textContent ?? '').trim();
  }

  focus(): void {
    this.element.focus();
  }

  /**
   * Scrolls the node into view without moving focus — what `active-descendant` mode needs,
   * since real focus never reaches the node.
   */
  reveal(): void {
    this.element.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  /** Expands the node. A chevron button calls this. Returns whether anything changed. */
  expand(): boolean {
    return this.navigation.expand(this.key());
  }

  /** Collapses the node. Returns whether anything changed. */
  collapse(): boolean {
    return this.navigation.collapse(this.key());
  }

  /** Expands a collapsed node and collapses an expanded one. */
  toggle(): boolean {
    return this.navigation.toggle(this.key());
  }

  protected onFocusin(): void {
    this.navigation.onItemFocusin(this);
  }

  protected onFocusout(event: FocusEvent): void {
    this.navigation.onItemFocusout(this, event);
  }
}
