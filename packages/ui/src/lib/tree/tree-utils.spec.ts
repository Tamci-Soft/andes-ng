/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type { AndesTreeNode } from './tree-types';
import {
  andesCheckedKeysByStrategy,
  andesConductCheck,
  andesCreateTreeIndex,
  andesFilterTree,
  andesFindTreeEntry,
  andesFindTreeNode,
  andesFlattenTree,
  andesGetExpandableKeys,
  andesGetTreeAncestors,
  andesGetTreeDescendants,
  andesHighlightSegments,
  andesMoveTreeNode,
  andesToggleCheck,
  andesTreeTitleMatches,
} from './tree-utils';

function sample(): AndesTreeNode[] {
  return [
    {
      key: 'a',
      title: 'Almacén central',
      children: [
        {
          key: 'a1',
          title: 'Pasillo 1',
          children: [
            { key: 'a1x', title: 'Estante X' },
            { key: 'a1y', title: 'Estante Y' },
          ],
        },
        { key: 'a2', title: 'Pasillo 2' },
      ],
    },
    {
      key: 'b',
      title: 'Sucursal norte',
      children: [{ key: 'b1', title: 'Caja' }],
    },
    { key: 'c', title: 'Archivo' },
  ];
}

describe('tree utils', () => {
  describe('andesCreateTreeIndex', () => {
    it('resolves levels, parents, positions and flags', () => {
      const index = andesCreateTreeIndex([
        ...sample(),
        { key: 'd', title: 'Bloqueado', disabled: true, selectable: true },
        {
          key: 'e',
          title: 'Sin caja',
          checkable: false,
          disableCheckbox: true,
          isLeaf: true,
        },
      ]);
      const a1x = index.byKey.get('a1x');
      expect(a1x?.level).toBe(3);
      expect(a1x?.parent?.key).toBe('a1');
      expect(a1x?.index).toBe(0);
      expect(a1x?.siblingCount).toBe(2);
      expect(index.order.slice(0, 5)).toEqual(['a', 'a1', 'a1x', 'a1y', 'a2']);

      const d = index.byKey.get('d');
      expect(d?.disabled).toBe(true);
      expect(d?.selectable).toBe(false);
      expect(d?.disableCheckbox).toBe(true);
      const e = index.byKey.get('e');
      expect(e?.checkable).toBe(false);
      expect(e?.isLeafFlag).toBe(true);
    });

    it('reads renamed fields', () => {
      const index = andesCreateTreeIndex(
        [{ id: 7, name: 'Root', items: [{ id: 8, name: 'Leaf' }] }],
        { key: 'id', title: 'name', children: 'items' },
      );
      expect(index.order).toEqual([7, 8]);
      expect(index.byKey.get(8)?.title).toBe('Leaf');
      expect(index.byKey.get(8)?.parent?.key).toBe(7);
    });

    it('falls back to the position path for a node without a key', () => {
      const index = andesCreateTreeIndex([
        { title: 'x', children: [{ title: 'y' }] } as unknown as AndesTreeNode,
      ]);
      expect(index.order).toEqual(['0', '0-0']);
    });

    it('tells an empty children array from a missing one', () => {
      const index = andesCreateTreeIndex([
        { key: 1, title: 'a', children: [] },
        { key: 2, title: 'b' },
      ]);
      expect(index.byKey.get(1)?.hasChildrenField).toBe(true);
      expect(index.byKey.get(2)?.hasChildrenField).toBe(false);
    });
  });

  describe('lookup', () => {
    it('finds entries, nodes, ancestors, descendants and expandable keys', () => {
      const nodes = sample();
      expect(andesFindTreeNode(nodes, 'a2')?.title).toBe('Pasillo 2');
      expect(andesFindTreeEntry(nodes, 'zzz')).toBeUndefined();
      const entry = andesFindTreeEntry(nodes, 'a1x');
      expect(andesGetTreeAncestors(entry!).map((e) => e.key)).toEqual([
        'a',
        'a1',
      ]);
      const root = andesFindTreeEntry(nodes, 'a');
      expect(andesGetTreeDescendants(root!).map((e) => e.key)).toEqual([
        'a1',
        'a1x',
        'a1y',
        'a2',
      ]);
      expect(andesGetExpandableKeys(andesCreateTreeIndex(nodes))).toEqual([
        'a',
        'a1',
        'b',
      ]);
    });
  });

  describe('andesFlattenTree', () => {
    it('returns every row depth first with level and set position', () => {
      const rows = andesFlattenTree(sample());
      expect(rows.map((r) => r.key)).toEqual([
        'a',
        'a1',
        'a1x',
        'a1y',
        'a2',
        'b',
        'b1',
        'c',
      ]);
      const a1y = rows.find((r) => r.key === 'a1y')!;
      expect(a1y.level).toBe(3);
      expect(a1y.posInSet).toBe(2);
      expect(a1y.setSize).toBe(2);
      expect(a1y.isLast).toBe(true);
      expect(a1y.parentKey).toBe('a1');
    });

    it('only descends into expanded keys', () => {
      const rows = andesFlattenTree(sample(), { expandedKeys: new Set(['a']) });
      expect(rows.map((r) => r.key)).toEqual(['a', 'a1', 'a2', 'b', 'c']);
    });

    it('counts only the included siblings', () => {
      const rows = andesFlattenTree(sample(), {
        include: (entry) => entry.key !== 'a1',
      });
      const a2 = rows.find((r) => r.key === 'a2')!;
      expect(a2.posInSet).toBe(1);
      expect(a2.setSize).toBe(1);
      expect(rows.some((r) => r.key === 'a1x')).toBe(false);
    });

    it('computes connector flags per indent cell', () => {
      const rows = andesFlattenTree(sample());
      const byKey = (key: string) => rows.find((r) => r.key === key)!;
      expect(byKey('a').connectors).toEqual([]);
      // a1: child of a, not the last child.
      expect(byKey('a1').connectors).toEqual([true]);
      // a2: the last child of a.
      expect(byKey('a2').connectors).toEqual([false]);
      // a1x: cell 0 = a1 has a later sibling (a2), cell 1 = own elbow, not last.
      expect(byKey('a1x').connectors).toEqual([true, true]);
      expect(byKey('a1y').connectors).toEqual([true, false]);
    });

    it('flags rows that have child rows', () => {
      const rows = andesFlattenTree(sample());
      expect(rows.find((r) => r.key === 'a')!.hasChildren).toBe(true);
      expect(rows.find((r) => r.key === 'c')!.hasChildren).toBe(false);
    });

    it('copes with no nodes', () => {
      expect(andesFlattenTree(null)).toEqual([]);
      expect(andesFlattenTree([])).toEqual([]);
    });
  });

  describe('check propagation', () => {
    const index = andesCreateTreeIndex(sample());

    it('cascades a checked parent down and fills in ancestors', () => {
      const { checked, halfChecked } = andesConductCheck(['a1'], index);
      expect([...checked].sort()).toEqual(['a1', 'a1x', 'a1y']);
      expect([...halfChecked]).toEqual(['a']);
    });

    it('checks a parent once all its children are checked', () => {
      const { checked, halfChecked } = andesConductCheck(['a1', 'a2'], index);
      expect(checked.has('a')).toBe(true);
      expect(halfChecked.size).toBe(0);
    });

    it('marks a parent half-checked when only one grandchild is checked', () => {
      const { checked, halfChecked } = andesConductCheck(['a1x'], index);
      expect([...checked]).toEqual(['a1x']);
      expect([...halfChecked].sort()).toEqual(['a', 'a1']);
    });

    it('ignores unknown keys', () => {
      expect(andesConductCheck(['nope'], index).checked.size).toBe(0);
    });

    it('takes keys as they are with strict', () => {
      const { checked, halfChecked } = andesConductCheck(['a'], index, true);
      expect([...checked]).toEqual(['a']);
      expect(halfChecked.size).toBe(0);
    });

    it('skips locked nodes in both directions', () => {
      const locked = andesCreateTreeIndex([
        {
          key: 'p',
          title: 'p',
          children: [
            { key: 'k1', title: 'k1' },
            { key: 'k2', title: 'k2', disableCheckbox: true },
          ],
        },
      ]);
      // Checking the parent does not reach the locked child, and the parent is judged on the
      // children that can change.
      const checkedParent = andesConductCheck(['p'], locked);
      expect([...checkedParent.checked].sort()).toEqual(['k1', 'p']);
      // A locked child that arrives checked stays checked without checking the parent.
      const lockedChecked = andesConductCheck(['k2'], locked);
      expect([...lockedChecked.checked]).toEqual(['k2']);
      expect(lockedChecked.halfChecked.size).toBe(0);
    });

    describe('andesToggleCheck', () => {
      it('checks a node and its subtree', () => {
        const state = andesToggleCheck(new Set(), index, 'a1', true);
        expect([...state.checked].sort()).toEqual(['a1', 'a1x', 'a1y']);
        expect(state.halfChecked.has('a')).toBe(true);
      });

      it('unchecking one child of a fully checked parent leaves the siblings checked', () => {
        const all = andesConductCheck(['a'], index).checked;
        expect(all.has('a')).toBe(true);
        const state = andesToggleCheck(all, index, 'a1x', false);
        expect(state.checked.has('a1x')).toBe(false);
        expect(state.checked.has('a1')).toBe(false);
        expect(state.checked.has('a')).toBe(false);
        expect(state.checked.has('a1y')).toBe(true);
        expect(state.checked.has('a2')).toBe(true);
        expect([...state.halfChecked].sort()).toEqual(['a', 'a1']);
      });

      it('unchecking a parent clears its subtree', () => {
        const all = andesConductCheck(['a'], index).checked;
        const state = andesToggleCheck(all, index, 'a1', false);
        expect(state.checked.has('a1x')).toBe(false);
        expect(state.checked.has('a1y')).toBe(false);
        expect(state.checked.has('a2')).toBe(true);
      });

      it('toggles one key with strict', () => {
        const on = andesToggleCheck(new Set(), index, 'a', true, true);
        expect([...on.checked]).toEqual(['a']);
        const off = andesToggleCheck(on.checked, index, 'a', false, true);
        expect(off.checked.size).toBe(0);
      });
    });

    describe('andesCheckedKeysByStrategy', () => {
      const checked = andesConductCheck(['a', 'b1'], index).checked;

      it('reports every checked node with all', () => {
        expect(andesCheckedKeysByStrategy(checked, index, 'all')).toEqual([
          'a',
          'a1',
          'a1x',
          'a1y',
          'a2',
          'b',
          'b1',
        ]);
      });

      it('reports only the topmost with parent', () => {
        expect(andesCheckedKeysByStrategy(checked, index, 'parent')).toEqual([
          'a',
          'b',
        ]);
      });

      it('reports only the leaves with child', () => {
        expect(andesCheckedKeysByStrategy(checked, index, 'child')).toEqual([
          'a1x',
          'a1y',
          'a2',
          'b1',
        ]);
      });
    });
  });

  describe('text matching', () => {
    it('ignores case and accents', () => {
      expect(andesTreeTitleMatches('Almacén central', 'ALMACEN')).toBe(true);
      expect(andesTreeTitleMatches('Almacén central', 'tral')).toBe(true);
      expect(andesTreeTitleMatches('Almacén central', 'zzz')).toBe(false);
      expect(andesTreeTitleMatches('anything', '  ')).toBe(false);
    });

    it('splits a title around matches in the original text', () => {
      expect(andesHighlightSegments('Almacén central', 'cent')).toEqual([
        { text: 'Almacén ', match: false },
        { text: 'cent', match: true },
        { text: 'ral', match: false },
      ]);
      // Accents are ignored, but the original characters are what comes back.
      expect(andesHighlightSegments('Almacén central', 'macen')).toEqual([
        { text: 'Al', match: false },
        { text: 'macén', match: true },
        { text: ' central', match: false },
      ]);
      expect(andesHighlightSegments('Almacén', 'ALMACEN')).toEqual([
        { text: 'Almacén', match: true },
      ]);
    });

    it('marks every occurrence', () => {
      expect(andesHighlightSegments('abab', 'ab')).toEqual([
        { text: 'ab', match: true },
        { text: 'ab', match: true },
      ]);
    });

    it('returns the text whole when there is no match or no query', () => {
      expect(andesHighlightSegments('plain', 'x')).toEqual([
        { text: 'plain', match: false },
      ]);
      expect(andesHighlightSegments('plain', '')).toEqual([
        { text: 'plain', match: false },
      ]);
    });
  });

  describe('andesFilterTree', () => {
    const index = andesCreateTreeIndex(sample());

    it('keeps matches, their ancestors and the subtree under a match', () => {
      const result = andesFilterTree(index, 'estante x');
      expect([...result.matched]).toEqual(['a1x']);
      expect([...result.visible].sort()).toEqual(['a', 'a1', 'a1x']);
      expect([...result.expand].sort()).toEqual(['a', 'a1']);

      const folder = andesFilterTree(index, 'pasillo 1');
      expect([...folder.visible].sort()).toEqual(['a', 'a1', 'a1x', 'a1y']);
      expect([...folder.expand]).toEqual(['a']);
    });

    it('shows everything for an empty query', () => {
      const result = andesFilterTree(index, '  ');
      expect(result.visible.size).toBe(index.order.length);
      expect(result.matched.size).toBe(0);
    });

    it('accepts a custom matcher', () => {
      const result = andesFilterTree(
        index,
        'b1',
        (entry, query) => entry.key === query,
      );
      expect([...result.visible].sort()).toEqual(['b', 'b1']);
    });
  });

  describe('andesMoveTreeNode', () => {
    const keys = (nodes: AndesTreeNode[]): unknown =>
      nodes.map((n) => [n.key, n.children ? keys(n.children) : undefined]);

    it('moves before and after a sibling without touching the input', () => {
      const nodes = sample();
      const before = andesMoveTreeNode(nodes, 'c', 'a', 'before')!;
      expect(before.map((n) => n.key)).toEqual(['c', 'a', 'b']);
      const after = andesMoveTreeNode(nodes, 'a', 'b', 'after')!;
      expect(after.map((n) => n.key)).toEqual(['b', 'a', 'c']);
      expect(nodes.map((n) => n.key)).toEqual(['a', 'b', 'c']);
    });

    it('moves inside as the first child', () => {
      const moved = andesMoveTreeNode(sample(), 'c', 'b', 'inside')!;
      expect(keys(moved)).toEqual([
        ['a', expect.anything()],
        [
          'b',
          [
            ['c', undefined],
            ['b1', undefined],
          ],
        ],
      ]);
    });

    it('creates a children array when dropping inside a leaf', () => {
      const moved = andesMoveTreeNode(sample(), 'b', 'c', 'inside')!;
      expect(moved.map((n) => n.key)).toEqual(['a', 'c']);
      expect(moved[1].children?.map((n) => n.key)).toEqual(['b']);
    });

    it('moves between levels and shares the untouched branches', () => {
      const nodes = sample();
      const moved = andesMoveTreeNode(nodes, 'a1x', 'b1', 'after')!;
      const b = moved.find((n) => n.key === 'b')!;
      expect(b.children?.map((n) => n.key)).toEqual(['b1', 'a1x']);
      const a1 = moved[0].children?.find((n) => n.key === 'a1');
      expect(a1?.children?.map((n) => n.key)).toEqual(['a1y']);
      expect(moved[2]).toBe(nodes[2]);
    });

    it('moves a node out of a branch to just after that branch', () => {
      // The target is copied on the way (its child list changes), so it must still be found.
      const moved = andesMoveTreeNode(sample(), 'b1', 'b', 'after')!;
      expect(moved.map((n) => n.key)).toEqual(['a', 'b', 'b1', 'c']);
      expect(moved[1].children).toEqual([]);
      const up = andesMoveTreeNode(sample(), 'a1x', 'a', 'before')!;
      expect(up.map((n) => n.key)).toEqual(['a1x', 'a', 'b', 'c']);
      const inward = andesMoveTreeNode(sample(), 'a1y', 'a', 'inside')!;
      expect(inward[0].children?.map((n) => n.key)).toEqual([
        'a1y',
        'a1',
        'a2',
      ]);
      expect(inward[0].children?.[1].children?.map((n) => n.key)).toEqual([
        'a1x',
      ]);
    });

    it('refuses a drop onto itself or into its own subtree', () => {
      expect(andesMoveTreeNode(sample(), 'a', 'a', 'inside')).toBeNull();
      expect(andesMoveTreeNode(sample(), 'a', 'a1x', 'before')).toBeNull();
      expect(andesMoveTreeNode(sample(), 'zz', 'a', 'before')).toBeNull();
      expect(andesMoveTreeNode(sample(), 'a', 'zz', 'before')).toBeNull();
    });

    it('works with renamed fields', () => {
      const moved = andesMoveTreeNode(
        [
          { id: 1, name: 'one', items: [{ id: 2, name: 'two' }] },
          { id: 3, name: 'three' },
        ],
        3,
        2,
        'before',
        { key: 'id', title: 'name', children: 'items' },
      )!;
      expect(
        (moved[0]['items'] as AndesTreeNode[]).map((n) => n['id']),
      ).toEqual([3, 2]);
    });
  });
});
