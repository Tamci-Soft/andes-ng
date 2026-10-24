import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  signal,
} from '@angular/core';

import {
  AndesSpinner,
  AndesSpinnerPercent,
  AndesSpinnerSize,
  AndesSpinnerVariant,
  spinnerPercentAttribute,
} from './spinner';

const SCROLLABLE_OVERFLOW = new Set(['auto', 'scroll', 'overlay']);

/** The nearest ancestor that scrolls vertically, or `null` when the page itself scrolls. */
function findScrollParent(element: HTMLElement): HTMLElement | null {
  let current = element.parentElement;
  while (current && current !== element.ownerDocument.body) {
    if (SCROLLABLE_OVERFLOW.has(getComputedStyle(current).overflowY)) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

/**
 * Wraps content and covers it with a loading indicator while `spinning`.
 *
 * - The projected content is dimmed and blurred, set `aria-busy` on the host, and cannot be
 *   clicked or selected while the indicator shows. Keyboard focus is not trapped; disable the
 *   controls that must not be used while loading.
 * - `delay` holds the indicator back so fast loads never flash it. Turning `spinning` off
 *   cancels a pending indicator and hides a visible one at once.
 * - The indicator sits at the centre of the host, and for tall content it sticks to the centre
 *   of the nearest scrolling viewport (the page, or the scrolling ancestor) instead of the
 *   middle of a long list.
 * - `fullscreen` covers the whole viewport with the indicator over a scrim and leaves the
 *   content alone. It is positioned with `position: fixed`, so an ancestor with a `transform`
 *   or `filter` would confine it.
 *
 * Styling hooks: `--andes-spin-scrim` (overlay colour), `--andes-spin-content-opacity`,
 * `--andes-spin-content-blur`, plus the spinner's own hooks.
 */
@Component({
  selector: 'andes-spin',
  imports: [AndesSpinner],
  templateUrl: './spin.html',
  styleUrl: './spin.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-slot]': '"spin"',
    '[attr.data-spinning]': 'visible() ? "" : null',
    '[attr.data-fullscreen]': 'fullscreen() ? "" : null',
    '[attr.aria-busy]': 'spinning() ? "true" : null',
  },
})
export class AndesSpin {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Whether the content is loading. */
  readonly spinning = input(true, { transform: booleanAttribute });
  /** Milliseconds to wait before the indicator shows; 0 shows it immediately. */
  readonly delay = input(0, { transform: numberAttribute });
  readonly tip = input<string | undefined>(undefined);
  readonly variant = input<AndesSpinnerVariant>('ring');
  readonly size = input<AndesSpinnerSize>('md');
  /** Determinate progress (0-100) or `'auto'` for a simulated one. */
  readonly percent = input<AndesSpinnerPercent | undefined, unknown>(
    undefined,
    { transform: spinnerPercentAttribute },
  );
  /** Visually hidden status text when there is no visible `tip`. */
  readonly label = input('Loading');
  /** Cover the whole viewport instead of the projected content. */
  readonly fullscreen = input(false, { transform: booleanAttribute });

  /**
   * Whether the indicator is showing. Immediate without a delay; otherwise it flips on after
   * the delay (see the effect below) and resets whenever `spinning` or `delay` change.
   */
  protected readonly visible = linkedSignal(
    () => this.spinning() && this.delay() <= 0,
  );

  /** Height of the nearest scroller, so the indicator can centre in what the user sees. */
  protected readonly viewportSize = signal<string | null>(null);

  protected readonly dimContent = computed(
    () => this.visible() && !this.fullscreen(),
  );

  constructor() {
    effect((onCleanup) => {
      const delay = this.delay();
      if (!this.spinning() || delay <= 0) {
        return;
      }
      const timer = setTimeout(() => this.visible.set(true), delay);
      onCleanup(() => clearTimeout(timer));
    });

    effect((onCleanup) => {
      this.viewportSize.set(null);
      if (!this.visible() || this.fullscreen()) {
        return;
      }
      const scroller = findScrollParent(this.host.nativeElement);
      if (!scroller || typeof ResizeObserver === 'undefined') {
        return;
      }
      const update = () => this.viewportSize.set(`${scroller.clientHeight}px`);
      update();
      const observer = new ResizeObserver(update);
      observer.observe(scroller);
      onCleanup(() => observer.disconnect());
    });
  }
}
