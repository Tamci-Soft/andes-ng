import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

import { AndesToastItem } from './toast-item';
import type { AndesToastController } from './toast-queue';
import {
  ANDES_TOAST_DEFAULT_GAP,
  ANDES_TOAST_DEFAULT_STACK_THRESHOLD,
  ANDES_TOAST_DEFAULT_VISIBLE_TOASTS,
  type AndesToast,
  type AndesToastAction,
  type AndesToastFlavor,
  type AndesToastPosition,
  type AndesToastStackConfig,
  type AndesToastSwipeDirection,
} from './toast.types';

/** A toast plus where it sits in the stack, derived from the measured heights. */
interface AndesToastSlot {
  readonly toast: AndesToast;
  /** 0 for the newest (front) toast, counting up towards the oldest. */
  readonly depth: number;
  /** Distance from the anchoring edge while the stack is expanded, as a CSS length. */
  readonly offset: string;
  /** The toast's own natural height as a CSS length - `null` until it has been measured. */
  readonly height: string | null;
}

function toCssLength(value: number | string | undefined): string | null {
  if (value === undefined) {
    return null;
  }
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * One fixed-position stack of toasts at one placement - `AndesToastViewport` renders one per
 * placement in use (plus one for messages). Internal to `@andes-ng/ui`.
 *
 * Lays its toasts out itself rather than in normal flow: each card is absolutely positioned
 * against the anchoring edge and moved into place with a transform computed from the
 * measured heights of the cards in front of it, so adding, removing or resizing one slides
 * the others smoothly instead of jumping. Newest is always against the edge.
 *
 * With `stack` on, the toasts collapse into a deck once there are more than `threshold`: the
 * newest in front, up to `visibleToasts - 1` older ones peeking out behind it (each nudged
 * `gap` px further back and scaled down 5%), expanding back into the list while the pointer
 * is over the stack or focus is inside it. While a deck is hovered, every toast's countdown
 * pauses; in a plain list only the hovered toast's does.
 *
 * Also owns the remaining interaction wiring: focus pause, close/action/cancel buttons,
 * body clicks and swipe-to-dismiss.
 */
@Component({
  selector: 'andes-toast-region',
  imports: [AndesToastItem],
  templateUrl: './toast-region.html',
  styleUrl: './toast-region.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-toast-region',
    '[attr.data-placement]': 'placement()',
    '[attr.data-flavor]': 'flavor()',
    '[attr.data-stack-enabled]': 'stackThreshold() !== null ? "" : null',
    '[attr.data-stacked]': 'stacked() ? "" : null',
    '[attr.data-hovered]': 'hovered() && stackThreshold() !== null ? "" : null',
    '[style.top]': 'topOffset()',
    '[style.bottom]': 'bottomOffset()',
    '[style.--_toast-offset-x]': 'inlineOffset()',
    '[style.--_toast-gap]': 'gap() + "px"',
    '[style.--_toast-front-height]': 'frontHeight()',
    '(mouseenter)': 'onMouseEnter()',
    '(mouseleave)': 'onMouseLeave()',
    '(focusin)': 'focused.set(true)',
    '(focusout)': 'onRegionFocusOut($event)',
  },
})
export class AndesToastRegion {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly toasts = input.required<readonly AndesToast[]>();
  readonly placement = input.required<AndesToastPosition>();
  readonly flavor = input.required<AndesToastFlavor>();
  readonly controller = input.required<AndesToastController>();
  readonly stack = input<AndesToastStackConfig>(false);
  readonly visibleToasts = input(ANDES_TOAST_DEFAULT_VISIBLE_TOASTS);
  readonly gap = input(ANDES_TOAST_DEFAULT_GAP);
  readonly swipeDirections = input<
    readonly AndesToastSwipeDirection[] | undefined
  >(undefined);
  readonly offset = input<number | string | undefined>(undefined);
  readonly top = input<number | string | undefined>(undefined);
  readonly bottom = input<number | string | undefined>(undefined);
  readonly rtl = input(false);

  protected readonly hovered = signal(false);
  protected readonly focused = signal(false);

  /** Natural heights reported by each item, by toast id. */
  private readonly heights = signal<ReadonlyMap<string, number>>(new Map());

  /** Ids whose timer this region paused because the stack is hovered. */
  private readonly hoverPaused = new Set<string>();

  protected readonly stackThreshold = computed(() => {
    const stack = this.stack();
    if (stack === false) {
      return null;
    }
    return stack === true
      ? ANDES_TOAST_DEFAULT_STACK_THRESHOLD
      : stack.threshold;
  });

  protected readonly stacked = computed(() => {
    const threshold = this.stackThreshold();
    return (
      threshold !== null &&
      this.toasts().length > threshold &&
      !this.hovered() &&
      !this.focused()
    );
  });

  protected readonly visibleDepth = computed(() =>
    Math.max(1, Math.floor(this.visibleToasts())),
  );

  /**
   * Every toast with its depth and expanded offset, in DOM order (oldest first). With
   * stacking on, the newest sits against the anchoring edge (it is the front of the deck,
   * and stays put when the deck expands); without it, the oldest does and newer ones line up
   * after it, as in a plain list.
   */
  protected readonly slots = computed(() => {
    const toasts = this.toasts();
    const heights = this.heights();
    const gap = this.gap();
    const fromEdge =
      this.stackThreshold() === null ? toasts : [...toasts].reverse();
    const byId = new Map<string, AndesToastSlot>();
    let offset = 0;
    // Each card's offset is the stack of cards between it and the edge.
    fromEdge.forEach((toast, depth) => {
      const height = heights.get(toast.id);
      byId.set(toast.id, {
        toast,
        depth,
        offset: `${offset}px`,
        height: height === undefined ? null : `${height}px`,
      });
      offset += (height ?? 0) + gap;
    });
    return toasts.map((toast) => byId.get(toast.id) as AndesToastSlot);
  });

  /** Height every card behind the front (newest) card of a collapsed deck is pinned to. */
  protected readonly frontHeight = computed(() => {
    const toasts = this.toasts();
    const front = toasts[toasts.length - 1];
    const height = front ? this.heights().get(front.id) : undefined;
    return height === undefined ? null : `${height}px`;
  });

  protected readonly topOffset = computed(() =>
    this.placement().startsWith('top')
      ? toCssLength(this.top() ?? this.offset())
      : null,
  );

  protected readonly bottomOffset = computed(() =>
    this.placement().startsWith('bottom')
      ? toCssLength(this.bottom() ?? this.offset())
      : null,
  );

  protected readonly inlineOffset = computed(() => toCssLength(this.offset()));

  /** Swipe directions every dismissible toast gets unless it sets its own. */
  private readonly defaultSwipeDirections = computed(() => {
    const configured = this.swipeDirections();
    if (configured) {
      return configured;
    }
    const placement = this.placement();
    const directions: AndesToastSwipeDirection[] = [
      placement.startsWith('top') ? 'top' : 'bottom',
    ];
    if (placement.endsWith('left')) {
      directions.push('left');
    } else if (placement.endsWith('right')) {
      directions.push('right');
    }
    return directions;
  });

  constructor() {
    // A toast that arrives while the stack is already hovered must start paused too, and the
    // bookkeeping for toasts that closed meanwhile is dropped (their timers are gone).
    effect(() => {
      const toasts = this.toasts();
      const hovered = this.hovered();
      untracked(() => {
        const ids = new Set(toasts.map((toast) => toast.id));
        for (const id of [...this.hoverPaused]) {
          if (!ids.has(id)) {
            this.hoverPaused.delete(id);
          }
        }
        if (hovered && this.stackThreshold() !== null) {
          this.pauseHovered();
        }
      });
    });
  }

  protected swipeDirectionsFor(
    toast: AndesToast,
  ): readonly AndesToastSwipeDirection[] {
    if (toast.swipeDirections) {
      return toast.swipeDirections;
    }
    if (toast.swipeToDismiss === false) {
      return [];
    }
    return toast.dismissible ? this.defaultSwipeDirections() : [];
  }

  protected onHeightChange(toast: AndesToast, height: number): void {
    this.heights.update((current) => {
      if (current.get(toast.id) === height) {
        return current;
      }
      const live = new Set(this.toasts().map((candidate) => candidate.id));
      const next = new Map(
        [...current].filter(([id]) => live.has(id) && id !== toast.id),
      );
      next.set(toast.id, height);
      return next;
    });
  }

  protected onMouseEnter(): void {
    this.hovered.set(true);
    if (this.stackThreshold() !== null) {
      this.pauseHovered();
    }
  }

  protected onMouseLeave(): void {
    this.hovered.set(false);
    for (const id of [...this.hoverPaused]) {
      this.hoverPaused.delete(id);
      this.controller().resume(id);
    }
  }

  protected onHoverStart(toast: AndesToast): void {
    // A deck pauses as a whole (see `pauseHovered`); only a plain list pauses per toast.
    if (
      this.stackThreshold() !== null ||
      !toast.pauseOnHover ||
      this.hoverPaused.has(toast.id)
    ) {
      return;
    }
    this.hoverPaused.add(toast.id);
    this.controller().pause(toast.id);
  }

  protected onHoverEnd(toast: AndesToast): void {
    if (this.stackThreshold() !== null) {
      return;
    }
    if (this.hoverPaused.delete(toast.id)) {
      this.controller().resume(toast.id);
    }
  }

  protected onAction(
    toast: AndesToast,
    action: AndesToastAction | undefined,
  ): void {
    if (!action) {
      return;
    }
    action.onClick();
    if (action.dismissOnClick !== false) {
      this.hoverPaused.delete(toast.id);
      this.controller().closeWithReason(toast.id, 'action');
    }
  }

  protected onClose(toast: AndesToast): void {
    this.hoverPaused.delete(toast.id);
    this.controller().closeWithReason(toast.id, 'close-button');
  }

  protected onSwiped(toast: AndesToast): void {
    this.hoverPaused.delete(toast.id);
    this.controller().closeWithReason(toast.id, 'swipe');
  }

  protected onBodyClick(toast: AndesToast): void {
    const ref = this.controller().refFor(toast.id);
    if (toast.onClick && ref) {
      toast.onClick(ref);
    }
  }

  protected onRegionFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.host.nativeElement.contains(next)) {
      this.focused.set(false);
    }
  }

  private pauseHovered(): void {
    for (const toast of this.toasts()) {
      if (toast.pauseOnHover && !this.hoverPaused.has(toast.id)) {
        this.hoverPaused.add(toast.id);
        this.controller().pause(toast.id);
      }
    }
  }
}
