import {
  andesNextSortDirection,
  andesSortRows,
  type AndesSortAccessors,
} from './table-sort';

interface Row {
  readonly id: string;
  readonly name: string;
  readonly score: number;
  readonly team: string | null;
  readonly active: boolean;
  readonly joined: Date;
}

function row(
  id: string,
  name: string,
  score: number,
  team: string | null = 'red',
  active = true,
  joined = new Date('2024-01-01'),
): Row {
  return { id, name, score, team, active, joined };
}

const ACCESSORS: AndesSortAccessors<Row> = {
  name: (r) => r.name,
  score: (r) => r.score,
  team: (r) => r.team,
  active: (r) => r.active,
  joined: (r) => r.joined,
};

function ids(rows: readonly Row[]): string[] {
  return rows.map((r) => r.id);
}

describe('andesSortRows', () => {
  const rows: readonly Row[] = [
    row('a', 'Carla', 10),
    row('b', 'Ana', 30),
    row('c', 'Bruno', 10),
    row('d', 'Diego', 20),
  ];

  it('returns the original array reference when there is no sort state', () => {
    expect(andesSortRows(rows, null, ACCESSORS)).toBe(rows);
    expect(andesSortRows(rows, undefined, ACCESSORS)).toBe(rows);
  });

  it('returns the original array reference when no accessor matches the column', () => {
    expect(
      andesSortRows(rows, { columnId: 'unknown', direction: 'asc' }, ACCESSORS),
    ).toBe(rows);
  });

  it('never mutates the input array', () => {
    const input = [...rows];
    andesSortRows(input, { columnId: 'name', direction: 'desc' }, ACCESSORS);

    expect(ids(input)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('sorts strings ascending and descending', () => {
    expect(
      ids(
        andesSortRows(rows, { columnId: 'name', direction: 'asc' }, ACCESSORS),
      ),
    ).toEqual(['b', 'c', 'a', 'd']);
    expect(
      ids(
        andesSortRows(rows, { columnId: 'name', direction: 'desc' }, ACCESSORS),
      ),
    ).toEqual(['d', 'a', 'c', 'b']);
  });

  it('sorts numbers numerically, not lexicographically', () => {
    const numeric = [row('a', 'a', 9), row('b', 'b', 100), row('c', 'c', 20)];

    expect(
      ids(
        andesSortRows(
          numeric,
          { columnId: 'score', direction: 'asc' },
          ACCESSORS,
        ),
      ),
    ).toEqual(['a', 'c', 'b']);
  });

  it('sorts embedded numbers in strings naturally', () => {
    const natural = [
      row('a', 'Item 10', 0),
      row('b', 'Item 2', 0),
      row('c', 'Item 1', 0),
    ];

    expect(
      ids(
        andesSortRows(
          natural,
          { columnId: 'name', direction: 'asc' },
          ACCESSORS,
        ),
      ),
    ).toEqual(['c', 'b', 'a']);
  });

  it('sorts booleans false before true', () => {
    const flags = [
      row('a', 'a', 0, 'red', true),
      row('b', 'b', 0, 'red', false),
    ];

    expect(
      ids(
        andesSortRows(
          flags,
          { columnId: 'active', direction: 'asc' },
          ACCESSORS,
        ),
      ),
    ).toEqual(['b', 'a']);
  });

  it('sorts dates chronologically', () => {
    const dated = [
      row('a', 'a', 0, 'red', true, new Date('2024-06-01')),
      row('b', 'b', 0, 'red', true, new Date('2023-01-15')),
      row('c', 'c', 0, 'red', true, new Date('2025-03-20')),
    ];

    expect(
      ids(
        andesSortRows(
          dated,
          { columnId: 'joined', direction: 'asc' },
          ACCESSORS,
        ),
      ),
    ).toEqual(['b', 'a', 'c']);
  });

  it('keeps empty values last in both directions', () => {
    const sparse = [
      row('a', 'a', 0, null),
      row('b', 'b', 0, 'blue'),
      row('c', 'c', 0, null),
      row('d', 'd', 0, 'amber'),
    ];

    expect(
      ids(
        andesSortRows(
          sparse,
          { columnId: 'team', direction: 'asc' },
          ACCESSORS,
        ),
      ),
    ).toEqual(['d', 'b', 'a', 'c']);
    expect(
      ids(
        andesSortRows(
          sparse,
          { columnId: 'team', direction: 'desc' },
          ACCESSORS,
        ),
      ),
    ).toEqual(['b', 'd', 'a', 'c']);
  });

  describe('stability', () => {
    // Every row ties on `score`, so the only correct output is the input order -
    // in both directions.
    const allTied: readonly Row[] = [
      row('a', 'a', 5),
      row('b', 'b', 5),
      row('c', 'c', 5),
      row('d', 'd', 5),
      row('e', 'e', 5),
    ];

    it('preserves source order when every value ties, ascending', () => {
      expect(
        ids(
          andesSortRows(
            allTied,
            { columnId: 'score', direction: 'asc' },
            ACCESSORS,
          ),
        ),
      ).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('preserves source order when every value ties, descending', () => {
      expect(
        ids(
          andesSortRows(
            allTied,
            { columnId: 'score', direction: 'desc' },
            ACCESSORS,
          ),
        ),
      ).toEqual(['a', 'b', 'c', 'd', 'e']);
    });

    it('preserves the relative order inside each group of tied values', () => {
      const grouped: readonly Row[] = [
        row('a1', 'a1', 2),
        row('b1', 'b1', 1),
        row('a2', 'a2', 2),
        row('b2', 'b2', 1),
        row('a3', 'a3', 2),
      ];

      expect(
        ids(
          andesSortRows(
            grouped,
            { columnId: 'score', direction: 'asc' },
            ACCESSORS,
          ),
        ),
      ).toEqual(['b1', 'b2', 'a1', 'a2', 'a3']);
      expect(
        ids(
          andesSortRows(
            grouped,
            { columnId: 'score', direction: 'desc' },
            ACCESSORS,
          ),
        ),
      ).toEqual(['a1', 'a2', 'a3', 'b1', 'b2']);
    });

    it('stays stable past the engine’s insertion-sort threshold', () => {
      // Small arrays can look stable purely by accident; 200 fully tied rows forces
      // the real sort path.
      const many = Array.from({ length: 200 }, (_, index) =>
        row(`row-${index}`, `row-${index}`, 1),
      );
      const expected = ids(many);

      expect(
        ids(
          andesSortRows(
            many,
            { columnId: 'score', direction: 'asc' },
            ACCESSORS,
          ),
        ),
      ).toEqual(expected);
      expect(
        ids(
          andesSortRows(
            many,
            { columnId: 'score', direction: 'desc' },
            ACCESSORS,
          ),
        ),
      ).toEqual(expected);
    });

    it('treats case-only differences as ties rather than reordering them', () => {
      const cased = [row('a', 'beta', 0), row('b', 'Beta', 0)];

      expect(
        ids(
          andesSortRows(
            cased,
            { columnId: 'name', direction: 'asc' },
            ACCESSORS,
          ),
        ),
      ).toEqual(['a', 'b']);
      expect(
        ids(
          andesSortRows(
            cased,
            { columnId: 'name', direction: 'desc' },
            ACCESSORS,
          ),
        ),
      ).toEqual(['a', 'b']);
    });
  });
});

describe('andesSortRows with several columns', () => {
  const rows: readonly Row[] = [
    row('a', 'Carla', 10, 'red'),
    row('b', 'Ana', 30, 'blue'),
    row('c', 'Bruno', 10, 'blue'),
    row('d', 'Diego', 20, 'red'),
    row('e', 'Eva', 10, 'red'),
  ];

  it('sorts by the first state and breaks ties with the next ones, in order', () => {
    expect(
      ids(
        andesSortRows(
          rows,
          [
            { columnId: 'score', direction: 'asc' },
            { columnId: 'name', direction: 'desc' },
          ],
          ACCESSORS,
        ),
      ),
    ).toEqual(['e', 'a', 'c', 'd', 'b']);
  });

  it('keeps the original order for rows tied on every column', () => {
    expect(
      ids(
        andesSortRows(
          rows,
          [
            { columnId: 'team', direction: 'desc' },
            { columnId: 'score', direction: 'asc' },
          ],
          ACCESSORS,
        ),
      ),
    ).toEqual(['a', 'e', 'd', 'c', 'b']);
  });

  it('returns the original reference for an empty list or only unknown columns', () => {
    expect(andesSortRows(rows, [], ACCESSORS)).toBe(rows);
    expect(
      andesSortRows(rows, [{ columnId: 'nope', direction: 'asc' }], ACCESSORS),
    ).toBe(rows);
  });

  it('skips unknown columns but still applies the known ones', () => {
    expect(
      ids(
        andesSortRows(
          rows,
          [
            { columnId: 'nope', direction: 'asc' },
            { columnId: 'name', direction: 'asc' },
          ],
          ACCESSORS,
        ),
      ),
    ).toEqual(['b', 'c', 'a', 'd', 'e']);
  });
});

describe('andesSortRows with a comparator', () => {
  const PRIORITY = ['high', 'medium', 'low'];
  const rows = [
    { id: 'a', priority: 'low' },
    { id: 'b', priority: 'high' },
    { id: 'c', priority: 'medium' },
    { id: 'd', priority: 'high' },
  ];
  const accessors = {
    priority: {
      compare: (x: (typeof rows)[number], y: (typeof rows)[number]) =>
        PRIORITY.indexOf(x.priority) - PRIORITY.indexOf(y.priority),
    },
  };

  it('uses compare() for ascending order and negates it for descending, stably', () => {
    expect(
      andesSortRows(
        rows,
        { columnId: 'priority', direction: 'asc' },
        accessors,
      ).map((r) => r.id),
    ).toEqual(['b', 'd', 'c', 'a']);
    expect(
      andesSortRows(
        rows,
        { columnId: 'priority', direction: 'desc' },
        accessors,
      ).map((r) => r.id),
    ).toEqual(['a', 'c', 'b', 'd']);
  });
});

describe('andesNextSortDirection', () => {
  it('cycles through the directions and then back to unsorted', () => {
    const cycle = ['asc', 'desc'] as const;

    expect(andesNextSortDirection(null, cycle)).toBe('asc');
    expect(andesNextSortDirection('asc', cycle)).toBe('desc');
    expect(andesNextSortDirection('desc', cycle)).toBeNull();
  });

  it('honours a custom order such as descending first', () => {
    const cycle = ['desc', 'asc'] as const;

    expect(andesNextSortDirection(null, cycle)).toBe('desc');
    expect(andesNextSortDirection('desc', cycle)).toBe('asc');
    expect(andesNextSortDirection('asc', cycle)).toBeNull();
  });

  it('never returns to unsorted when a direction is repeated (Ant’s trick)', () => {
    const cycle = ['asc', 'desc', 'asc'] as const;
    let direction = andesNextSortDirection(null, cycle);
    const seen = [direction];
    for (let i = 0; i < 5; i++) {
      direction = andesNextSortDirection(direction, cycle);
      seen.push(direction);
    }

    expect(seen).not.toContain(null);
  });

  it('treats a single direction as a toggle between it and unsorted', () => {
    expect(andesNextSortDirection(null, ['asc'])).toBe('asc');
    expect(andesNextSortDirection('asc', ['asc'])).toBeNull();
  });

  it('never sorts with an empty list, and resets a direction not in the list', () => {
    expect(andesNextSortDirection(null, [])).toBeNull();
    expect(andesNextSortDirection('desc', ['asc'])).toBeNull();
  });
});
