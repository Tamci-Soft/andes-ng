import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';

import { ANDES_COLLAPSIBLE } from './collapsible-types';
import { AndesCollapsibleLazy } from './collapsible-lazy';

/** Added to the measured transition time before assuming no `transitionend` will arrive. */
const SETTLE_GRACE_MS = 60;

function toMilliseconds(value: string): number {
  const text = value.split(',')[0].trim();
  if (!text) {
    return 0;
  }
  const number = parseFloat(text);
  if (Number.isNaN(number)) {
    return 0;
  }
  return text.endsWith('ms') ? number : number * 1000;
}

/**
 * The part of a collapsible that expands and collapses.
 *
 * The height animates with a grid-row transition (`0fr` to `1fr`), so the real content height
 * is used and nothing jumps, whatever the content is. While closed the content is `inert`
 * and `visibility: hidden` (after the collapse finishes), so it leaves the tab order and the
 * accessibility tree but keeps its state. Overflow is only clipped while animating, so focus
 * rings and shadows of the content are not cut once it is open. The measured height is also
 * published as `--andes-collapsible-content-height` for custom animations.
 *
 * Two kinds of body, freely combined: projected content is always created and keeps its state;
 * an `<ng-template andesCollapsibleLazy>` is created on first open (`forceMount` creates it up
 * front, `unmountOnClose` destroys it after each close animation).
 */
@Component({
  selector: 'andes-collapsible-content',
  imports: [NgTemplateOutlet],
  templateUrl: './collapsible-content.html',
  styleUrl: './collapsible-content.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'collapsible-content',
    '[id]': 'collapsible.contentId',
    '[attr.data-state]': "collapsible.isOpen() ? 'open' : 'closed'",
    '[attr.data-disabled]': "collapsible.isDisabled() ? '' : null",
    '[attr.data-animating]': "animating() ? '' : null",
    '[attr.inert]': "collapsible.isOpen() ? null : ''",
    '(transitionend)': 'onTransitionEnd($event)',
  },
})
export class AndesCollapsibleContent {
  protected readonly collapsible = inject(ANDES_COLLAPSIBLE);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  /** Keep the lazy template created at all times, including before the first open. */
  readonly forceMount = input(false, { transform: booleanAttribute });
  /** Destroy the lazy template once each collapse animation has finished. */
  readonly unmountOnClose = input(false, { transform: booleanAttribute });

  protected readonly lazy = contentChild(AndesCollapsibleLazy);

  private readonly hasOpened = signal(false);
  private readonly closing = signal(false);
  protected readonly animating = signal(false);

  protected readonly renderLazy = computed(() => {
    if (this.forceMount() || this.collapsible.isOpen() || this.closing()) {
      return true;
    }
    return !this.unmountOnClose() && this.hasOpened();
  });

  private settleTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    let first = true;
    let wasOpen = false;
    effect(() => {
      const open = this.collapsible.isOpen();
      untracked(() => {
        const changed = !first && open !== wasOpen;
        first = false;
        wasOpen = open;
        if (open) {
          this.hasOpened.set(true);
          this.closing.set(false);
        }
        if (changed) {
          this.startAnimation(open);
        }
      });
    });

    afterNextRender(() => {
      const inner = this.host.nativeElement
        .firstElementChild as HTMLElement | null;
      if (!inner || typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => {
        const style = this.host.nativeElement.style;
        style.setProperty(
          '--andes-collapsible-content-height',
          `${inner.scrollHeight}px`,
        );
        style.setProperty(
          '--andes-collapsible-content-width',
          `${inner.scrollWidth}px`,
        );
      });
      observer.observe(inner);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    this.destroyRef.onDestroy(() => clearTimeout(this.settleTimer));
  }

  private startAnimation(open: boolean): void {
    clearTimeout(this.settleTimer);
    const duration = this.transitionDuration();
    if (!open && this.unmountOnClose()) {
      this.closing.set(duration > 0);
    }
    if (duration <= 0) {
      this.animating.set(false);
      return;
    }
    this.animating.set(true);
    this.settleTimer = setTimeout(
      () => this.settle(),
      duration + SETTLE_GRACE_MS,
    );
  }

  /** The grid-row transition time currently in effect; 0 under reduced motion or no CSS. */
  private transitionDuration(): number {
    if (typeof getComputedStyle !== 'function') {
      return 0;
    }
    const style = getComputedStyle(this.host.nativeElement);
    return (
      toMilliseconds(style.transitionDuration) +
      toMilliseconds(style.transitionDelay)
    );
  }

  private settle(): void {
    this.animating.set(false);
    this.closing.set(false);
  }

  protected onTransitionEnd(event: TransitionEvent): void {
    // Only this region's own height transition, not one bubbling up from the body.
    if (
      event.target === this.host.nativeElement &&
      event.propertyName === 'grid-template-rows'
    ) {
      clearTimeout(this.settleTimer);
      this.settle();
    }
  }
}
