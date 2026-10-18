import {
  assertInInjectionContext,
  effect,
  inject,
  Injector,
  isSignal,
  PLATFORM_ID,
  signal,
  Signal,
} from '@angular/core';

/** Options for {@link andesMediaQuery} and the ready-made preference signals. */
export interface AndesMediaQueryOptions {
  /**
   * The value reported where the query cannot be evaluated: server rendering, or a browser
   * without `matchMedia`. It is also what the signal holds until the first evaluation. Defaults
   * to `false`, i.e. "the condition does not hold", which for preference queries means the
   * default experience.
   */
  readonly ssrDefault?: boolean;
  /**
   * The injector that owns the listener. Only needed when calling outside an injection context;
   * the listener is removed when this injector is destroyed.
   */
  readonly injector?: Injector;
}

/** `window.matchMedia`, or `null` where there is no browser window to ask. */
function matchMediaFor(
  platformId: unknown,
): ((query: string) => MediaQueryList) | null {
  if (
    platformId !== 'browser' ||
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function'
  ) {
    return null;
  }
  return (query) => window.matchMedia(query);
}

/**
 * Whether a CSS media query currently matches, as a signal that stays in sync.
 *
 * The first value is read synchronously, so the first render already uses the right answer
 * instead of flashing the default. After that one `change` listener keeps it current; it is
 * removed when the query changes (a `Signal` query) and when the owning injector is destroyed.
 * Where `matchMedia` is unavailable the signal holds `ssrDefault` and nothing is registered.
 *
 * Must be called in an injection context unless `options.injector` is given.
 *
 * @param query A media query string, or a signal of one for queries that depend on an input.
 */
export function andesMediaQuery(
  query: string | Signal<string>,
  options: AndesMediaQueryOptions = {},
): Signal<boolean> {
  if (!options.injector) {
    assertInInjectionContext(andesMediaQuery);
  }
  const injector = options.injector ?? inject(Injector);
  const ssrDefault = options.ssrDefault ?? false;
  const matchMedia = matchMediaFor(injector.get(PLATFORM_ID));
  const read = isSignal(query) ? query : () => query;

  const matches = signal(matchMedia ? matchMedia(read()).matches : ssrDefault);
  if (!matchMedia) {
    return matches.asReadonly();
  }

  effect(
    (onCleanup) => {
      const list = matchMedia(read());
      matches.set(list.matches);
      const listener = (event: MediaQueryListEvent) =>
        matches.set(event.matches);
      list.addEventListener('change', listener);
      onCleanup(() => list.removeEventListener('change', listener));
    },
    { injector },
  );

  return matches.asReadonly();
}

/**
 * Whether the user asked the system to reduce motion. Components consult it before running
 * non-essential animation or smooth scrolling.
 */
export function andesPrefersReducedMotion(
  options?: AndesMediaQueryOptions,
): Signal<boolean> {
  return andesMediaQuery('(prefers-reduced-motion: reduce)', options);
}

/** Whether the system is set to a dark color scheme. */
export function andesPrefersDark(
  options?: AndesMediaQueryOptions,
): Signal<boolean> {
  return andesMediaQuery('(prefers-color-scheme: dark)', options);
}

/** Whether the user asked for higher contrast than the default. */
export function andesPrefersContrast(
  options?: AndesMediaQueryOptions,
): Signal<boolean> {
  return andesMediaQuery('(prefers-contrast: more)', options);
}
