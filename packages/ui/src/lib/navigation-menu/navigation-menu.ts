import {
  AndesOverlayPrimitive,
  andesOverlayPreset,
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
  DestroyRef,
  DOCUMENT,
  effect,
  ElementRef,
  forwardRef,
  inject,
  Injector,
  input,
  model,
  numberAttribute,
  signal,
  type TemplateRef,
  untracked,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import {
  ANDES_NAVIGATION_MENU,
  type AndesNavigationMenuAlign,
  type AndesNavigationMenuContext,
  type AndesNavigationMenuItemRef,
  type AndesNavigationMenuOpenSource,
} from './navigation-menu-types';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [data-andes-nav-menu-link], [tabindex]:not([tabindex="-1"])';

let nextMenuId = 0;

/** Panel width/height transitions run this long. Matches the stylesheet. */
const RESIZE_MS = 200;
/** A click this soon after a hover opened the panel keeps it open instead of toggling it shut. */
const HOVER_CLICK_GRACE_MS = 500;

function isRtl(element: Element): boolean {
  const dir = element.closest('[dir]')?.getAttribute('dir');
  if (dir) {
    return dir === 'rtl';
  }
  return (
    element.ownerDocument.defaultView?.getComputedStyle(element).direction ===
    'rtl'
  );
}

/**
 * A website or application navigation bar whose triggers open rich content (lists,
 * grids of linked cards) in one shared panel under the bar.
 *
 * ```html
 * <andes-navigation-menu ariaLabel="Main">
 *   <andes-navigation-menu-item>
 *     <button type="button" andesNavigationMenuTrigger>Products</button>
 *     <andes-navigation-menu-content [columns]="2">
 *       <a andesNavigationMenuLink href="/orders">…</a>
 *     </andes-navigation-menu-content>
 *   </andes-navigation-menu-item>
 *   <andes-navigation-menu-item>
 *     <a andesNavigationMenuLink href="/pricing" [active]="true">Pricing</a>
 *   </andes-navigation-menu-item>
 * </andes-navigation-menu>
 * ```
 *
 * ## Behavior
 *
 * - Hover opens a trigger's content after `delayDuration`; once one is open, moving to
 *   another trigger switches at once. Leaving closes after the `closeDelay` grace, which
 *   the pointer can cancel by entering the panel.
 * - The panel is shared: switching triggers resizes it (200ms, no overshoot), slides the
 *   content in from the direction of the move and moves the arrow under the new trigger.
 * - Keyboard: Left / Right (flipped in RTL) move along the bar, Down opens and enters the
 *   content, Arrow keys move through its links, Escape closes and returns to the trigger,
 *   Tab walks the bar, then the open content, then on.
 * - Under `mobileBreakpoint` the bar becomes a stacked list and content opens inline
 *   under its trigger.
 *
 * The root is a `navigation` landmark: give it an `ariaLabel`.
 */
@Component({
  selector: 'andes-navigation-menu',
  imports: [NgTemplateOutlet],
  templateUrl: './navigation-menu.html',
  styleUrl: './navigation-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    provideAndesOverlay(),
    {
      provide: ANDES_NAVIGATION_MENU,
      useExisting: forwardRef(() => AndesNavigationMenu),
    },
  ],
  host: {
    class: 'andes-nav-menu',
    'data-slot': 'navigation-menu',
    role: 'navigation',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.data-mobile]': 'mobile() ? "" : null',
    '(focusout)': 'focusLeft($event)',
  },
})
export class AndesNavigationMenu implements AndesNavigationMenuContext {
  /** Value of the item whose content is open, or `null`. Two-way. */
  readonly value = model<string | null>(null);
  /** Milliseconds a hovered trigger waits before opening when nothing is open yet. */
  readonly delayDuration = input(150, { transform: numberAttribute });
  /** Milliseconds the panel stays open after the pointer left, so it can cross the gap. */
  readonly closeDelay = input(150, { transform: numberAttribute });
  /** Alignment of the panel with the trigger it belongs to. */
  readonly align = input<AndesNavigationMenuAlign>('start');
  /** Viewport width (px) at or under which the bar becomes a stacked list. */
  readonly mobileBreakpoint = input(768, { transform: numberAttribute });
  /** Shows the small arrow pointing from the panel to its trigger. */
  readonly indicator = input(true, { transform: booleanAttribute });
  /** Accessible name of the navigation landmark. */
  readonly ariaLabel = input<string | null>(null);
  /** Closes open content when a link in it, or in the bar, is followed. */
  readonly closeOnNavigate = input(true, { transform: booleanAttribute });

  readonly instanceId = `andes-nav-menu-${nextMenuId++}`;
  readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  private readonly overlay = inject(AndesOverlayPrimitive);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  private readonly viewportTemplate =
    viewChild.required<TemplateRef<unknown>>('viewport');
  private readonly viewportElement =
    viewChild<ElementRef<HTMLElement>>('viewportEl');
  private readonly panelElement = viewChild<ElementRef<HTMLElement>>('panelEl');
  private readonly contentElement =
    viewChild<ElementRef<HTMLElement>>('contentEl');

  private readonly itemsSignal = signal<readonly AndesNavigationMenuItemRef[]>(
    [],
  );
  private readonly mobileSignal = signal(false);
  readonly mobile = this.mobileSignal.asReadonly();

  protected readonly activeItems = computed(() => {
    const open = this.value();
    const item = this.itemsSignal().find(
      (candidate) => candidate.key() === open,
    );
    return item ? [item] : [];
  });
  protected readonly size = signal<{ width: number; height: number } | null>(
    null,
  );
  protected readonly instant = signal(true);
  protected readonly arrowX = signal(0);
  protected readonly motion = signal<'from-start' | 'from-end' | null>(null);

  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private settleTimer: ReturnType<typeof setTimeout> | undefined;
  private pendingFocus = false;
  private openedByPointerAt = -Infinity;
  private lastValue: string | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor() {
    this.overlay.configure({
      ...andesOverlayPreset('popover'),
      layer: 'dropdown',
      role: 'none',
      autoFocus: 'none',
      restoreFocus: false,
      closeOnEscape: false,
      closeOnOutsideClick: false,
    });

    // The overlay only follows `value`; it never decides on its own.
    effect(() => {
      const value = this.value();
      const mobile = this.mobile();
      untracked(() => this.sync(mobile ? null : value));
    });

    effect((onCleanup) => {
      const view = this.document.defaultView;
      if (typeof view?.matchMedia !== 'function') {
        return;
      }
      const query = view.matchMedia(
        `(max-width: ${this.mobileBreakpoint()}px)`,
      );
      this.mobileSignal.set(query.matches);
      const listener = (event: MediaQueryListEvent) =>
        this.mobileSignal.set(event.matches);
      query.addEventListener('change', listener);
      onCleanup(() => query.removeEventListener('change', listener));
    });

    this.overlay.outsidePointerEvents
      .pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (!this.owns(event.target as Node | null)) {
          this.close(false);
        }
      });

    this.overlay.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event.key === 'Escape' && !event.defaultPrevented) {
        event.preventDefault();
        this.closeFromEscape();
      }
    });

    this.destroyRef.onDestroy(() => {
      clearTimeout(this.openTimer);
      clearTimeout(this.closeTimer);
      clearTimeout(this.settleTimer);
      this.resizeObserver?.disconnect();
    });
  }

  // ---------------------------------------------------------------- public API

  /** Opens the content of the item with this value. */
  openItem(value: string): void {
    const item = this.itemsSignal().find(
      (candidate) => candidate.key() === value,
    );
    if (item) {
      this.open(item, 'api');
    }
  }

  /** Closes any open content. */
  closeItem(): void {
    this.close(false);
  }

  // ----------------------------------------------------------- context: state

  registerItem(item: AndesNavigationMenuItemRef): void {
    this.itemsSignal.update((items) => [...items, item]);
  }

  unregisterItem(item: AndesNavigationMenuItemRef): void {
    this.itemsSignal.update((items) => items.filter((entry) => entry !== item));
  }

  panelId(value: string): string {
    return `${this.instanceId}-content-${value}`;
  }

  isOpen(item: AndesNavigationMenuItemRef): boolean {
    return this.value() === item.key() && !!item.content();
  }

  // --------------------------------------------------------- context: behavior

  open(
    item: AndesNavigationMenuItemRef,
    source: AndesNavigationMenuOpenSource,
  ): void {
    this.cancelTimers();
    if (item.disabled() || !item.content()) {
      return;
    }
    this.pendingFocus = source === 'keyboard';
    if (source === 'pointer') {
      this.openedByPointerAt = performance.now();
    }
    const unchanged = this.value() === item.key();
    this.value.set(item.key());
    // A change of value reaches `sync`, which moves focus once the panel renders.
    if (unchanged || this.mobile()) {
      this.consumePendingFocus();
    }
  }

  close(restoreFocus: boolean): void {
    this.cancelTimers();
    const trigger = this.activeItems()[0]?.trigger() ?? null;
    if (this.value() === null) {
      return;
    }
    this.value.set(null);
    if (restoreFocus) {
      trigger?.focus({ preventScroll: true });
    }
  }

  triggerClicked(item: AndesNavigationMenuItemRef, event: MouseEvent): void {
    if (item.disabled() || !item.content()) {
      return;
    }
    // `detail` is 0 for a click synthesised by Enter or Space.
    const source = event.detail === 0 ? 'keyboard' : 'pointer';
    if (this.value() === item.key()) {
      const justOpened =
        performance.now() - this.openedByPointerAt < HOVER_CLICK_GRACE_MS;
      if (source === 'pointer' && justOpened && !this.mobile()) {
        return;
      }
      this.close(false);
      return;
    }
    this.open(item, source);
  }

  triggerPointerEntered(item: AndesNavigationMenuItemRef): void {
    if (this.mobile() || !item.content()) {
      return;
    }
    clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
    if (this.value() === item.key()) {
      return;
    }
    clearTimeout(this.openTimer);
    if (this.value() !== null) {
      // Already showing content: follow the pointer without waiting.
      this.open(item, 'pointer');
      return;
    }
    this.openTimer = setTimeout(() => {
      this.openTimer = undefined;
      this.open(item, 'pointer');
    }, this.delayDuration());
  }

  triggerPointerLeft(): void {
    clearTimeout(this.openTimer);
    this.openTimer = undefined;
    this.scheduleClose();
  }

  protected panelPointerEntered(): void {
    clearTimeout(this.closeTimer);
    this.closeTimer = undefined;
  }

  protected panelPointerLeft(): void {
    this.scheduleClose();
  }

  linkActivated(): void {
    if (this.closeOnNavigate() && this.value() !== null) {
      this.close(false);
    }
  }

  focusLeft(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (next && !this.owns(next) && this.value() !== null) {
      this.close(false);
    }
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
      `.andes-nav-menu__viewport[data-menu="${this.instanceId}"]`,
    );
  }

  // ------------------------------------------------------------------ keyboard

  barKeydown(
    event: KeyboardEvent,
    item: AndesNavigationMenuItemRef | null,
  ): void {
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }
    const target = event.currentTarget as HTMLElement;
    const rtl = isRtl(target);
    const mobile = this.mobile();
    const forward = mobile ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = mobile ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    const triggerItem = item?.content() ? item : null;

    switch (event.key) {
      case forward:
      case backward: {
        event.preventDefault();
        const next = this.moveAlongBar(target, event.key === forward ? 1 : -1);
        this.followOpenContent(next);
        return;
      }
      case 'Home':
      case 'End': {
        event.preventDefault();
        const all = this.barFocusables();
        const next = event.key === 'Home' ? all[0] : all[all.length - 1];
        next?.focus();
        this.followOpenContent(next ?? null);
        return;
      }
      case 'ArrowDown':
        if (triggerItem && !mobile) {
          event.preventDefault();
          this.pendingFocus = true;
          if (this.value() === triggerItem.key()) {
            this.consumePendingFocus();
          } else {
            this.open(triggerItem, 'keyboard');
          }
        }
        return;
      case 'Escape':
        if (this.value() !== null) {
          event.preventDefault();
          this.close(true);
        }
        return;
      case 'Tab':
        if (
          !event.shiftKey &&
          !mobile &&
          triggerItem &&
          this.value() === triggerItem.key()
        ) {
          const first = this.panelFocusables()[0];
          if (first) {
            event.preventDefault();
            first.focus();
          }
        }
        return;
    }
  }

  panelKeydown(event: KeyboardEvent): void {
    if (
      event.defaultPrevented ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    ) {
      return;
    }
    const target = event.target as HTMLElement;
    const rtl = isRtl(target);
    const focusables = this.panelFocusables();
    const index = focusables.indexOf(target);
    const trigger = this.activeItems()[0]?.trigger() ?? null;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.close(true);
        return;
      case 'Tab': {
        if (this.mobile() || index < 0) {
          return;
        }
        if (event.shiftKey && index === 0) {
          event.preventDefault();
          trigger?.focus();
        } else if (!event.shiftKey && index === focusables.length - 1) {
          event.preventDefault();
          this.close(false);
          const bar = this.barFocusables();
          const at = trigger ? bar.indexOf(trigger) : -1;
          (bar[at + 1] ?? trigger)?.focus();
        }
        return;
      }
      case 'ArrowDown':
      case 'ArrowUp':
      case rtl ? 'ArrowLeft' : 'ArrowRight':
      case rtl ? 'ArrowRight' : 'ArrowLeft': {
        if (index < 0 || !target.hasAttribute('data-andes-nav-menu-link')) {
          return;
        }
        event.preventDefault();
        const forward =
          event.key === 'ArrowDown' ||
          event.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
        const step = forward ? 1 : -1;
        focusables[
          (index + step + focusables.length) % focusables.length
        ]?.focus();
        return;
      }
      case 'Home':
      case 'End':
        if (index >= 0 && target.hasAttribute('data-andes-nav-menu-link')) {
          event.preventDefault();
          (event.key === 'Home'
            ? focusables[0]
            : focusables[focusables.length - 1]
          )?.focus();
        }
        return;
    }
  }

  // ------------------------------------------------------------------- helpers

  private cancelTimers(): void {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    this.openTimer = undefined;
    this.closeTimer = undefined;
  }

  private scheduleClose(): void {
    if (this.value() === null || this.closeTimer !== undefined) {
      return;
    }
    this.closeTimer = setTimeout(() => {
      this.closeTimer = undefined;
      this.close(false);
    }, this.closeDelay());
  }

  private closeFromEscape(): void {
    const active = this.document.activeElement;
    this.close(!!active && this.owns(active));
  }

  /** Bar focusables in DOM order: triggers and top-level links. */
  private barFocusables(): HTMLElement[] {
    return Array.from(
      this.host.querySelectorAll<HTMLElement>(
        '[data-andes-nav-menu-focusable]',
      ),
    ).filter(
      (element) =>
        element.getAttribute('aria-disabled') !== 'true' &&
        !(element as HTMLButtonElement).disabled,
    );
  }

  private panelFocusables(): HTMLElement[] {
    const root = this.mobile()
      ? this.activeItems()[0]?.host
      : this.viewportElement()?.nativeElement;
    if (!root) {
      return [];
    }
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (element) =>
        !element.hasAttribute('data-andes-nav-menu-focusable') &&
        !element.closest('[inert]') &&
        !element.classList.contains('andes-nav-menu__trigger'),
    );
  }

  private moveAlongBar(from: HTMLElement, delta: 1 | -1): HTMLElement | null {
    const all = this.barFocusables();
    if (all.length === 0) {
      return null;
    }
    const index = all.indexOf(from);
    const next = all[(index + delta + all.length) % all.length];
    next.focus();
    return next;
  }

  /** While content is open, moving onto another trigger opens that one. */
  private followOpenContent(target: HTMLElement | null): void {
    if (!target || this.value() === null || this.mobile()) {
      return;
    }
    const item = this.itemsSignal().find(
      (candidate) => candidate.trigger() === target,
    );
    if (item?.content()) {
      this.open(item, 'api');
    } else {
      this.close(false);
    }
  }

  private consumePendingFocus(): void {
    if (!this.pendingFocus) {
      return;
    }
    this.pendingFocus = false;
    afterNextRender(
      () => {
        const first = this.panelFocusables()[0];
        first?.focus({ preventScroll: true });
      },
      { injector: this.injector },
    );
  }

  private orderedItems(): AndesNavigationMenuItemRef[] {
    return [...this.itemsSignal()].sort((a, b) =>
      a.host.compareDocumentPosition(b.host) & Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1,
    );
  }

  /** Brings the overlay in line with the open item. */
  private sync(value: string | null): void {
    const item = value
      ? this.itemsSignal().find((candidate) => candidate.key() === value)
      : undefined;
    const trigger = item?.trigger() ?? null;

    if (!item || !trigger || !item.content()) {
      this.lastValue = null;
      if (this.overlay.isOpen()) {
        this.overlay.close('trigger');
      }
      return;
    }

    const previous = this.lastValue;
    this.lastValue = value;
    const positioning = {
      kind: 'anchored',
      side: 'bottom',
      align: this.align(),
      sideOffset: 10,
    } as const;

    if (!this.overlay.isOpen()) {
      this.motion.set(null);
      this.instant.set(true);
      this.size.set(null);
      this.overlay.registerAnchor(trigger);
      this.overlay.configure({ positioning: { ...positioning } });
      this.overlay.open(this.viewportTemplate());
      this.consumePendingFocus();
      this.afterContentRendered(true);
      return;
    }

    // Switching triggers: the panel stays, moves and resizes.
    const viewport = this.viewportElement()?.nativeElement;
    const before = viewport?.getBoundingClientRect().left ?? 0;
    const order = this.orderedItems();
    const from = order.findIndex((entry) => entry.key() === previous);
    const to = order.indexOf(item);
    this.motion.set(from >= 0 && to >= from ? 'from-end' : 'from-start');
    this.overlay.registerAnchor(trigger);
    this.overlay.configure({ positioning: { ...positioning } });
    const after = viewport?.getBoundingClientRect().left ?? 0;
    if (
      viewport &&
      before !== after &&
      typeof viewport.animate === 'function'
    ) {
      const reduced = this.document.defaultView?.matchMedia?.(
        '(prefers-reduced-motion: reduce)',
      ).matches;
      if (!reduced) {
        viewport.animate(
          [
            { transform: `translateX(${before - after}px)` },
            { transform: 'none' },
          ],
          { duration: RESIZE_MS, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
        );
      }
    }
    this.consumePendingFocus();
    this.afterContentRendered(false);
  }

  /** Measures the new content, sizes the panel to it and points the arrow at the trigger. */
  private afterContentRendered(first: boolean): void {
    afterNextRender(
      () => {
        this.measure();
        this.observePanel();
        if (first) {
          clearTimeout(this.settleTimer);
          this.settleTimer = setTimeout(() => this.instant.set(false), 50);
        }
      },
      { injector: this.injector },
    );
  }

  private measure(): void {
    const content = this.contentElement()?.nativeElement;
    if (content && content.offsetWidth > 0) {
      this.size.set({
        width: content.offsetWidth,
        height: content.offsetHeight,
      });
    }
    this.updateArrow();
    this.overlay.updatePosition();
  }

  private updateArrow(): void {
    const viewport = this.viewportElement()?.nativeElement;
    const trigger = this.activeItems()[0]?.trigger();
    if (!viewport || !trigger) {
      return;
    }
    const box = viewport.getBoundingClientRect();
    const anchor = trigger.getBoundingClientRect();
    if (box.width === 0) {
      return;
    }
    const center = anchor.left + anchor.width / 2 - box.left;
    this.arrowX.set(
      Math.min(Math.max(center, 16), Math.max(box.width - 16, 16)),
    );
  }

  /** While the panel animates its size the arrow and the overlay position follow it. */
  private observePanel(): void {
    const panel = this.panelElement()?.nativeElement;
    if (!panel || typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => {
      this.overlay.updatePosition();
      this.updateArrow();
    });
    this.resizeObserver.observe(panel);
  }
}
