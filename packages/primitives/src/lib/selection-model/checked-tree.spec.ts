import { computed, effect, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesCheckedTree } from './checked-tree';
import type { AndesCheckedTreeConfig } from './selection-model-types';

interface Node {
  readonly id: string;
  readonly locked?: boolean;
  readonly children?: readonly Node[];
}

const leaf = (id: string, locked = false): Node => ({ id, locked });
const branch = (
  id: string,
  children: readonly Node[],
  locked = false,
): Node => ({
  id,
  locked,
  children,
});

/**
 * root
 * ├─ a
 * │  ├─ a1
 * │  └─ a2
 * ├─ b
 * │  ├─ b1
 * │  └─ b2
 * └─ c
 */
const sample = (): Node[] => [
  branch('root', [
    branch('a', [leaf('a1'), leaf('a2')]),
    branch('b', [leaf('b1'), leaf('b2')]),
    leaf('c'),
  ]),
];

function createTree(
  nodes: readonly Node[] | (() => readonly Node[]) = sample(),
  config: Partial<AndesCheckedTreeConfig<Node, string>> = {},
) {
  return new AndesCheckedTree<Node, string>({
    nodes,
    childrenOf: (node) => node.children,
    keyOf: (node) => node.id,
    isDisabled: (node) => node.locked === true,
    ...config,
  });
}

const sorted = (values: Iterable<string>) => [...values].sort();

describe('AndesCheckedTree', () => {
  describe('propagation downwards', () => {
    it('checks the whole subtree and the parent chain it completes', () => {
      const tree = createTree();

      expect(tree.check('a')).toBe(true);

      expect(sorted(tree.checked())).toEqual(['a', 'a1', 'a2']);
      expect(sorted(tree.halfChecked())).toEqual(['root']);
    });

    it('lists checked keys in tree order, not click order', () => {
      const tree = createTree();

      tree.check('c');
      tree.check('a2');
      tree.check('a1');

      expect(tree.checkedKeys()).toEqual(['a', 'a1', 'a2', 'c']);
    });

    it('checks every node when the root is checked', () => {
      const tree = createTree();

      tree.check('root');

      expect(tree.checked().size).toBe(8);
      expect(tree.halfChecked().size).toBe(0);
      expect(tree.overallState()).toBe('all');
    });
  });

  describe('propagation upwards', () => {
    it('checks a parent once all its children are checked', () => {
      const tree = createTree();

      tree.check('a1');
      expect(tree.stateOf('a')).toBe('mixed');
      expect(tree.isHalfChecked('a')).toBe(true);
      expect(tree.isChecked('a')).toBe(false);

      tree.check('a2');
      expect(tree.stateOf('a')).toBe('checked');
      expect(tree.isChecked('a')).toBe(true);
      expect(tree.stateOf('root')).toBe('mixed');
    });

    it('propagates all the way to the root', () => {
      const tree = createTree();

      for (const id of ['a1', 'a2', 'b1', 'b2', 'c']) {
        tree.check(id);
      }

      expect(tree.stateOf('root')).toBe('checked');
    });

    it('propagates mixed through intermediate levels', () => {
      const tree = createTree();

      tree.check('b2');

      expect(tree.stateOf('b')).toBe('mixed');
      expect(tree.stateOf('root')).toBe('mixed');
      expect(tree.stateOf('a')).toBe('unchecked');
      expect(tree.stateOf('c')).toBe('unchecked');
    });
  });

  describe('unchecking', () => {
    it('clears the subtree', () => {
      const tree = createTree();
      tree.check('root');

      expect(tree.uncheck('b')).toBe(true);

      expect(sorted(tree.checked())).toEqual(['a', 'a1', 'a2', 'c']);
      expect(sorted(tree.halfChecked())).toEqual(['root']);
    });

    it('unchecks the ancestors that were only checked because of this node', () => {
      const tree = createTree();
      tree.check('root');

      tree.uncheck('a1');

      expect(tree.stateOf('a')).toBe('mixed');
      expect(tree.stateOf('a2')).toBe('checked');
      expect(tree.stateOf('root')).toBe('mixed');
      expect(tree.stateOf('b')).toBe('checked');
    });

    it('does not re-check a node from a stale checked parent', () => {
      const tree = createTree([branch('p', [leaf('x'), leaf('y')])], {
        initial: ['p'],
      });
      expect(tree.stateOf('x')).toBe('checked');

      tree.uncheck('x');

      expect(tree.stateOf('x')).toBe('unchecked');
      expect(tree.stateOf('y')).toBe('checked');
      expect(tree.stateOf('p')).toBe('mixed');
    });

    it('unchecks a mixed parent completely', () => {
      const tree = createTree();
      tree.check('a1');

      expect(tree.uncheck('a')).toBe(true);

      expect(tree.checkedKeys()).toEqual([]);
    });

    it('toggle completes a mixed parent and then clears it', () => {
      const tree = createTree();
      tree.check('a1');

      tree.toggle('a');
      expect(tree.stateOf('a')).toBe('checked');
      expect(tree.stateOf('a2')).toBe('checked');

      tree.toggle('a');
      expect(tree.stateOf('a')).toBe('unchecked');
      expect(tree.checkedKeys()).toEqual([]);
    });

    it('does nothing for a node with nothing checked', () => {
      const tree = createTree();

      expect(tree.uncheck('a')).toBe(false);
      expect(tree.changes()).toBeNull();
    });
  });

  describe('idempotence and no-ops', () => {
    it('checking an already checked node changes nothing', () => {
      const tree = createTree();
      tree.check('a');

      expect(tree.check('a')).toBe(false);
      expect(tree.check('a1')).toBe(false);
    });

    it('ignores unknown keys for check, uncheck and toggle', () => {
      const tree = createTree();

      expect(tree.check('nope')).toBe(false);
      expect(tree.uncheck('nope')).toBe(false);
      expect(tree.toggle('nope')).toBe(false);
      expect(tree.checkedKeys()).toEqual([]);
    });

    it('normalizes the stored value so re-reading is stable', () => {
      const tree = createTree();
      tree.check('a');
      const before = tree.checkedKeys();

      tree.setChecked(before);

      expect(tree.checkedKeys()).toEqual(before);
      expect(tree.changes()?.source).toBe('interaction');
    });
  });

  describe('strict mode', () => {
    it('makes every node independent', () => {
      const tree = createTree(sample(), { strict: true });

      tree.check('a');

      expect(tree.checkedKeys()).toEqual(['a']);
      expect(tree.halfChecked().size).toBe(0);
      expect(tree.stateOf('a1')).toBe('unchecked');
      expect(tree.stateOf('root')).toBe('unchecked');
    });

    it('does not complete a parent from its children', () => {
      const tree = createTree(sample(), { strict: true });

      tree.check('a1');
      tree.check('a2');

      expect(tree.stateOf('a')).toBe('unchecked');
    });

    it('unchecks only the node itself', () => {
      const tree = createTree(sample(), { strict: true });
      tree.setChecked(['a', 'a1', 'root']);

      tree.uncheck('a');

      expect(tree.checkedKeys()).toEqual(['root', 'a1']);
    });

    it('takes seeds as they are', () => {
      const tree = createTree(sample(), { strict: true, initial: ['a'] });

      expect(sorted(tree.checked())).toEqual(['a']);
    });

    it('can follow a signal and recompute when it flips', () => {
      const strict = signal(true);
      const tree = createTree(sample(), { strict, initial: ['a'] });
      expect(tree.strict()).toBe(true);
      expect(tree.stateOf('a1')).toBe('unchecked');

      strict.set(false);

      expect(tree.stateOf('a1')).toBe('checked');
      expect(tree.stateOf('root')).toBe('mixed');
    });

    it('reports every checked key whatever the strategy', () => {
      const tree = createTree(sample(), { strict: true, initial: ['a', 'a1'] });

      expect(tree.checkedKeysByStrategy('parent')).toEqual(['a', 'a1']);
      expect(tree.checkedKeysByStrategy('child')).toEqual(['a', 'a1']);
    });

    it('allows locking to block toggling', () => {
      const tree = createTree([branch('p', [leaf('x', true), leaf('y')])], {
        strict: true,
      });

      expect(tree.check('x')).toBe(false);
      expect(tree.check('y')).toBe(true);
    });
  });

  describe('disabled nodes', () => {
    it('cannot be toggled', () => {
      const tree = createTree([branch('p', [leaf('x', true), leaf('y')])]);

      expect(tree.check('x')).toBe(false);
      expect(tree.uncheck('x')).toBe(false);
      expect(tree.toggle('x')).toBe(false);
      expect(tree.isDisabled('x')).toBe(true);
      expect(tree.isDisabled('y')).toBe(false);
      expect(tree.isDisabled('unknown')).toBe(false);
    });

    it('are skipped by a cascade from their parent', () => {
      const tree = createTree([
        branch('p', [leaf('x', true), leaf('y'), leaf('z')]),
      ]);

      tree.check('p');

      expect(sorted(tree.checked())).toEqual(['p', 'y', 'z']);
      expect(tree.stateOf('x')).toBe('unchecked');
    });

    it('keep a pre-checked state through a cascade', () => {
      const tree = createTree([branch('p', [leaf('x', true), leaf('y')])], {
        initial: ['x'],
      });

      tree.check('y');
      expect(tree.stateOf('x')).toBe('checked');
      tree.uncheck('p');
      expect(tree.stateOf('x')).toBe('checked');
      expect(tree.stateOf('y')).toBe('unchecked');
    });

    it('do not count against a parent: a partially disabled parent completes from its enabled children', () => {
      const tree = createTree([
        branch('p', [leaf('x', true), leaf('y'), leaf('z')]),
      ]);

      tree.check('y');
      expect(tree.stateOf('p')).toBe('mixed');
      tree.check('z');

      expect(tree.stateOf('p')).toBe('checked');
      expect(tree.stateOf('x')).toBe('unchecked');
    });

    it('do not make a parent mixed on their own', () => {
      const tree = createTree([branch('p', [leaf('x', true), leaf('y')])], {
        initial: ['x'],
      });

      expect(tree.stateOf('p')).toBe('unchecked');
    });

    it('cut off their whole subtree from a cascade', () => {
      const tree = createTree([
        branch('p', [branch('l', [leaf('d1'), leaf('d2')], true), leaf('y')]),
      ]);

      tree.check('p');

      expect(sorted(tree.checked())).toEqual(['p', 'y']);
      expect(tree.stateOf('d1')).toBe('unchecked');
    });

    it('still let nodes below a locked parent be toggled among themselves', () => {
      const tree = createTree([
        branch('p', [branch('l', [leaf('d1'), leaf('d2')], true), leaf('y')]),
      ]);

      tree.check('d1');

      expect(tree.stateOf('d1')).toBe('checked');
      expect(tree.stateOf('l')).toBe('unchecked');
      expect(tree.stateOf('p')).toBe('unchecked');
    });

    it('a locked parent keeps its own state and does not pass it down', () => {
      const tree = createTree([branch('l', [leaf('d1'), leaf('d2')], true)], {
        initial: ['l'],
      });

      expect(tree.stateOf('l')).toBe('checked');
      expect(tree.stateOf('d1')).toBe('unchecked');
      expect(tree.check('d1')).toBe(true);
      expect(tree.stateOf('l')).toBe('checked');
    });

    it('a parent whose children are all locked behaves like a leaf', () => {
      const tree = createTree([
        branch('p', [leaf('x', true), leaf('y', true)]),
      ]);

      expect(tree.check('p')).toBe(true);
      expect(tree.checkedKeys()).toEqual(['p']);
      expect(tree.uncheck('p')).toBe(true);
    });

    it('a locked leaf checked from outside leaves the sibling state alone', () => {
      const tree = createTree([branch('p', [leaf('x', true), leaf('y')])], {
        initial: ['x'],
      });

      tree.check('y');

      expect(sorted(tree.checked())).toEqual(['p', 'x', 'y']);
    });

    it('checkAll and clear leave locked nodes untouched', () => {
      const tree = createTree(
        [branch('p', [leaf('x', true), leaf('y'), leaf('z')])],
        { initial: ['x'] },
      );

      tree.checkAll();
      expect(sorted(tree.checked())).toEqual(['p', 'x', 'y', 'z']);

      tree.clear();
      expect(tree.checkedKeys()).toEqual(['x']);
    });

    it('track signals read by the predicate', () => {
      const lockedIds = signal<readonly string[]>([]);
      const tree = createTree(sample(), {
        isDisabled: (node) => lockedIds().includes(node.id),
      });
      expect(tree.isDisabled('a')).toBe(false);

      lockedIds.set(['a']);

      expect(tree.isDisabled('a')).toBe(true);
      expect(tree.check('a')).toBe(false);
    });
  });

  describe('setChecked, checkAll and clear', () => {
    it('treats listed parents as seeds and reports a programmatic change', () => {
      const tree = createTree();

      expect(tree.setChecked(['a', 'b1'])).toBe(true);

      expect(tree.checkedKeys()).toEqual(['a', 'a1', 'a2', 'b1']);
      expect(tree.changes()).toEqual({
        added: ['a', 'a1', 'a2', 'b1'],
        removed: [],
        source: 'programmatic',
      });
    });

    it('completes a parent whose children are all listed', () => {
      const tree = createTree();

      tree.setChecked(['a1', 'a2']);

      expect(tree.stateOf('a')).toBe('checked');
    });

    it('ignores locking', () => {
      const tree = createTree([branch('p', [leaf('x', true), leaf('y')])]);

      tree.setChecked(['x']);

      expect(tree.stateOf('x')).toBe('checked');
    });

    it('drops duplicates', () => {
      const tree = createTree();

      tree.setChecked(['c', 'c', 'zzz', 'zzz']);

      expect(tree.checkedKeys()).toEqual(['c', 'zzz']);
    });

    it('checkAll checks everything once and clear empties', () => {
      const tree = createTree();

      expect(tree.checkAll()).toBe(true);
      expect(tree.checkAll()).toBe(false);
      expect(tree.checked().size).toBe(8);
      expect(tree.clear()).toBe(true);
      expect(tree.clear()).toBe(false);
      expect(tree.checkedKeys()).toEqual([]);
    });

    it('does nothing for an identical value', () => {
      const tree = createTree(sample(), { initial: ['c'] });

      expect(tree.setChecked(['c'])).toBe(false);
      expect(tree.changes()).toBeNull();
    });
  });

  describe('overall state', () => {
    it('summarizes the unlocked nodes', () => {
      const tree = createTree([
        branch('p', [leaf('x', true), leaf('y'), leaf('z')]),
      ]);
      expect(tree.overallState()).toBe('none');

      tree.check('y');
      expect(tree.overallState()).toBe('some');

      tree.check('z');
      expect(tree.overallState()).toBe('all');
    });

    it('is none for an empty tree', () => {
      const tree = createTree([]);

      expect(tree.overallState()).toBe('none');
      expect(tree.checkAll()).toBe(false);
    });
  });

  describe('changes', () => {
    it('reports added and removed keys with propagation included', () => {
      const received: string[] = [];
      const tree = createTree(sample(), {
        onChange: (change) =>
          received.push(
            `+${change.added.join(',')} -${change.removed.join(',')}`,
          ),
      });

      tree.check('a');
      tree.uncheck('a1');

      expect(received).toEqual(['+a,a1,a2 -', '+ -a,a1']);
      expect(tree.changes()).toEqual({
        added: [],
        removed: ['a', 'a1'],
        source: 'interaction',
      });
    });

    it('triggers an effect for each change', () => {
      TestBed.runInInjectionContext(() => {
        const tree = createTree();
        let runs = 0;
        effect(() => {
          if (tree.changes()) {
            runs++;
          }
        });

        TestBed.tick();
        tree.check('c');
        TestBed.tick();
        tree.uncheck('c');
        TestBed.tick();

        expect(runs).toBe(2);
      });
    });

    it('is not tracked when a mutation runs inside a reactive context', () => {
      TestBed.runInInjectionContext(() => {
        const tree = createTree();
        let runs = 0;
        effect(() => {
          runs++;
          tree.check('c');
        });

        TestBed.tick();
        tree.check('a');
        TestBed.tick();

        expect(runs).toBe(1);
      });
    });
  });

  describe('strategies', () => {
    it('reports topmost checked nodes for parent and leaves for child', () => {
      const tree = createTree();
      tree.check('a');
      tree.check('b1');

      expect(tree.checkedKeysByStrategy('all')).toEqual([
        'a',
        'a1',
        'a2',
        'b1',
      ]);
      expect(tree.checkedKeysByStrategy('parent')).toEqual(['a', 'b1']);
      expect(tree.checkedKeysByStrategy('child')).toEqual(['a1', 'a2', 'b1']);
    });

    it('reports a fully checked tree as its root', () => {
      const tree = createTree();
      tree.check('root');

      expect(tree.checkedKeysByStrategy('parent')).toEqual(['root']);
      expect(tree.checkedKeysByStrategy('child')).toEqual([
        'a1',
        'a2',
        'b1',
        'b2',
        'c',
      ]);
    });

    it('appends unknown keys to every strategy', () => {
      const tree = createTree(sample(), { initial: ['c', 'ghost'] });

      expect(tree.checkedKeysByStrategy('parent')).toEqual(['c', 'ghost']);
      expect(tree.checkedKeysByStrategy('child')).toEqual(['c', 'ghost']);
    });
  });

  describe('structure queries', () => {
    it('answers has, parentKeyOf and childKeysOf', () => {
      const tree = createTree();

      expect(tree.has('a1')).toBe(true);
      expect(tree.has('zzz')).toBe(false);
      expect(tree.parentKeyOf('a1')).toBe('a');
      expect(tree.parentKeyOf('root')).toBeUndefined();
      expect(tree.parentKeyOf('zzz')).toBeUndefined();
      expect(tree.childKeysOf('root')).toEqual(['a', 'b', 'c']);
      expect(tree.childKeysOf('c')).toEqual([]);
      expect(tree.childKeysOf('zzz')).toEqual([]);
    });

    it('treats unknown keys as unchecked', () => {
      const tree = createTree();

      expect(tree.stateOf('zzz')).toBe('unchecked');
      expect(tree.isChecked('zzz')).toBe(false);
    });
  });

  describe('source list changes', () => {
    it('re-indexes when the nodes signal changes and recomputes the propagated state', () => {
      const nodes = signal<readonly Node[]>([
        branch('p', [leaf('x'), leaf('y')]),
      ]);
      const tree = createTree(nodes);
      tree.check('x');
      expect(tree.stateOf('p')).toBe('mixed');

      nodes.set([branch('p', [leaf('x')])]);

      expect(tree.stateOf('p')).toBe('checked');
      expect(tree.has('y')).toBe(false);
    });

    it('cascades a checked parent into children that load later', () => {
      const nodes = signal<readonly Node[]>([branch('p', [])]);
      const tree = createTree(nodes);
      tree.check('p');
      expect(tree.checkedKeys()).toEqual(['p']);

      nodes.set([branch('p', [leaf('x'), leaf('y')])]);

      expect(tree.checkedKeys()).toEqual(['p', 'x', 'y']);
    });

    it('keeps keys of removed nodes as unknown until pruned', () => {
      const nodes = signal<readonly Node[]>(sample());
      const tree = createTree(nodes);
      tree.check('c');
      tree.check('a1');

      nodes.set([branch('root', [leaf('c')])]);

      expect(tree.checkedKeys()).toEqual(['root', 'c', 'a1']);
      expect(tree.checked().has('a1')).toBe(false);

      expect(tree.prune()).toBe(true);
      expect(tree.checkedKeys()).toEqual(['root', 'c']);
      expect(tree.changes()).toEqual({
        added: [],
        removed: ['a1'],
        source: 'programmatic',
      });
      expect(tree.prune()).toBe(false);
    });

    it('revives unknown keys when their nodes come back', () => {
      const nodes = signal<readonly Node[]>([]);
      const tree = createTree(nodes, { initial: ['c'] });
      expect(tree.checked().size).toBe(0);
      expect(tree.checkedKeys()).toEqual(['c']);

      nodes.set(sample());

      expect(tree.stateOf('c')).toBe('checked');
      expect(tree.checkedKeys()).toEqual(['c']);
    });

    it('clear forgets unknown keys', () => {
      const tree = createTree(sample(), { initial: ['c', 'ghost'] });

      tree.clear();

      expect(tree.checkedKeys()).toEqual([]);
    });

    it('preserves unknown keys across interactions', () => {
      const tree = createTree(sample(), { initial: ['ghost'] });

      tree.check('c');

      expect(tree.checkedKeys()).toEqual(['c', 'ghost']);
    });

    it('re-evaluates after a parent is removed and its children are promoted', () => {
      const nodes = signal<readonly Node[]>([
        branch('p', [leaf('x'), leaf('y')]),
      ]);
      const tree = createTree(nodes);
      tree.check('p');

      nodes.set([leaf('x'), leaf('y')]);

      expect(tree.checkedKeys()).toEqual(['x', 'y', 'p']);
      expect(tree.prune()).toBe(true);
      expect(tree.checkedKeys()).toEqual(['x', 'y']);
    });
  });

  describe('data shapes', () => {
    it('uses nodes as keys by default', () => {
      const child = { children: [] as unknown[] };
      const root = { children: [child] };
      const tree = new AndesCheckedTree<typeof root>({
        nodes: [root],
        childrenOf: (node) => node.children as (typeof root)[],
      });

      tree.check(root);

      expect(tree.isChecked(root)).toBe(true);
      expect(tree.isChecked(child as typeof root)).toBe(true);
    });

    it('ignores a repeated key and its subtree', () => {
      const tree = createTree([
        branch('p', [leaf('x')]),
        branch('p', [leaf('shadow')]),
      ]);

      expect(tree.has('shadow')).toBe(false);
      expect(tree.childKeysOf('p')).toEqual(['x']);
    });

    it('survives cyclic data', () => {
      const a: { id: string; children: unknown[] } = { id: 'a', children: [] };
      const b = { id: 'b', children: [a] };
      a.children.push(b);
      const tree = new AndesCheckedTree<typeof a, string>({
        nodes: [a],
        childrenOf: (node) => node.children as (typeof a)[],
        keyOf: (node) => node.id,
      });

      expect(tree.check('a')).toBe(true);
      expect(tree.checkedKeys()).toEqual(['a', 'b']);
    });

    it('accepts a flat parent map by using keys as nodes', () => {
      const childrenMap = new Map<string, string[]>([
        ['r', ['r1', 'r2']],
        ['r1', ['r1a']],
      ]);
      const tree = new AndesCheckedTree<string>({
        nodes: ['r'],
        childrenOf: (key) => childrenMap.get(key),
      });

      tree.check('r1a');

      expect(tree.stateOf('r1')).toBe('checked');
      expect(tree.stateOf('r')).toBe('mixed');
    });

    it('handles an empty root list', () => {
      const tree = createTree([]);

      expect(tree.checkedKeys()).toEqual([]);
      expect(tree.check('x')).toBe(false);
    });

    it('handles a very deep chain without overflowing the stack', () => {
      let node: Node = leaf('n0');
      for (let i = 1; i <= 20000; i++) {
        node = branch(`n${i}`, [node]);
      }
      const tree = createTree([node]);

      tree.check('n20000');

      expect(tree.checked().size).toBe(20001);
      expect(tree.uncheck('n0')).toBe(true);
      expect(tree.checked().size).toBe(0);
    });
  });

  describe('performance', () => {
    it('handles several thousand nodes', () => {
      const groups = Array.from({ length: 50 }, (_, g) =>
        branch(
          `g${g}`,
          Array.from({ length: 100 }, (_, i) => leaf(`g${g}-${i}`)),
        ),
      );
      const tree = createTree([branch('all', groups)]);

      tree.check('g7');
      expect(tree.checked().size).toBe(101);
      tree.check('all');
      expect(tree.checked().size).toBe(5051);
      tree.uncheck('g3-50');
      expect(tree.stateOf('g3')).toBe('mixed');
      expect(tree.stateOf('all')).toBe('mixed');
      expect(tree.checked().size).toBe(5051 - 3);
      expect(tree.overallState()).toBe('some');
    });
  });

  describe('derived signals', () => {
    it('can feed a computed row state', () => {
      const tree = createTree();
      const aState = computed(() => tree.stateOf('a'));
      expect(aState()).toBe('unchecked');

      tree.check('a1');
      expect(aState()).toBe('mixed');
      tree.check('a2');
      expect(aState()).toBe('checked');
    });
  });
});
