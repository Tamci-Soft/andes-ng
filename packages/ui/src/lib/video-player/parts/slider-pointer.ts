/** What a key does on a horizontal slider (WAI-ARIA slider pattern). */
export type AndesSliderKeyAction =
  | {
      readonly kind: 'step';
      readonly direction: 1 | -1;
      readonly large: boolean;
    }
  | { readonly kind: 'page'; readonly direction: 1 | -1 }
  | { readonly kind: 'min' }
  | { readonly kind: 'max' };

/**
 * Maps a key to a slider action. Right/Up increase, Left/Down decrease (Shift = large step),
 * PageUp/PageDown move a page, Home/End go to the ends. The player's sliders keep a
 * left-to-right time axis in every writing direction, so the arrows are never mirrored.
 */
export function sliderKeyAction(
  event: KeyboardEvent,
): AndesSliderKeyAction | null {
  if (event.altKey || event.ctrlKey || event.metaKey) {
    return null;
  }
  switch (event.key) {
    case 'ArrowRight':
    case 'ArrowUp':
      return { kind: 'step', direction: 1, large: event.shiftKey };
    case 'ArrowLeft':
    case 'ArrowDown':
      return { kind: 'step', direction: -1, large: event.shiftKey };
    case 'PageUp':
      return { kind: 'page', direction: 1 };
    case 'PageDown':
      return { kind: 'page', direction: -1 };
    case 'Home':
      return { kind: 'min' };
    case 'End':
      return { kind: 'max' };
    default:
      return null;
  }
}

/** The pointer's position along an element, 0 (left edge) to 1 (right edge). */
export function pointerFraction(
  event: { clientX: number },
  element: Element,
): number {
  const rect = element.getBoundingClientRect();
  if (!rect.width) {
    return 0;
  }
  return Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
}

/** Callbacks of a {@link SliderDrag}. Values are fractions from 0 to 1. */
export interface SliderDragHandlers {
  start(fraction: number): void;
  move(fraction: number): void;
  end(fraction: number, cancelled: boolean): void;
}

/**
 * Pointer dragging for a slider, the same for mouse, touch and pen: pointer capture keeps the
 * drag going when the pointer leaves the track, and a cancelled or lost capture still ends it.
 */
export class SliderDrag {
  private pointerId: number | null = null;
  private lastFraction = 0;

  constructor(
    private readonly track: () => Element | null,
    private readonly handlers: SliderDragHandlers,
  ) {}

  /** Whether a drag is in progress. */
  get active(): boolean {
    return this.pointerId !== null;
  }

  down(event: PointerEvent): boolean {
    const track = this.track();
    if (!track || (event.pointerType === 'mouse' && event.button !== 0)) {
      return false;
    }
    this.pointerId = event.pointerId;
    const target = event.currentTarget as Element | null;
    try {
      target?.setPointerCapture?.(event.pointerId);
    } catch {
      // Capture is an enhancement; without it the drag ends when the pointer leaves.
    }
    this.lastFraction = pointerFraction(event, track);
    this.handlers.start(this.lastFraction);
    return true;
  }

  move(event: PointerEvent): boolean {
    const track = this.track();
    if (this.pointerId !== event.pointerId || !track) {
      return false;
    }
    this.lastFraction = pointerFraction(event, track);
    this.handlers.move(this.lastFraction);
    return true;
  }

  up(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) {
      return;
    }
    const track = this.track();
    if (track && event.type === 'pointerup') {
      this.lastFraction = pointerFraction(event, track);
    }
    const target = event.currentTarget as Element | null;
    try {
      if (target?.hasPointerCapture?.(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Already released.
    }
    this.pointerId = null;
    this.handlers.end(this.lastFraction, event.type === 'pointercancel');
  }
}
