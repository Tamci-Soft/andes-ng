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

/** The names of Andes' responsive breakpoints. */
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
 * Breakpoints are cumulative and mobile-first: `md` applies from 768px up, until `lg` takes
 * over. One table shared by every component keeps "mobile" meaning the same width everywhere.
 */
export const ANDES_BREAKPOINTS: Readonly<Record<AndesBreakpoint, number>> = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
};

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
 * The breakpoint reported where the viewport cannot be measured (server rendering, browsers
 * without `matchMedia`). Override it to match your most common client so the server-rendered
 * markup is the one most users keep.
 */
export const ANDES_BREAKPOINT_SSR_DEFAULT = new InjectionToken<AndesBreakpoint>(
  'ANDES_BREAKPOINT_SSR_DEFAULT',
  {
    providedIn: 'root',
    factory: () => 'lg',
  },
);

function indexOfBreakpoint(name: AndesBreakpoint): number {
  const index = ANDES_BREAKPOINT_NAMES.indexOf(name);
  if (index < 0) {
    throw new Error(`Unknown Andes breakpoint "${String(name)}".`);
  }
  return index;
}

/**
 * The current viewport breakpoint and ready-made "at least / narrower than / in range" signals,
 * shared by the whole application.
 *
 * It listens to one `matchMedia` query per breakpoint (never to `resize`), so nothing runs
 * while the viewport stays inside a breakpoint, and the listeners are removed with the root
 * injector. On the server, or where `matchMedia` does not exist, `active` holds
 * `ANDES_BREAKPOINT_SSR_DEFAULT` and never changes.
 *
 * The comparisons are half-open on purpose: `up(x)` is true from the start of `x`, `down(x)` is
 * true strictly before it, so `down(x)` is always `!up(x)` and `between(a, b)` ranges never
 * overlap or leave a gap when chained (`between('sm', 'md')` then `between('md', 'lg')`).
 */
@Injectable({ providedIn: 'root' })
export class AndesBreakpoints {
  private readonly state = signal<AndesBreakpoint>(
    inject(ANDES_BREAKPOINT_SSR_DEFAULT),
  );
  private readonly comparisons = new Map<string, Signal<boolean>>();

  /** The largest breakpoint whose minimum width the viewport has reached. */
  readonly active: Signal<AndesBreakpoint> = this.state.asReadonly();

  constructor() {
    if (
      inject(PLATFORM_ID) !== 'browser' ||
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

  /**
   * True once the viewport is at least as wide as `name` (`up('md')` is true from 768px).
   * `up('xs')` is always true. Repeated calls with the same name return the same signal.
   */
  up(name: AndesBreakpoint): Signal<boolean> {
    const index = indexOfBreakpoint(name);
    return this.memo(`up:${name}`, () =>
      computed(() => indexOfBreakpoint(this.state()) >= index),
    );
  }

  /**
   * True while the viewport is narrower than `name` (`down('lg')` is true below 992px, the
   * usual "collapse on small screens" test). `down('xs')` is always false.
   */
  down(name: AndesBreakpoint): Signal<boolean> {
    const index = indexOfBreakpoint(name);
    return this.memo(`down:${name}`, () =>
      computed(() => indexOfBreakpoint(this.state()) < index),
    );
  }

  /**
   * True from the start of `from` until the start of `to` (`between('sm', 'lg')` covers 576px
   * up to, but excluding, 992px). A range that is empty or reversed (`from` not below `to`) is
   * never true, rather than being silently swapped.
   */
  between(from: AndesBreakpoint, to: AndesBreakpoint): Signal<boolean> {
    const start = indexOfBreakpoint(from);
    const end = indexOfBreakpoint(to);
    return this.memo(`between:${from}:${to}`, () =>
      computed(() => {
        const current = indexOfBreakpoint(this.state());
        return current >= start && current < end;
      }),
    );
  }

  private memo(key: string, create: () => Signal<boolean>): Signal<boolean> {
    let existing = this.comparisons.get(key);
    if (!existing) {
      existing = create();
      this.comparisons.set(key, existing);
    }
    return existing;
  }
}
