import {
  assertInInjectionContext,
  computed,
  inject,
  Injector,
  isSignal,
  Signal,
} from '@angular/core';

import {
  andesElementSize,
  AndesElementSizeOptions,
  AndesElementSizeTarget,
} from './element-size';

/** Options for {@link andesContainerBreakpoint}. */
export interface AndesContainerBreakpointOptions<K extends string> extends Pick<
  AndesElementSizeOptions,
  'box' | 'injector'
> {
  /**
   * The bucket reported before the element is measured and on the server. Defaults to the
   * smallest bucket, the safe choice for a "collapse when narrow" layout that is then expanded
   * once the real width is known.
   */
  readonly initial?: NoInfer<K>;
}

/**
 * The bucket whose minimum width is the largest one that `width` still reaches, or the
 * smallest bucket when `width` is below all of them. Throws on an empty map.
 */
function bucketFor<K extends string>(
  buckets: Readonly<Record<K, number>>,
  width: number,
): K {
  const entries = Object.entries(buckets) as [K, number][];
  if (entries.length === 0) {
    throw new Error('andesContainerBreakpoint needs at least one bucket.');
  }
  let smallest = entries[0];
  let best: [K, number] | null = null;
  for (const entry of entries) {
    if (entry[1] < smallest[1]) {
      smallest = entry;
    }
    if (width >= entry[1] && (best === null || entry[1] > best[1])) {
      best = entry;
    }
  }
  return (best ?? smallest)[0];
}

/**
 * The container-width bucket an element currently falls in, for components that adapt to the
 * room they are given rather than to the viewport (collapsing pagination, a grid row inside a
 * narrow sidebar).
 *
 * `buckets` maps a name to the minimum width at which it starts, mobile-first like the viewport
 * breakpoints, so `ANDES_BREAKPOINTS` works as is and `{ compact: 0, full: 480 }` is a
 * two-state switch. The signal changes only when the element crosses a threshold, not on every
 * pixel, so effects and templates reading it stay quiet while the element resizes inside a
 * bucket. Pass a signal for `buckets` when the thresholds come from inputs.
 *
 * Must be called in an injection context unless `options.injector` is given.
 */
export function andesContainerBreakpoint<K extends string>(
  element: AndesElementSizeTarget,
  buckets: Readonly<Record<K, number>> | Signal<Readonly<Record<K, number>>>,
  options: AndesContainerBreakpointOptions<K> = {},
): Signal<K> {
  if (!options.injector) {
    assertInInjectionContext(andesContainerBreakpoint);
  }
  const injector = options.injector ?? inject(Injector);
  const sizing = andesElementSize(element, {
    box: options.box,
    injector,
  });
  const resolve = (): Readonly<Record<K, number>> =>
    isSignal(buckets) ? buckets() : buckets;

  return computed(() => {
    const current = resolve();
    if (!sizing.measured()) {
      return options.initial ?? bucketFor(current, -Infinity);
    }
    return bucketFor(current, sizing.width());
  });
}
