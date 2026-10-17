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
  ANDES_TOAST_DEFAULT_STACK_THRESHOLD,
  type AndesToast,
  type AndesToastAction,
  type AndesToastFlavor,
  type AndesToastPosition,
  type AndesToastStackConfig,
} from './toast.types';

/** How many cards of a collapsed stack stay visible (the front one plus two peeking). */
const STACK_VISIBLE_DEPTH = 3;

/** Space between expanded toasts, in px (Sonner's 14px). */
const TOAST_GAP = 14;
/** Space between messages, in px. */
const MESSAGE_GAP = 8;

interface AndesToastSlot {
  /** Position counted from the anchoring edge - 0 is the card against the edge. */
  readonly index: number;
  /** Distance from the edge when expanded: the heights of the cards before it plus the gaps. */
  readonly offset: number;
  /** Its measured natural height (`null` until the item reports one). */
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
 * Lays its toasts out the way Sonner does: every card is absolutely positioned against the
 * anchoring edge and moved into place with a transform computed from the measured heights
 * (`--_toast-offset`), so expanding, collapsing, adding and removing all animate as one
 * smooth transform/height transition instead of reflowing a flex column.
 *
 * Owns the per-region interaction wiring: hover/focus pause of each toast's timer, close and
 * action buttons, swipes, body clicks, and the collapsed-stack mode (`stack`): once more than
 * `threshold` toasts are open, they collapse into a deck with the newest in front, and expand
 * back to a list while the pointer is over the region or focus is inside it. While a deck is
 * hovered, every toast in it holds its countdown (Sonner's behavior), so the expanded list
 * doesn't shift under the pointer; without stacking, hovering pauses just that toast.
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
    '[style.top]': 'topOffset()',
    '[style.bottom]': 'bottomOffset()',
    '[style.--_toast-gap.px]': 'gap()',
    '[style.--_toast-front-height]': 'frontHeight()',
    '(mouseenter)': 'onRegionHover(true)',
    '(mouseleave)': 'onRegionHover(false)',
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
  readonly top = input<number | string | undefined>(undefined);
  readonly bottom = input<number | string | undefined>(undefined);

  protected readonly hovered = signal(false);
  protected readonly focused = signal(false);

  /** Natural heights reported by each `andes-toast-item`, by toast id. */
  private readonly heights = signal<ReadonlyMap<string, number>>(new Map());

  /** Ids whose timer this region paused for pointer hover, so un-hovering stays balanced. */
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

  protected readonly gap = computed(() =>
    this.flavor() === 'message' ? MESSAGE_GAP : TOAST_GAP,
  );

  /**
   * Each toast's slot, counted from the anchoring edge. With stacking on, the newest sits
   * against the edge (it's the front of the deck, and stays put when the deck expands);
   * without it, the oldest does and newer ones line up after it.
   */
  protected readonly slots = computed(() => {
    const toasts = this.toasts();
    const fromEdge =
      this.stackThreshold() === null ? toasts : [...toasts].reverse();
    const heights = this.heights();
    const gap = this.gap();
    const slots = new Map<string, AndesToastSlot>();
    let offset = 0;
    fromEdge.forEach((toast, index) => {
      const height = heights.get(toast.id);
      slots.set(toast.id, {
        index,
        offset,
        height: height === undefined ? null : `${height}px`,
      });
      offset += (height ?? 0) + gap;
    });
    return slots;
  });

  /** Height every card behind the front of a collapsed deck is pinned to. */
  protected readonly frontHeight = computed(() => {
    const toasts = this.toasts();
    const front = toasts[toasts.length - 1];
    const height = front ? this.heights().get(front.id) : undefined;
    return height === undefined ? null : `${height}px`;
  });

  protected readonly topOffset = computed(() =>
    this.placement().startsWith('top') ? toCssLength(this.top()) : null,
  );

  protected readonly bottomOffset = computed(() =>
    this.placement().startsWith('bottom') ? toCssLength(this.bottom()) : null,
  );

  protected readonly stackVisibleDepth = STACK_VISIBLE_DEPTH;

  constructor() {
    // A toast that arrives (or a deck that forms) while the pointer is already over it is held
    // too; one that leaves is forgotten.
    effect(() => {
      this.toasts();
      this.stackThreshold();
      this.hovered();
      untracked(() => this.syncDeckHoverPause());
    });
  }

  protected slotOf(toast: AndesToast): AndesToastSlot {
    return this.slots().get(toast.id) ?? { index: 0, offset: 0, height: null };
  }

  protected onHeightChange(toast: AndesToast, height: number): void {
    if (this.heights().get(toast.id) === height) {
      return;
    }
    this.heights.update((current) => {
      const next = new Map<string, number>();
      // Rebuild from the open toasts, which also drops the heights of ones that closed.
      for (const open of this.toasts()) {
        const known = open.id === toast.id ? height : current.get(open.id);
        if (known !== undefined) {
          next.set(open.id, known);
        }
      }
      return next;
    });
  }

  protected onRegionHover(hovered: boolean): void {
    this.hovered.set(hovered);
    this.syncDeckHoverPause();
  }

  protected onHoverStart(toast: AndesToast): void {
    // A deck pauses as a whole (see syncDeckHoverPause); only a plain list pauses per toast.
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

  /**
   * With stacking on, keeps every `pauseOnHover` toast of the region paused exactly while the
   * pointer is over the region. A no-op for a plain list, whose toasts pause one by one.
   */
  private syncDeckHoverPause(): void {
    if (this.stackThreshold() === null) {
      return;
    }
    const controller = this.controller();
    const open = new Set(this.toasts().map((toast) => toast.id));
    for (const id of [...this.hoverPaused]) {
      if (!open.has(id)) {
        this.hoverPaused.delete(id);
      } else if (!this.hovered()) {
        this.hoverPaused.delete(id);
        controller.resume(id);
      }
    }
    if (!this.hovered()) {
      return;
    }
    for (const toast of this.toasts()) {
      if (toast.pauseOnHover && !this.hoverPaused.has(toast.id)) {
        this.hoverPaused.add(toast.id);
        controller.pause(toast.id);
      }
    }
  }
}
