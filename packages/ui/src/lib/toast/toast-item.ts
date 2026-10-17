import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  Renderer2,
  RendererStyleFlags2,
  viewChild,
} from '@angular/core';

import { AndesButton } from '../button/button';
import type {
  AndesToast,
  AndesToastAction,
  AndesToastSwipeDirection,
} from './toast.types';

/** Distance, in px, past which releasing a drag dismisses the toast. */
const SWIPE_DISTANCE_THRESHOLD = 45;
/** Release speed, in px/ms, past which a shorter flick still dismisses the toast. */
const SWIPE_VELOCITY_THRESHOLD = 0.11;
/** Movement, in px, after which a press counts as a drag rather than a click. */
const DRAG_START_THRESHOLD = 4;

interface DragState {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly startedAt: number;
  axis: 'x' | 'y' | null;
  amount: number;
}

/**
 * Renders a single toast's chrome (icon, title, message, buttons, close button, progress
 * bar) and its drag-to-dismiss gesture - with no live-region semantics of its own. Internal to
 * `@andes-ng/ui` - only `AndesToastRegion` instantiates it, so it stays unexported from the
 * package root; auto-dismiss, hover pause, queueing and the stack layout live elsewhere.
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
 * transforms: the region clamps a card hidden behind the front of a collapsed deck to the
 * front card's height, so the card can't measure itself from its own box.
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
    '[attr.data-pause-on-hover]': 'toast().pauseOnHover ? "" : null',
    '[attr.data-clickable]': 'toast().onClick ? "" : null',
    '[attr.data-rich-colors]': 'toast().richColors ? "" : null',
    '[attr.data-swipeable]': 'swipeDirections().length ? "" : null',
    '[attr.dir]': 'rtl() ? "rtl" : null',
    '[style]': 'toast().style ?? null',
    '(click)': 'onHostClick($event)',
    '(pointerdown)': 'onPointerDown($event)',
    '(pointermove)': 'onPointerMove($event)',
    '(pointerup)': 'onPointerUp($event)',
    '(pointercancel)': 'resetDrag()',
  },
})
export class AndesToastItem {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  readonly toast = input.required<AndesToast>();
  /** Lays the content out right-to-left (the flavor's global `rtl` option). */
  readonly rtl = input(false);
  /** Directions the toast can be dragged off screen in, already resolved by the region. */
  readonly swipeDirections = input<readonly AndesToastSwipeDirection[]>([]);

  /** The close button was clicked. */
  readonly dismissRequested = output<void>();
  /** The inline `action` button was clicked. */
  readonly actionClicked = output<void>();
  /** The inline `cancel` button was clicked. */
  readonly cancelClicked = output<void>();
  /** A button of the `actions` group was clicked. */
  readonly groupActionClicked = output<AndesToastAction>();
  /** The toast body (anything but one of its buttons) was clicked. */
  readonly bodyClicked = output<void>();
  /** The toast was dragged past the dismiss threshold, in this direction. */
  readonly swiped = output<AndesToastSwipeDirection>();
  /** The toast's natural (unclamped) border-box height changed, in px. */
  readonly heightChange = output<number>();

  private readonly row = viewChild.required<ElementRef<HTMLElement>>('row');

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

  /** With a title the message becomes the supporting line; alone it is the headline. */
  protected readonly hasTitle = computed(() => {
    const toast = this.toast();
    return !!toast.title || !!toast.titleTemplate;
  });

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

  private drag: DragState | null = null;
  /** Set when a press turned into a drag, so the click that ends it isn't a body click. */
  private suppressClick = false;

  constructor() {
    // `attributes` is an open-ended map, so it can't be expressed as static host bindings:
    // apply it imperatively and remove whatever a previous revision set but this one doesn't.
    let applied: readonly string[] = [];
    effect(() => {
      const element = this.host.nativeElement;
      const next = Object.entries(this.toast().attributes ?? {}).filter(
        ([name]) => name !== 'class' && name !== 'style',
      );
      const nextNames = new Set(next.map(([name]) => name));
      for (const name of applied) {
        if (!nextNames.has(name)) {
          this.renderer.removeAttribute(element, name);
        }
      }
      for (const [name, value] of next) {
        this.renderer.setAttribute(element, name, value);
      }
      applied = [...nextNames];
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender({
      read: () => {
        this.reportHeight();
        if (typeof ResizeObserver === 'undefined') {
          return;
        }
        const observer = new ResizeObserver(() => this.reportHeight());
        observer.observe(this.row().nativeElement);
        destroyRef.onDestroy(() => observer.disconnect());
      },
    });
  }

  protected onHostClick(event: MouseEvent): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    if (this.isInteractive(event.target)) {
      return;
    }
    this.bodyClicked.emit();
  }

  protected onPointerDown(event: PointerEvent): void {
    if (
      !this.swipeDirections().length ||
      event.button !== 0 ||
      this.isInteractive(event.target)
    ) {
      return;
    }
    this.suppressClick = false;
    this.drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: performance.now(),
      axis: null,
      amount: 0,
    };
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (drag.axis === null) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < DRAG_START_THRESHOLD) {
        return;
      }
      // Lock onto one axis for the rest of the gesture, so a mostly-vertical drag doesn't
      // also wobble sideways.
      drag.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      this.suppressClick = true;
      this.renderer.setAttribute(this.host.nativeElement, 'data-swiping', '');
      try {
        // Keeps the drag alive when the pointer outruns the card.
        this.host.nativeElement.setPointerCapture?.(event.pointerId);
      } catch {
        // The pointer is already gone (e.g. released between events) - nothing to capture.
      }
    }
    const delta = drag.axis === 'x' ? dx : dy;
    // Free movement towards an allowed direction; elastic resistance the other way, so the
    // toast still responds to the finger without travelling far where it can't be dismissed.
    drag.amount = this.allows(drag.axis, delta)
      ? delta
      : delta / (1.5 + Math.abs(delta) / 20);
    this.setSwipeOffset(drag.axis, drag.amount);
  }

  protected onPointerUp(event: PointerEvent): void {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }
    this.drag = null;
    if (drag.axis === null) {
      return;
    }
    const elapsed = Math.max(1, performance.now() - drag.startedAt);
    const velocity = Math.abs(drag.amount) / elapsed;
    const direction = this.directionOf(drag.axis, drag.amount);
    if (
      direction !== null &&
      this.swipeDirections().includes(direction) &&
      (Math.abs(drag.amount) >= SWIPE_DISTANCE_THRESHOLD ||
        velocity > SWIPE_VELOCITY_THRESHOLD)
    ) {
      // The exit animation reads this attribute to continue the motion off screen.
      this.renderer.setAttribute(
        this.host.nativeElement,
        'data-swipe-out',
        direction,
      );
      this.renderer.removeAttribute(this.host.nativeElement, 'data-swiping');
      this.swiped.emit(direction);
      return;
    }
    this.resetDrag();
  }

  /** Lets go of an unfinished drag; the toast eases back into place. */
  protected resetDrag(): void {
    this.drag = null;
    const element = this.host.nativeElement;
    this.renderer.removeAttribute(element, 'data-swiping');
    this.renderer.removeStyle(
      element,
      '--_toast-swipe-x',
      RendererStyleFlags2.DashCase,
    );
    this.renderer.removeStyle(
      element,
      '--_toast-swipe-y',
      RendererStyleFlags2.DashCase,
    );
  }

  private setSwipeOffset(axis: 'x' | 'y', amount: number): void {
    this.renderer.setStyle(
      this.host.nativeElement,
      axis === 'x' ? '--_toast-swipe-x' : '--_toast-swipe-y',
      `${amount}px`,
      RendererStyleFlags2.DashCase,
    );
  }

  private allows(axis: 'x' | 'y', delta: number): boolean {
    const direction = this.directionOf(axis, delta);
    return direction !== null && this.swipeDirections().includes(direction);
  }

  private directionOf(
    axis: 'x' | 'y',
    delta: number,
  ): AndesToastSwipeDirection | null {
    if (delta === 0) {
      return null;
    }
    if (axis === 'x') {
      return delta > 0 ? 'right' : 'left';
    }
    return delta > 0 ? 'bottom' : 'top';
  }

  private isInteractive(target: EventTarget | null): boolean {
    const interactive = (target as Element | null)?.closest?.(
      'button, a, andes-button',
    );
    return !!interactive && this.host.nativeElement.contains(interactive);
  }

  private reportHeight(): void {
    const element = this.host.nativeElement;
    const row = this.row().nativeElement;
    const style = getComputedStyle(element);
    const chrome = [
      style.paddingTop,
      style.paddingBottom,
      style.borderTopWidth,
      style.borderBottomWidth,
    ].reduce((total, value) => total + (parseFloat(value) || 0), 0);
    // offsetHeight ignores transforms, so a card scaled down in a collapsed deck (or still
    // sliding in) reports its real size.
    const height = row.offsetHeight + chrome;
    if (height > 0) {
      this.heightChange.emit(Math.round(height * 100) / 100);
    }
  }
}
