import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
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
 * Owns the per-region interaction wiring: hover/focus pause of each toast's timer, close and
 * action buttons, body clicks, and the collapsed-stack mode (`stack`): once more than
 * `threshold` toasts are open, they collapse into a deck with the newest in front, and expand
 * back to a list while the pointer is over the region or focus is inside it.
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
    '[style.padding-top]': 'topOffset()',
    '[style.padding-bottom]': 'bottomOffset()',
    '(mouseenter)': 'hovered.set(true)',
    '(mouseleave)': 'hovered.set(false)',
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

  /** Ids whose timer this region paused on `mouseenter`, so `mouseleave` stays balanced. */
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

  protected readonly topOffset = computed(() =>
    this.placement().startsWith('top') ? toCssLength(this.top()) : null,
  );

  protected readonly bottomOffset = computed(() =>
    this.placement().startsWith('bottom') ? toCssLength(this.bottom()) : null,
  );

  protected readonly stackVisibleDepth = STACK_VISIBLE_DEPTH;

  protected onHoverStart(toast: AndesToast): void {
    if (!toast.pauseOnHover || this.hoverPaused.has(toast.id)) {
      return;
    }
    this.hoverPaused.add(toast.id);
    this.controller().pause(toast.id);
  }

  protected onHoverEnd(toast: AndesToast): void {
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
}
