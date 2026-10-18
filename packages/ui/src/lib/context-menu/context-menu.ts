import {
  AndesListNavigation,
  andesOverlayPreset,
  type AndesOverlayAnchoredPositioning,
  type AndesOverlayCloseReason,
  AndesOverlayPrimitive,
  type AndesOverlaySide,
  provideAndesOverlay,
} from '@andes-ng/primitives';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  DOCUMENT,
  effect,
  forwardRef,
  inject,
  Injector,
  input,
  model,
  numberAttribute,
  output,
  Signal,
  signal,
  TemplateRef,
  untracked,
  viewChild,
  WritableSignal,
} from '@angular/core';

import { AndesDropdownMenuContent } from '../dropdown-menu/dropdown-menu-content';
import { AndesDropdownMenuItems } from '../dropdown-menu/dropdown-menu-items';
import {
  type AndesDropdownMenuActivation,
  AndesDropdownMenuRoot,
} from '../dropdown-menu/dropdown-menu-root';
import {
  type AndesDropdownMenuItemDef,
  type AndesDropdownMenuItemOption,
  AndesDropdownMenuLevel,
  type AndesDropdownMenuSubmenuClickEvent,
  type AndesDropdownMenuSubmenuRef,
  isAndesDropdownMenuSubmenu,
} from '../dropdown-menu/dropdown-menu-types';
import type {
  AndesContextMenuClickEvent,
  AndesContextMenuOpenChange,
  AndesContextMenuOpenChangeSource,
  AndesContextMenuOpenOptions,
  AndesContextMenuPoint,
  AndesContextMenuSelectEvent,
} from './context-menu-types';

const CLOSE_REASONS: Partial<
  Record<AndesContextMenuOpenChangeSource, AndesOverlayCloseReason>
> = {
  'escape-key': 'escape-key',
  'outside-click': 'outside-click',
  programmatic: 'imperative',
};

/** Rows of the panel and of every submenu panel; scrolling inside them must not close the menu. */
const PANEL_SELECTOR = '.andes-dropdown-menu__content';

/**
 * A menu that opens where the user asks for it - at the pointer on a right-click, under
 * a held finger on touch, at the focused element from the keyboard - instead of hanging
 * off a button.
 *
 * It is the menu half of the pair; the other half is the area that opens it,
 * `[andesContextMenuTrigger]`. The menu's items are the dropdown menu's own parts
 * (`andes-dropdown-menu-item`, `-checkbox-item`, `-radio-item`, `-sub`, `-separator`,
 * `-label`, `-shortcut`, `-group`), projected straight into the component - it supplies
 * the panel itself - or described by the `items` array.
 *
 * ```html
 * <andes-context-menu (itemClick)="run($event.key, $event.context)">
 *   <div andesContextMenuTrigger class="canvas">Right-click anywhere here</div>
 *
 *   <andes-dropdown-menu-item key="paste">Paste</andes-dropdown-menu-item>
 *   <andes-dropdown-menu-separator />
 *   <andes-dropdown-menu-item key="delete" variant="destructive">Delete</andes-dropdown-menu-item>
 * </andes-context-menu>
 * ```
 *
 * The area does not have to be inside the menu: bind it to the menu instead, which lets
 * one menu serve many areas (the rows of a table, say).
 *
 * ```html
 * <andes-context-menu #rowMenu="andesContextMenu" [items]="rowActions" />
 * @for (row of rows; track row.id) {
 *   <tr [andesContextMenuTrigger]="rowMenu" [andesContextMenuContext]="row">…</tr>
 * }
 * ```
 *
 * Opening: the native menu is suppressed only inside an area, and only while neither the
 * menu nor the area is `disabled`. The panel's top-left corner sits on the pointer; when
 * it would not fit, it flips to the other side of the point and is pushed back into the
 * viewport. Focus moves to the first item (`autoFocus`), Escape, Tab, a click outside, a
 * page scroll or a window resize close it, and focus goes back to where it was.
 *
 * `providers` (not `viewProviders`) is what lets the projected items resolve the menu,
 * the overlay and the list navigation, even though they are authored as content of
 * `<andes-context-menu>` rather than inside its template.
 */
@Component({
  selector: 'andes-context-menu',
  exportAs: 'andesContextMenu',
  imports: [AndesDropdownMenuContent, AndesDropdownMenuItems],
  template: `
    <ng-content select="[andesContextMenuTrigger]" />
    <ng-template #contentTemplate>
      <andes-dropdown-menu-content>
        @if (items(); as menuItems) {
          <andes-dropdown-menu-items [items]="menuItems" />
        } @else {
          <ng-content />
        }
      </andes-dropdown-menu-content>
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideAndesOverlay(),
    AndesListNavigation,
    {
      provide: AndesDropdownMenuRoot,
      useExisting: forwardRef(() => AndesContextMenu),
    },
    {
      provide: AndesDropdownMenuLevel,
      useExisting: forwardRef(() => AndesContextMenu),
    },
  ],
  host: {
    // The component is only a wrapper: a trigger area projected into it must lay out
    // as if it were a direct child of the menu's parent.
    style: 'display: contents',
  },
})
export class AndesContextMenu
  implements AndesDropdownMenuRoot, AndesDropdownMenuLevel
{
  protected readonly overlay = inject(AndesOverlayPrimitive);
  private readonly navigation = inject(AndesListNavigation);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  private readonly contentTemplate =
    viewChild.required<TemplateRef<unknown>>('contentTemplate');

  /**
   * Whether the menu is open. Two-way bindable (`[(open)]`); a one-way `[open]` binding
   * still lets the menu close itself, the usual `model()` contract. Opening it this way
   * has no pointer, so the menu appears at the last point it was opened at, or at the top
   * left of the first area bound to it.
   */
  readonly open = model(false);
  /** Turns the menu off: nothing opens it, an open menu closes, and the native menu comes back. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * Whether opening moves focus to the first item. Default `true`; with `false` the
   * arrow keys still start from the first/last item, but focus stays where it was.
   */
  readonly autoFocus = input(true, { transform: booleanAttribute });
  /**
   * How long a touch or pen press must be held to open the menu, in ms. Default `500`;
   * `0` turns long-press off.
   */
  readonly longPressDelay = input(500, { transform: numberAttribute });
  /** Close on page scroll and window resize. Default `true`; the menu is pinned to a viewport point. */
  readonly closeOnScroll = input(true, { transform: booleanAttribute });
  /**
   * Extra class(es) on the overlay pane that holds the panel, for styling a single menu
   * from the outside (e.g. `.wide .andes-dropdown-menu__content { … }`).
   */
  readonly panelClass = input<string | readonly string[] | undefined>(
    undefined,
  );
  /**
   * Whether activating a plain item closes the menu. Unset (the default) closes it,
   * except in a `selectable` + `multiple` menu. An item's own `closeOnSelect` wins.
   * Checkbox and radio items never close the menu.
   */
  readonly closeOnSelect = input<boolean | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value === undefined || value === null
        ? undefined
        : booleanAttribute(value),
  });

  /** Data-driven menu content. When set, projected content is ignored. */
  readonly items = input<readonly AndesDropdownMenuItemDef[] | null>(null);
  /** Whether items with a `key` are selectable. Default `false`. */
  readonly selectable = input(false, { transform: booleanAttribute });
  /** Allow more than one selected key. Default `false`. */
  readonly multiple = input(false, { transform: booleanAttribute });
  /** Selected keys. Two-way bindable. */
  readonly selectedKeys = model<readonly string[]>([]);
  /** Replaces every submenu trigger's chevron. Its context's `$implicit` is the submenu's open state. */
  readonly expandIcon = input<TemplateRef<unknown> | undefined>(undefined);
  /** How submenus open. Default `'hover'` (keyboard and click always work too). */
  readonly triggerSubMenuAction = input<'hover' | 'click'>('hover');
  /** Hover-intent delay before a submenu opens, in ms. Default `100`. */
  readonly subMenuOpenDelay = input(100, { transform: numberAttribute });
  /** Grace period before a submenu closes when the pointer moves to a sibling, in ms. Default `100`. */
  readonly subMenuCloseDelay = input(100, { transform: numberAttribute });

  /** Emits every open-state change, with its source. */
  readonly openStateChange = output<AndesContextMenuOpenChange>();
  /** Emits when an item with a `key` is activated. */
  readonly itemClick = output<AndesContextMenuClickEvent>();
  /** Emits when `selectable` is on and a key becomes selected. */
  readonly itemSelect = output<AndesContextMenuSelectEvent>();
  /** Emits when `selectable` and `multiple` are on and a key is deselected. */
  readonly itemDeselect = output<AndesContextMenuSelectEvent>();
  /** Emits when a submenu's trigger row is clicked (it still opens/toggles its submenu). */
  readonly submenuTriggerClick = output<AndesDropdownMenuSubmenuClickEvent>();

  /** Whether the menu is currently open. */
  readonly isOpen: Signal<boolean> = this.overlay.isOpen;
  readonly isDisabled: Signal<boolean> = computed(() => this.disabled());
  readonly isSelectable: Signal<boolean> = computed(() => this.selectable());
  readonly isMultiple: Signal<boolean> = computed(() => this.multiple());
  /** The panel hangs below the point; drives its entry motion. */
  readonly placementSide: Signal<AndesOverlaySide> = computed(() => 'bottom');

  private readonly pointSignal = signal<AndesContextMenuPoint | null>(null);
  /** Where the menu was last opened, in viewport coordinates; `null` before the first time. */
  readonly point: Signal<AndesContextMenuPoint | null> =
    this.pointSignal.asReadonly();

  private readonly contextSignal = signal<unknown>(undefined);
  /** The context of the area the menu was opened from, while it is open. */
  readonly context: Signal<unknown> = this.contextSignal.asReadonly();

  private readonly positioning: AndesOverlayAnchoredPositioning = {
    kind: 'anchored',
    side: 'bottom',
    align: 'start',
    sideOffset: 0,
    alignOffset: 0,
    flip: true,
    shift: true,
  };

  /** `key` -> `items` entry, for `(itemClick)`'s `item`. */
  private readonly itemIndex = computed(() => {
    const index = new Map<string, AndesDropdownMenuItemOption>();
    const visit = (defs: readonly AndesDropdownMenuItemDef[]) => {
      for (const def of defs) {
        if (def.type === 'divider') {
          continue;
        }
        if (def.type === 'group' || isAndesDropdownMenuSubmenu(def)) {
          visit(def.children);
        } else {
          index.set(def.key, def);
        }
      }
    };
    visit(this.items() ?? []);
    return index;
  });

  private readonly openChildSignal = signal<AndesDropdownMenuSubmenuRef | null>(
    null,
  );
  readonly openChild = this.openChildSignal.asReadonly();

  private readonly radioGroupValues = new Map<
    string,
    WritableSignal<unknown>
  >();

  private readonly areas = new Map<HTMLElement, () => boolean>();
  private virtualAnchor: HTMLElement | null = null;
  private closingSource: AndesContextMenuOpenChangeSource | null = null;
  private syncingFromInput = false;
  private swallowClickUntil = 0;
  private unbindOpenListeners: (() => void) | null = null;
  private destroyed = false;

  constructor() {
    this.overlay.configure({
      ...andesOverlayPreset('menu'),
      positioning: this.positioning,
      autoFocus: 'first-tabbable',
      // Handled below instead, so a close carries its source and focus is only restored
      // when it was actually inside the menu. The menu is pinned to a viewport point, so
      // following scrolls would only detach it from the point it was opened at.
      closeOnEscape: false,
      closeOnOutsideClick: false,
      repositionOnScroll: false,
    });
    this.navigation.configure({
      orientation: 'vertical',
      focusMode: 'roving-tabindex',
      wrap: true,
    });

    // Only touch the pane class once the input has been used, so an unset input never
    // wipes a class configured elsewhere; clearing a set value still resets it.
    let panelClassUsed = false;
    effect(() => {
      const panelClass = this.panelClass();
      if (panelClass === undefined && !panelClassUsed) return;
      panelClassUsed = true;
      this.overlay.configure({ panelClass: panelClass ?? null });
    });

    // `[open]` -> overlay. The reverse direction (overlay -> `open`) is `commit()`.
    const openInput = computed(() => booleanAttribute(this.open()));
    effect(() => {
      const wanted = openInput();
      untracked(() => {
        if (wanted === this.overlay.isOpen()) {
          return;
        }
        this.syncingFromInput = true;
        try {
          if (wanted) {
            this.showMenu(this.fallbackPoint(), 'programmatic', {});
          } else {
            this.hide('programmatic');
          }
        } finally {
          this.syncingFromInput = false;
        }
      });
    });

    effect(() => {
      if (this.disabled()) {
        untracked(() => this.hide('programmatic'));
      }
    });

    // `keydownEvents` only ever emits for the topmost overlay, so while a submenu is
    // open its own panel gets the keys, not this one.
    this.overlay.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.hide('escape-key');
        return;
      }
      this.navigation.onKeydown(event);
    });

    // CDK walks the overlay stack top-down and stops at the first overlay containing
    // the target, so a click inside an open submenu's panel never gets here.
    this.overlay.outsidePointerEvents
      .pipe(takeUntilDestroyed())
      .subscribe((event) => this.onOutsidePointer(event));

    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe((reason) => {
      this.navigation.clearActive();
      this.unbindOpenListeners?.();
      this.unbindOpenListeners = null;
      this.releaseVirtualAnchor();
      this.contextSignal.set(undefined);
      const source =
        this.closingSource ??
        (reason === 'escape-key' || reason === 'outside-click'
          ? reason
          : 'programmatic');
      this.closingSource = null;
      this.commit(false, source);
    });

    // The panel sits at the end of `<body>` with no focus trap (menus must not trap
    // focus), so otherwise Tab would leave it open while focus has already moved on.
    this.navigation.tabOut
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.hide('tab-out'));

    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.unbindOpenListeners?.();
      this.releaseVirtualAnchor();
    });
  }

  /**
   * Opens the menu with its top-left corner at a viewport point (CSS pixels, as in a
   * pointer event's `clientX`/`clientY`). If it is already open it moves there. Does
   * nothing while `disabled`.
   */
  openAt(
    x: number,
    y: number,
    options: AndesContextMenuOpenOptions = {},
  ): void {
    this.showMenu({ x, y }, options.source ?? 'programmatic', options);
  }

  /** Opens the menu at the top-left corner of an element, as the keyboard gesture does. */
  openAtElement(
    element: Element,
    options: AndesContextMenuOpenOptions = {},
  ): void {
    const { left, top } = element.getBoundingClientRect();
    this.openAt(left, top, { source: 'keyboard', ...options });
  }

  /** Closes the menu and every open submenu. A no-op if already closed. */
  close(): void {
    this.hide('programmatic');
  }

  /** Closes the menu and every open submenu, reporting `source` through `(openStateChange)`. */
  hide(source: AndesContextMenuOpenChangeSource): void {
    if (!this.overlay.isOpen()) {
      return;
    }
    // Measured before any submenu closes: removing a focused submenu item moves focus
    // to `<body>`, which would read as "focus was never in the menu".
    const restoreFocus = this.focusIsInMenu();
    this.openChildSignal()?.close(false);
    this.closingSource = source;
    this.overlay.configure({ restoreFocus });
    this.overlay.close(CLOSE_REASONS[source] ?? 'trigger');
  }

  // ---------------------------------------------------------------------------
  // Wiring - called by `AndesContextMenuTrigger`.
  // ---------------------------------------------------------------------------

  /** @internal */
  registerArea(element: HTMLElement, isActive: () => boolean): () => void {
    this.areas.set(element, isActive);
    return () => this.areas.delete(element);
  }

  /**
   * @internal Called when a long press has opened the menu: the finger is still down
   * on the area, and the click its lift-off produces must not count as an outside
   * click that closes the menu again.
   */
  swallowNextClick(): void {
    this.swallowClickUntil = Date.now() + 1000;
  }

  /** @internal Whether a long press opened the menu moments ago. */
  openedByLongPressRecently(): boolean {
    return this.swallowClickUntil > Date.now();
  }

  // ---------------------------------------------------------------------------
  // AndesDropdownMenuRoot
  // ---------------------------------------------------------------------------

  isKeySelected(key: string): boolean {
    return this.selectedKeys().includes(key);
  }

  activateItem({
    key,
    keyPath,
    event,
    closeOnSelect,
  }: AndesDropdownMenuActivation): void {
    if (key !== undefined) {
      const click: AndesContextMenuClickEvent = {
        key,
        keyPath,
        event,
        item: this.itemIndex().get(key) ?? null,
        context: this.contextSignal(),
      };
      this.itemClick.emit(click);
      if (this.selectable()) {
        this.updateSelection(click);
      }
    }
    if (closeOnSelect) {
      this.hide('item');
    }
  }

  submenuTriggerClicked(click: AndesDropdownMenuSubmenuClickEvent): void {
    this.submenuTriggerClick.emit(click);
  }

  // The menu has no hover trigger to time out; the panels report their pointer anyway.
  pointerEntered(): void {
    // Nothing to cancel.
  }

  pointerLeft(): void {
    // Nothing to schedule.
  }

  radioGroupValue(name: string): Signal<unknown> {
    return this.radioGroupSignal(name).asReadonly();
  }

  setRadioGroupValue(name: string, value: unknown): void {
    this.radioGroupSignal(name).set(value);
  }

  // ---------------------------------------------------------------------------
  // AndesDropdownMenuLevel
  // ---------------------------------------------------------------------------

  childOpened(child: AndesDropdownMenuSubmenuRef): void {
    const current = this.openChildSignal();
    if (current && current !== child) {
      current.close(false);
    }
    this.openChildSignal.set(child);
  }

  childClosed(child: AndesDropdownMenuSubmenuRef): void {
    if (this.openChildSignal() === child) {
      this.openChildSignal.set(null);
    }
  }

  keyPath(): readonly string[] {
    return [];
  }

  // ---------------------------------------------------------------------------

  private showMenu(
    point: AndesContextMenuPoint,
    source: AndesContextMenuOpenChangeSource,
    options: AndesContextMenuOpenOptions,
  ): void {
    if (this.isDisabled()) {
      return;
    }
    const focusFirst = options.focus ?? this.autoFocus();
    this.pointSignal.set(point);
    this.contextSignal.set(options.context);

    if (this.overlay.isOpen()) {
      // A second right-click while open: the menu follows the pointer instead of
      // closing and reopening, which would flash.
      this.openChildSignal()?.close(false);
      this.placeVirtualAnchor(point);
      this.overlay.configure({ positioning: this.positioning });
      if (focusFirst) {
        this.navigation.focusFirst();
      }
      return;
    }

    const active = this.document.activeElement;
    this.placeVirtualAnchor(point);
    this.overlay.configure({
      positioning: this.positioning,
      autoFocus: focusFirst ? 'first-tabbable' : 'none',
      restoreFocus: true,
    });
    this.overlay.open(this.contentTemplate(), {
      // The anchor is a throwaway point, which cannot take focus back - return it to
      // wherever it was when the menu opened instead.
      restoreFocusTo: active instanceof HTMLElement ? active : null,
    });
    if (focusFirst) {
      // The overlay's own autofocus lands on the first item without telling the list
      // navigation, so the first arrow key would only re-focus it. Making it the
      // active item once the panel has rendered lets that first key move on.
      afterNextRender(() => this.navigation.focusFirst(), {
        injector: this.injector,
      });
    }
    this.unbindOpenListeners = this.bindOpenListeners();
    this.commit(true, source);
  }

  /** Where `[open]="true"` puts the menu when no pointer or element says otherwise. */
  private fallbackPoint(): AndesContextMenuPoint {
    const last = this.pointSignal();
    if (last) {
      return last;
    }
    const [area] = this.areas.keys();
    if (area) {
      const { left, top } = area.getBoundingClientRect();
      return { x: left, y: top };
    }
    return { x: 0, y: 0 };
  }

  private onOutsidePointer(event: MouseEvent): void {
    // A right-click on one of this menu's own areas repositions the menu instead
    // (the area's handler runs next) - closing here would only make it flash.
    if (event.type === 'contextmenu' && this.isInActiveArea(event.target)) {
      return;
    }
    // The release of the right button that opened the menu is not a click away from it.
    if (event.type === 'auxclick' && event.button === 2) {
      return;
    }
    // Likewise the lift-off after a long press, which still lands on the area.
    if (event.type === 'click' && this.swallowClickUntil > Date.now()) {
      this.swallowClickUntil = 0;
      return;
    }
    this.hide('outside-click');
  }

  private isInActiveArea(target: EventTarget | null): boolean {
    if (!(target instanceof Node)) {
      return false;
    }
    for (const [element, isActive] of this.areas) {
      if (element.contains(target) && isActive()) {
        return true;
      }
    }
    return false;
  }

  /** Reflects an open-state change onto `open` and `(openStateChange)`. */
  private commit(open: boolean, source: AndesContextMenuOpenChangeSource) {
    // A change the parent made through `[open]` is not news to the parent.
    if (this.syncingFromInput || this.destroyed) {
      return;
    }
    if (untracked(this.open) !== open) {
      this.open.set(open);
    }
    this.openStateChange.emit({ open, source });
  }

  private updateSelection(click: AndesContextMenuClickEvent): void {
    const current = this.selectedKeys();
    const { key } = click;
    if (this.multiple()) {
      if (current.includes(key)) {
        const selectedKeys = current.filter((entry) => entry !== key);
        this.selectedKeys.set(selectedKeys);
        this.itemDeselect.emit({ ...click, selectedKeys });
      } else {
        const selectedKeys = [...current, key];
        this.selectedKeys.set(selectedKeys);
        this.itemSelect.emit({ ...click, selectedKeys });
      }
      return;
    }
    // Single mode never deselects by clicking the selected item again.
    if (current.length === 1 && current[0] === key) {
      return;
    }
    const selectedKeys = [key];
    this.selectedKeys.set(selectedKeys);
    this.itemSelect.emit({ ...click, selectedKeys });
  }

  private focusIsInMenu(): boolean {
    return !!this.document.activeElement?.closest(PANEL_SELECTOR);
  }

  /**
   * Keeps the native menu out of the panels (a right-click on a row would otherwise
   * stack the browser's menu on ours) and closes the menu when the page moves under it.
   */
  private bindOpenListeners(): () => void {
    const doc = this.document;
    const view = doc.defaultView;
    const onContextMenu = (event: Event) => {
      if (
        event.target instanceof Element &&
        event.target.closest(PANEL_SELECTOR)
      ) {
        event.preventDefault();
      }
    };
    const onScroll = (event: Event) => {
      if (!this.closeOnScroll()) {
        return;
      }
      if (
        event.target instanceof Element &&
        event.target.closest(PANEL_SELECTOR)
      ) {
        return;
      }
      this.hide('scroll');
    };
    const onResize = () => {
      if (this.closeOnScroll()) {
        this.hide('scroll');
      }
    };
    doc.addEventListener('contextmenu', onContextMenu, true);
    doc.addEventListener('scroll', onScroll, true);
    view?.addEventListener('resize', onResize);
    return () => {
      doc.removeEventListener('contextmenu', onContextMenu, true);
      doc.removeEventListener('scroll', onScroll, true);
      view?.removeEventListener('resize', onResize);
    };
  }

  /**
   * The overlay primitive only anchors to elements, so the menu anchors to a zero-size,
   * fixed-position element at the point. (A point-origin option on the primitive would
   * make this unnecessary.)
   */
  private placeVirtualAnchor({ x, y }: AndesContextMenuPoint): void {
    const anchor = this.document.createElement('div');
    anchor.setAttribute('aria-hidden', 'true');
    anchor.className = 'andes-context-menu__anchor';
    anchor.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:0;height:0;pointer-events:none;`;
    this.document.body.appendChild(anchor);
    const previous = this.virtualAnchor;
    this.virtualAnchor = anchor;
    this.overlay.registerAnchor(anchor);
    previous?.remove();
  }

  private releaseVirtualAnchor(): void {
    if (!this.virtualAnchor) {
      return;
    }
    this.virtualAnchor.remove();
    this.virtualAnchor = null;
    this.overlay.registerAnchor(null);
  }

  private radioGroupSignal(name: string): WritableSignal<unknown> {
    let value = this.radioGroupValues.get(name);
    if (!value) {
      value = signal<unknown>(undefined);
      this.radioGroupValues.set(name, value);
    }
    return value;
  }
}
