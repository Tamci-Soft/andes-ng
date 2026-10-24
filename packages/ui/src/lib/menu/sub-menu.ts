import {
  type AndesOverlayAnchoredPositioning,
  andesOverlayPreset,
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  provideAndesOverlay,
} from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DOCUMENT,
  effect,
  forwardRef,
  inject,
  Injector,
  input,
  output,
  type Signal,
  type TemplateRef,
  untracked,
  viewChild,
  type ElementRef,
} from '@angular/core';

import { AndesMenuRow, AndesMenuRowBase } from './menu-row';
import { navigableRows } from './menu-dom';
import {
  ANDES_MENU_LEVEL,
  type AndesMenuClickEvent,
  type AndesMenuFocusTarget,
  type AndesMenuLevel,
  type AndesMenuSubRef,
} from './menu-types';

/**
 * A row that opens a nested list of entries. The default content is the nested
 * entries; the row's own text is the `label` input or a `[slot=label]` element.
 *
 * ```html
 * <andes-sub-menu key="settings" label="Settings">
 *   <andes-menu-item key="profile">Profile</andes-menu-item>
 *   <andes-menu-item key="billing">Billing</andes-menu-item>
 * </andes-sub-menu>
 * ```
 *
 * Where the nested entries appear depends on the menu: an `inline` menu expands
 * them in place (animated, indented), every other mode opens them in a popup next to
 * the row (below it, for a horizontal bar). The open state lives in the menu's
 * `openKeys`, whichever way it is shown.
 */
@Component({
  selector: 'andes-sub-menu',
  imports: [NgTemplateOutlet, AndesMenuRow, AndesOverlayContentPrimitive],
  templateUrl: './sub-menu.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideAndesOverlay(),
    {
      // The entries inside this submenu live one level deeper.
      provide: ANDES_MENU_LEVEL,
      useFactory: (): AndesMenuLevel =>
        inject(forwardRef(() => AndesSubMenu)).childLevel,
    },
  ],
  host: {
    class: 'andes-menu__node',
    'data-slot': 'menu-sub-menu',
    '[attr.role]': 'menu.navigation() ? "listitem" : "none"',
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
  },
})
export class AndesSubMenu extends AndesMenuRowBase implements AndesMenuSubRef {
  /** `[x, y]` pixel nudge of the popup from its default position. */
  readonly popupOffset = input<readonly [number, number] | undefined>(
    undefined,
  );
  /** Extra class(es) for the popup panel. */
  readonly popupClass = input<string | readonly string[] | undefined>(
    undefined,
  );
  /** Emitted when the submenu's own row is clicked. */
  readonly titleClick = output<AndesMenuClickEvent>();
  /**
   * Makes this the horizontal bar's overflow submenu. Used by the menu itself.
   *
   * @internal
   */
  readonly overflowRoot = input(false, { transform: booleanAttribute });

  private readonly overlay = inject(AndesOverlayPrimitive);
  private readonly injector = inject(Injector);
  private readonly document = inject(DOCUMENT);

  private readonly panelTemplate =
    viewChild.required<TemplateRef<unknown>>('panel');
  private readonly inlineList =
    viewChild<ElementRef<HTMLElement>>('inlineList');

  readonly isOpen: Signal<boolean> = computed(() =>
    this.menu.isOpen(this.effectiveKey()),
  );
  readonly usesPopup: Signal<boolean> = computed(() =>
    this.menu.popupSubmenus(),
  );
  override readonly opened: Signal<boolean> = this.isOpen;
  override readonly expanded: Signal<boolean | null> = this.isOpen;
  override readonly hasPopup: Signal<boolean> = computed(
    () => !this.menu.navigation(),
  );
  override readonly controls: Signal<string | null> = computed(() =>
    this.isOpen() && this.usesPopup() ? this.overlay.contentId : null,
  );
  readonly chainParent: Signal<AndesMenuSubRef | null> = computed(() =>
    this.overflowed() ? this.menu.overflowSub() : this.level.sub,
  );
  readonly panel: Signal<HTMLElement | null> = this.overlay.panelElement;

  /** The level the nested entries sit in. */
  readonly childLevel: AndesMenuLevel;

  protected readonly isTopLevelBarItem = this.bar;
  protected readonly descendantSelected = computed(
    () => !this.overflowRoot() && this.menu.hasSelectedDescendant(this),
  );
  protected readonly popupClassName = computed(() => {
    const extra = this.popupClass();
    const classes = ['andes-menu__popup'];
    if (extra) {
      classes.push(...(typeof extra === 'string' ? [extra] : extra));
    }
    return classes.join(' ');
  });
  protected readonly placementSide = computed(() =>
    this.isTopLevelBarItem() ? 'bottom' : 'right',
  );

  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingFocus: AndesMenuFocusTarget = null;

  protected override rowKind(): 'sub' {
    return 'sub';
  }

  constructor() {
    super();
    this.entry.sub = this;

    this.childLevel = {
      depth: this.level.depth + 1,
      sub: this,
      inPopup: computed(
        () => this.level.inPopup() || this.menu.popupSubmenus(),
      ),
      isRoot: false,
    };

    const preset = andesOverlayPreset('menu');
    this.overlay.configure({
      ...preset,
      autoFocus: 'none',
      restoreFocus: false,
      closeOnEscape: false,
      closeOnOutsideClick: false,
    });

    // The open state belongs to the menu (`openKeys`); the popup just follows it.
    effect(() => {
      // Anchored popups need the row to exist, so a submenu already open at start waits for it.
      const wanted =
        this.isOpen() &&
        this.usesPopup() &&
        !this.disabled() &&
        !!this.rowElement();
      untracked(() => (wanted ? this.showPopup() : this.hidePopup()));
    });

    this.overlay.outsidePointerEvents
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (!this.menu.owns(event.target as Node | null)) {
          this.menu.closeAllPopups();
        }
      });

    // Something other than the menu closed the popup (navigation, teardown).
    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe(() => {
      if (this.isOpen() && this.usesPopup()) {
        this.menu.setOpen(this, false);
      }
    });

    this.destroyRef.onDestroy(() => this.cancelTimers());
  }

  override ngOnInit(): void {
    super.ngOnInit();
    if (this.overflowRoot()) {
      this.menu.registerOverflowSub(this);
      this.destroyRef.onDestroy(() => this.menu.registerOverflowSub(null));
    }
  }

  protected override registersUnit(): boolean {
    return !this.overflowRoot();
  }

  /** Opens the submenu, optionally moving focus to its first or last row. */
  open(focus: AndesMenuFocusTarget = null): void {
    this.cancelTimers();
    if (this.disabled()) {
      return;
    }
    this.pendingFocus = focus;
    if (this.isOpen()) {
      this.consumePendingFocus();
      return;
    }
    this.menu.setOpen(this, true);
    if (!this.usesPopup()) {
      this.consumePendingFocus();
    }
  }

  /** Closes the submenu and every submenu open inside it. */
  close(): void {
    this.cancelTimers();
    this.menu.setOpen(this, false);
  }

  toggle(focus: AndesMenuFocusTarget = null): void {
    if (this.isOpen()) {
      this.close();
    } else {
      this.open(focus);
    }
  }

  scheduleOpen(): void {
    this.cancelCloseTimer();
    if (this.isOpen() || this.openTimer !== undefined || this.disabled()) {
      return;
    }
    const delay = this.menu.openDelay();
    if (delay <= 0) {
      this.open();
      return;
    }
    this.openTimer = setTimeout(() => {
      this.openTimer = undefined;
      this.open();
    }, delay);
  }

  scheduleClose(): void {
    this.cancelOpenTimer();
    if (!this.isOpen() || this.closeTimer !== undefined) {
      return;
    }
    this.closeTimer = setTimeout(() => {
      this.closeTimer = undefined;
      this.close();
    }, this.menu.closeDelay());
  }

  cancelTimers(): void {
    this.cancelOpenTimer();
    this.cancelCloseTimer();
  }

  focusRowIn(target: 'first' | 'last'): void {
    const container = this.usesPopup()
      ? this.overlay.panelElement()
      : this.inlineList()?.nativeElement;
    if (!container) {
      return;
    }
    const rows = navigableRows(
      this.usesPopup()
        ? (container.querySelector('[data-andes-menu-list]') as HTMLElement)
        : (this.menu.host.querySelector(
            '[data-andes-menu-list]',
          ) as HTMLElement),
      container,
    );
    const row = target === 'first' ? rows[0] : rows[rows.length - 1];
    row?.focus({ preventScroll: true });
  }

  override onClick(event: MouseEvent): void {
    if (this.disabled()) {
      event.preventDefault();
      return;
    }
    this.titleClick.emit({
      key: this.effectiveKey(),
      keyPath: this.menu.keyPathOf(this.entry),
      event,
    });
    if (this.usesPopup() && this.menu.triggerAction() === 'hover') {
      // A hover menu is usually already open by the time of the click; closing it
      // again would feel like a flicker. Touch users open it with this tap.
      this.open();
    } else {
      this.toggle();
    }
  }

  override onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch' || this.disabled()) {
      return;
    }
    this.menu.rowPointerEntered(this.entry);
    this.cancelCloseTimer();
    if (this.usesPopup() && this.menu.triggerAction() === 'hover') {
      this.scheduleOpen();
    }
  }

  override onPointerLeave(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }
    this.cancelOpenTimer();
    if (this.usesPopup() && this.menu.triggerAction() === 'hover') {
      this.scheduleClose();
    }
  }

  protected onPanelPointerEnter(): void {
    // The pointer is inside this panel, so this submenu and every submenu it hangs from stay open.
    this.cancelTimers();
    let current = this.chainParent();
    while (current) {
      current.cancelTimers();
      current = current.chainParent();
    }
  }

  protected onPanelPointerLeave(): void {
    if (this.menu.triggerAction() === 'hover') {
      this.scheduleClose();
    }
  }

  private showPopup(): void {
    if (this.overlay.isOpen()) {
      return;
    }
    this.overlay.registerAnchor(this.rowElement());
    this.overlay.configure({
      role: this.menu.navigation() ? 'none' : 'menu',
      positioning: this.positioning(),
    });
    this.overlay.open(this.panelTemplate());
    this.consumePendingFocus();
  }

  private hidePopup(): void {
    if (!this.overlay.isOpen()) {
      return;
    }
    const pane = this.overlay.panelElement();
    const active = this.document.activeElement;
    // Focus inside a panel that goes away would be dropped on the page; keep it on the row.
    if (pane && active && pane.contains(active)) {
      this.rowElement()?.focus({ preventScroll: true });
    }
    this.overlay.close('trigger');
  }

  private positioning(): AndesOverlayAnchoredPositioning {
    const [x, y] = this.popupOffset() ?? [0, 0];
    if (this.isTopLevelBarItem()) {
      return {
        kind: 'anchored',
        side: 'bottom',
        align: 'start',
        sideOffset: 4 + y,
        alignOffset: x,
      };
    }
    return {
      kind: 'anchored',
      side: 'right',
      align: 'start',
      sideOffset: 4 + x,
      // Lines the first row of the panel up with this row (panel padding + border).
      alignOffset: -5 + y,
    };
  }

  private consumePendingFocus(): void {
    const target = this.pendingFocus;
    this.pendingFocus = null;
    if (!target) {
      return;
    }
    afterNextRender(() => this.focusRowIn(target), {
      injector: this.injector,
    });
  }

  private cancelOpenTimer(): void {
    clearTimeout(this.openTimer);
    this.openTimer = undefined;
  }

  private cancelCloseTimer(): void {
    clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
  }
}
