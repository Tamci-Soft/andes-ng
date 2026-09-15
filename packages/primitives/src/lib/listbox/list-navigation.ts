import {
  ActiveDescendantKeyManager,
  FocusKeyManager,
  ListKeyManager,
} from '@angular/cdk/a11y';
import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  Injector,
  signal,
  Signal,
} from '@angular/core';
import { Observable, Subject } from 'rxjs';

import {
  AndesListFocusMode,
  AndesListNavigationConfig,
  AndesListNavigationItemRef,
  AndesListOrientation,
  AndesListTextDirection,
} from './list-navigation-types';

/** The CDK's own typeahead debounce default, restated so consumers can reference it. */
export const ANDES_LIST_TYPEAHEAD_DEBOUNCE = 200;

/** `Node.DOCUMENT_POSITION_*` values, inlined so this file never touches the `Node` global. */
const DOCUMENT_POSITION_DISCONNECTED = 1;
const DOCUMENT_POSITION_PRECEDING = 2;
const DOCUMENT_POSITION_FOLLOWING = 4;

type ItemKeyManager = ListKeyManager<AndesListNavigationItemRef>;

/** Sorts registered items into DOM order, leaving detached items in registration order. */
function sortByDocumentOrder(
  items: readonly AndesListNavigationItemRef[],
): AndesListNavigationItemRef[] {
  return [...items].sort((a, b) => {
    const position = a.element.compareDocumentPosition(b.element);
    if (position & DOCUMENT_POSITION_DISCONNECTED) {
      return 0;
    }
    if (position & DOCUMENT_POSITION_FOLLOWING) {
      return -1;
    }
    if (position & DOCUMENT_POSITION_PRECEDING) {
      return 1;
    }
    return 0;
  });
}

/** Whether a key event is a plain printable character, i.e. typeahead input. */
function isPrintableCharacter(event: KeyboardEvent): boolean {
  return (
    event.key?.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
  );
}

/**
 * Shared list-navigation state for a listbox, menu, tablist or combobox popup: roving
 * tabindex or `aria-activedescendant` focus management, arrow-key navigation in either
 * orientation, `Home`/`End`, typeahead and disabled-item skipping.
 *
 * This is a thin, signal-shaped wrapper around Angular CDK's own `ListKeyManager` family
 * (`FocusKeyManager` for `roving-tabindex`, `ActiveDescendantKeyManager` for
 * `active-descendant`) — the key handling, typeahead buffering and wrap-around arithmetic
 * are the CDK's, not a reimplementation.
 *
 * It is a DI-scoped service, not a directive: provide it from the consuming component so
 * that every descendant item — including items rendered into a CDK overlay, which are
 * injector descendants but not DOM descendants — can inject the same instance.
 *
 * ```ts
 * @Component({
 *   selector: 'andes-tabs',
 *   providers: [AndesListNavigation],
 *   template: `
 *     <div role="tablist" andesListNavigationKeys>
 *       @for (tab of tabs(); track tab.value) {
 *         <button role="tab" type="button" andesListNavigationItem [disabled]="tab.disabled">
 *           {{ tab.label }}
 *         </button>
 *       }
 *     </div>
 *   `,
 * })
 * export class AndesTabs {
 *   protected readonly navigation = inject(AndesListNavigation);
 *
 *   constructor() {
 *     this.navigation.configure({ orientation: 'horizontal', wrap: true });
 *   }
 * }
 * ```
 *
 * What this primitive deliberately does *not* do: it owns no selection state, sets no
 * `role`/`aria-selected`/`aria-checked`, and never interprets `Enter`, `Space` or `Escape`.
 * "Active item" is focus, not selection — a component that activates on focus (Tabs in
 * automatic-activation mode) reacts to {@link activeItem} in an `effect`, while one that
 * activates manually handles `Enter`/`Space` itself.
 */
@Injectable()
export class AndesListNavigation {
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** Which arrow keys navigate. */
  readonly orientation = signal<AndesListOrientation>('vertical');
  /** Whether navigation wraps around the ends of the list. */
  readonly wrap = signal(true);
  /** Whether typing characters moves the active item. */
  readonly typeahead = signal(true);
  /** How long to wait after the last keystroke before matching. */
  readonly typeaheadDebounce = signal(ANDES_LIST_TYPEAHEAD_DEBOUNCE);
  /** Whether `Home`/`End` jump to the first/last enabled item. */
  readonly homeAndEnd = signal(true);
  /** How the active item is surfaced to assistive technology. */
  readonly focusMode = signal<AndesListFocusMode>('roving-tabindex');
  /** Text direction used to mirror horizontal arrow keys. */
  readonly textDirection = signal<AndesListTextDirection>('ltr');
  /** Whether disabled items are skipped while navigating. */
  readonly skipDisabled = signal(true);

  private readonly _items = signal<readonly AndesListNavigationItemRef[]>([]);
  /** Every registered item, in DOM order. */
  readonly items: Signal<readonly AndesListNavigationItemRef[]> =
    this._items.asReadonly();

  private readonly _activeItem = signal<AndesListNavigationItemRef | null>(
    null,
  );
  /** The active item, or `null` when nothing is active yet. */
  readonly activeItem: Signal<AndesListNavigationItemRef | null> =
    this._activeItem.asReadonly();

  private readonly _activeIndex = signal(-1);
  /** Index of the active item within {@link items}, or `-1` when nothing is active. */
  readonly activeIndex: Signal<number> = this._activeIndex.asReadonly();

  /**
   * The `id` to publish as `aria-activedescendant`, or `null` in `roving-tabindex` mode
   * (where real focus already conveys the active item).
   */
  readonly activeDescendantId: Signal<string | null> = computed(() =>
    this.focusMode() === 'active-descendant'
      ? (this._activeItem()?.itemId ?? null)
      : null,
  );

  /**
   * The single item that should carry `tabindex="0"` in `roving-tabindex` mode: the active
   * item, or — before anything is active — the first item the user can navigate to, so the
   * list is always reachable with one Tab press.
   */
  readonly rovingTabindexTarget: Signal<AndesListNavigationItemRef | null> =
    computed(() => {
      const active = this._activeItem();
      if (active && !this.shouldSkip(active)) {
        return active;
      }
      return this._items().find((item) => !this.shouldSkip(item)) ?? null;
    });

  private readonly _tabOut = new Subject<void>();
  /** Emits when `Tab` is pressed, so a menu or popup can close and hand focus back. */
  readonly tabOut: Observable<void> = this._tabOut.asObservable();

  private keyManager: ItemKeyManager | null = null;
  private keyManagerMode: AndesListFocusMode | null = null;
  private appliedTypeaheadDebounce: number | null = null;
  private destroyed = false;

  constructor() {
    this.destroyRef.onDestroy(() => {
      this.destroyed = true;
      this.keyManager?.destroy();
      this.keyManager = null;
      this._tabOut.complete();
    });
  }

  /** Applies any subset of the configuration options in one call. */
  configure(config: AndesListNavigationConfig): void {
    if (config.orientation !== undefined) {
      this.orientation.set(config.orientation);
    }
    if (config.wrap !== undefined) {
      this.wrap.set(config.wrap);
    }
    if (config.typeahead !== undefined) {
      this.typeahead.set(config.typeahead);
    }
    if (config.typeaheadDebounce !== undefined) {
      this.typeaheadDebounce.set(config.typeaheadDebounce);
    }
    if (config.homeAndEnd !== undefined) {
      this.homeAndEnd.set(config.homeAndEnd);
    }
    if (config.focusMode !== undefined) {
      this.focusMode.set(config.focusMode);
    }
    if (config.textDirection !== undefined) {
      this.textDirection.set(config.textDirection);
    }
    if (config.skipDisabled !== undefined) {
      this.skipDisabled.set(config.skipDisabled);
    }
  }

  /** Adds an item to the list. Called by {@link AndesListNavigationItem} on init. */
  register(item: AndesListNavigationItemRef): void {
    this._items.update((items) => sortByDocumentOrder([...items, item]));
  }

  /**
   * Removes an item from the list. Called by {@link AndesListNavigationItem} on destroy.
   * Removing the active item clears the active state rather than guessing a neighbour.
   */
  unregister(item: AndesListNavigationItemRef): void {
    this._items.update((items) => items.filter((entry) => entry !== item));
    // Items also unregister while the whole list is being torn down, where touching the
    // key manager would mean building one against an injector that is already gone.
    if (!this.destroyed && this._activeItem() === item) {
      this.clearActive();
    }
  }

  /**
   * Handles a `keydown` on whichever element owns keyboard focus for this list — the
   * tablist/menu in `roving-tabindex` mode, the text input in `active-descendant` mode.
   * {@link AndesListNavigationKeys} wires this up for you.
   *
   * Only navigation keys are consumed (and `preventDefault`ed); `Enter`, `Space` and
   * `Escape` are left entirely to the consumer.
   *
   * Note: this delegates to the CDK, which reads the (deprecated but universally
   * populated) `KeyboardEvent.keyCode`. Real browsers always set it; synthetic events in
   * unit tests must set it explicitly.
   */
  onKeydown(event: KeyboardEvent): void {
    const manager = this.resolveKeyManager();

    if (isPrintableCharacter(event)) {
      // Typing is off, so a character key is never ours to handle.
      if (!this.typeahead()) {
        return;
      }
      // Space activates an item; it may extend a typeahead query but must never start one.
      if (event.key === ' ' && !manager.isTyping()) {
        return;
      }
    }

    manager.onKeydown(event);
    this.syncActive(manager);
  }

  /** Moves the active item to the first enabled item. */
  focusFirst(): void {
    const manager = this.resolveKeyManager();
    manager.setFirstItemActive();
    this.syncActive(manager);
  }

  /** Moves the active item to the last enabled item. */
  focusLast(): void {
    const manager = this.resolveKeyManager();
    manager.setLastItemActive();
    this.syncActive(manager);
  }

  /** Moves the active item forwards, respecting {@link wrap} and {@link skipDisabled}. */
  focusNext(): void {
    const manager = this.resolveKeyManager();
    manager.setNextItemActive();
    this.syncActive(manager);
  }

  /** Moves the active item backwards, respecting {@link wrap} and {@link skipDisabled}. */
  focusPrevious(): void {
    const manager = this.resolveKeyManager();
    manager.setPreviousItemActive();
    this.syncActive(manager);
  }

  /** Makes a specific item active, applying the current focus mode's effects. */
  focusItem(item: AndesListNavigationItemRef | number): void {
    const manager = this.resolveKeyManager();
    manager.setActiveItem(item);
    this.syncActive(manager);
  }

  /**
   * Moves the active pointer without focusing the item — for restoring an active item
   * after the list is re-filtered, or for following a click/`focusin` that already moved
   * real focus. Being silent, it also skips scrolling the item into view; use
   * {@link focusItem} when the item should be revealed.
   */
  setActiveItemSilently(
    item: AndesListNavigationItemRef | number | null,
  ): void {
    const manager = this.resolveKeyManager();
    // `updateActiveItem` has no union overload, so the two cases have to be split.
    if (item === null || typeof item === 'number') {
      manager.updateActiveItem(item ?? -1);
    } else {
      manager.updateActiveItem(item);
    }
    this.syncActive(manager);
  }

  /** Clears the active item, e.g. when a popup closes. */
  clearActive(): void {
    this.setActiveItemSilently(null);
  }

  /** Whether a typeahead query is currently buffered. */
  isTyping(): boolean {
    return this.keyManager?.isTyping() ?? false;
  }

  /** Discards any buffered typeahead query. */
  cancelTypeahead(): void {
    this.keyManager?.cancelTypeahead();
  }

  private shouldSkip(item: AndesListNavigationItemRef): boolean {
    return this.skipDisabled() && item.isDisabled();
  }

  /**
   * Returns the CDK key manager for the current focus mode, creating it on first use and
   * rebuilding it (carrying the active item over) if the focus mode changes.
   */
  private resolveKeyManager(): ItemKeyManager {
    const mode = this.focusMode();

    if (!this.keyManager || this.keyManagerMode !== mode) {
      const previousActive = this._activeItem();
      this.keyManager?.destroy();

      const manager: ItemKeyManager =
        mode === 'active-descendant'
          ? new ActiveDescendantKeyManager<AndesListNavigationItemRef>(
              this._items,
              this.injector,
            )
          : new FocusKeyManager<AndesListNavigationItemRef>(
              this._items,
              this.injector,
            );

      // The CDK's default predicate reads a plain `item.disabled` boolean, which an item
      // directive with a signal input cannot provide — see AndesListNavigationItemRef.
      manager.skipPredicate((item) => this.shouldSkip(item));
      // Typeahead resolves asynchronously (it is debounced), so mirror its result too.
      manager.change.subscribe(() => this.syncActive(manager));
      manager.tabOut.subscribe(() => this._tabOut.next());

      this.keyManager = manager;
      this.keyManagerMode = mode;
      this.appliedTypeaheadDebounce = null;

      if (previousActive) {
        manager.updateActiveItem(previousActive);
      }
    }

    this.applyConfig(this.keyManager);
    return this.keyManager;
  }

  private applyConfig(manager: ItemKeyManager): void {
    const orientation = this.orientation();
    const horizontal = orientation === 'vertical' ? null : this.textDirection();

    manager.withWrap(this.wrap());
    manager.withVerticalOrientation(orientation !== 'horizontal');
    manager.withHorizontalOrientation(horizontal);
    manager.withHomeAndEnd(this.homeAndEnd());

    // `withTypeAhead` rebuilds the CDK's typeahead (dropping any buffered query), so only
    // call it when it has not been applied yet or the debounce actually changed. Turning
    // typeahead off is handled in `onKeydown` instead, since the CDK has no "off" switch.
    const debounce = this.typeaheadDebounce();
    if (this.typeahead() && this.appliedTypeaheadDebounce !== debounce) {
      manager.withTypeAhead(debounce);
      this.appliedTypeaheadDebounce = debounce;
    }
  }

  private syncActive(manager: ItemKeyManager): void {
    this._activeItem.set(manager.activeItem);
    this._activeIndex.set(manager.activeItemIndex ?? -1);
  }
}
