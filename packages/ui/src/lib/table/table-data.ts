/**
 * Pure row-pipeline helpers that pair with `AndesTable`'s filter and pagination
 * state, the same way `andesSortRows` pairs with its sort state. The table only
 * ever owns *state*; the consumer keeps the rows and derives what to render:
 *
 * ```ts
 * readonly visible = computed(() => {
 *   const filtered = andesFilterRows(this.rows(), this.filters(), predicates);
 *   const sorted = andesSortRows(filtered, this.sort(), accessors);
 *   return andesPaginateRows(sorted, this.page(), 10);
 * });
 * ```
 */

/** A single value a column filter can hold (Ant's `filters[].value`). */
export type AndesFilterValue = string | number | boolean;

/**
 * Active filters: column id -> the values selected for it. A column with no
 * entry, or an empty array, is not filtered.
 */
export type AndesTableFilters = Readonly<
  Record<string, readonly AndesFilterValue[]>
>;

/** Whether `row` matches one selected filter `value` (Ant's `onFilter`). */
export type AndesFilterPredicate<TRow> = (
  value: AndesFilterValue,
  row: TRow,
) => boolean;

/** Column id -> predicate, keyed by the `column` of each `andes-table-filter`. */
export type AndesFilterPredicates<TRow> = Readonly<
  Record<string, AndesFilterPredicate<TRow>>
>;

/**
 * Keeps the rows that pass every active column filter.
 *
 * Within one column the selected values are OR-ed (a row matching any of them
 * passes); across columns they are AND-ed - the same semantics as Ant's Table.
 * Columns without a predicate are ignored. Returns `rows` itself, untouched, when
 * nothing is filtered.
 */
export function andesFilterRows<TRow>(
  rows: readonly TRow[],
  filters: AndesTableFilters | null | undefined,
  predicates: AndesFilterPredicates<TRow>,
): readonly TRow[] {
  const active = Object.entries(filters ?? {}).filter(
    ([column, values]) => values.length > 0 && predicates[column],
  );

  if (active.length === 0) {
    return rows;
  }

  return rows.filter((row) =>
    active.every(([column, values]) =>
      values.some((value) => predicates[column](value, row)),
    ),
  );
}

/** Number of pages needed for `total` rows - never less than 1. */
export function andesPageCount(total: number, pageSize: number): number {
  if (pageSize <= 0) {
    return 1;
  }
  return Math.max(1, Math.ceil(total / pageSize));
}

/**
 * The rows on 1-based `page`. An out-of-range page is clamped to the nearest
 * valid one, so shrinking the data (e.g. after filtering) never yields an empty
 * page while earlier pages still have rows.
 */
export function andesPaginateRows<TRow>(
  rows: readonly TRow[],
  page: number,
  pageSize: number,
): readonly TRow[] {
  if (pageSize <= 0) {
    return rows;
  }

  const lastPage = andesPageCount(rows.length, pageSize);
  const current = Math.min(Math.max(1, Math.floor(page)), lastPage);
  const start = (current - 1) * pageSize;

  return rows.slice(start, start + pageSize);
}
