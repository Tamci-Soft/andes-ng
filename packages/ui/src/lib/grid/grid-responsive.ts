import {
  ANDES_BREAKPOINT_NAMES,
  AndesBreakpoint,
  AndesResponsive,
  isAndesResponsiveMap,
} from './breakpoints';

/**
 * The value that applies at `active`: the entry of the largest breakpoint at or below it, or
 * `undefined` when the map has none (the caller then falls back to its base value).
 */
export function andesResolveResponsive<T>(
  value: AndesResponsive<T> | null | undefined,
  active: AndesBreakpoint,
): T | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (!isAndesResponsiveMap(value)) {
    return value;
  }
  const limit = ANDES_BREAKPOINT_NAMES.indexOf(active);
  for (let i = limit; i >= 0; i--) {
    const entry = value[ANDES_BREAKPOINT_NAMES[i]];
    if (entry !== undefined) {
      return entry;
    }
  }
  return undefined;
}

/**
 * Writes a responsive value as CSS custom properties: `--name` for a plain value and
 * `--name-sm`, `--name-md`... for a map. The stylesheet picks the right one with media queries,
 * so the layout is correct before any script runs. With `active` set (container mode) the map
 * is resolved here instead and only `--name` is written.
 */
export function andesResponsiveVars<T>(
  out: Record<string, string>,
  name: string,
  value: AndesResponsive<T> | null | undefined,
  convert: (value: T) => string | null,
  active: AndesBreakpoint | null,
): void {
  if (value === null || value === undefined) {
    return;
  }
  if (isAndesResponsiveMap(value) && active === null) {
    for (const breakpoint of ANDES_BREAKPOINT_NAMES) {
      const entry = value[breakpoint];
      const css = entry === undefined ? null : convert(entry);
      if (css !== null) {
        out[`--${name}-${breakpoint}`] = css;
      }
    }
    return;
  }
  const resolved =
    active === null ? (value as T) : andesResolveResponsive(value, active);
  const css = resolved === undefined ? null : convert(resolved);
  if (css !== null) {
    out[`--${name}`] = css;
  }
}

/** A gutter or gap component: pixels for a number, any CSS length for a string. */
export function andesLength(value: number | string): string | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? `${value}px` : null;
  }
  return value.trim() === '' ? null : value;
}
