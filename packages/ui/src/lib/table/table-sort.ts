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

/** Which column is sorted, and how. One entry per sorted column. */
export interface AndesSortState {
  readonly columnId: string;
  readonly direction: AndesSortDirection;
}

/** Value kinds `andesSortRows` knows how to compare. */
export type AndesSortValue =
  string | number | boolean | Date | null | undefined;

/** Reads the sortable value for one column out of a row. */
export type AndesSortAccessor<TRow> = (row: TRow) => AndesSortValue;

/**
 * Full comparator for a column whose order an accessor can't express (Ant's
 * `sorter: (a, b) => number`). `compare` defines the *ascending* order; descending
 * negates it. Empty-value handling is the comparator's own business.
 */
export interface AndesSortComparator<TRow> {
  readonly compare: (a: TRow, b: TRow) => number;
}

/**
 * Column id -> value accessor (or comparator), keyed by the `sortKey` of each
 * `AndesTableHead`.
 */
export type AndesSortAccessors<TRow> = Readonly<
  Record<string, AndesSortAccessor<TRow> | AndesSortComparator<TRow>>
>;

/**
 * Sort input `andesSortRows` accepts: one column (`AndesTable.sort`), several in
 * priority order (`AndesTable.sorts` with `multiSort`), or nothing.
 */
export type AndesSortInput =
  AndesSortState | readonly AndesSortState[] | null | undefined;

/**
 * Next step of a header's sort cycle: each of `directions` in turn, then back to
 * unsorted. Mirrors Ant's `sortDirections`, including its trick of repeating a
 * direction (`['asc', 'desc', 'asc']`) to make a column that never returns to
 * unsorted once activated.
 */
export function andesNextSortDirection(
  current: AndesSortDirection | null,
  directions: readonly AndesSortDirection[],
): AndesSortDirection | null {
  if (directions.length === 0) {
    return null;
  }
  if (current === null) {
    return directions[0];
  }

  const index = directions.indexOf(current);
  return index === -1 || index === directions.length - 1
    ? null
    : directions[index + 1];
}

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

interface SortColumn<TRow> {
  readonly direction: 1 | -1;
  readonly accessor?: AndesSortAccessor<TRow>;
  readonly compare?: (a: TRow, b: TRow) => number;
}

function toColumns<TRow>(
  sort: AndesSortInput,
  accessors: AndesSortAccessors<TRow>,
): SortColumn<TRow>[] {
  const states: readonly AndesSortState[] = !sort
    ? []
    : Array.isArray(sort)
      ? sort
      : [sort as AndesSortState];

  return states.flatMap((state) => {
    const entry = accessors[state.columnId];
    if (!entry) {
      return [];
    }

    const direction = state.direction === 'asc' ? 1 : -1;
    return [
      typeof entry === 'function'
        ? { direction, accessor: entry }
        : { direction, compare: entry.compare },
    ];
  });
}

/**
 * Sorts `rows` by the column(s) named in `sort`, using the matching accessors.
 *
 * With several sort states the first is the primary key and each later one only
 * breaks ties left by the ones before it (Ant's `sorter.multiple` priority).
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
  sort: AndesSortInput,
  accessors: AndesSortAccessors<TRow>,
): readonly TRow[] {
  const columns = toColumns(sort, accessors);
  if (columns.length === 0) {
    return rows;
  }

  return rows
    .map((row, index) => ({
      row,
      index,
      values: columns.map((column) =>
        column.accessor ? column.accessor(row) : undefined,
      ),
    }))
    .sort((a, b) => {
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];

        if (column.compare) {
          const result = column.compare(a.row, b.row);
          if (result !== 0) {
            return result * column.direction;
          }
          continue;
        }

        const aValue = a.values[i];
        const bValue = b.values[i];
        const aEmpty = isEmpty(aValue);
        const bEmpty = isEmpty(bValue);

        if (aEmpty !== bEmpty) {
          return aEmpty ? 1 : -1;
        }

        if (!aEmpty) {
          const result = compareValues(aValue, bValue);
          if (result !== 0) {
            return result * column.direction;
          }
        }
      }

      // Ties resolve by original position, never negated by a direction - that is
      // what makes the sort stable rather than merely deterministic.
      return a.index - b.index;
    })
    .map((entry) => entry.row);
}
