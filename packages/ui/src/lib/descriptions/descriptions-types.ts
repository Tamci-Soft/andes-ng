import { TemplateRef } from '@angular/core';

/** `horizontal` puts a label beside its value, `vertical` stacks them. */
export type AndesDescriptionsLayout = 'horizontal' | 'vertical';

export type AndesDescriptionsSize = 'default' | 'middle' | 'small';

/** Text or a template. */
export type AndesDescriptionsContent = string | TemplateRef<unknown>;

/** Container-width breakpoints, measured on the component itself rather than the window. */
export type AndesDescriptionsBreakpoint =
  'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

/** Column count per breakpoint; a breakpoint left out inherits the next smaller one. */
export type AndesDescriptionsColumns = Partial<
  Record<AndesDescriptionsBreakpoint, number>
>;

/** Minimum container width in px for each breakpoint. */
export const ANDES_DESCRIPTIONS_BREAKPOINTS: Readonly<
  Record<AndesDescriptionsBreakpoint, number>
> = {
  xs: 0,
  sm: 576,
  md: 768,
  lg: 992,
  xl: 1200,
  xxl: 1600,
};

export const ANDES_DESCRIPTIONS_BREAKPOINT_ORDER: readonly AndesDescriptionsBreakpoint[] =
  ['xs', 'sm', 'md', 'lg', 'xl', 'xxl'];

/** An item's span: a number of columns, or `'filled'` for "the rest of the row". */
export type AndesDescriptionsSpan = number | 'filled';

export interface AndesDescriptionsCell {
  /** Position of the item among the items. */
  index: number;
  /** Columns the item covers, after filling. */
  span: number;
}

/**
 * Packs items into rows of `columns` columns.
 *
 * Numeric spans are clamped to `1..columns`; `'filled'` takes whatever is left of its row. An
 * item that does not fit starts a new row, and the item before it grows to close its own row,
 * so every row is exactly `columns` wide.
 */
export function layoutDescriptionRows(
  spans: readonly AndesDescriptionsSpan[],
  columns: number,
): AndesDescriptionsCell[][] {
  const width = Math.max(1, Math.floor(columns) || 1);
  const rows: AndesDescriptionsCell[][] = [];
  let row: AndesDescriptionsCell[] = [];
  let used = 0;

  const closeRow = () => {
    if (row.length > 0) {
      row[row.length - 1].span += width - used;
      rows.push(row);
    }
    row = [];
    used = 0;
  };

  spans.forEach((raw, index) => {
    if (raw === 'filled') {
      const span = width - used;
      row.push({ index, span });
      used += span;
    } else {
      const wanted = Math.min(width, Math.max(1, Math.floor(Number(raw)) || 1));
      if (used + wanted > width) {
        closeRow();
      }
      row.push({ index, span: wanted });
      used += wanted;
    }
    if (used >= width) {
      closeRow();
    }
  });
  closeRow();
  return rows;
}

/**
 * Picks the column count for a container width. Unmeasured containers use the widest breakpoint
 * that has a value.
 */
export function resolveDescriptionsColumns(
  column: number | AndesDescriptionsColumns,
  width: number | null,
  fallback = 3,
): number {
  if (typeof column === 'number') {
    return Math.max(1, Math.floor(column) || 1);
  }
  let current = ANDES_DESCRIPTIONS_BREAKPOINT_ORDER.length - 1;
  if (width !== null) {
    current = 0;
    ANDES_DESCRIPTIONS_BREAKPOINT_ORDER.forEach((name, index) => {
      if (width >= ANDES_DESCRIPTIONS_BREAKPOINTS[name]) {
        current = index;
      }
    });
  }
  for (let index = current; index >= 0; index--) {
    const value = column[ANDES_DESCRIPTIONS_BREAKPOINT_ORDER[index]];
    if (value !== undefined) {
      return Math.max(1, Math.floor(value) || 1);
    }
  }
  return fallback;
}
