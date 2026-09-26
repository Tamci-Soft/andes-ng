import {
  andesFilterRows,
  andesPageCount,
  andesPaginateRows,
  type AndesFilterPredicates,
} from './table-data';

interface Row {
  readonly id: string;
  readonly status: 'paid' | 'pending' | 'overdue';
  readonly method: string;
}

const ROWS: readonly Row[] = [
  { id: 'a', status: 'paid', method: 'card' },
  { id: 'b', status: 'pending', method: 'transfer' },
  { id: 'c', status: 'overdue', method: 'transfer' },
  { id: 'd', status: 'paid', method: 'transfer' },
];

const PREDICATES: AndesFilterPredicates<Row> = {
  status: (value, row) => row.status === value,
  method: (value, row) => row.method === value,
};

const ids = (rows: readonly Row[]) => rows.map((row) => row.id);

describe('andesFilterRows', () => {
  it('returns the original reference when nothing is filtered', () => {
    expect(andesFilterRows(ROWS, {}, PREDICATES)).toBe(ROWS);
    expect(andesFilterRows(ROWS, null, PREDICATES)).toBe(ROWS);
    expect(andesFilterRows(ROWS, { status: [] }, PREDICATES)).toBe(ROWS);
  });

  it('ignores columns that have no predicate', () => {
    expect(andesFilterRows(ROWS, { unknown: ['x'] }, PREDICATES)).toBe(ROWS);
  });

  it('ORs the values selected within one column', () => {
    expect(
      ids(andesFilterRows(ROWS, { status: ['paid', 'overdue'] }, PREDICATES)),
    ).toEqual(['a', 'c', 'd']);
  });

  it('ANDs filters across columns', () => {
    expect(
      ids(
        andesFilterRows(
          ROWS,
          { status: ['paid'], method: ['transfer'] },
          PREDICATES,
        ),
      ),
    ).toEqual(['d']);
  });

  it('never mutates its input', () => {
    const input = [...ROWS];
    andesFilterRows(input, { status: ['paid'] }, PREDICATES);

    expect(ids(input)).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('andesPageCount', () => {
  it('rounds up and never reports fewer than one page', () => {
    expect(andesPageCount(0, 10)).toBe(1);
    expect(andesPageCount(10, 10)).toBe(1);
    expect(andesPageCount(11, 10)).toBe(2);
    expect(andesPageCount(5, 0)).toBe(1);
  });
});

describe('andesPaginateRows', () => {
  const rows = Array.from({ length: 7 }, (_, i) => i + 1);

  it('returns the rows of a 1-based page', () => {
    expect(andesPaginateRows(rows, 1, 3)).toEqual([1, 2, 3]);
    expect(andesPaginateRows(rows, 2, 3)).toEqual([4, 5, 6]);
    expect(andesPaginateRows(rows, 3, 3)).toEqual([7]);
  });

  it('clamps an out-of-range page to the nearest valid one', () => {
    expect(andesPaginateRows(rows, 9, 3)).toEqual([7]);
    expect(andesPaginateRows(rows, 0, 3)).toEqual([1, 2, 3]);
    expect(andesPaginateRows([], 4, 3)).toEqual([]);
  });

  it('returns every row for a non-positive page size', () => {
    expect(andesPaginateRows(rows, 2, 0)).toBe(rows);
  });
});
