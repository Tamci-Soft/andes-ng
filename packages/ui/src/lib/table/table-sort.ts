/**
 * Sorting contract shared by `AndesTable` and `AndesTableHead`, plus the stable
 * comparator consumers use to derive the sorted rows they render.
 *
 * `AndesTable` deliberately owns only the sort *state* (which column, which
 * direction) and never the data: rows stay in the consumer's own signal/store,
 * exactly like shadcn's plain Table. `andesSortRows` is the pure function that
 * closes the gap without dragging in a headless table engine.
 */

/** Direction a column is currently sorted in. `null` means "not sorted". */
export type AndesSortDirection = 'asc' | 'desc';

/** Which column is sorted, and how. A single column at a time. */
export interface AndesSortState {
  readonly columnId: string;
  readonly direction: AndesSortDirection;
}

/** Value kinds `andesSortRows` knows how to compare. */
export type AndesSortValue =
  string | number | boolean | Date | null | undefined;

/** Reads the sortable value for one column out of a row. */
export type AndesSortAccessor<TRow> = (row: TRow) => AndesSortValue;

/** Column id -> value accessor, keyed by the `sortKey` of each `AndesTableHead`. */
export type AndesSortAccessors<TRow> = Readonly<
  Record<string, AndesSortAccessor<TRow>>
>;

// Locale-aware, with numeric collation so "Item 2" precedes "Item 10". Case- and
// accent-insensitive on purpose: values that differ only in case compare equal and
// therefore keep their original relative order instead of being reshuffled.
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function isEmpty(value: AndesSortValue): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'number' && Number.isNaN(value))
  );
}

function compareValues(a: AndesSortValue, b: AndesSortValue): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }
  if (typeof a === 'boolean' && typeof b === 'boolean') {
    return Number(a) - Number(b);
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }
  return collator.compare(String(a), String(b));
}

/**
 * Sorts `rows` by the column named in `sort`, using the matching accessor.
 *
 * Guarantees:
 * - **Stable**: rows whose sort values compare equal keep their original relative
 *   order, in both directions. Stability is enforced explicitly through an
 *   original-index tiebreaker rather than relying on the engine's `Array#sort`.
 * - **Non-mutating**: `rows` is never touched; the same reference is returned
 *   untouched when there is nothing to sort.
 * - **Empty values last**: `null`/`undefined`/`NaN` sink to the bottom in both
 *   directions, so flipping the direction never floats "no data" to the top.
 */
export function andesSortRows<TRow>(
  rows: readonly TRow[],
  sort: AndesSortState | null | undefined,
  accessors: AndesSortAccessors<TRow>,
): readonly TRow[] {
  if (!sort) {
    return rows;
  }

  const accessor = accessors[sort.columnId];
  if (!accessor) {
    return rows;
  }

  const direction = sort.direction === 'asc' ? 1 : -1;

  return rows
    .map((row, index) => ({ row, index, value: accessor(row) }))
    .sort((a, b) => {
      const aEmpty = isEmpty(a.value);
      const bEmpty = isEmpty(b.value);

      if (aEmpty !== bEmpty) {
        return aEmpty ? 1 : -1;
      }

      if (!aEmpty) {
        const result = compareValues(a.value, b.value);
        if (result !== 0) {
          return result * direction;
        }
      }

      // Ties resolve by original position, never negated by `direction` - that is
      // what makes the sort stable rather than merely deterministic.
      return a.index - b.index;
    })
    .map((entry) => entry.row);
}
