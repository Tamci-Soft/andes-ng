import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

import { AndesButton } from '../button/button';
import type {
  AndesToast,
  AndesToastAction,
  AndesToastPosition,
} from './toast.types';

/** Drag distance (px) past which releasing a swipe dismisses the toast. */
const SWIPE_THRESHOLD = 45;
/** Release speed (px/ms) that dismisses even a short flick. */
const SWIPE_VELOCITY = 0.11;

type AndesSwipeDirection = 'left' | 'right' | 'up' | 'down';

interface AndesSwipeState {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly startedAt: number;
  axis: 'x' | 'y' | null;
  amount: number;
}

/** Movement against an allowed direction is dampened rather than blocked, so it feels elastic. */
function dampen(delta: number): number {
  return delta / (1.5 + Math.abs(delta) / 20);
}

/**
 * Renders a single toast's chrome (icon, title, message, actions, close button, progress
 * bar) - purely visual, with no live-region semantics of its own. Internal to `@andes-ng/ui` -
 * only `AndesToastRegion` instantiates it, so it stays unexported from the package root;
 * nothing about its auto-dismiss/hover-pause/queueing behavior lives here, only presentation,
 * the swipe gesture, and the events the region wires to the owning service.
 *
 * Deliberately has no `role`/`aria-live` on its host: this node is added to and removed from
 * the DOM dynamically (per toast, per show/dismiss), which is not a reliable way to trigger a
 * screen reader announcement in every browser/AT pairing. `AndesToastQueue.announce()`
 * covers the accessibility requirement instead, via CDK's `LiveAnnouncer` and its persistent
 * hidden node - see that method's doc comment. Duplicating a second live region here would
 * announce every toast's text twice, so don't add one back. (The toast's `role` option is
 * honored there, as the announcement's politeness.)
 *
 * Reports its natural height (`heightChange`) so the region can lay the stack out with
 * transforms - the region pins a collapsed card's height to the front card's, so the height
 * is measured from the inner `.andes-toast__body`, which never stretches.
 */
@Component({
  selector: 'andes-toast-item',
  imports: [NgTemplateOutlet, AndesButton],
  templateUrl: './toast-item.html',
  styleUrl: './toast-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClasses()',
    '[attr.data-severity]': 'toast().severity',
    '[attr.data-flavor]': 'toast().flavor',
    '[attr.data-rich-colors]': 'toast().richColors ? "" : null',
    '[attr.data-pause-on-hover]': 'toast().pauseOnHover ? "" : null',
    '[attr.data-clickable]': 'toast().onClick ? "" : null',
    '[attr.data-swipeable]': 'swipeable() ? "" : null',
    '(click)': 'onHostClick($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'resetSwipe()',
  },
})
export class AndesToastItem {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly body = viewChild.required<ElementRef<HTMLElement>>('body');

  readonly toast = input.required<AndesToast>();
  /** The resolved placement - decides which way a swipe may fling the toast. */
  readonly placement = input<AndesToastPosition>('bottom-right');

  /** The close button was clicked. */
  readonly dismissRequested = output<void>();
  /** The inline `action` button was clicked. */
  readonly actionClicked = output<void>();
  /** A button of the `actions` group was clicked. */
  readonly groupActionClicked = output<AndesToastAction>();
  /** The toast body (anything but one of its buttons) was clicked. */
  readonly bodyClicked = output<void>();
  /** A swipe went far or fast enough to dismiss the toast. */
  readonly swiped = output<void>();
  /** The toast's natural (unstretched) border-box height, in px. */
  readonly heightChange = output<number>();

  private swipe: AndesSwipeState | null = null;
  /** Set once a drag moved the toast, so the click that ends it doesn't count as a body click. */
  private dragged = false;

  protected readonly hostClasses = computed(() => {
    const toast = this.toast();
    const base = `andes-toast andes-toast--${toast.severity} andes-toast--${toast.flavor}`;
    return toast.className ? `${base} ${toast.className}` : base;
  });

  protected readonly closeLabel = computed(() =>
    this.toast().flavor === 'message'
      ? 'Dismiss message'
      : 'Dismiss notification',
  );

  protected readonly swipeable = computed(
    () => this.toast().swipeToDismiss && this.toast().dismissible,
  );

  /** Progress bar only makes sense when there is a countdown to visualize. */
  protected readonly progressDuration = computed(() => {
    const { showProgress, duration } = this.toast();
    return showProgress && duration !== false && duration > 0 ? duration : null;
  });

  /** One-element list keyed by revision, so a key-based update restarts the bar's animation. */
  protected readonly progressRevision = computed(() => [this.toast().revision]);

  protected readonly iconContext = computed(() => ({
    $implicit: this.toast(),
  }));

  /** The twelve bars of the loading spinner. */
  protected readonly spinnerBars = Array.from({ length: 12 }, (_, i) => i);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      this.reportHeight();
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => this.reportHeight());
      observer.observe(this.body().nativeElement);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected onHostClick(event: MouseEvent): void {
    if (this.dragged) {
      this.dragged = false;
      return;
    }
    const target = event.target as Element | null;
    const interactive = target?.closest('button, a, andes-button');
    if (interactive && this.host.nativeElement.contains(interactive)) {
      return;
    }
    this.bodyClicked.emit();
  }

  protected onPointerDown(event: PointerEvent): void {
    const target = event.target as Element | null;
    if (
      !this.swipeable() ||
      event.button !== 0 ||
      target?.closest('button, a, andes-button, input, textarea, select')
    ) {
      return;
    }
    this.dragged = false;
    this.swipe = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: Date.now(),
      axis: null,
      amount: 0,
    };
  }

  protected onPointerMove(event: PointerEvent): void {
    const swipe = this.swipe;
    if (!swipe || swipe.pointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - swipe.startX;
    const dy = event.clientY - swipe.startY;
    if (swipe.axis === null) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 3) {
        return;
      }
      swipe.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      const element = this.host.nativeElement;
      element.setAttribute('data-swiping', '');
      element.setPointerCapture?.(event.pointerId);
    }
    const delta = swipe.axis === 'x' ? dx : dy;
    swipe.amount = this.allows(this.directionOf(swipe.axis, delta))
      ? delta
      : dampen(delta);
    this.dragged = true;
    this.setSwipeAmount(swipe.axis, swipe.amount);
  }

  protected onPointerUp(event: PointerEvent): void {
    const swipe = this.swipe;
    if (!swipe || swipe.pointerId !== event.pointerId) {
      return;
    }
    this.swipe = null;
    if (swipe.axis === null) {
      return;
    }
    const direction = this.directionOf(swipe.axis, swipe.amount);
    const velocity =
      Math.abs(swipe.amount) / Math.max(1, Date.now() - swipe.startedAt);
    if (
      this.allows(direction) &&
      (Math.abs(swipe.amount) >= SWIPE_THRESHOLD || velocity > SWIPE_VELOCITY)
    ) {
      const element = this.host.nativeElement;
      element.removeAttribute('data-swiping');
      // Read by the region's leave animation, which flings the card out from where it is.
      element.setAttribute('data-swipe-out', direction);
      this.swiped.emit();
      return;
    }
    this.resetSwipe();
  }

  protected resetSwipe(): void {
    this.swipe = null;
    const element = this.host.nativeElement;
    element.removeAttribute('data-swiping');
    element.style.removeProperty('--_toast-swipe-x');
    element.style.removeProperty('--_toast-swipe-y');
  }

  private setSwipeAmount(axis: 'x' | 'y', amount: number): void {
    const style = this.host.nativeElement.style;
    style.setProperty('--_toast-swipe-x', axis === 'x' ? `${amount}px` : '0px');
    style.setProperty('--_toast-swipe-y', axis === 'y' ? `${amount}px` : '0px');
  }

  private directionOf(axis: 'x' | 'y', delta: number): AndesSwipeDirection {
    if (axis === 'x') {
      return delta > 0 ? 'right' : 'left';
    }
    return delta > 0 ? 'down' : 'up';
  }

  /** A toast flings toward the edges it's anchored to; centered ones sideways both ways. */
  private allows(direction: AndesSwipeDirection): boolean {
    const placement = this.placement();
    switch (direction) {
      case 'up':
        return placement.startsWith('top');
      case 'down':
        return placement.startsWith('bottom');
      case 'left':
        return !placement.endsWith('right');
      case 'right':
        return !placement.endsWith('left');
    }
  }

  private reportHeight(): void {
    const host = this.host.nativeElement;
    const body = this.body().nativeElement;
    const style = getComputedStyle(host);
    const chrome =
      parseFloat(style.paddingTop) +
      parseFloat(style.paddingBottom) +
      parseFloat(style.borderTopWidth) +
      parseFloat(style.borderBottomWidth);
    const height = body.offsetHeight + (Number.isFinite(chrome) ? chrome : 0);
    if (height > 0) {
      this.heightChange.emit(height);
    }
  }
}
