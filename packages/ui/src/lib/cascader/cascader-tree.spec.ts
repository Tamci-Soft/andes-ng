import {
  buildTree,
  collectTerminals,
  findNode,
  highlightParts,
  nodePath,
  nodeValues,
  pathKey,
  searchPaths,
} from './cascader-tree';
import type { AndesCascaderOption } from './cascader-types';

const OPTIONS: AndesCascaderOption[] = [
  {
    value: 'zhejiang',
    label: 'Zhejiang',
    children: [
      {
        value: 'hangzhou',
        label: 'Hangzhou',
        children: [{ value: 'xihu', label: 'West Lake' }],
      },
      { value: 'ningbo', label: 'Ningbo', disabled: true },
    ],
  },
  {
    value: 'jiangsu',
    label: 'Jiangsu',
    children: [{ value: 'nanjing', label: 'Nanjing' }],
  },
  { value: 7, label: 'Seven' },
];

const alwaysLeaf = () => false;

describe('cascader tree', () => {
  it('builds nodes with levels, parents and stable keys', () => {
    const tree = buildTree(OPTIONS);

    expect(tree.roots.map((node) => node.label)).toEqual([
      'Zhejiang',
      'Jiangsu',
      'Seven',
    ]);
    const lake = findNode(tree, ['zhejiang', 'hangzhou', 'xihu']);
    expect(lake?.level).toBe(2);
    expect(lake?.parent?.value).toBe('hangzhou');
    expect(nodeValues(lake!)).toEqual(['zhejiang', 'hangzhou', 'xihu']);
    expect(nodePath(lake!).map((node) => node.label)).toEqual([
      'Zhejiang',
      'Hangzhou',
      'West Lake',
    ]);
    expect(tree.byKey.size).toBe(7);
    expect(new Set([...tree.byKey.values()].map((node) => node.id)).size).toBe(
      7,
    );
  });

  it('keeps the original option objects and the disabled flag', () => {
    const tree = buildTree(OPTIONS);

    expect(tree.roots[0].option).toBe(OPTIONS[0]);
    expect(findNode(tree, ['zhejiang', 'ningbo'])?.disabled).toBe(true);
    expect(findNode(tree, ['zhejiang', 'hangzhou'])?.disabled).toBe(false);
  });

  it('compares values strictly and returns null for unknown paths', () => {
    const tree = buildTree(OPTIONS);

    expect(findNode(tree, [7])?.label).toBe('Seven');
    expect(findNode(tree, ['7'])).toBeNull();
    expect(findNode(tree, [])).toBeNull();
    expect(findNode(tree, ['zhejiang', 'nanjing'])).toBeNull();
    expect(pathKey([1])).not.toBe(pathKey(['1']));
  });

  it('reads other field names', () => {
    const tree = buildTree(
      [
        {
          code: 'a',
          name: 'Alpha',
          kids: [{ code: 'b', name: 'Beta', off: true, leaf: true }],
        },
      ],
      {
        value: 'code',
        label: 'name',
        children: 'kids',
        disabled: 'off',
        isLeaf: 'leaf',
      },
    );

    const beta = findNode(tree, ['a', 'b']);
    expect(beta?.label).toBe('Beta');
    expect(beta?.disabled).toBe(true);
    expect(beta?.isLeaf).toBe(true);
    expect(tree.roots[0].hasChildrenField).toBe(true);
  });

  it('falls back to the value as the label and skips options without a usable value', () => {
    const tree = buildTree([
      { value: 'x' },
      { label: 'no value' },
      { value: null as never, label: 'null value' },
      { value: 'x', label: 'duplicate' },
    ]);

    expect(tree.roots.map((node) => node.label)).toEqual(['x']);
  });

  it('copes with nothing at all', () => {
    expect(buildTree(undefined).roots).toEqual([]);
    expect(buildTree(null).roots).toEqual([]);
    expect(buildTree([]).byKey.size).toBe(0);
  });

  it('distinguishes a missing children field from an empty one', () => {
    const tree = buildTree([{ value: 'a' }, { value: 'b', children: [] }]);

    expect(tree.roots[0].hasChildrenField).toBe(false);
    expect(tree.roots[1].hasChildrenField).toBe(true);
  });

  describe('collectTerminals', () => {
    it('lists the leaves under a node, or the node when it has none', () => {
      const tree = buildTree(OPTIONS);
      const isBranch = (node: { children: unknown[] }) =>
        node.children.length > 0;

      expect(
        collectTerminals(tree.roots[0], isBranch).map((node) => node.value),
      ).toEqual(['xihu', 'ningbo']);
      expect(collectTerminals(tree.roots[2], isBranch)).toEqual([
        tree.roots[2],
      ]);
    });

    it('stops at a node the predicate calls a leaf', () => {
      const tree = buildTree(OPTIONS);

      expect(collectTerminals(tree.roots[0], alwaysLeaf)).toEqual([
        tree.roots[0],
      ]);
    });
  });

  describe('searchPaths', () => {
    const tree = buildTree(OPTIONS);
    const leavesOnly = (node: { children: unknown[] }) =>
      node.children.length === 0;

    it('finds leaf paths where any label matches, ignoring case', () => {
      const results = searchPaths(tree, 'ZHE', { isCandidate: leavesOnly });

      expect(results.map((result) => result.labels.join('/'))).toEqual([
        'Zhejiang/Hangzhou/West Lake',
        'Zhejiang/Ningbo',
      ]);
      expect(results[1].disabled).toBe(true);
      expect(results[0].disabled).toBe(false);
      expect(results[0].key).toBe(pathKey(['zhejiang', 'hangzhou', 'xihu']));
    });

    it('matches a label further down the path', () => {
      const results = searchPaths(tree, 'lake', { isCandidate: leavesOnly });

      expect(results.map((result) => result.labels.join('/'))).toEqual([
        'Zhejiang/Hangzhou/West Lake',
      ]);
    });

    it('can list branches too', () => {
      const results = searchPaths(tree, 'hang', { isCandidate: () => true });

      expect(results.map((result) => result.labels.join('/'))).toEqual([
        'Zhejiang/Hangzhou',
        'Zhejiang/Hangzhou/West Lake',
      ]);
    });

    it('returns nothing for blank text or no match', () => {
      expect(searchPaths(tree, '   ', { isCandidate: leavesOnly })).toEqual([]);
      expect(searchPaths(tree, 'zzz', { isCandidate: leavesOnly })).toEqual([]);
    });

    it('takes a custom filter, handing it the option objects of the path', () => {
      const seen: string[][] = [];
      const results = searchPaths(tree, 'x', {
        isCandidate: leavesOnly,
        search: {
          filter: (_text, path) => {
            seen.push(path.map((option) => String(option['value'])));
            return path[path.length - 1]['value'] === 'nanjing';
          },
        },
      });

      expect(results.map((result) => result.labels.join('/'))).toEqual([
        'Jiangsu/Nanjing',
      ]);
      expect(seen[0]).toEqual(['zhejiang', 'hangzhou', 'xihu']);
    });

    it('sorts with a custom comparator and applies the limit', () => {
      const sorted = searchPaths(tree, 'n', {
        isCandidate: leavesOnly,
        search: {
          sort: (a, b) =>
            String(b[b.length - 1]['label']).localeCompare(
              String(a[a.length - 1]['label']),
            ),
        },
      });
      expect(sorted.map((result) => result.labels.at(-1))).toEqual([
        'West Lake',
        'Seven',
        'Ningbo',
        'Nanjing',
      ]);

      const limited = searchPaths(tree, 'n', {
        isCandidate: leavesOnly,
        search: { limit: 1 },
      });
      expect(limited.length).toBe(1);
      expect(
        searchPaths(tree, 'n', {
          isCandidate: leavesOnly,
          search: { limit: false },
        }).length,
      ).toBe(4);
    });

    it('limits to 50 by default', () => {
      const many = buildTree(
        Array.from({ length: 80 }, (_, index) => ({
          value: index,
          label: `Item ${index}`,
        })),
      );

      expect(
        searchPaths(many, 'item', { isCandidate: () => true }).length,
      ).toBe(50);
    });
  });

  describe('highlightParts', () => {
    it('splits around every match, ignoring case', () => {
      expect(highlightParts('Hangzhou Hang', 'hang')).toEqual([
        { text: 'Hang', match: true },
        { text: 'zhou ', match: false },
        { text: 'Hang', match: true },
      ]);
    });

    it('keeps the text of a match as written', () => {
      expect(highlightParts('West Lake', 'LAKE')).toEqual([
        { text: 'West ', match: false },
        { text: 'Lake', match: true },
      ]);
    });

    it('returns the label whole without a match or a needle', () => {
      expect(highlightParts('Ningbo', 'xyz')).toEqual([
        { text: 'Ningbo', match: false },
      ]);
      expect(highlightParts('Ningbo', ' ')).toEqual([
        { text: 'Ningbo', match: false },
      ]);
      expect(highlightParts('', 'a')).toEqual([{ text: '', match: false }]);
    });
  });
});
