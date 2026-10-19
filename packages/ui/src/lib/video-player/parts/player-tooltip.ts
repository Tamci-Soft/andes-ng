import {
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  Renderer2,
  signal,
} from '@angular/core';

import { safeMatches } from '../core/browser';
import { AndesPlayerStore } from '../core/player-store';

const SHOW_DELAY_MS = 350;
/** Closer than this to the player's edge, the tooltip aligns to the control's edge instead. */
const EDGE_ROOM_PX = 72;

/**
 * A small text bubble above a player control, shown on mouse hover and on keyboard focus. It is
 * purely visual (`aria-hidden`): the control's own accessible name already says the same thing,
 * so screen readers do not hear it twice. It renders inside the control, so it also works in
 * fullscreen, and keeps inside the player near its edges.
 *
 * ```html
 * <button andesPlayerTooltip="Mute" andesPlayerTooltipHint="M" aria-label="Mute">...</button>
 * ```
 */
@Directive({
  selector: '[andesPlayerTooltip]',
  host: {
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'hide()',
    '(pointerdown)': 'hide()',
    '(focus)': 'onFocus()',
    '(blur)': 'hide()',
    '(keydown.escape)': 'hide()',
    '[attr.data-tooltip-open]': 'open() ? "" : null',
  },
})
export class AndesPlayerTooltip {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly store = inject(AndesPlayerStore, { optional: true });

  /** The tooltip text; empty hides it. */
  readonly andesPlayerTooltip = input<string | null>('');
  /** A keyboard shortcut shown next to the text. */
  readonly andesPlayerTooltipHint = input<string | null>(null);
  /** Set while the control's own popup is open, which the tooltip would cover. */
  readonly andesPlayerTooltipDisabled = input(false);

  protected readonly open = signal(false);
  private bubble: HTMLElement | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(() => {
      const text = this.andesPlayerTooltip();
      const hint = this.andesPlayerTooltipHint();
      if (this.bubble) {
        this.fill(this.bubble, text ?? '', hint);
      }
    });
    effect(() => {
      if (
        this.andesPlayerTooltipDisabled() ||
        this.store?.controlsVisible() === false
      ) {
        this.hide();
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.clearTimer();
      this.bubble?.remove();
    });
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      return;
    }
    this.clearTimer();
    this.timer = setTimeout(() => this.show(), SHOW_DELAY_MS);
  }

  protected onFocus(): void {
    // Only keyboard focus: a mouse click already showed (and dismissed) it on hover.
    if (safeMatches(this.host.nativeElement, ':focus-visible')) {
      this.show();
    }
  }

  /** Shows the tooltip now. */
  show(): void {
    this.clearTimer();
    const text = this.andesPlayerTooltip();
    if (!text || this.andesPlayerTooltipDisabled()) {
      return;
    }
    const bubble = this.ensureBubble();
    this.fill(bubble, text, this.andesPlayerTooltipHint());
    this.renderer.setAttribute(bubble, 'data-align', this.alignment());
    this.renderer.setAttribute(bubble, 'data-state', 'open');
    this.open.set(true);
  }

  hide(): void {
    this.clearTimer();
    if (this.bubble) {
      this.renderer.setAttribute(this.bubble, 'data-state', 'closed');
    }
    this.open.set(false);
  }

  private ensureBubble(): HTMLElement {
    if (!this.bubble) {
      const bubble = this.renderer.createElement('span') as HTMLElement;
      this.renderer.addClass(bubble, 'andes-player-tooltip');
      this.renderer.setAttribute(bubble, 'aria-hidden', 'true');
      this.renderer.setAttribute(bubble, 'data-slot', 'tooltip');
      this.renderer.appendChild(this.host.nativeElement, bubble);
      this.bubble = bubble;
    }
    return this.bubble;
  }

  private fill(bubble: HTMLElement, text: string, hint: string | null): void {
    bubble.textContent = text;
    if (hint) {
      const kbd = this.renderer.createElement('kbd') as HTMLElement;
      this.renderer.addClass(kbd, 'andes-player-tooltip__hint');
      kbd.textContent = hint;
      this.renderer.appendChild(bubble, kbd);
    }
  }

  /** Physical alignment (the bubble is positioned against the measured box, not the text flow). */
  private alignment(): 'left' | 'center' | 'right' {
    const element = this.host.nativeElement;
    const container = this.store?.container();
    if (!container || typeof element.getBoundingClientRect !== 'function') {
      return 'center';
    }
    const rect = element.getBoundingClientRect();
    const bounds = container.getBoundingClientRect();
    const center = rect.left + rect.width / 2;
    if (center - bounds.left < EDGE_ROOM_PX) {
      return 'left';
    }
    if (bounds.right - center < EDGE_ROOM_PX) {
      return 'right';
    }
    return 'center';
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
