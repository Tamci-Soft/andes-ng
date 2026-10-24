import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';

import { AndesFloatButton } from './float-button';
import {
  AndesFloatButtonShape,
  AndesFloatButtonSize,
  AndesFloatButtonType,
  AndesFloatLength,
} from './float-button-types';

/** What `AndesBackTop` watches and scrolls. */
export type AndesBackTopTarget = HTMLElement | Window | Document;

function scrollTopOf(target: AndesBackTopTarget): number {
  if (typeof Window !== 'undefined' && target instanceof Window) {
    return target.scrollY ?? target.document.documentElement.scrollTop;
  }
  if (typeof Document !== 'undefined' && target instanceof Document) {
    return target.documentElement.scrollTop || target.body.scrollTop;
  }
  return (target as HTMLElement).scrollTop;
}

function scrollTo(target: AndesBackTopTarget, top: number): void {
  if (typeof Window !== 'undefined' && target instanceof Window) {
    target.scrollTo(0, top);
  } else if (typeof Document !== 'undefined' && target instanceof Document) {
    target.documentElement.scrollTop = top;
    target.body.scrollTop = top;
  } else {
    (target as HTMLElement).scrollTop = top;
  }
}

/** Ease-in-out cubic: gentle start and end, no overshoot. */
function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * A float button that appears once the page (or another scroller) has been scrolled past
 * `visibilityHeight` and scrolls it back to the top when pressed.
 *
 * `target` is the scroller to watch and move - the window by default, or any scrollable
 * element. The scroll is animated over `duration` milliseconds with an ease-in-out curve, and
 * jumps instantly when `duration` is 0 or the user prefers reduced motion. Wheel, touch and
 * key input during the animation hand control back to the user. The button fades in and out in
 * 150ms; while hidden it is removed from the tab order and the accessibility tree.
 *
 * It is a float button, so it shares `type`, `shape`, `size` and the safe-area aware position
 * inputs; its default `aria-label` is "Back to top".
 */
@Component({
  selector: 'andes-back-top',
  imports: [AndesFloatButton],
  templateUrl: './back-top.html',
  styleUrl: './back-top.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'back-top',
    '[attr.data-state]': "visible() ? 'visible' : 'hidden'",
  },
})
export class AndesBackTop {
  private readonly destroyRef = inject(DestroyRef);
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The scroller to watch and scroll; the window when omitted. */
  readonly target = input<AndesBackTopTarget | null | undefined>(undefined);
  /** Scroll distance in pixels after which the button shows. */
  readonly visibilityHeight = input(400);
  /** Scroll animation time in milliseconds; 0 jumps. */
  readonly duration = input(450);
  readonly type = input<AndesFloatButtonType>('default');
  readonly shape = input<AndesFloatButtonShape>('circle');
  readonly size = input<AndesFloatButtonSize>('md');
  readonly tooltip = input<string | undefined>(undefined);
  readonly fixed = input(true, { transform: booleanAttribute });
  readonly right = input<AndesFloatLength | undefined>(undefined);
  readonly bottom = input<AndesFloatLength | undefined>(undefined);
  readonly left = input<AndesFloatLength | undefined>(undefined);
  readonly top = input<AndesFloatLength | undefined>(undefined);
  readonly ariaLabel = input('Back to top', { alias: 'aria-label' });

  /** Fires when the button is pressed, before the scroll starts. */
  readonly clicked = output<MouseEvent>();
  /** Fires when the button appears or disappears. */
  readonly visibleChange = output<boolean>();

  private readonly scrollOffset = signal(0);
  /** Whether the button is currently shown. */
  readonly visible = computed(
    () => this.scrollOffset() >= this.visibilityHeight(),
  );

  private frame: number | undefined;
  private cancelScroll: (() => void) | undefined;

  constructor() {
    let first = true;
    effect(() => {
      const visible = this.visible();
      if (first) {
        first = false;
        return;
      }
      untracked(() => this.visibleChange.emit(visible));
    });

    effect((onCleanup) => {
      const scroller = this.resolveTarget();
      if (!scroller) {
        return;
      }
      const update = () => {
        this.scrollOffset.set(scrollTopOf(scroller));
      };
      update();
      scroller.addEventListener('scroll', update, { passive: true });
      onCleanup(() => scroller.removeEventListener('scroll', update));
    });

    afterNextRender(() => {
      // The target can be an element created after this component; look again once rendered.
      this.scrollOffset.set(this.currentScrollTop());
    });

    this.destroyRef.onDestroy(() => this.stop());
  }

  /** Scrolls the target to the top, as pressing the button does. */
  scrollToTop(): void {
    const scroller = this.resolveTarget();
    if (!scroller) {
      return;
    }
    this.stop();
    const from = scrollTopOf(scroller);
    const duration = this.duration();
    if (duration <= 0 || from <= 0 || this.prefersReducedMotion()) {
      scrollTo(scroller, 0);
      return;
    }
    const start = performance.now();
    const cancel = () => this.stop();
    const interrupts = ['wheel', 'touchstart', 'keydown'] as const;
    for (const type of interrupts) {
      scroller.addEventListener(type, cancel, { passive: true, once: true });
    }
    this.cancelScroll = () => {
      for (const type of interrupts) {
        scroller.removeEventListener(type, cancel);
      }
    };
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      scrollTo(scroller, from * (1 - ease(progress)));
      if (progress < 1) {
        this.frame = requestAnimationFrame(step);
      } else {
        this.stop();
      }
    };
    this.frame = requestAnimationFrame(step);
  }

  protected onClick(event: MouseEvent): void {
    this.clicked.emit(event);
    this.scrollToTop();
  }

  private stop(): void {
    if (this.frame !== undefined) {
      cancelAnimationFrame(this.frame);
      this.frame = undefined;
    }
    this.cancelScroll?.();
    this.cancelScroll = undefined;
  }

  private resolveTarget(): AndesBackTopTarget | null {
    const target = this.target();
    if (target) {
      return target;
    }
    const view = this.element.nativeElement.ownerDocument.defaultView;
    return view ?? null;
  }

  private currentScrollTop(): number {
    const scroller = this.resolveTarget();
    return scroller ? scrollTopOf(scroller) : 0;
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
