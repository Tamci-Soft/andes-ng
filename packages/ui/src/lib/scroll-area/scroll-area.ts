import {
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
  viewChild,
} from '@angular/core';

export type AndesScrollAreaType = 'auto' | 'always' | 'scroll' | 'hover';
export type AndesScrollAreaOrientation = 'vertical' | 'horizontal' | 'both';

/** Scroll state reported by `(scrolled)`. `left` is the distance from the inline start edge,
 *  so it is positive in right-to-left layouts too. */
export interface AndesScrollPosition {
  top: number;
  left: number;
  scrollHeight: number;
  scrollWidth: number;
  clientHeight: number;
  clientWidth: number;
  atTop: boolean;
  atBottom: boolean;
  atStart: boolean;
  atEnd: boolean;
}

interface AxisMetrics {
  overflow: boolean;
  /** Thumb length in px. */
  thumb: number;
  /** Thumb distance from the start of the track, in px. */
  offset: number;
  /** Space the thumb can travel (track minus thumb). */
  travel: number;
  /** Scrollable distance of the content (content minus viewport). */
  range: number;
  atStart: boolean;
  atEnd: boolean;
}

const NO_OVERFLOW: AxisMetrics = {
  overflow: false,
  thumb: 0,
  offset: 0,
  travel: 0,
  range: 0,
  atStart: true,
  atEnd: true,
};

type Axis = 'vertical' | 'horizontal';

function axisMetrics(
  client: number,
  size: number,
  position: number,
  track: number,
  minThumb: number,
): AxisMetrics {
  const range = size - client;
  if (client <= 0 || range <= 1 || track <= 0) {
    return { ...NO_OVERFLOW, atStart: position <= 0, atEnd: true };
  }
  const thumb = Math.min(track, Math.max(minThumb, (track * client) / size));
  const travel = track - thumb;
  const clamped = Math.min(range, Math.max(0, position));
  return {
    overflow: true,
    thumb,
    offset: (clamped / range) * travel,
    travel,
    range,
    atStart: position <= 0,
    atEnd: position >= range - 1,
  };
}

/**
 * A scrollable region with slim, themed overlay scrollbars.
 *
 * The content scrolls in a real native scroll container, so wheel, touch, keyboard and
 * `scrollTo` behave exactly as in the browser (and the container is focusable, so arrow keys
 * work). The native scrollbars are hidden and replaced by thin bars drawn on top of the content,
 * which take no layout space, so showing or hiding them never reflows the content.
 *
 * The bars are pointer aids and are hidden from assistive technology; the thumb can be dragged
 * (pointer capture) and a press on the track pages towards it. Bars follow the content through
 * a `ResizeObserver` and mirror in right-to-left layouts.
 *
 * `type` decides when they show: `auto` while the content overflows, `always` regardless,
 * `scroll` while scrolling or hovered, `hover` while the pointer is over the area (`hideDelay`
 * ms after leaving or after scrolling stops). Give the host a height (or `max-height`) so there
 * is something to scroll.
 */
@Component({
  selector: 'andes-scroll-area',
  templateUrl: './scroll-area.html',
  styleUrl: './scroll-area.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'scroll-area',
    '[attr.data-type]': 'type()',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-rtl]': "rtl() ? '' : null",
    '[attr.data-scrolling]': "scrolling() ? '' : null",
    '[attr.data-dragging]': "dragging() ? '' : null",
    '(pointerenter)': 'onHostEnter()',
    '(pointerleave)': 'onHostLeave()',
  },
})
export class AndesScrollArea {
  private readonly destroyRef = inject(DestroyRef);

  /** When the scrollbars show; see the class description. */
  readonly type = input<AndesScrollAreaType>('auto');
  /** Which axes scroll. */
  readonly orientation = input<AndesScrollAreaOrientation>('vertical');
  /** Milliseconds before `scroll` and `hover` bars hide again. */
  readonly hideDelay = input(600);
  /** Smallest thumb length in px, so a long document still leaves something to grab. */
  readonly minThumbSize = input(24);
  /** Fade a soft shadow in at each edge the content can still scroll towards. */
  readonly edgeShadow = input(false, { transform: booleanAttribute });
  /** Make the scroller a tab stop so keyboard users can scroll it. */
  readonly focusable = input(true, { transform: booleanAttribute });
  /** Accessible name; also gives the scroller `role="region"`. */
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });
  /** CSS class(es) added to both scrollbars (tracks). */
  readonly scrollbarClass = input<string | string[]>('');
  /** CSS class(es) added to both thumbs. */
  readonly thumbClass = input<string | string[]>('');
  /** CSS class(es) added to the native scroll container. */
  readonly viewportClass = input<string | string[]>('');
  /** CSS class(es) added to the wrapper around the projected content. */
  readonly contentClass = input<string | string[]>('');

  /** Emits on every scroll with the new position. */
  readonly scrolled = output<AndesScrollPosition>();

  private readonly viewportRef = viewChild<ElementRef<HTMLElement>>('viewport');
  private readonly contentRef = viewChild<ElementRef<HTMLElement>>('content');
  private readonly verticalBar =
    viewChild<ElementRef<HTMLElement>>('verticalBar');
  private readonly horizontalBar =
    viewChild<ElementRef<HTMLElement>>('horizontalBar');

  protected readonly showVertical = computed(
    () => this.orientation() !== 'horizontal',
  );
  protected readonly showHorizontal = computed(
    () => this.orientation() !== 'vertical',
  );
  protected readonly showCorner = computed(() => this.orientation() === 'both');

  protected readonly vertical = signal<AxisMetrics>(NO_OVERFLOW);
  protected readonly horizontal = signal<AxisMetrics>(NO_OVERFLOW);
  protected readonly rtl = signal(false);

  private readonly hovered = signal(false);
  protected readonly scrolling = signal(false);
  private readonly barHovered = signal(false);
  protected readonly dragging = signal(false);

  private readonly timers: Partial<
    Record<'hover' | 'scroll' | 'bar', ReturnType<typeof setTimeout>>
  > = {};

  protected readonly verticalState = computed(() =>
    this.visible(this.vertical()) ? 'visible' : 'hidden',
  );
  protected readonly horizontalState = computed(() =>
    this.visible(this.horizontal()) ? 'visible' : 'hidden',
  );

  protected readonly verticalThumbStyle = computed(() => {
    const m = this.vertical();
    return {
      height: `${m.thumb}px`,
      transform: `translateY(${m.offset}px)`,
      display: m.overflow ? null : 'none',
    };
  });
  protected readonly horizontalThumbStyle = computed(() => {
    const m = this.horizontal();
    const offset = this.rtl() ? -m.offset : m.offset;
    return {
      width: `${m.thumb}px`,
      transform: `translateX(${offset}px)`,
      display: m.overflow ? null : 'none',
    };
  });

  private drag:
    | {
        axis: Axis;
        pointerId: number;
        startPointer: number;
        startPosition: number;
      }
    | undefined;

  constructor() {
    effect((onCleanup) => {
      const viewport = this.viewportRef()?.nativeElement;
      const content = this.contentRef()?.nativeElement;
      // Re-measure when anything that changes the geometry changes.
      this.orientation();
      this.minThumbSize();
      this.verticalBar();
      this.horizontalBar();
      if (!viewport) {
        return;
      }
      this.update();
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => this.update());
      observer.observe(viewport);
      if (content) {
        observer.observe(content);
      }
      onCleanup(() => observer.disconnect());
    });

    this.destroyRef.onDestroy(() => {
      for (const timer of Object.values(this.timers)) {
        clearTimeout(timer);
      }
    });
  }

  /** The native scroll container, for anything the API does not cover. */
  get viewport(): HTMLElement | null {
    return this.viewportRef()?.nativeElement ?? null;
  }

  /** Scrolls like `Element.scrollTo`. `behavior: 'smooth'` is ignored under reduced motion. */
  scrollTo(options: ScrollToOptions): void {
    const viewport = this.viewport;
    if (!viewport) {
      return;
    }
    const behavior = this.prefersReducedMotion() ? 'auto' : options.behavior;
    const resolved = { ...options, behavior };
    if (typeof viewport.scrollTo === 'function') {
      viewport.scrollTo(resolved);
    } else {
      if (options.top !== undefined) {
        viewport.scrollTop = options.top;
      }
      if (options.left !== undefined) {
        viewport.scrollLeft = options.left;
      }
    }
  }

  /** Scrolls like `Element.scrollBy`. */
  scrollBy(options: ScrollToOptions): void {
    const viewport = this.viewport;
    if (!viewport) {
      return;
    }
    this.scrollTo({
      ...options,
      top:
        options.top === undefined
          ? undefined
          : viewport.scrollTop + options.top,
      left:
        options.left === undefined
          ? undefined
          : viewport.scrollLeft + options.left,
    });
  }

  scrollToTop(behavior: ScrollBehavior = 'auto'): void {
    this.scrollTo({ top: 0, behavior });
  }

  scrollToBottom(behavior: ScrollBehavior = 'auto'): void {
    const viewport = this.viewport;
    if (viewport) {
      this.scrollTo({ top: viewport.scrollHeight, behavior });
    }
  }

  /** Re-reads the geometry and repositions the thumbs. Done automatically on scroll and resize. */
  update(): void {
    const viewport = this.viewport;
    if (!viewport) {
      return;
    }
    const rtl =
      typeof getComputedStyle === 'function' &&
      getComputedStyle(viewport).direction === 'rtl';
    this.rtl.set(rtl);
    const min = this.minThumbSize();
    this.vertical.set(
      this.showVertical()
        ? axisMetrics(
            viewport.clientHeight,
            viewport.scrollHeight,
            viewport.scrollTop,
            this.verticalBar()?.nativeElement.clientHeight ?? 0,
            min,
          )
        : NO_OVERFLOW,
    );
    this.horizontal.set(
      this.showHorizontal()
        ? axisMetrics(
            viewport.clientWidth,
            viewport.scrollWidth,
            Math.abs(viewport.scrollLeft),
            this.horizontalBar()?.nativeElement.clientWidth ?? 0,
            min,
          )
        : NO_OVERFLOW,
    );
  }

  protected onScroll(): void {
    this.update();
    this.scrolling.set(true);
    this.later('scroll', () => this.scrolling.set(false));
    const viewport = this.viewport;
    if (viewport) {
      const v = this.vertical();
      const h = this.horizontal();
      this.scrolled.emit({
        top: viewport.scrollTop,
        left: Math.abs(viewport.scrollLeft),
        scrollHeight: viewport.scrollHeight,
        scrollWidth: viewport.scrollWidth,
        clientHeight: viewport.clientHeight,
        clientWidth: viewport.clientWidth,
        atTop: v.atStart,
        atBottom: v.atEnd,
        atStart: h.atStart,
        atEnd: h.atEnd,
      });
    }
  }

  protected onHostEnter(): void {
    clearTimeout(this.timers.hover);
    this.hovered.set(true);
  }

  protected onHostLeave(): void {
    this.later('hover', () => this.hovered.set(false));
  }

  protected onBarEnter(): void {
    clearTimeout(this.timers.bar);
    this.barHovered.set(true);
  }

  protected onBarLeave(): void {
    this.later('bar', () => this.barHovered.set(false));
  }

  /** A press on the empty track pages towards the pointer; the thumb itself is handled apart. */
  protected onTrackPointerDown(event: PointerEvent, axis: Axis): void {
    if (event.button !== 0 || event.target !== event.currentTarget) {
      return;
    }
    const viewport = this.viewport;
    if (!viewport) {
      return;
    }
    const track = event.currentTarget as HTMLElement;
    const rect = track.getBoundingClientRect();
    const metrics = axis === 'vertical' ? this.vertical() : this.horizontal();
    let pointer: number;
    if (axis === 'vertical') {
      pointer = event.clientY - rect.top;
    } else {
      pointer = this.rtl()
        ? rect.right - event.clientX
        : event.clientX - rect.left;
    }
    const direction = pointer < metrics.offset ? -1 : 1;
    if (
      pointer >= metrics.offset &&
      pointer <= metrics.offset + metrics.thumb
    ) {
      return;
    }
    event.preventDefault();
    if (axis === 'vertical') {
      this.scrollBy({
        top: direction * viewport.clientHeight,
        behavior: 'smooth',
      });
    } else {
      const sign = this.rtl() ? -1 : 1;
      this.scrollBy({
        left: sign * direction * viewport.clientWidth,
        behavior: 'smooth',
      });
    }
  }

  protected onThumbPointerDown(event: PointerEvent, axis: Axis): void {
    const viewport = this.viewport;
    if (event.button !== 0 || !viewport) {
      return;
    }
    event.preventDefault();
    try {
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    } catch {
      // A pointer that already ended cannot be captured; the drag still tracks moves.
    }
    this.drag = {
      axis,
      pointerId: event.pointerId,
      startPointer: axis === 'vertical' ? event.clientY : event.clientX,
      startPosition:
        axis === 'vertical'
          ? viewport.scrollTop
          : Math.abs(viewport.scrollLeft),
    };
    this.dragging.set(true);
  }

  protected onThumbPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    const viewport = this.viewport;
    if (!drag || !viewport || event.pointerId !== drag.pointerId) {
      return;
    }
    const metrics =
      drag.axis === 'vertical' ? this.vertical() : this.horizontal();
    if (metrics.travel <= 0) {
      return;
    }
    const pointer = drag.axis === 'vertical' ? event.clientY : event.clientX;
    let delta = pointer - drag.startPointer;
    if (drag.axis === 'horizontal' && this.rtl()) {
      delta = -delta;
    }
    const position = Math.min(
      metrics.range,
      Math.max(
        0,
        drag.startPosition + (delta * metrics.range) / metrics.travel,
      ),
    );
    if (drag.axis === 'vertical') {
      viewport.scrollTop = position;
    } else {
      viewport.scrollLeft = this.rtl() ? -position : position;
    }
  }

  protected onThumbPointerEnd(event: PointerEvent): void {
    if (this.drag && event.pointerId === this.drag.pointerId) {
      (event.currentTarget as HTMLElement).releasePointerCapture?.(
        event.pointerId,
      );
      this.drag = undefined;
      this.dragging.set(false);
    }
  }

  private visible(metrics: AxisMetrics): boolean {
    switch (this.type()) {
      case 'always':
        return true;
      case 'auto':
        return metrics.overflow;
      case 'scroll':
        return (
          metrics.overflow &&
          (this.scrolling() || this.dragging() || this.barHovered())
        );
      case 'hover':
        return (
          metrics.overflow &&
          (this.hovered() || this.scrolling() || this.dragging())
        );
    }
  }

  private later(key: 'hover' | 'scroll' | 'bar', action: () => void): void {
    clearTimeout(this.timers[key]);
    this.timers[key] = setTimeout(action, this.hideDelay());
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }
}
