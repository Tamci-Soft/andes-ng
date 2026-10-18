import {
  assertInInjectionContext,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  isSignal,
  PLATFORM_ID,
  signal,
  Signal,
  untracked,
} from '@angular/core';

import {
  AndesElementBox,
  AndesElementMeasure,
  AndesResizeObserver,
} from './resize-observer';

/** What {@link andesElementSize} can watch: an element, its `ElementRef`, or a signal of either. */
export type AndesElementSizeTarget =
  | Element
  | ElementRef<Element>
  | Signal<Element | ElementRef<Element> | null | undefined>;

/** Options for {@link andesElementSize}. */
export interface AndesElementSizeOptions {
  /**
   * The box to measure. `content-box` (default) is the room available to the element's
   * children; `border-box` is the space the element occupies in its parent.
   */
  readonly box?: AndesElementBox;
  /**
   * The size reported before the first measurement and on the server, where nothing can be
   * measured. Defaults to `0 x 0`. Use `measured` to tell a real zero from "not measured yet".
   */
  readonly initial?: AndesElementMeasure;
  /** The injector that owns the observation. Only needed outside an injection context. */
  readonly injector?: Injector;
}

/** The signals returned by {@link andesElementSize}. */
export interface AndesElementSizeRef {
  /** The element's width in CSS pixels. */
  readonly width: Signal<number>;
  /** The element's height in CSS pixels. */
  readonly height: Signal<number>;
  /** Width and height together, for reading both without two dependencies. */
  readonly size: Signal<AndesElementMeasure>;
  /**
   * False until the browser has reported a size for the current element, and again whenever the
   * element goes away or is swapped. Lets callers keep a server-rendered layout rather than
   * collapse to the `initial` size.
   */
  readonly measured: Signal<boolean>;
}

const EMPTY: AndesElementMeasure = { width: 0, height: 0 };

function resolveElement(
  value: Element | ElementRef<Element> | null | undefined,
): Element | null {
  const element = value instanceof ElementRef ? value.nativeElement : value;
  return element && (element as Node).nodeType === 1 ? element : null;
}

/**
 * Tracks an element's size as signals. Replaces a hand-written `ResizeObserver` plus its
 * server guard and teardown.
 *
 * Observation starts when the element exists and stops when it goes away, is swapped for
 * another, or the owning injector is destroyed, so a signal target such as a `viewChild` can
 * come and go freely. All elements share one native observer and updates are coalesced to one
 * per animation frame (see `AndesResizeObserver`). On the server and where `ResizeObserver` is
 * missing nothing is observed and the signals keep `initial`.
 *
 * Must be called in an injection context unless `options.injector` is given.
 */
export function andesElementSize(
  target: AndesElementSizeTarget,
  options: AndesElementSizeOptions = {},
): AndesElementSizeRef {
  if (!options.injector) {
    assertInInjectionContext(andesElementSize);
  }
  const injector = options.injector ?? inject(Injector);
  const initial = options.initial ?? EMPTY;
  const state = signal<AndesElementMeasure>(initial, {
    equal: (a, b) => a.width === b.width && a.height === b.height,
  });
  const measured = signal(false);
  const ref: AndesElementSizeRef = {
    width: computed(() => state().width),
    height: computed(() => state().height),
    size: state.asReadonly(),
    measured: measured.asReadonly(),
  };

  if (injector.get(PLATFORM_ID) !== 'browser') {
    return ref;
  }

  const observer = injector.get(AndesResizeObserver);
  const element = computed(() =>
    resolveElement(isSignal(target) ? target() : target),
  );

  effect(
    (onCleanup) => {
      const current = element();
      untracked(() => {
        state.set(initial);
        measured.set(false);
      });
      if (!current) {
        return;
      }
      const stop = observer.observe(
        current,
        (measure) => {
          state.set(measure);
          measured.set(true);
        },
        { box: options.box },
      );
      onCleanup(stop);
    },
    { injector },
  );

  return ref;
}
