/** Not part of the public API: the grid owns the exported breakpoint table. */
export type AndesLayoutBreakpoint = 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export const LAYOUT_BREAKPOINT_WIDTHS: Readonly<
  Record<AndesLayoutBreakpoint, number>
> = { sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1600 };

/** `(max-width: ...)` query that is true while the viewport is narrower than `breakpoint`. */
export function belowBreakpointQuery(
  breakpoint: AndesLayoutBreakpoint,
): string {
  return `(max-width: ${LAYOUT_BREAKPOINT_WIDTHS[breakpoint] - 0.02}px)`;
}

/** A number is pixels; a string is any CSS length. */
export function toCssLength(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value;
}

export type AndesLayoutPosition = 'static' | 'sticky' | 'fixed';
