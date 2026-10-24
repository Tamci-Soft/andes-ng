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
import { AndesMenubar } from './menubar';
import type {
  AndesMenubarAlign,
  AndesMenubarClickEvent,
  AndesMenubarMenuRef,
  AndesMenubarOpenChange,
  AndesMenubarOpenChangeSource,
  AndesMenubarSelectEvent,
  AndesMenubarShowOptions,
  AndesMenubarTriggerRef,
} from './menubar-types';

const CLOSE_REASONS: Partial<
  Record<AndesMenubarOpenChangeSource, AndesOverlayCloseReason>
> = {
  'escape-key': 'escape-key',
  'outside-click': 'outside-click',
  programmatic: 'imperative',
};

/** Gap between the trigger and the panel: the bar's inner padding and border, plus a 4px gap. */
const SIDE_OFFSET = 7;

/** Rows of the root panel and of every submenu panel. */
const PANEL_SELECTOR = '.andes-dropdown-menu__content';
const SUB_PANEL_SELECTOR = '.andes-dropdown-menu__sub-content';
const SUB_TRIGGER_SELECTOR = '.andes-dropdown-menu__sub-trigger';

let nextMenuId = 0;

/**
 * One menu of a menubar: its `andes-menubar-trigger` and the items of the panel the
 * trigger opens. The items are the dropdown menu's own parts, projected straight into
 * the component - it supplies the panel itself - or described by the `items` array.
 *
 * ```html
 * <andes-menubar-menu value="edit">
 *   <andes-menubar-trigger>Edit</andes-menubar-trigger>
 *   <andes-dropdown-menu-item key="undo">
 *     Undo <andes-dropdown-menu-shortcut>⌘Z</andes-dropdown-menu-shortcut>
 *   </andes-dropdown-menu-item>
 *   <andes-dropdown-menu-separator />
 *   <andes-dropdown-menu-item key="cut">Cut</andes-dropdown-menu-item>
 * </andes-menubar-menu>
 * ```
 *
 * Providing the overlay, list navigation and the dropdown menu's root and level
 * contracts is what lets the projected parts resolve this menu through DI even though
 * they are authored as content of it.
 *
 * Inside the panel: ArrowUp/Down, Home/End and typeahead move through the items,
 * ArrowRight (ArrowLeft in RTL) opens a submenu - or, on any other item, opens the next
 * menu of the bar - and ArrowLeft goes to the previous one; Escape closes and returns
 * focus to the trigger, Tab closes and moves on.
 */
@Component({
  selector: 'andes-menubar-menu',
  exportAs: 'andesMenubarMenu',
  imports: [AndesDropdownMenuContent, AndesDropdownMenuItems],
  template: `
    <ng-content select="andes-menubar-trigger" />
    <ng-template #contentTemplate>
      <andes-dropdown-menu-content
        [attr.aria-labelledby]="triggerId()"
        [attr.dir]="panelDirection()"
      >
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
      useExisting: forwardRef(() => AndesMenubarMenu),
    },
    {
      provide: AndesDropdownMenuLevel,
      useExisting: forwardRef(() => AndesMenubarMenu),
    },
  ],
  host: {
    // Only a wrapper: the trigger must lay out as an item of the bar itself.
    style: 'display: contents',
  },
})
export class AndesMenubarMenu
  implements AndesDropdownMenuRoot, AndesDropdownMenuLevel, AndesMenubarMenuRef
{
  protected readonly overlay = inject(AndesOverlayPrimitive);
  private readonly navigation = inject(AndesListNavigation);
  private readonly bar = inject(AndesMenubar);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  private readonly contentTemplate =
    viewChild.required<TemplateRef<unknown>>('contentTemplate');

  /**
   * Identifies the menu in the bar's `value` and in `(itemClick)`'s `menu`. Generated
   * unless set.
   */
  readonly value = input(`andes-menubar-menu-${nextMenuId++}`);
  /** Whether the menu is open. Two-way bindable (`[(open)]`). */
  readonly open = model(false);
  /** Disables the menu: its trigger opens nothing, and an open menu closes. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Which end of the trigger the panel lines up with. Default `start`. */
  readonly align = input<AndesMenubarAlign>('start');
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
  readonly openStateChange = output<AndesMenubarOpenChange>();
  /** Emits when an item with a `key` is activated. */
  readonly itemClick = output<AndesMenubarClickEvent>();
  /** Emits when `selectable` is on and a key becomes selected. */
  readonly itemSelect = output<AndesMenubarSelectEvent>();
  /** Emits when `selectable` and `multiple` are on and a key is deselected. */
  readonly itemDeselect = output<AndesMenubarSelectEvent>();
  /** Emits when a submenu's trigger row is clicked (it still opens/toggles its submenu). */
  readonly submenuTriggerClick = output<AndesDropdownMenuSubmenuClickEvent>();

  /** Whether the menu is currently open. */
  readonly isOpen: Signal<boolean> = this.overlay.isOpen;
  readonly isDisabled: Signal<boolean> = computed(
    () => this.disabled() || this.bar.disabled(),
  );
  readonly isSelectable: Signal<boolean> = computed(() => this.selectable());
  readonly isMultiple: Signal<boolean> = computed(() => this.multiple());
  /** The panel hangs below the trigger; drives its entry motion. */
  readonly placementSide: Signal<AndesOverlaySide> = computed(() => 'bottom');

  private readonly triggerRef = signal<AndesMenubarTriggerRef | null>(null);
  /** @internal The trigger's id, for the panel's `aria-labelledby`. */
  protected readonly triggerId = computed(
    () => this.triggerRef()?.element.id || null,
  );

  /**
   * The panel renders under `<body>`, outside the bar, so it does not inherit a
   * direction the bar was given locally: it is handed the bar's own.
   */
  protected readonly panelDirection = signal<'ltr' | 'rtl'>('ltr');

  private readonly positioning = computed<AndesOverlayAnchoredPositioning>(
    () => ({
      kind: 'anchored',
      side: 'bottom',
      align: this.align(),
      sideOffset: SIDE_OFFSET,
      alignOffset: 0,
      flip: true,
      shift: true,
    }),
  );

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

  private closingSource: AndesMenubarOpenChangeSource | null = null;
  private syncingFromInput = false;
  private unbindOpenListeners: (() => void) | null = null;
  private destroyed = false;

  constructor() {
    this.overlay.configure({
      ...andesOverlayPreset('menu'),
      positioning: this.positioning(),
      // Both are handled below instead, so the close carries an open-change source
      // and focus is only restored when it was actually inside the menu.
      closeOnEscape: false,
      closeOnOutsideClick: false,
    });
    this.navigation.configure({
      orientation: 'vertical',
      focusMode: 'roving-tabindex',
      wrap: true,
    });

    effect(() => this.overlay.configure({ positioning: this.positioning() }));

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
            this.show({ focus: 'none', source: 'programmatic' });
          } else {
            this.hide('programmatic');
          }
        } finally {
          this.syncingFromInput = false;
        }
      });
    });

    effect(() => {
      if (this.isDisabled()) {
        untracked(() => this.hide('programmatic'));
      }
    });

    // `keydownEvents` only ever emits for the topmost overlay, so while a submenu is
    // open its own panel gets the keys, not this one.
    this.overlay.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      this.onPanelKeydown(event);
    });

    // CDK walks the overlay stack top-down and stops at the first overlay containing
    // the target, so a click inside an open submenu's panel never gets here.
    this.overlay.outsidePointerEvents
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        const target = event.target as Node | null;
        // A click on the trigger is the trigger's own business - closing here as
        // well would fight its toggle.
        if (target && this.triggerRef()?.element.contains(target)) {
          return;
        }
        this.hide('outside-click');
      });

    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe((reason) => {
      this.navigation.clearActive();
      this.unbindOpenListeners?.();
      this.unbindOpenListeners = null;
      const source =
        this.closingSource ??
        (reason === 'escape-key' || reason === 'outside-click'
          ? reason
          : 'programmatic');
      this.closingSource = null;
      this.bar.menuClosed(this);
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
    });
  }

  /**
   * Opens the menu, closing the bar's other open menu. A no-op while disabled; if the
   * menu is already open it only moves focus as asked.
   */
  show(options: AndesMenubarShowOptions = {}): void {
    const source = options.source ?? 'programmatic';
    const focus = options.focus ?? 'first';
    if (this.isDisabled()) {
      return;
    }
    if (this.overlay.isOpen()) {
      this.focusItem(focus);
      return;
    }
    this.bar.prepareOpen(this, source);
    this.panelDirection.set(this.bar.isRtl() ? 'rtl' : 'ltr');
    this.overlay.configure({
      positioning: this.positioning(),
      autoFocus: focus === 'first' ? 'first-tabbable' : 'none',
      restoreFocus: true,
    });
    this.overlay.open(this.contentTemplate());
    if (focus === 'first') {
      // The overlay's own autofocus lands on the first item without telling the list
      // navigation, so the first arrow key would only re-focus it. Making it the
      // active item once the panel has rendered lets that first key move on.
      afterNextRender(() => this.navigation.focusFirst(), {
        injector: this.injector,
      });
    } else if (focus === 'last') {
      // The overlay's own autofocus may resolve asynchronously; deferring one
      // macrotask lets this land after it instead of racing it.
      setTimeout(() => this.navigation.focusLast());
    }
    this.unbindOpenListeners = this.bindOpenListeners();
    this.bar.menuOpened(this);
    this.commit(true, source);
  }

  /** Opens the menu if closed, closes it if open. */
  toggle(): void {
    if (this.overlay.isOpen()) {
      this.hide('programmatic');
    } else {
      this.show();
    }
  }

  /** Closes the menu and every open submenu. A no-op if already closed. */
  close(): void {
    this.hide('programmatic');
  }

  /**
   * Closes the menu and every open submenu, reporting `source` through
   * `(openStateChange)`. Focus returns to the trigger when it was inside the panel,
   * unless `restoreFocus` says otherwise.
   */
  hide(
    source: AndesMenubarOpenChangeSource,
    options: { readonly restoreFocus?: boolean } = {},
  ): void {
    if (!this.overlay.isOpen()) {
      return;
    }
    // Measured before any submenu closes: removing a focused submenu item moves focus
    // to `<body>`, which would read as "focus was never in the menu".
    const restoreFocus = options.restoreFocus ?? this.focusIsInMenu();
    this.openChildSignal()?.close(false);
    this.closingSource = source;
    this.overlay.configure({ restoreFocus });
    this.overlay.close(CLOSE_REASONS[source] ?? 'trigger');
  }

  /** Moves focus to the first enabled item of the open menu. */
  focusFirstItem(): void {
    this.navigation.focusFirst();
  }

  /** Moves focus to the last enabled item of the open menu. */
  focusLastItem(): void {
    this.navigation.focusLast();
  }

  /** @internal */
  registerTrigger(trigger: AndesMenubarTriggerRef): void {
    this.triggerRef.set(trigger);
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
      const click: AndesMenubarClickEvent = {
        key,
        keyPath,
        event,
        item: this.itemIndex().get(key) ?? null,
        menu: this.value(),
      };
      this.itemClick.emit(click);
      this.bar.itemActivated(click);
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

  // A menubar menu has no hover trigger to time out.
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

  private focusItem(focus: 'first' | 'last' | 'none'): void {
    if (focus === 'first') {
      this.navigation.focusFirst();
    } else if (focus === 'last') {
      this.navigation.focusLast();
    }
  }

  /** Keys reaching the root panel (the topmost overlay), wherever focus is. */
  private onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.hide('escape-key');
      return;
    }
    const target = event.target;
    // Keys pressed on a trigger are the triggers' and the bar's. Their handlers have
    // already run - and may have just opened another menu, which is the topmost overlay
    // by the time this event reaches it - so moving the list as well would skip an item.
    if (this.bar.isTriggerTarget(target)) {
      return;
    }
    const rtl = this.bar.isRtl();
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    if (event.key === forward || event.key === backward) {
      // On a submenu's trigger row the forward key opens that submenu instead.
      if (
        event.key === forward &&
        target instanceof Element &&
        target.closest(SUB_TRIGGER_SELECTOR)
      ) {
        return;
      }
      event.preventDefault();
      this.bar.openAdjacent(this, event.key === forward ? 1 : -1);
      return;
    }
    this.navigation.onKeydown(event);
  }

  /** Reflects an open-state change onto `open` and `(openStateChange)`. */
  private commit(open: boolean, source: AndesMenubarOpenChangeSource) {
    // A change the parent made through `[open]` is not news to the parent.
    if (this.syncingFromInput || this.destroyed) {
      return;
    }
    if (untracked(this.open) !== open) {
      this.open.set(open);
    }
    this.openStateChange.emit({ open, source });
  }

  private updateSelection(click: AndesMenubarClickEvent): void {
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
   * Submenu panels are separate overlays, so their keys never reach this menu's panel.
   * The forward arrow on one of their plain items still means "next menu of the bar".
   */
  private bindOpenListeners(): () => void {
    const doc = this.document;
    const onKeydown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        !target.closest(SUB_PANEL_SELECTOR) ||
        target.closest(SUB_TRIGGER_SELECTOR)
      ) {
        return;
      }
      const forward = this.bar.isRtl() ? 'ArrowLeft' : 'ArrowRight';
      if (event.key === forward) {
        event.preventDefault();
        this.bar.openAdjacent(this, 1);
      }
    };
    doc.addEventListener('keydown', onKeydown);
    return () => doc.removeEventListener('keydown', onKeydown);
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
