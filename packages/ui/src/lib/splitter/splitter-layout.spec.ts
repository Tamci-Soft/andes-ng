import {
  collapsePanel,
  expandPanel,
  fitSizes,
  nearestOpenPanel,
  pairRange,
  parseSplitterSize,
  readStoredLayout,
  rescaleSizes,
  resizePair,
  resolveSizes,
  writeStoredLayout,
  type AndesSplitterBounds,
  type AndesSplitterPanelSpec,
} from './splitter-layout';

function spec(
  overrides: Partial<AndesSplitterPanelSpec> = {},
): AndesSplitterPanelSpec {
  return {
    size: undefined,
    min: undefined,
    max: undefined,
    collapsed: false,
    collapsedSize: 0,
    ...overrides,
  };
}

const open: AndesSplitterBounds = { min: 0, max: Infinity };

describe('parseSplitterSize', () => {
  it.each([
    [240, 1000, 240],
    ['240', 1000, 240],
    ['240px', 1000, 240],
    ['30%', 1000, 300],
    ['12.5%', 800, 100],
    ['auto', 1000, undefined],
    ['', 1000, undefined],
    [undefined, 1000, undefined],
    ['nonsense', 1000, undefined],
    [-5, 1000, 0],
  ])('reads %p against %p as %p', (value, available, expected) => {
    expect(parseSplitterSize(value, available)).toBe(expected);
  });
});

describe('resolveSizes', () => {
  it('gives auto panels what the declared ones leave', () => {
    expect(
      resolveSizes([spec({ size: '30%' }), spec(), spec({ size: 100 })], 1000),
    ).toEqual([300, 600, 100]);
  });

  it('shares the space equally between auto panels', () => {
    expect(resolveSizes([spec(), spec(), spec()], 900)).toEqual([
      300, 300, 300,
    ]);
  });

  it('scales declared sizes up to fill the container', () => {
    const [a, b] = resolveSizes(
      [spec({ size: 100 }), spec({ size: 300 })],
      800,
    );
    expect(a + b).toBeCloseTo(800);
    expect(b / a).toBeCloseTo(3);
  });

  it('respects min and max while still filling the container', () => {
    const sizes = resolveSizes(
      [spec({ size: 100, max: 150 }), spec({ size: 100, min: 50 })],
      800,
    );
    expect(sizes).toEqual([150, 650]);
  });

  it('keeps a collapsed panel at its collapsed size', () => {
    expect(
      resolveSizes(
        [
          spec({ size: 300, collapsed: true, collapsedSize: 40 }),
          spec({ size: 300 }),
        ],
        1000,
      ),
    ).toEqual([40, 960]);
  });
});

describe('fitSizes', () => {
  it('shrinks proportionally when the total is too large', () => {
    const out = fitSizes([600, 400], [open, open], [false, false], 500);
    expect(out[0]).toBeCloseTo(300);
    expect(out[1]).toBeCloseTo(200);
  });

  it('never moves frozen panes', () => {
    const out = fitSizes(
      [200, 300, 500],
      [open, open, open],
      [true, false, false],
      800,
    );
    expect(out[0]).toBe(200);
    expect(out[1]).toBeCloseTo(225);
    expect(out[2]).toBeCloseTo(375);
  });

  it('stops when every flexible panel is at a bound', () => {
    const bounds: AndesSplitterBounds[] = [
      { min: 0, max: 100 },
      { min: 0, max: 100 },
    ];
    expect(fitSizes([50, 50], bounds, [false, false], 1000)).toEqual([
      100, 100,
    ]);
  });
});

describe('rescaleSizes', () => {
  it('scales open panels with the container and leaves collapsed ones alone', () => {
    const out = rescaleSizes(
      [40, 300, 660],
      [spec({ collapsed: true, collapsedSize: 40 }), spec(), spec()],
      2000,
    );
    expect(out[0]).toBe(40);
    expect(out[1] + out[2]).toBeCloseTo(1960);
    expect(out[2] / out[1]).toBeCloseTo(2.2);
  });
});

describe('resizePair', () => {
  const bounds: AndesSplitterBounds[] = [
    { min: 100, max: 600 },
    { min: 200, max: Infinity },
    open,
  ];

  it('moves the boundary and keeps the pair total', () => {
    expect(resizePair([300, 400, 300], bounds, 0, 50)).toEqual([350, 350, 300]);
  });

  it('stops at the minimum of the shrinking panel', () => {
    expect(resizePair([300, 400, 300], bounds, 0, -1000)).toEqual([
      100, 600, 300,
    ]);
  });

  it('stops at the neighbour minimum', () => {
    expect(resizePair([300, 400, 300], bounds, 0, 1000)).toEqual([
      500, 200, 300,
    ]);
    expect(resizePair([300, 400, 300], bounds, 0, Infinity)).toEqual([
      500, 200, 300,
    ]);
  });

  it('does nothing past the last panel', () => {
    expect(resizePair([300, 700], bounds.slice(0, 2), 1, 20)).toEqual([
      300, 700,
    ]);
  });
});

describe('pairRange', () => {
  it('combines the limits of both neighbours', () => {
    expect(
      pairRange(
        [300, 700],
        [
          { min: 100, max: 800 },
          { min: 200, max: 500 },
        ],
        0,
      ),
    ).toEqual({ min: 500, max: 800 });
  });
});

describe('collapsing', () => {
  const bounds: AndesSplitterBounds[] = [
    { min: 100, max: Infinity },
    { min: 0, max: Infinity },
    { min: 0, max: Infinity },
  ];

  it('hands the freed space to the partner and remembers the old size', () => {
    const result = collapsePanel(
      [300, 400, 300],
      bounds,
      [false, false, false],
      0,
      1,
      0,
      1000,
    );
    expect(result.sizes).toEqual([0, 700, 300]);
    expect(result.restore).toBe(300);
  });

  it('gives back the remembered size when expanding', () => {
    expect(
      expandPanel([0, 700, 300], bounds, [true, false, false], 0, 1, 300, 1000),
    ).toEqual([300, 400, 300]);
  });

  it('does not take the partner below its minimum', () => {
    const tight: AndesSplitterBounds[] = [
      { min: 0, max: Infinity },
      { min: 500, max: Infinity },
    ];
    const out = expandPanel([0, 1000], tight, [true, false], 0, 1, 800, 1000);
    expect(out[1]).toBeGreaterThanOrEqual(500);
    expect(out[0] + out[1]).toBeCloseTo(1000);
  });

  it('finds the nearest panel that is still open', () => {
    expect(nearestOpenPanel(0, [true, false, false])).toBe(1);
    expect(nearestOpenPanel(2, [false, true, true])).toBe(0);
    expect(nearestOpenPanel(0, [true, true])).toBeUndefined();
  });
});

describe('stored layout', () => {
  afterEach(() => localStorage.clear());

  it('round-trips a layout', () => {
    writeStoredLayout('k', {
      v: 1,
      fractions: [0.25, 0.75],
      restore: [null, null],
      collapsed: [false, false],
    });
    expect(readStoredLayout('k', 2)?.fractions).toEqual([0.25, 0.75]);
  });

  it('ignores a layout for a different number of panes or broken data', () => {
    writeStoredLayout('k', {
      v: 1,
      fractions: [1],
      restore: [],
      collapsed: [],
    });
    expect(readStoredLayout('k', 2)).toBeNull();
    localStorage.setItem('andes-splitter:bad', '{oops');
    expect(readStoredLayout('bad', 2)).toBeNull();
    expect(readStoredLayout('missing', 2)).toBeNull();
  });
});
