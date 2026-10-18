import {
  AndesOverlayPrimitive,
  andesOverlayPreset,
  provideAndesOverlay,
} from '@andes-ng/primitives';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  type TemplateRef,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import { isRtlElement, MENU_LIST_SELECTOR, navigableRows } from './menu-dom';
import { AndesMenuNodes } from './menu-nodes';
import { AndesSubMenu } from './sub-menu';
import {
  ANDES_MENU,
  ANDES_MENU_LEVEL,
  ANDES_MENU_OVERFLOW_KEY,
  type AndesMenuClickEvent,
  type AndesMenuContext,
  type AndesMenuEntry,
  type AndesMenuExpandIconContext,
  type AndesMenuLevel,
  type AndesMenuMode,
  type AndesMenuNode,
  type AndesMenuOpenChangeEvent,
  type AndesMenuSelectEvent,
  type AndesMenuSize,
  type AndesMenuSubRef,
  type AndesMenuTheme,
  type AndesMenuTriggerAction,
  type AndesMenuUnit,
} from './menu-types';

let nextMenuId = 0;

/** How long a typed prefix stays valid for type-ahead. */
const TYPEAHEAD_RESET_MS = 500;
/** Delay before the collapsed rail's tooltip appears when none is showing yet. */
const TOOLTIP_DELAY_MS = 100;
/** How long the tooltip lingers after the pointer leaves, so moving to the next row swaps it instantly. */
const TOOLTIP_GRACE_MS = 60;

/**
 * A navigation or command menu: vertical, horizontal bar or inline (expanding)
 * list, with nested submenus, groups, dividers, selection and a collapsible icon rail.
 *
 * Build it from components,
 *
 * ```html
 * <andes-menu mode="inline" [(selectedKeys)]="selected" [(openKeys)]="open">
 *   <andes-menu-item key="home">Home</andes-menu-item>
 *   <andes-sub-menu key="reports" label="Reports">
 *     <andes-menu-item key="daily">Daily</andes-menu-item>
 *   </andes-sub-menu>
 * </andes-menu>
 * ```
 *
 * or from data with `items`. Both render the same components.
 *
 * ## Keyboard
 *
 * One tab stop for the whole menu (roving `tabindex`). Up / Down move between rows,
 * Home / End jump to the first / last, a printable character jumps to the next row
 * starting with it. Right opens a submenu (Left closes it and returns to its row; both
 * flip in RTL). In a horizontal bar Left / Right move along the bar and Down / Up
 * open a submenu. Enter or Space activates, Escape closes the open popup and Tab
 * leaves the menu.
 *
 * ## Semantics
 *
 * By default the list is a `menu` / `menubar` and selectable items are
 * `menuitemradio` / `menuitemcheckbox`. With `navigation` the menu is a labelled
 * `navigation` landmark of links and disclosure buttons, the selected link is
 * `aria-current="page"` and every row is a normal tab stop.
 */
@Component({
  selector: 'andes-menu',
  imports: [AndesMenuNodes, AndesSubMenu],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    provideAndesOverlay(),
    { provide: ANDES_MENU, useExisting: forwardRef(() => AndesMenu) },
    {
      provide: ANDES_MENU_LEVEL,
      useFactory: (): AndesMenuLevel =>
        inject(forwardRef(() => AndesMenu)).rootLevel,
    },
  ],
  host: {
    class: 'andes-menu',
    'data-slot': 'menu',
    '[attr.data-mode]': 'mode()',
    '[attr.data-size]': 'size()',
    '[attr.data-collapsed]': 'collapsed() ? "" : null',
    '[attr.data-navigation]': 'navigation() ? "" : null',
    '[attr.data-andes-theme]': 'theme() === "dark" ? "dark" : null',
    '[attr.role]': 'navigation() ? "navigation" : null',
    '[attr.aria-label]': 'navigation() ? ariaLabel() : null',
  },
})
export class AndesMenu implements AndesMenuContext {
  /** Data-driven entries; rendered after any projected entries. */
  readonly items = input<readonly AndesMenuNode[]>([]);
  /** `vertical`, `horizontal` or `inline`. */
  readonly mode = input<AndesMenuMode>('vertical');
  /** `dark` re-scopes the tokens to their dark values on the menu and its popups. */
  readonly theme = input<AndesMenuTheme>('light');
  /** Row height: sm 24px, md 32px, lg 40px. */
  readonly size = input<AndesMenuSize>('md');
  /** Folds an `inline` menu into an icon rail; submenus then open as popups. */
  readonly inlineCollapsed = input(false, { transform: booleanAttribute });
  /** Extra start padding in px per nesting level of an `inline` menu. */
  readonly inlineIndent = input(24, { transform: numberAttribute });
  /** Whether activating an item selects it. */
  readonly selectable = input(true, { transform: booleanAttribute });
  /** Allow several selected items; activating a selected item deselects it. */
  readonly multiple = input(false, { transform: booleanAttribute });
  /**
   * Site-navigation semantics: a `navigation` landmark, links with
   * `aria-current="page"`, disclosure buttons for submenus and ordinary tab stops.
   */
  readonly navigation = input(false, { transform: booleanAttribute });
  /** Accessible name of the list, or of the landmark with `navigation`. */
  readonly ariaLabel = input<string | null>(null);
  /** What opens a popup submenu from a pointer. */
  readonly triggerSubMenuAction = input<AndesMenuTriggerAction>('hover');
  /** Milliseconds before a hovered submenu opens. */
  readonly subMenuOpenDelay = input(0, { transform: numberAttribute });
  /** Milliseconds a hover-opened submenu waits before closing once the pointer left. */
  readonly subMenuCloseDelay = input(100, { transform: numberAttribute });
  /** Replaces the submenu chevron. The context's `$implicit` is the open state. */
  readonly expandIcon = input<TemplateRef<AndesMenuExpandIconContext> | null>(
    null,
  );
  /** Replaces the "…" trigger of the horizontal overflow submenu. */
  readonly overflowedIndicator = input<TemplateRef<unknown> | null>(null);
  /** Accessible name of the overflow trigger. */
  readonly overflowLabel = input('More');
  /** Keeps every item in the horizontal bar instead of collapsing the ones that do not fit. */
  readonly disableOverflow = input(false, { transform: booleanAttribute });
  /** In an inline menu, opening a submenu closes its open siblings. */
  readonly accordion = input(false, { transform: booleanAttribute });
  /** Shows the label tooltip on the collapsed rail. */
  readonly collapsedTooltips = input(true, { transform: booleanAttribute });

  /** Keys of the selected items. */
  readonly selectedKeys = model<readonly string[]>([]);
  /** Keys of the open submenus (expanded inline, or open as popups). */
  readonly openKeys = model<readonly string[]>([]);

  /** Emitted when an item is activated, selectable or not. */
  readonly itemClick = output<AndesMenuClickEvent>();
  /** Emitted when an item becomes selected. */
  readonly itemSelected = output<AndesMenuSelectEvent>();
  /** Emitted when a selected item is deselected (`multiple` menus). */
  readonly itemDeselected = output<AndesMenuSelectEvent>();
  /** Emitted when a submenu opens or closes. */
  readonly openChange = output<AndesMenuOpenChangeEvent>();

  readonly instanceId = `andes-menu-${nextMenuId++}`;
  readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly overflowKey = ANDES_MENU_OVERFLOW_KEY;

  private readonly destroyRef = inject(DestroyRef);
  private readonly tooltipOverlay = inject(AndesOverlayPrimitive);
  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  private readonly tooltipTemplate = viewChild<TemplateRef<unknown>>('tip');

  readonly rootLevel: AndesMenuLevel = {
    depth: 0,
    sub: null,
    inPopup: signal(false).asReadonly(),
    isRoot: true,
  };

  readonly collapsed = computed(
    () => this.mode() === 'inline' && this.inlineCollapsed(),
  );
  readonly popupSubmenus = computed(
    () => this.mode() !== 'inline' || this.inlineCollapsed(),
  );
  readonly triggerAction = this.triggerSubMenuAction;
  readonly openDelay = this.subMenuOpenDelay;
  readonly closeDelay = this.subMenuCloseDelay;
  readonly overflowIndicator = this.overflowedIndicator;

  protected readonly listRole = computed(() => {
    if (this.navigation()) {
      return null;
    }
    return this.mode() === 'horizontal' ? 'menubar' : 'menu';
  });

  private readonly entriesSignal = signal<readonly AndesMenuEntry[]>([]);
  readonly entries = this.entriesSignal.asReadonly();
  private readonly unitsSignal = signal<readonly AndesMenuUnit[]>([]);
  private readonly overflowSubSignal = signal<AndesMenuSubRef | null>(null);
  readonly overflowSub = this.overflowSubSignal.asReadonly();
  private readonly overflowUnitsSignal = signal<readonly AndesMenuUnit[]>([]);
  readonly overflowUnits = this.overflowUnitsSignal.asReadonly();
  private readonly tabStopSignal = signal<string | null>(null);
  readonly tabStopId = this.tabStopSignal.asReadonly();
  protected readonly tooltipText = signal('');

  private readonly selectedSet = computed(() => new Set(this.selectedKeys()));
  private readonly openSet = computed(() => new Set(this.openKeys()));

  private readonly layoutVersion = signal(0);
  private readonly unitWidths = new WeakMap<AndesMenuUnit, number>();
  private indicatorWidth = 40;
  private resizeObserver: ResizeObserver | null = null;

  private typeBuffer = '';
  private typeTimer: ReturnType<typeof setTimeout> | undefined;
  private tooltipTimer: ReturnType<typeof setTimeout> | undefined;
  private tooltipHideTimer: ReturnType<typeof setTimeout> | undefined;
  private stashedOpenKeys: readonly string[] | null = null;
  private popupModeSeen = false;

  constructor() {
    this.tooltipOverlay.configure({
      ...andesOverlayPreset('tooltip'),
      restoreFocus: false,
      closeOnOutsideClick: false,
      closeOnEscape: false,
    });

    // Popups and inline panels are different views of the same open state; hand
    // the state over cleanly when the menu switches between them.
    effect(() => {
      const popup = this.popupSubmenus();
      untracked(() => {
        const first = !this.popupModeSeen;
        this.popupModeSeen = true;
        if (first && (!popup || this.openKeys().length === 0)) {
          return;
        }
        if (popup) {
          this.stashedOpenKeys = this.openKeys();
          this.openKeys.set([]);
        } else if (this.stashedOpenKeys) {
          this.openKeys.set(this.stashedOpenKeys);
          this.stashedOpenKeys = null;
        }
      });
    });

    // The roving tab stop must always point at a row that exists and can be focused.
    afterRenderEffect(() => {
      this.entries();
      this.selectedKeys();
      this.openKeys();
      this.mode();
      this.navigation();
      this.layoutVersion();
      this.items();
      untracked(() => this.ensureTabStop());
    });

    // Horizontal bar: move what does not fit into the overflow submenu.
    afterRenderEffect(() => {
      this.layoutVersion();
      this.unitsSignal();
      this.mode();
      this.size();
      this.disableOverflow();
      this.items();
      this.updateOverflow();
    });

    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() =>
        this.layoutVersion.update((version) => version + 1),
      );
      this.resizeObserver = observer;
      const list = this.list()?.nativeElement;
      if (list) {
        observer.observe(list);
      }
      for (const unit of this.unitsSignal()) {
        observer.observe(unit.host);
      }
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    this.destroyRef.onDestroy(() => {
      clearTimeout(this.typeTimer);
      clearTimeout(this.tooltipTimer);
      clearTimeout(this.tooltipHideTimer);
    });
  }

  // ---------------------------------------------------------------- public API

  /** Moves focus to the menu's tab stop (the selected item, else the first row). */
  focus(): void {
    this.ensureTabStop();
    const id = this.tabStopSignal();
    const entry = this.entries().find((candidate) => candidate.id === id);
    entry?.row()?.focus();
  }

  /** Opens the submenu with this key. */
  openSubMenu(key: string): void {
    this.subByKey(key)?.open();
  }

  /** Closes the submenu with this key and every submenu inside it. */
  closeSubMenu(key: string): void {
    this.subByKey(key)?.close();
  }

  /** Closes every open popup submenu. */
  closeAllPopups(): void {
    if (!this.popupSubmenus()) {
      return;
    }
    const open = this.openKeys();
    if (open.length === 0) {
      return;
    }
    for (const entry of this.entries()) {
      entry.sub?.cancelTimers();
    }
    this.openKeys.set([]);
    for (const key of open) {
      this.openChange.emit({ key, open: false, openKeys: [] });
    }
  }

  // ------------------------------------------------------------ context: state

  isSelected(key: string): boolean {
    return this.selectedSet().has(key);
  }

  isOpen(key: string): boolean {
    return this.openSet().has(key);
  }

  hasSelectedDescendant(sub: AndesMenuSubRef): boolean {
    const selected = this.selectedSet();
    if (selected.size === 0) {
      return false;
    }
    return this.entries().some(
      (entry) =>
        entry.kind === 'item' &&
        selected.has(entry.key()) &&
        this.isInside(entry.level.sub, sub),
    );
  }

  keyPathOf(entry: AndesMenuEntry): readonly string[] {
    const path = [entry.key()];
    for (let sub = entry.level.sub; sub; sub = sub.level.sub) {
      path.push(sub.entry.key());
    }
    return path;
  }

  owns(node: Node | null): boolean {
    if (!node) {
      return false;
    }
    if (this.host.contains(node)) {
      return true;
    }
    const element = node instanceof Element ? node : node.parentElement;
    return !!element?.closest(
      `.andes-menu__popup[data-menu="${this.instanceId}"]`,
    );
  }

  isRtl(element: Element): boolean {
    return isRtlElement(element);
  }

  // ------------------------------------------------------- context: registries

  registerEntry(entry: AndesMenuEntry): void {
    this.entriesSignal.update((entries) => [...entries, entry]);
  }

  unregisterEntry(entry: AndesMenuEntry): void {
    this.entriesSignal.update((entries) =>
      entries.filter((candidate) => candidate !== entry),
    );
  }

  registerUnit(unit: AndesMenuUnit): void {
    this.unitsSignal.update((units) => [...units, unit]);
    this.resizeObserver?.observe(unit.host);
  }

  unregisterUnit(unit: AndesMenuUnit): void {
    this.unitsSignal.update((units) =>
      units.filter((candidate) => candidate !== unit),
    );
    this.resizeObserver?.unobserve(unit.host);
  }

  registerOverflowSub(sub: AndesMenuSubRef | null): void {
    this.overflowSubSignal.set(sub);
  }

  // --------------------------------------------------------- context: behavior

  setOpen(sub: AndesMenuSubRef, open: boolean): void {
    const key = sub.entry.key();
    const current = this.openKeys();
    let next: string[];

    if (open) {
      if (current.includes(key)) {
        return;
      }
      next = [...current];
      if (this.popupSubmenus() || this.accordion()) {
        const closing = this.subs().filter(
          (other) =>
            other !== sub &&
            other.chainParent() === sub.chainParent() &&
            current.includes(other.entry.key()),
        );
        const dropped = new Set<string>();
        for (const sibling of closing) {
          dropped.add(sibling.entry.key());
          for (const inner of this.subs()) {
            if (this.isInside(inner, sibling)) {
              dropped.add(inner.entry.key());
            }
          }
        }
        next = next.filter((candidate) => !dropped.has(candidate));
      }
      next.push(key);
    } else {
      if (!current.includes(key)) {
        return;
      }
      const dropped = new Set<string>([key]);
      for (const inner of this.subs()) {
        if (this.isInside(inner, sub)) {
          dropped.add(inner.entry.key());
        }
      }
      next = current.filter((candidate) => !dropped.has(candidate));
    }

    this.openKeys.set(next);
    this.openChange.emit({ key, open, openKeys: next });
  }

  activate(entry: AndesMenuEntry, event: Event): void {
    const key = entry.key();
    const keyPath = this.keyPathOf(entry);
    this.itemClick.emit({ key, keyPath, event });

    if (this.selectable()) {
      const selected = this.isSelected(key);
      if (this.multiple()) {
        const next = selected
          ? this.selectedKeys().filter((candidate) => candidate !== key)
          : [...this.selectedKeys(), key];
        this.selectedKeys.set(next);
        const payload = { key, keyPath, selectedKeys: next, event };
        (selected ? this.itemDeselected : this.itemSelected).emit(payload);
      } else if (!selected) {
        this.selectedKeys.set([key]);
        this.itemSelected.emit({ key, keyPath, selectedKeys: [key], event });
      }
    }

    if (entry.inPopup()) {
      const topRow = this.topRowOf(entry);
      this.closeAllPopups();
      topRow?.focus({ preventScroll: true });
    }
  }

  rowPointerEntered(entry: AndesMenuEntry): void {
    if (this.triggerAction() !== 'hover' || !this.popupSubmenus()) {
      return;
    }
    const parent = this.chainParentOf(entry);
    for (const sub of this.subs()) {
      if (sub !== entry.sub && sub.isOpen() && sub.chainParent() === parent) {
        sub.scheduleClose();
      }
    }
  }

  rowFocused(entry: AndesMenuEntry): void {
    if (!this.navigation() && !entry.inPopup()) {
      this.tabStopSignal.set(entry.id);
    }
  }

  rowFocusLeft(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    // Focus moving somewhere definite outside the menu ends any open popup. A null target is
    // a click on inert space or a row being removed; outside clicks are handled separately.
    if (next && !this.owns(next) && this.openKeys().length > 0) {
      this.closeAllPopups();
    }
  }

  showTooltip(entry: AndesMenuEntry, immediate: boolean): void {
    const row = entry.row();
    const template = this.tooltipTemplate();
    if (!this.collapsed() || !this.collapsedTooltips() || !row || !template) {
      return;
    }
    clearTimeout(this.tooltipTimer);
    clearTimeout(this.tooltipHideTimer);
    const show = () => {
      this.tooltipText.set(entry.tooltipText());
      this.tooltipOverlay.registerAnchor(row);
      const positioning = {
        kind: 'anchored',
        side: 'right',
        align: 'center',
        sideOffset: 8,
      } as const;
      this.tooltipOverlay.configure({ positioning: { ...positioning } });
      if (!this.tooltipOverlay.isOpen()) {
        this.tooltipOverlay.open(template);
      }
    };
    if (immediate || this.tooltipOverlay.isOpen()) {
      show();
    } else {
      this.tooltipTimer = setTimeout(show, TOOLTIP_DELAY_MS);
    }
  }

  hideTooltip(): void {
    clearTimeout(this.tooltipTimer);
    this.tooltipTimer = undefined;
    clearTimeout(this.tooltipHideTimer);
    if (this.tooltipOverlay.isOpen()) {
      this.tooltipHideTimer = setTimeout(
        () => this.tooltipOverlay.close('imperative'),
        TOOLTIP_GRACE_MS,
      );
    }
  }

  // ------------------------------------------------------------------ keyboard

  keydown(entry: AndesMenuEntry, event: KeyboardEvent): void {
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }
    const row = event.currentTarget as HTMLElement;
    const rtl = this.isRtl(row);
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    const sub = entry.sub;
    const inPopup = entry.inPopup();
    const bar = this.mode() === 'horizontal' && !inPopup;
    const list = row.closest(MENU_LIST_SELECTOR);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (bar) {
          sub?.open('first');
        } else {
          this.moveWithin(list, row, 1);
        }
        return;
      case 'ArrowUp':
        event.preventDefault();
        if (bar) {
          sub?.open('last');
        } else {
          this.moveWithin(list, row, -1);
        }
        return;
      case forward:
        if (bar) {
          event.preventDefault();
          this.moveWithin(list, row, 1);
        } else if (sub) {
          event.preventDefault();
          if (sub.isOpen()) {
            sub.focusRowIn('first');
          } else {
            sub.open('first');
          }
        } else if (inPopup) {
          this.moveAlongBar(entry, 1, event);
        }
        return;
      case backward:
        if (bar) {
          event.preventDefault();
          this.moveWithin(list, row, -1);
        } else if (inPopup) {
          this.leavePopup(entry, event);
        } else if (sub?.isOpen() && !sub.usesPopup()) {
          event.preventDefault();
          sub.close();
        } else if (entry.level.sub) {
          event.preventDefault();
          entry.level.sub.entry.row()?.focus();
        }
        return;
      case 'Home':
      case 'End': {
        event.preventDefault();
        const rows = navigableRows(list);
        (event.key === 'Home' ? rows[0] : rows[rows.length - 1])?.focus();
        return;
      }
      case 'Enter':
      case ' ':
        if (event.key === 'Enter' && row.tagName === 'A') {
          return;
        }
        event.preventDefault();
        if (sub) {
          if (sub.usesPopup()) {
            sub.open('first');
          } else {
            sub.toggle();
          }
        } else {
          row.click();
        }
        return;
      case 'Escape': {
        const owner = this.popupOwner(entry);
        if (inPopup && owner) {
          event.preventDefault();
          owner.close();
          owner.entry.row()?.focus();
        } else if (this.popupSubmenus() && this.openKeys().length > 0) {
          event.preventDefault();
          this.closeAllPopups();
        }
        return;
      }
      case 'Tab':
        if (!this.navigation() && this.popupSubmenus()) {
          const top = inPopup ? this.topRowOf(entry) : null;
          this.closeAllPopups();
          // Focus the row the popups hang from before the browser moves on, so Tab
          // continues from the menu rather than from a panel that is going away.
          top?.focus({ preventScroll: true });
        }
        return;
      default:
        if (event.key.length === 1) {
          this.typeahead(event.key, list, row);
        }
    }
  }

  // ------------------------------------------------------------------- helpers

  private subs(): AndesMenuSubRef[] {
    return this.entries()
      .map((entry) => entry.sub)
      .filter((sub): sub is AndesMenuSubRef => !!sub);
  }

  private subByKey(key: string): AndesMenuSubRef | undefined {
    return this.subs().find((sub) => sub.entry.key() === key);
  }

  /** Whether `inner` is `outer` or hangs below it in the open chain. */
  private isInside(
    inner: AndesMenuSubRef | null,
    outer: AndesMenuSubRef,
  ): boolean {
    for (let sub = inner; sub; sub = sub.chainParent()) {
      if (sub === outer) {
        return true;
      }
    }
    return false;
  }

  /** The submenu whose popup an entry's siblings share. */
  private chainParentOf(entry: AndesMenuEntry): AndesMenuSubRef | null {
    return entry.level.sub ?? (entry.inPopup() ? this.overflowSub() : null);
  }

  /** The submenu whose popup panel the entry renders in, if any. */
  private popupOwner(entry: AndesMenuEntry): AndesMenuSubRef | null {
    return entry.inPopup() ? this.chainParentOf(entry) : null;
  }

  /** The bar (or rail) row the chain of popups containing `entry` hangs from. */
  private topRowOf(entry: AndesMenuEntry): HTMLElement | null {
    let sub = this.chainParentOf(entry);
    while (sub?.chainParent()) {
      sub = sub.chainParent();
    }
    return sub?.entry.row() ?? null;
  }

  private moveWithin(
    list: Element | null,
    row: HTMLElement,
    delta: 1 | -1,
  ): void {
    const rows = navigableRows(list);
    if (rows.length === 0) {
      return;
    }
    const index = rows.indexOf(row);
    const target = rows[(index + delta + rows.length) % rows.length];
    target?.focus();
  }

  /** Right arrow on a leaf inside a bar's first popup: on to the next bar item. */
  private moveAlongBar(
    entry: AndesMenuEntry,
    delta: 1 | -1,
    event: KeyboardEvent,
  ): void {
    const owner = this.popupOwner(entry);
    const barSub = this.barAncestor(owner);
    if (!barSub || this.mode() !== 'horizontal') {
      return;
    }
    event.preventDefault();
    const barRow = barSub.entry.row();
    const rows = navigableRows(this.list()?.nativeElement ?? null);
    const index = barRow ? rows.indexOf(barRow) : -1;
    if (index < 0 || rows.length === 0) {
      return;
    }
    const target = rows[(index + delta + rows.length) % rows.length];
    barSub.close();
    target.focus();
    const targetEntry = this.entries().find(
      (candidate) => candidate.id === target.id,
    );
    targetEntry?.sub?.open('first');
  }

  private leavePopup(entry: AndesMenuEntry, event: KeyboardEvent): void {
    const owner = this.popupOwner(entry);
    if (!owner) {
      return;
    }
    event.preventDefault();
    if (this.mode() === 'horizontal' && !owner.entry.inPopup()) {
      this.moveAlongBar(entry, -1, event);
      return;
    }
    owner.close();
    owner.entry.row()?.focus();
  }

  /** The bar-level submenu at the top of an open chain. */
  private barAncestor(sub: AndesMenuSubRef | null): AndesMenuSubRef | null {
    let current = sub;
    while (current?.chainParent()) {
      current = current.chainParent();
    }
    return current;
  }

  private typeahead(
    char: string,
    list: Element | null,
    row: HTMLElement,
  ): void {
    clearTimeout(this.typeTimer);
    this.typeBuffer += char.toLowerCase();
    this.typeTimer = setTimeout(
      () => (this.typeBuffer = ''),
      TYPEAHEAD_RESET_MS,
    );
    const rows = navigableRows(list);
    if (rows.length === 0) {
      return;
    }
    const start = rows.indexOf(row) + (this.typeBuffer.length === 1 ? 1 : 0);
    for (let step = 0; step < rows.length; step++) {
      const candidate = rows[(start + step + rows.length) % rows.length];
      const entry = this.entries().find((item) => item.id === candidate.id);
      if (entry?.text().toLowerCase().startsWith(this.typeBuffer)) {
        candidate.focus();
        return;
      }
    }
  }

  private ensureTabStop(): void {
    if (this.navigation()) {
      return;
    }
    const rows = navigableRows(this.list()?.nativeElement ?? null);
    if (rows.length === 0) {
      this.tabStopSignal.set(null);
      return;
    }
    const current = this.tabStopSignal();
    if (current && rows.some((row) => row.id === current)) {
      return;
    }
    const selected = rows.find((row) => {
      const entry = this.entries().find((item) => item.id === row.id);
      return entry?.kind === 'item' && this.isSelected(entry.key());
    });
    this.tabStopSignal.set((selected ?? rows[0]).id);
  }

  private sortedUnits(): AndesMenuUnit[] {
    return [...this.unitsSignal()]
      .filter((unit) => unit.host.isConnected)
      .sort((a, b) =>
        a.host.compareDocumentPosition(b.host) &
        Node.DOCUMENT_POSITION_FOLLOWING
          ? -1
          : 1,
      );
  }

  private updateOverflow(): void {
    const list = this.list()?.nativeElement;
    const units = this.sortedUnits();
    if (this.mode() !== 'horizontal' || this.disableOverflow() || !list) {
      for (const unit of units) {
        if (unit.overflowed()) {
          unit.overflowed.set(false);
        }
      }
      this.setOverflowUnits([]);
      return;
    }

    for (const unit of units) {
      if (!unit.overflowed()) {
        const width = unit.host.getBoundingClientRect().width;
        if (width > 0) {
          this.unitWidths.set(unit, width);
        }
      }
    }
    // A unit that was never rendered has no known width: show everything once so it can be measured.
    const unmeasured = units.filter(
      (unit) => unit.overflowed() && !this.unitWidths.has(unit),
    );
    if (unmeasured.length > 0) {
      for (const unit of unmeasured) {
        unit.overflowed.set(false);
      }
      return;
    }

    const overflowRow = this.overflowSub()?.entry.host;
    const measuredIndicator = overflowRow?.getBoundingClientRect().width ?? 0;
    if (measuredIndicator > 0) {
      this.indicatorWidth = measuredIndicator;
    }

    const available = list.clientWidth;
    const widths = units.map((unit) => this.unitWidths.get(unit) ?? 0);
    const total = widths.reduce((sum, width) => sum + width, 0);
    let firstHidden = units.length;
    if (total > available) {
      const room = available - this.indicatorWidth;
      let used = 0;
      firstHidden = 0;
      for (let index = 0; index < units.length; index++) {
        if (used + widths[index] > room) {
          break;
        }
        used += widths[index];
        firstHidden = index + 1;
      }
    }

    const hidden: AndesMenuUnit[] = [];
    units.forEach((unit, index) => {
      const overflowed = index >= firstHidden;
      if (unit.overflowed() !== overflowed) {
        unit.overflowed.set(overflowed);
      }
      if (overflowed) {
        hidden.push(unit);
      }
    });
    while (hidden.length > 0 && hidden[0].divider) {
      hidden.shift();
    }
    this.setOverflowUnits(hidden);
  }

  private setOverflowUnits(units: readonly AndesMenuUnit[]): void {
    const current = this.overflowUnitsSignal();
    if (
      current.length !== units.length ||
      current.some((unit, index) => unit !== units[index])
    ) {
      this.overflowUnitsSignal.set(units);
    }
  }
}
