import {
  AndesListNavigation,
  andesOverlayPreset,
  type AndesOverlayAlign,
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

import { AndesDropdownMenuContent } from './dropdown-menu-content';
import { AndesDropdownMenuItems } from './dropdown-menu-items';
import {
  type AndesDropdownMenuActivation,
  AndesDropdownMenuRoot,
} from './dropdown-menu-root';
import {
  type AndesDropdownMenuArrow,
  type AndesDropdownMenuClickEvent,
  type AndesDropdownMenuItemDef,
  type AndesDropdownMenuItemOption,
  AndesDropdownMenuLevel,
  type AndesDropdownMenuOpenChange,
  type AndesDropdownMenuOpenChangeSource,
  type AndesDropdownMenuPlacement,
  type AndesDropdownMenuSelectEvent,
  type AndesDropdownMenuSubmenuRef,
  type AndesDropdownMenuTriggerAction,
  isAndesDropdownMenuSubmenu,
} from './dropdown-menu-types';

const PLACEMENTS: Readonly<
  Record<
    AndesDropdownMenuPlacement,
    { readonly side: AndesOverlaySide; readonly align: AndesOverlayAlign }
  >
> = {
  top: { side: 'top', align: 'center' },
  topLeft: { side: 'top', align: 'start' },
  topRight: { side: 'top', align: 'end' },
  bottom: { side: 'bottom', align: 'center' },
  bottomLeft: { side: 'bottom', align: 'start' },
  bottomRight: { side: 'bottom', align: 'end' },
  left: { side: 'left', align: 'center' },
  leftTop: { side: 'left', align: 'start' },
  leftBottom: { side: 'left', align: 'end' },
  right: { side: 'right', align: 'center' },
  rightTop: { side: 'right', align: 'start' },
  rightBottom: { side: 'right', align: 'end' },
};

/** Gap between trigger and panel - the `menu` preset's own value. */
const SIDE_OFFSET = 4;
/** Gap with an arrow: room for the ~7px the rotated arrow sticks out, plus the usual gap. */
const ARROW_SIDE_OFFSET = 10;
/** Closest the arrow's center may get to a panel corner, so it never overlaps the radius. */
const ARROW_INSET = 14;

const CLOSE_REASONS: Partial<
  Record<AndesDropdownMenuOpenChangeSource, AndesOverlayCloseReason>
> = {
  'escape-key': 'escape-key',
  'outside-click': 'outside-click',
  programmatic: 'imperative',
};

type FocusOnOpen = 'first' | 'last' | 'none';

interface ShowOptions {
  readonly focus?: FocusOnOpen;
  /** Viewport coordinates to open at, instead of against the trigger. */
  readonly point?: { readonly x: number; readonly y: number };
}

/**
 * A menu of actions, triggered by a button, positioned relative to it and navigated
 * with the arrow keys.
 *
 * Built on the shared `@andes-ng/primitives` overlay (portal, positioning, focus-return)
 * and listbox (roving-tabindex arrow-key navigation, typeahead) primitives rather than
 * reimplementing either: this component wires the two together and provides the styled
 * anatomy (`AndesDropdownMenuContent`, `AndesDropdownMenuItem`, submenus, etc.).
 *
 * `providers` (not `viewProviders`) is what makes the overlay and navigation resolvable
 * by every sub-part, even though they are authored as *content children* of
 * `<andes-dropdown-menu>` rather than inside its own template.
 *
 * Content is either projected:
 *
 * ```html
 * <andes-dropdown-menu (itemClick)="run($event.key)">
 *   <button type="button" andesDropdownMenuTrigger>Options</button>
 *   <andes-dropdown-menu-content>
 *     <andes-dropdown-menu-item key="edit">Edit</andes-dropdown-menu-item>
 *     <andes-dropdown-menu-sub>
 *       <andes-dropdown-menu-sub-trigger>Share</andes-dropdown-menu-sub-trigger>
 *       <andes-dropdown-menu-sub-content>…</andes-dropdown-menu-sub-content>
 *     </andes-dropdown-menu-sub>
 *   </andes-dropdown-menu-content>
 * </andes-dropdown-menu>
 * ```
 *
 * or described by the `items` array, in which case nothing but the trigger is projected.
 */
@Component({
  selector: 'andes-dropdown-menu',
  imports: [AndesDropdownMenuContent, AndesDropdownMenuItems],
  template: `
    <ng-content select="[andesDropdownMenuTrigger]" />
    <ng-template #contentTemplate>
      @if (items(); as menuItems) {
        <andes-dropdown-menu-content>
          <andes-dropdown-menu-items [items]="menuItems" />
        </andes-dropdown-menu-content>
      } @else {
        <ng-content />
      }
      @if (arrowEnabled()) {
        <span class="andes-dropdown-menu__arrow" aria-hidden="true"></span>
      }
    </ng-template>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideAndesOverlay(),
    AndesListNavigation,
    {
      provide: AndesDropdownMenuRoot,
      useExisting: forwardRef(() => AndesDropdownMenu),
    },
    {
      provide: AndesDropdownMenuLevel,
      useExisting: forwardRef(() => AndesDropdownMenu),
    },
  ],
})
export class AndesDropdownMenu
  implements AndesDropdownMenuRoot, AndesDropdownMenuLevel
{
  protected readonly overlay = inject(AndesOverlayPrimitive);
  private readonly navigation = inject(AndesListNavigation);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  private readonly contentTemplate =
    viewChild.required<TemplateRef<unknown>>('contentTemplate');

  /**
   * Whether the menu is open. Two-way bindable (`[(open)]`); a one-way `[open]` binding
   * still lets the menu close itself, the usual `model()` contract.
   */
  readonly open = model(false);
  /**
   * What opens the menu - one action or several. Default `'click'`, so existing menus keep
   * their current behavior.
   */
  readonly trigger = input<
    AndesDropdownMenuTriggerAction | readonly AndesDropdownMenuTriggerAction[]
  >('click');
  /** Where the panel opens relative to the trigger. Default `'bottomLeft'`. */
  readonly placement = input<AndesDropdownMenuPlacement>('bottomLeft');
  /** Render an arrow pointing at the trigger; `{ pointAtCenter: true }` also shifts the panel so it does. */
  readonly arrow = input<AndesDropdownMenuArrow, AndesDropdownMenuArrow | ''>(
    false,
    { transform: (value) => (value === '' ? true : value) },
  );
  /** Flip/shift the panel to keep it on screen. Default `true`. */
  readonly autoAdjustOverflow = input(true, { transform: booleanAttribute });
  /** Disables the trigger: nothing opens the menu, and an open menu closes. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * Whether opening moves focus to the first item. Unset (the default) focuses on
   * click/context-menu opens and leaves focus alone on hover opens. Keyboard opens
   * (ArrowDown/ArrowUp on the trigger) always focus.
   */
  readonly autoFocus = input<boolean | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value === undefined || value === null
        ? undefined
        : booleanAttribute(value),
  });
  /** Hover-open delay in ms, for `trigger="hover"`. Default `150`. */
  readonly mouseEnterDelay = input(150, { transform: numberAttribute });
  /** Hover-close grace period in ms, for `trigger="hover"`. Default `100`. */
  readonly mouseLeaveDelay = input(100, { transform: numberAttribute });

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

  /** Emits every open-state change the user caused, with its source. */
  readonly openStateChange = output<AndesDropdownMenuOpenChange>();
  /** Emits when an item with a `key` is activated. */
  readonly itemClick = output<AndesDropdownMenuClickEvent>();
  /** Emits when `selectable` is on and a key becomes selected. */
  readonly itemSelect = output<AndesDropdownMenuSelectEvent>();
  /** Emits when `selectable` and `multiple` are on and a key is deselected. */
  readonly itemDeselect = output<AndesDropdownMenuSelectEvent>();

  /** Whether the menu is currently open. */
  readonly isOpen: Signal<boolean> = this.overlay.isOpen;
  readonly isDisabled: Signal<boolean> = computed(() => this.disabled());
  readonly isSelectable: Signal<boolean> = computed(() => this.selectable());
  readonly isMultiple: Signal<boolean> = computed(() => this.multiple());

  protected readonly arrowEnabled = computed(() => {
    const arrow = this.arrow();
    return typeof arrow === 'object' ? true : arrow;
  });

  private readonly pointAtCenterOffset = signal(0);
  private readonly triggerActions = computed(
    () => new Set<AndesDropdownMenuTriggerAction>([this.trigger()].flat()),
  );

  private readonly positioning = computed<AndesOverlayAnchoredPositioning>(
    () => {
      const { side, align } = PLACEMENTS[this.placement()];
      const adjust = this.autoAdjustOverflow();
      return {
        kind: 'anchored',
        side,
        align,
        sideOffset: this.arrowEnabled() ? ARROW_SIDE_OFFSET : SIDE_OFFSET,
        alignOffset: this.pointAtCenterOffset(),
        flip: adjust,
        shift: adjust,
      };
    },
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

  /** Where the trigger wants the panel anchored (its inner focusable, for a wrapper). */
  private triggerAnchor: HTMLElement | null = null;
  private triggerHost: HTMLElement | null = null;
  private virtualAnchor: HTMLElement | null = null;
  private closingSource: AndesDropdownMenuOpenChangeSource | null = null;
  private syncingFromInput = false;
  private hoverOpenTimer: ReturnType<typeof setTimeout> | undefined;
  private hoverCloseTimer: ReturnType<typeof setTimeout> | undefined;
  private stopArrowTracking: (() => void) | null = null;

  constructor() {
    this.overlay.configure({
      ...andesOverlayPreset('menu'),
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
            this.showMenu('programmatic', {
              focus: this.autoFocus() ? 'first' : 'none',
            });
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
      .subscribe((event) => {
        const target = event.target as Node | null;
        // A click on the trigger is the trigger's own business - closing here as well
        // would fight its toggle.
        if (target && this.triggerHost?.contains(target)) {
          return;
        }
        this.hide('outside-click');
      });

    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe((reason) => {
      this.navigation.clearActive();
      this.stopArrowTracking?.();
      this.stopArrowTracking = null;
      this.releaseVirtualAnchor();
      const source =
        this.closingSource ??
        (reason === 'escape-key' || reason === 'outside-click'
          ? reason
          : 'programmatic');
      this.closingSource = null;
      this.commit(false, source);
    });

    // Closes the menu and hands focus back when the user tabs away - the panel sits at
    // the end of `<body>` with no focus trap (correct: menus shouldn't trap focus), so
    // otherwise Tab would leave it open while focus has already moved on. Restoring
    // focus to the trigger synchronously, before the browser's own default Tab action
    // runs, makes Tab continue onward from the trigger.
    this.navigation.tabOut
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.hide('tab-out'));

    inject(DestroyRef).onDestroy(() => {
      this.clearHoverTimers();
      this.stopArrowTracking?.();
      this.releaseVirtualAnchor();
    });
  }

  /** Opens the menu. A no-op if it is already open or disabled. */
  show(): void {
    this.showMenu('programmatic', {
      focus: this.autoFocus() === false ? 'none' : 'first',
    });
  }

  /**
   * Opens the menu, focusing its last enabled item - `ArrowUp` on a closed trigger.
   * A no-op if already open.
   */
  openFocusingLast(): void {
    this.showMenu('keyboard', { focus: 'last' });
  }

  /** Closes the menu. A no-op if already closed. */
  close(): void {
    this.hide('programmatic');
  }

  /** Opens the menu if closed, closes it if open. */
  toggle(): void {
    if (this.overlay.isOpen()) {
      this.hide('programmatic');
    } else {
      this.show();
    }
  }

  /** Closes the menu and every open submenu, reporting `source` through `(openStateChange)`. */
  hide(source: AndesDropdownMenuOpenChangeSource): void {
    this.clearHoverTimers();
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
  // Trigger wiring - called by `AndesDropdownMenuTrigger`.
  // ---------------------------------------------------------------------------

  /** @internal */
  registerTrigger(host: HTMLElement, anchor: HTMLElement): void {
    this.triggerHost = host;
    this.triggerAnchor = anchor;
    if (!this.virtualAnchor) {
      this.overlay.registerAnchor(anchor);
    }
  }

  /** @internal */
  onTriggerClick(): void {
    if (this.isDisabled()) {
      return;
    }
    const actions = this.triggerActions();
    if (actions.has('click')) {
      if (this.overlay.isOpen()) {
        this.hide('trigger');
      } else {
        this.showMenu('trigger');
      }
    } else if (actions.has('hover')) {
      // A hover menu must still open for keyboard (Enter/Space click the trigger) and
      // touch users - but a click never closes it, or a mouse user who hovered and
      // then clicked would shut the menu they just opened.
      this.showMenu('trigger');
    }
  }

  /** @internal */
  onTriggerKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.showMenu('keyboard', { focus: 'first' });
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.openFocusingLast();
        break;
      default:
        break;
    }
  }

  /** @internal */
  onTriggerPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }
    this.pointerEntered();
    if (
      !this.triggerActions().has('hover') ||
      this.isDisabled() ||
      this.overlay.isOpen()
    ) {
      return;
    }
    clearTimeout(this.hoverOpenTimer);
    this.hoverOpenTimer = setTimeout(
      () => this.showMenu('hover'),
      this.mouseEnterDelay(),
    );
  }

  /** @internal */
  onTriggerPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }
    clearTimeout(this.hoverOpenTimer);
    this.hoverOpenTimer = undefined;
    this.pointerLeft();
  }

  /** @internal */
  onTriggerContextMenu(event: MouseEvent): void {
    if (!this.triggerActions().has('contextMenu')) {
      return;
    }
    event.preventDefault();
    if (this.isDisabled()) {
      return;
    }
    // The context-menu key and Shift+F10 fire `contextmenu` without a pointer
    // position; opening against the trigger is the only sensible place then.
    const fromKeyboard = event.button !== 2 && !event.clientX && !event.clientY;
    if (this.overlay.isOpen()) {
      this.hide('context-menu');
    }
    this.showMenu('context-menu', {
      point: fromKeyboard ? undefined : { x: event.clientX, y: event.clientY },
      focus: fromKeyboard ? 'first' : undefined,
    });
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
      const click: AndesDropdownMenuClickEvent = {
        key,
        keyPath,
        event,
        item: this.itemIndex().get(key) ?? null,
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

  pointerEntered(): void {
    clearTimeout(this.hoverCloseTimer);
    this.hoverCloseTimer = undefined;
  }

  pointerLeft(): void {
    if (!this.triggerActions().has('hover') || !this.overlay.isOpen()) {
      return;
    }
    clearTimeout(this.hoverCloseTimer);
    this.hoverCloseTimer = setTimeout(
      () => this.hide('hover'),
      this.mouseLeaveDelay(),
    );
  }

  /**
   * Current value of the named radio group. There is no separate radio-group
   * component - grouping is by matching `name`, the same as native radio inputs.
   */
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
    source: AndesDropdownMenuOpenChangeSource,
    options: ShowOptions = {},
  ): void {
    this.clearHoverTimers();
    if (this.overlay.isOpen() || this.isDisabled()) {
      return;
    }

    const focus = options.focus ?? this.defaultFocus(source);
    const active = this.document.activeElement;
    if (options.point) {
      this.useVirtualAnchor(options.point.x, options.point.y);
    }
    this.pointAtCenterOffset.set(
      options.point ? 0 : this.computePointAtCenterOffset(),
    );
    this.overlay.configure({
      positioning: this.positioning(),
      autoFocus: focus === 'first' ? 'first-tabbable' : 'none',
      restoreFocus: true,
    });
    this.overlay.open(this.contentTemplate(), {
      // A context menu is anchored to a throwaway point, which cannot take focus
      // back - return it to wherever it was when the menu opened instead.
      restoreFocusTo:
        options.point && active instanceof HTMLElement ? active : null,
    });

    if (focus === 'last') {
      // The overlay's own autofocus may resolve asynchronously; deferring one
      // macrotask lets this land after it instead of racing it.
      setTimeout(() => this.navigation.focusLast());
    }
    if (this.arrowEnabled()) {
      this.trackArrow();
    }
    this.commit(true, source);
  }

  private defaultFocus(source: AndesDropdownMenuOpenChangeSource): FocusOnOpen {
    const autoFocus = this.autoFocus();
    if (autoFocus !== undefined) {
      return autoFocus ? 'first' : 'none';
    }
    return source === 'hover' || source === 'programmatic' ? 'none' : 'first';
  }

  /** Reflects an open-state change onto `open` and `(openStateChange)`. */
  private commit(open: boolean, source: AndesDropdownMenuOpenChangeSource) {
    // A change the parent made through `[open]` is not news to the parent.
    if (this.syncingFromInput) {
      return;
    }
    if (untracked(this.open) !== open) {
      this.open.set(open);
    }
    this.openStateChange.emit({ open, source });
  }

  private updateSelection(click: AndesDropdownMenuClickEvent): void {
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
    // Single mode never deselects by clicking the selected item again, so re-picking the
    // current choice is harmless.
    if (current.length === 1 && current[0] === key) {
      return;
    }
    const selectedKeys = [key];
    this.selectedKeys.set(selectedKeys);
    this.itemSelect.emit({ ...click, selectedKeys });
  }

  private focusIsInMenu(): boolean {
    const active = this.document.activeElement;
    return !!active?.closest('.andes-dropdown-menu__content');
  }

  private clearHoverTimers(): void {
    clearTimeout(this.hoverOpenTimer);
    clearTimeout(this.hoverCloseTimer);
    this.hoverOpenTimer = undefined;
    this.hoverCloseTimer = undefined;
  }

  /**
   * `{ pointAtCenter: true }`: shift the panel along its alignment axis so the arrow
   * (which otherwise sits `ARROW_INSET` from the aligned edge) lands on the trigger's
   * center. Centered placements already point at the center.
   */
  private computePointAtCenterOffset(): number {
    const arrow = this.arrow();
    const anchor = this.triggerAnchor;
    if (typeof arrow !== 'object' || !arrow.pointAtCenter || !anchor) {
      return 0;
    }
    const { side, align } = PLACEMENTS[this.placement()];
    if (align === 'center') {
      return 0;
    }
    const rect = anchor.getBoundingClientRect();
    const half =
      (side === 'top' || side === 'bottom' ? rect.width : rect.height) / 2;
    const delta = half - ARROW_INSET;
    return align === 'start' ? delta : -delta;
  }

  /**
   * The overlay primitive only anchors to elements, so a context menu anchors to a
   * zero-size, fixed-position element at the pointer. (A point-origin option on the
   * primitive would make this unnecessary.)
   */
  private useVirtualAnchor(x: number, y: number): void {
    this.releaseVirtualAnchor();
    const anchor = this.document.createElement('div');
    anchor.setAttribute('aria-hidden', 'true');
    anchor.className = 'andes-dropdown-menu__point-anchor';
    anchor.style.cssText = `position:fixed;left:${x}px;top:${y}px;width:0;height:0;pointer-events:none;`;
    this.document.body.appendChild(anchor);
    this.virtualAnchor = anchor;
    this.overlay.registerAnchor(anchor);
  }

  private releaseVirtualAnchor(): void {
    if (!this.virtualAnchor) {
      return;
    }
    this.virtualAnchor.remove();
    this.virtualAnchor = null;
    this.overlay.registerAnchor(this.triggerAnchor);
  }

  /**
   * Points the arrow at the anchor. The side is read back off the rendered geometry
   * rather than taken from `placement`, because collision handling may have flipped it.
   */
  private trackArrow(): void {
    const update = () => this.updateArrow();
    afterNextRender(update, { injector: this.injector });
    const view = this.document.defaultView;
    if (!view) {
      return;
    }
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    view.addEventListener('scroll', schedule, { capture: true, passive: true });
    view.addEventListener('resize', schedule, { passive: true });
    this.stopArrowTracking = () => {
      cancelAnimationFrame(frame);
      view.removeEventListener('scroll', schedule, { capture: true });
      view.removeEventListener('resize', schedule);
    };
  }

  private updateArrow(): void {
    const pane = this.overlay.panelElement();
    const anchor = this.overlay.anchor();
    const arrow = pane?.querySelector<HTMLElement>(
      '.andes-dropdown-menu__arrow',
    );
    if (!pane || !anchor || !arrow) {
      return;
    }
    const panel = pane.getBoundingClientRect();
    const target = anchor.getBoundingClientRect();
    let side: AndesOverlaySide;
    if (panel.top >= target.bottom - 1) {
      side = 'bottom';
    } else if (panel.bottom <= target.top + 1) {
      side = 'top';
    } else if (panel.left >= target.right - 1) {
      side = 'right';
    } else {
      side = 'left';
    }
    const vertical = side === 'top' || side === 'bottom';
    const center = vertical
      ? target.left + target.width / 2 - panel.left
      : target.top + target.height / 2 - panel.top;
    const length = vertical ? panel.width : panel.height;
    const offset = Math.min(
      Math.max(center, ARROW_INSET),
      Math.max(length - ARROW_INSET, ARROW_INSET),
    );
    arrow.dataset['side'] = side;
    arrow.style.setProperty(
      '--andes-dropdown-menu-arrow-offset',
      `${offset}px`,
    );
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
