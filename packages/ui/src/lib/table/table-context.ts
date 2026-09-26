import { InjectionToken, type Signal } from '@angular/core';

/** Identifies a row for selection and expansion. */
export type AndesTableRowKey = string | number;

/**
 * What `AndesTable` needs to know about each rendered row-selection control to
 * drive "select all": which row it selects, and whether it may be toggled.
 *
 * Provided by `AndesTableSelection` under this token (rather than queried by class)
 * so `AndesTable` can collect them with a content query without importing the
 * selection file, which itself depends on the table - no circular import.
 */
export interface AndesTableSelectable {
  readonly resolvedKey: Signal<AndesTableRowKey | undefined>;
  readonly isDisabled: Signal<boolean>;
}

export const ANDES_TABLE_SELECTABLE = new InjectionToken<AndesTableSelectable>(
  'ANDES_TABLE_SELECTABLE',
);

/**
 * CSS length from a number of pixels or any CSS length string. A unitless numeric
 * string (what a static template attribute such as `fixedOffset="48"` yields) is
 * read as pixels too.
 */
export function andesCssLength(
  value: string | number | null | undefined,
): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return typeof value === 'number' || /^-?\d+(\.\d+)?$/.test(value)
    ? `${value}px`
    : value;
}

/** Edge a column is pinned to while the table scrolls horizontally. */
export type AndesTableFixed = 'start' | 'end';

/** Classes shared by header and data cells for `fixed` and `ellipsis`. */
export function andesCellModifiers(
  fixed: AndesTableFixed | undefined,
  ellipsis: boolean,
): (string | false)[] {
  return [
    !!fixed && 'andes-table__fixed',
    fixed === 'start' && 'andes-table__fixed-start',
    fixed === 'end' && 'andes-table__fixed-end',
    ellipsis && 'andes-table__ellipsis',
  ];
}
