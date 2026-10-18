/** Pure placement maths for the masonry; no DOM, so every rule can be tested directly. */

export type AndesMasonryBreakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/** Smallest viewport width, in pixels, at which each breakpoint starts. */
export const ANDES_MASONRY_BREAKPOINTS: Record<AndesMasonryBreakpoint, number> =
  {
    xs: 0,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1600,
  };

export const ANDES_MASONRY_BREAKPOINT_ORDER: readonly AndesMasonryBreakpoint[] =
  ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

export type AndesMasonryResponsive<T> =
  T | Partial<Record<AndesMasonryBreakpoint, T>>;

export function andesMasonryBreakpoint(width: number): AndesMasonryBreakpoint {
  let current: AndesMasonryBreakpoint = 'xs';
  for (const name of ANDES_MASONRY_BREAKPOINT_ORDER) {
    if (width >= ANDES_MASONRY_BREAKPOINTS[name]) {
      current = name;
    }
  }
  return current;
}

function isMap<T>(
  value: AndesMasonryResponsive<T>,
): value is Partial<Record<AndesMasonryBreakpoint, T>> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    ANDES_MASONRY_BREAKPOINT_ORDER.some((name) => name in value)
  );
}

/**
 * Picks the value for a breakpoint: its own entry, else the nearest smaller one, else the
 * nearest larger one (so a map that starts at `md` still has an answer on phones).
 */
export function andesMasonryResolve<T>(
  value: AndesMasonryResponsive<T>,
  breakpoint: AndesMasonryBreakpoint,
): T {
  if (!isMap(value)) {
    return value as T;
  }
  const index = ANDES_MASONRY_BREAKPOINT_ORDER.indexOf(breakpoint);
  for (let i = index; i >= 0; i--) {
    const found = value[ANDES_MASONRY_BREAKPOINT_ORDER[i]];
    if (found !== undefined) {
      return found;
    }
  }
  for (let i = index + 1; i < ANDES_MASONRY_BREAKPOINT_ORDER.length; i++) {
    const found = value[ANDES_MASONRY_BREAKPOINT_ORDER[i]];
    if (found !== undefined) {
      return found;
    }
  }
  return undefined as T;
}

export type AndesMasonryGutter = number | [number, number];

export function andesMasonryGutterPair(
  gutter: AndesMasonryGutter | undefined,
): [number, number] {
  if (Array.isArray(gutter)) {
    return [Math.max(0, gutter[0] ?? 0), Math.max(0, gutter[1] ?? 0)];
  }
  const value = Math.max(0, gutter ?? 0);
  return [value, value];
}

export interface AndesMasonryEntry {
  /** Identity used to remember which column an item was given. */
  id: unknown;
  height: number;
  /** Pins the item to this column (0-based). */
  column?: number | undefined;
}

export interface AndesMasonryPlacement {
  column: number;
  x: number;
  y: number;
  width: number;
}

export interface AndesMasonryLayoutResult {
  placements: AndesMasonryPlacement[];
  /** Height of the tallest column, without the trailing gutter. */
  height: number;
  /** Column given to every entry, to be fed back in on the next pass. */
  assignments: Map<unknown, number>;
}

export interface AndesMasonryLayoutOptions {
  entries: readonly AndesMasonryEntry[];
  columns: number;
  /** Width of the container. */
  width: number;
  gutterX: number;
  gutterY: number;
  /** Columns handed out earlier; honoured unless `fresh`. */
  previous?: ReadonlyMap<unknown, number>;
  /** Recompute every column from scratch instead of keeping earlier assignments. */
  fresh?: boolean;
}

/**
 * Shortest-column-first placement. Entries are visited in source order; each goes into the
 * column that is currently shortest (the leftmost on a tie), unless it is pinned or - in the
 * stable mode - already has a column from the previous pass.
 */
export function andesMasonryLayout(
  options: AndesMasonryLayoutOptions,
): AndesMasonryLayoutResult {
  const columns = Math.max(1, Math.floor(options.columns));
  const width = Math.max(0, options.width);
  const columnWidth = Math.max(
    0,
    (width - options.gutterX * (columns - 1)) / columns,
  );
  const heights = new Array<number>(columns).fill(0);
  const assignments = new Map<unknown, number>();
  const placements: AndesMasonryPlacement[] = [];

  for (const entry of options.entries) {
    let column: number | undefined;
    if (entry.column !== undefined && Number.isFinite(entry.column)) {
      column = Math.min(columns - 1, Math.max(0, Math.floor(entry.column)));
    } else if (!options.fresh) {
      const remembered = options.previous?.get(entry.id);
      if (remembered !== undefined && remembered < columns) {
        column = remembered;
      }
    }
    if (column === undefined) {
      column = shortest(heights);
    }
    placements.push({
      column,
      x: column * (columnWidth + options.gutterX),
      y: heights[column],
      width: columnWidth,
    });
    heights[column] += Math.max(0, entry.height) + options.gutterY;
    assignments.set(entry.id, column);
  }

  const tallest = options.entries.length
    ? Math.max(...heights) - options.gutterY
    : 0;
  return { placements, height: Math.max(0, tallest), assignments };
}

function shortest(heights: readonly number[]): number {
  let index = 0;
  for (let i = 1; i < heights.length; i++) {
    if (heights[i] < heights[index] - 0.01) {
      index = i;
    }
  }
  return index;
}
