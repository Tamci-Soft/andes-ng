import { isPlatformBrowser } from '@angular/common';
import {
  computed,
  DestroyRef,
  inject,
  Injectable,
  InjectionToken,
  PLATFORM_ID,
  signal,
  Signal,
} from '@angular/core';

export type AndesBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/** Breakpoint names, smallest first. */
export const ANDES_BREAKPOINT_NAMES: readonly AndesBreakpoint[] = [
  'xs',
  'sm',
  'md',
  'lg',
  'xl',
  'xxl',
];

/**
 * The minimum viewport (or container) width, in pixels, at which each breakpoint starts.
 * Breakpoints are cumulative and mobile-first: `md` applies from 768px up, until `lg` takes over.
 */
export const ANDES_BREAKPOINTS: Readonly<Record<AndesBreakpoint, number>> = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
};

/** A value that is either the same everywhere or set per breakpoint. */
export type AndesResponsive<T> = T | Partial<Record<AndesBreakpoint, T>>;

/** True for a per-breakpoint map (as opposed to a plain value or a tuple). */
export function isAndesResponsiveMap<T>(
  value: AndesResponsive<T> | null | undefined,
): value is Partial<Record<AndesBreakpoint, T>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The largest breakpoint whose minimum width fits `width`. Negative and `NaN` widths count as
 * `xs`.
 */
export function andesBreakpointForWidth(width: number): AndesBreakpoint {
  let current: AndesBreakpoint = 'xs';
  for (const name of ANDES_BREAKPOINT_NAMES) {
    if (width >= ANDES_BREAKPOINTS[name]) {
      current = name;
    }
  }
  return current;
}

/**
 * The breakpoint reported where the viewport cannot be measured (server rendering, tests
 * without `matchMedia`). Override it to match your most common client.
 */
export const ANDES_BREAKPOINT_SSR_DEFAULT = new InjectionToken<AndesBreakpoint>(
  'ANDES_BREAKPOINT_SSR_DEFAULT',
  { providedIn: 'root', factory: () => 'lg' },
);

/**
 * The current viewport breakpoint as a signal, driven by `matchMedia` (one listener per
 * breakpoint, no resize polling). On the server, or where `matchMedia` does not exist, it holds
 * `ANDES_BREAKPOINT_SSR_DEFAULT` and never changes.
 */
@Injectable({ providedIn: 'root' })
export class AndesBreakpointService {
  private readonly state = signal<AndesBreakpoint>(
    inject(ANDES_BREAKPOINT_SSR_DEFAULT),
  );

  /** The largest breakpoint whose minimum width the viewport has reached. */
  readonly current: Signal<AndesBreakpoint> = this.state.asReadonly();

  constructor() {
    if (
      !isPlatformBrowser(inject(PLATFORM_ID)) ||
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return;
    }

    const queries = ANDES_BREAKPOINT_NAMES.filter((name) => name !== 'xs').map(
      (name) => ({
        name,
        list: window.matchMedia(`(min-width: ${ANDES_BREAKPOINTS[name]}px)`),
      }),
    );
    const update = () => {
      let current: AndesBreakpoint = 'xs';
      for (const { name, list } of queries) {
        if (list.matches) {
          current = name;
        }
      }
      this.state.set(current);
    };
    update();

    for (const { list } of queries) {
      list.addEventListener('change', update);
    }
    inject(DestroyRef).onDestroy(() => {
      for (const { list } of queries) {
        list.removeEventListener('change', update);
      }
    });
  }

  /** True once the viewport is at least as wide as `breakpoint`. */
  atLeast(breakpoint: AndesBreakpoint): Signal<boolean> {
    return computed(
      () =>
        ANDES_BREAKPOINT_NAMES.indexOf(this.state()) >=
        ANDES_BREAKPOINT_NAMES.indexOf(breakpoint),
    );
  }
}
