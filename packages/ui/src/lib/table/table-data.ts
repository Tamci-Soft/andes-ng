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

/**
 * A single value a column filter can hold. `null` marks an open bound in the
 * range panels (`[null, 100]` is "up to 100").
 */
export type AndesFilterValue = string | number | boolean | null;

/**
 * Active filters: column id -> the values selected for it. A column with no
 * entry, or an empty array, is not filtered.
 */
export type AndesTableFilters = Readonly<
  Record<string, readonly AndesFilterValue[]>
>;

/** Whether `row` matches one selected filter `value`. */
export type AndesFilterPredicate<TRow> = (
  value: AndesFilterValue,
  row: TRow,
) => boolean;

/**
 * Matches a row against *all* of a column's values at once. The ready-made
 * panels store structured values - an operator plus a text, or the two ends of
 * a range - which only make sense together, so they pair with a matcher rather
 * than with a per-value predicate. Build one with `andesTextFilter`,
 * `andesRangeFilter` or `andesDateRangeFilter`.
 */
export interface AndesColumnFilterMatcher<TRow> {
  readonly matches: (values: readonly AndesFilterValue[], row: TRow) => boolean;
}

/**
 * Column id -> how to test a row, keyed by the `column` of each
 * `andes-table-filter`: a per-value predicate (values OR-ed) or a matcher that
 * sees the column's whole value list.
 */
export type AndesFilterPredicates<TRow> = Readonly<
  Record<string, AndesFilterPredicate<TRow> | AndesColumnFilterMatcher<TRow>>
>;

/**
 * Keeps the rows that pass every active column filter.
 *
 * Within one column the selected values are OR-ed (a row matching any of them
 * passes); across columns they are AND-ed.
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
    active.every(([column, values]) => {
      const test = predicates[column];
      return typeof test === 'function'
        ? values.some((value) => test(value, row))
        : test.matches(values, row);
    }),
  );
}

// Ready-made matchers for the advanced filter panels. Each panel writes a small,
// documented value list, so a server-side data source can read the same state
// with the `andesRead*` helpers instead of matching rows on the client.

/** How `andes-table-text-filter` compares the cell text with the query. */
export type AndesTextFilterOperator =
  'contains' | 'equals' | 'startsWith' | 'endsWith' | 'notContains';

const TEXT_OPERATORS: readonly AndesTextFilterOperator[] = [
  'contains',
  'equals',
  'startsWith',
  'endsWith',
  'notContains',
];

/** Text filter state: stored in the table's filters as `[operator, text]`. */
export interface AndesTextFilterState {
  readonly operator: AndesTextFilterOperator;
  readonly text: string;
}

/** Reads a text filter's `[operator, text]`; `null` when it filters nothing. */
export function andesReadTextFilter(
  values: readonly AndesFilterValue[] | null | undefined,
): AndesTextFilterState | null {
  const [operator, text] = values ?? [];
  if (
    typeof operator !== 'string' ||
    !TEXT_OPERATORS.includes(operator as AndesTextFilterOperator) ||
    text === null ||
    text === undefined ||
    String(text).trim() === ''
  ) {
    return null;
  }
  return {
    operator: operator as AndesTextFilterOperator,
    text: String(text).trim(),
  };
}

/**
 * Case- and accent-insensitive form of a text, so "jose" finds "José" - what
 * people expect from a search box over names and descriptions.
 */
export function andesFoldText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase();
}

/**
 * Matcher for `andes-table-text-filter`: compares `accessor(row)` with the
 * query using the chosen operator, ignoring case and accents.
 */
export function andesTextFilter<TRow>(
  accessor: (row: TRow) => string | number | null | undefined,
): AndesColumnFilterMatcher<TRow> {
  return {
    matches: (values, row) => {
      const state = andesReadTextFilter(values);
      if (!state) {
        return true;
      }
      const cell = andesFoldText(String(accessor(row) ?? ''));
      const query = andesFoldText(state.text);
      switch (state.operator) {
        case 'equals':
          return cell === query;
        case 'startsWith':
          return cell.startsWith(query);
        case 'endsWith':
          return cell.endsWith(query);
        case 'notContains':
          return !cell.includes(query);
        default:
          return cell.includes(query);
      }
    },
  };
}

/** Range filter state: stored as `[min, max]`, `null` for an open end. */
export interface AndesRangeFilterState<T> {
  readonly min: T | null;
  readonly max: T | null;
}

/** Reads a number range filter's `[min, max]`; `null` when both ends are open. */
export function andesReadRangeFilter(
  values: readonly AndesFilterValue[] | null | undefined,
): AndesRangeFilterState<number> | null {
  const [min, max] = values ?? [];
  const end = (value: AndesFilterValue | undefined) =>
    typeof value === 'number' && Number.isFinite(value) ? value : null;
  const state = { min: end(min), max: end(max) };
  return state.min === null && state.max === null ? null : state;
}

/**
 * Matcher for `andes-table-range-filter`: keeps rows whose `accessor(row)` lies
 * within `[min, max]`, both ends inclusive. Rows without a number fail an active
 * range.
 */
export function andesRangeFilter<TRow>(
  accessor: (row: TRow) => number | null | undefined,
): AndesColumnFilterMatcher<TRow> {
  return {
    matches: (values, row) => {
      const range = andesReadRangeFilter(values);
      if (!range) {
        return true;
      }
      const value = accessor(row);
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return false;
      }
      return (
        (range.min === null || value >= range.min) &&
        (range.max === null || value <= range.max)
      );
    },
  };
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Reads a date range filter's `[from, to]` as `YYYY-MM-DD` strings; `null` when
 * both ends are open.
 */
export function andesReadDateRangeFilter(
  values: readonly AndesFilterValue[] | null | undefined,
): AndesRangeFilterState<string> | null {
  const [from, to] = values ?? [];
  const end = (value: AndesFilterValue | undefined) =>
    typeof value === 'string' && ISO_DATE.test(value) ? value : null;
  const state = { min: end(from), max: end(to) };
  return state.min === null && state.max === null ? null : state;
}

/**
 * Calendar day of a date as `YYYY-MM-DD` in local time. A `YYYY-MM-DD` string
 * is returned as is, so a plain date never shifts a day through time zones.
 */
export function andesIsoDate(
  value: Date | string | number | null | undefined,
): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'string' && ISO_DATE.test(value)) {
    return value;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/**
 * Matcher for `andes-table-date-range-filter`: keeps rows whose date falls on or
 * between the chosen days. Compares calendar days, so the time of day never
 * excludes a row on the last day.
 */
export function andesDateRangeFilter<TRow>(
  accessor: (row: TRow) => Date | string | number | null | undefined,
): AndesColumnFilterMatcher<TRow> {
  return {
    matches: (values, row) => {
      const range = andesReadDateRangeFilter(values);
      if (!range) {
        return true;
      }
      const day = andesIsoDate(accessor(row));
      if (day === null) {
        return false;
      }
      return (
        (range.min === null || day >= range.min) &&
        (range.max === null || day <= range.max)
      );
    },
  };
}

/**
 * Per-value predicate for an option list: a row passes a selected value when
 * `accessor(row)` equals it - or, for a multi-valued cell such as tags,
 * contains it.
 */
export function andesOptionFilter<TRow>(
  accessor: (
    row: TRow,
  ) => AndesFilterValue | readonly AndesFilterValue[] | undefined,
): AndesFilterPredicate<TRow> {
  return (value, row) => {
    const cell = accessor(row);
    return Array.isArray(cell) ? cell.includes(value) : cell === value;
  };
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

/**
 * `columns` in the user's `order` of column keys (`AndesTable.columnOrder`), for
 * rendering the header and body cells of a reorderable table. Columns whose key is
 * not in `order` (e.g. a selection column) keep their own position; the others
 * fill the remaining positions in `order`. An empty `order` returns `columns`.
 */
export function andesOrderColumns<TColumn>(
  columns: readonly TColumn[],
  order: readonly string[] | null | undefined,
  keyOf: (column: TColumn) => string | undefined,
): readonly TColumn[] {
  if (!order?.length) {
    return columns;
  }
  const rank = new Map(order.map((key, index) => [key, index]));
  const rankOf = (column: TColumn) => {
    const key = keyOf(column);
    return key === undefined ? undefined : rank.get(key);
  };
  const ordered = columns
    .filter((column) => rankOf(column) !== undefined)
    .sort((a, b) => (rankOf(a) as number) - (rankOf(b) as number));
  let next = 0;
  return columns.map((column) =>
    rankOf(column) === undefined ? column : ordered[next++],
  );
}

/**
 * Moves `key` to where `targetKey` is in `order`: before it when moving toward
 * the start, after it when moving toward the end. Keys missing from `order`
 * leave it unchanged (the same array is returned).
 */
export function andesMoveColumn(
  order: readonly string[],
  key: string,
  targetKey: string,
): readonly string[] {
  const from = order.indexOf(key);
  const to = order.indexOf(targetKey);
  if (from === -1 || to === -1 || from === to) {
    return order;
  }
  const next = order.filter((item) => item !== key);
  const at = next.indexOf(targetKey) + (to > from ? 1 : 0);
  next.splice(at, 0, key);
  return next;
}

/**
 * `order` without the `hidden` keys - the columns to render, in order. Hidden
 * columns stay in the stored order, so they come back where they were.
 */
export function andesVisibleColumns(
  order: readonly string[],
  hidden: readonly string[] | ReadonlySet<string>,
): readonly string[] {
  const skip = hidden instanceof Set ? hidden : new Set(hidden);
  return order.filter((key) => !skip.has(key));
}
