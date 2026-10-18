import { computed, effect, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesSelectionModel } from './selection-model';
import type {
  AndesSelectionChange,
  AndesSelectionMode,
} from './selection-model-types';

interface Row {
  readonly id: number;
  readonly name?: string;
  readonly locked?: boolean;
}

const row = (id: number, locked = false): Row => ({ id, locked });
const rows = (count: number): Row[] =>
  Array.from({ length: count }, (_, i) => row(i + 1));
const ids = (items: readonly Row[]): number[] => items.map((r) => r.id);

describe('AndesSelectionModel', () => {
  describe('defaults', () => {
    it('starts empty in multiple mode with no limit', () => {
      const model = new AndesSelectionModel<string>();

      expect(model.selected()).toEqual([]);
      expect(model.size()).toBe(0);
      expect(model.isEmpty()).toBe(true);
      expect(model.mode()).toBe('multiple');
      expect(model.max()).toBeUndefined();
      expect(model.changes()).toBeNull();
      expect(model.anchor()).toBeUndefined();
    });

    it('seeds the selection from `initial` without reporting a change', () => {
      const onChange = vi.fn();
      const model = new AndesSelectionModel<string>({
        initial: ['a', 'b', 'a'],
        onChange,
      });

      expect(model.selected()).toEqual(['a', 'b']);
      expect(model.changes()).toBeNull();
      expect(onChange).not.toHaveBeenCalled();
    });

    it('can be created outside an injection context', () => {
      expect(() => new AndesSelectionModel<number>()).not.toThrow();
    });
  });

  describe('multiple mode', () => {
    it('keeps items in the order they were selected', () => {
      const model = new AndesSelectionModel<string>();

      model.select('c');
      model.select('a');
      model.select('b');

      expect(model.selected()).toEqual(['c', 'a', 'b']);
      expect(model.size()).toBe(3);
      expect(model.isEmpty()).toBe(false);
      expect(model.isSelected('a')).toBe(true);
      expect(model.isSelected('z')).toBe(false);
    });

    it('does nothing when selecting an item that is already selected', () => {
      const model = new AndesSelectionModel<string>({ initial: ['a'] });

      expect(model.select('a')).toBe(false);
      expect(model.selected()).toEqual(['a']);
      expect(model.changes()).toBeNull();
    });

    it('deselects only the given item', () => {
      const model = new AndesSelectionModel<string>({
        initial: ['a', 'b', 'c'],
      });

      expect(model.deselect('b')).toBe(true);
      expect(model.selected()).toEqual(['a', 'c']);
      expect(model.deselect('b')).toBe(false);
    });

    it('toggles in and out', () => {
      const model = new AndesSelectionModel<string>();

      expect(model.toggle('a')).toBe(true);
      expect(model.isSelected('a')).toBe(true);
      expect(model.toggle('a')).toBe(true);
      expect(model.isSelected('a')).toBe(false);
    });

    it('clears everything', () => {
      const model = new AndesSelectionModel<string>({ initial: ['a', 'b'] });

      expect(model.clear()).toBe(true);
      expect(model.isEmpty()).toBe(true);
      expect(model.clear()).toBe(false);
    });

    it('distinguishes objects by reference by default', () => {
      const model = new AndesSelectionModel<Row>();
      const original = row(1);

      model.select(original);

      expect(model.isSelected(original)).toBe(true);
      expect(model.isSelected(row(1))).toBe(false);
    });

    it('treats NaN as one value, like a Set', () => {
      const model = new AndesSelectionModel<number>();

      model.select(NaN);
      model.select(NaN);

      expect(model.size()).toBe(1);
      expect(model.isSelected(NaN)).toBe(true);
    });
  });

  describe('single mode', () => {
    it('replaces the selection', () => {
      const model = new AndesSelectionModel<string>({ mode: 'single' });

      model.select('a');
      model.select('b');

      expect(model.selected()).toEqual(['b']);
      expect(model.changes()).toMatchObject({ added: ['b'], removed: ['a'] });
    });

    it('lets toggle deselect the selected item', () => {
      const model = new AndesSelectionModel<string>({
        mode: 'single',
        initial: ['a'],
      });

      expect(model.toggle('a')).toBe(true);
      expect(model.isEmpty()).toBe(true);
    });

    it('keeps only the first of several initial items', () => {
      const model = new AndesSelectionModel<string>({
        mode: 'single',
        initial: ['a', 'b'],
      });

      expect(model.selected()).toEqual(['a']);
    });

    it('cuts setSelection down to one item', () => {
      const model = new AndesSelectionModel<string>({ mode: 'single' });

      model.setSelection(['x', 'y', 'z']);

      expect(model.selected()).toEqual(['x']);
    });

    it('refuses selectAll and toggleAll', () => {
      const model = new AndesSelectionModel<string>({ mode: 'single' });

      expect(model.selectAll(['a', 'b'])).toBe(false);
      expect(model.toggleAll(['a', 'b'])).toBe(false);
      expect(model.isEmpty()).toBe(true);
    });

    it('does not replace a locked selection', () => {
      const model = new AndesSelectionModel<Row>({
        mode: 'single',
        keyOf: (r) => r.id,
        isDisabled: (r) => r.locked === true,
        initial: [row(1, true)],
      });

      expect(model.select(row(2))).toBe(false);
      expect(ids(model.selected())).toEqual([1]);
    });

    it('selects only the target of a range', () => {
      const list = rows(5);
      const model = new AndesSelectionModel<Row>({
        mode: 'single',
        keyOf: (r) => r.id,
      });

      expect(model.selectRange(list, list[0], list[3])).toBe(true);
      expect(ids(model.selected())).toEqual([4]);
      expect(model.selectRange(list, list[0], list[3], false)).toBe(true);
      expect(model.isEmpty()).toBe(true);
    });

    it('ignores a range whose target is locked', () => {
      const list = [row(1), row(2, true)];
      const model = new AndesSelectionModel<Row>({
        mode: 'single',
        keyOf: (r) => r.id,
        isDisabled: (r) => r.locked === true,
      });

      expect(model.selectRange(list, list[0], list[1])).toBe(false);
      expect(model.anchor()).toBeUndefined();
    });
  });

  describe('reactive mode and max', () => {
    it('follows a mode signal and shows only the earliest items when narrowed', () => {
      const mode = signal<AndesSelectionMode>('multiple');
      const model = new AndesSelectionModel<string>({
        mode,
        initial: ['a', 'b', 'c'],
      });
      expect(model.selected()).toEqual(['a', 'b', 'c']);

      mode.set('single');
      expect(model.mode()).toBe('single');
      expect(model.selected()).toEqual(['a']);
      expect(model.size()).toBe(1);

      mode.set('multiple');
      expect(model.selected()).toEqual(['a', 'b', 'c']);
    });

    it('forgets hidden items once an interaction rewrites the selection', () => {
      const mode = signal<AndesSelectionMode>('multiple');
      const model = new AndesSelectionModel<string>({
        mode,
        initial: ['a', 'b', 'c'],
      });
      mode.set('single');

      model.select('z');
      mode.set('multiple');

      expect(model.selected()).toEqual(['z']);
    });

    it('follows a max signal', () => {
      const max = signal<number | undefined>(2);
      const model = new AndesSelectionModel<string>({ max });
      model.select('a');
      model.select('b');
      expect(model.select('c')).toBe(false);

      max.set(3);
      expect(model.select('c')).toBe(true);

      max.set(1);
      expect(model.selected()).toEqual(['a']);
      max.set(undefined);
      expect(model.max()).toBeUndefined();
    });

    it.each([
      [0, 0],
      [-3, 0],
      [2.9, 2],
    ])('normalizes max %s to %s', (given, expected) => {
      const model = new AndesSelectionModel<string>({ max: given });

      expect(model.max()).toBe(expected);
    });

    it.each([NaN, Infinity])('treats max %s as no limit', (given) => {
      const model = new AndesSelectionModel<string>({ max: given });

      expect(model.max()).toBeUndefined();
    });
  });

  describe('max', () => {
    it('refuses to select beyond the limit but still allows swapping via deselect', () => {
      const model = new AndesSelectionModel<string>({ max: 2 });

      expect(model.select('a')).toBe(true);
      expect(model.select('b')).toBe(true);
      expect(model.select('c')).toBe(false);
      expect(model.selected()).toEqual(['a', 'b']);

      model.deselect('a');
      expect(model.select('c')).toBe(true);
      expect(model.selected()).toEqual(['b', 'c']);
    });

    it('allows nothing at max 0', () => {
      const model = new AndesSelectionModel<string>({ max: 0 });

      expect(model.select('a')).toBe(false);
      expect(model.selectAll(['a', 'b'])).toBe(false);
      expect(model.isEmpty()).toBe(true);
    });

    it('cuts initial items and setSelection to the limit, keeping the first', () => {
      const model = new AndesSelectionModel<string>({
        max: 2,
        initial: ['a', 'b', 'c'],
      });
      expect(model.selected()).toEqual(['a', 'b']);

      model.setSelection(['x', 'y', 'z']);
      expect(model.selected()).toEqual(['x', 'y']);
    });

    it('fills the remaining room on selectAll in list order', () => {
      const model = new AndesSelectionModel<string>({ max: 3, initial: ['b'] });

      expect(model.selectAll(['a', 'b', 'c', 'd', 'e'])).toBe(true);

      expect(model.selected()).toEqual(['b', 'a', 'c']);
    });

    it('applies the limit to ranges too', () => {
      const list = rows(6);
      const model = new AndesSelectionModel<Row>({
        max: 3,
        keyOf: (r) => r.id,
      });

      model.selectRange(list, list[1], list[5]);

      expect(ids(model.selected())).toEqual([2, 3, 4]);
    });
  });

  describe('identity', () => {
    it('matches items by keyOf', () => {
      const model = new AndesSelectionModel<Row>({ keyOf: (r) => r.id });

      model.select(row(1));

      expect(model.isSelected(row(1))).toBe(true);
      expect(model.select(row(1))).toBe(false);
      expect(model.deselect(row(1))).toBe(true);
      expect(model.isEmpty()).toBe(true);
    });

    it('keeps the original instance when an equal one is selected again', () => {
      const first = row(1);
      const model = new AndesSelectionModel<Row>({
        keyOf: (r) => r.id,
        initial: [first],
      });

      model.select(row(1));

      expect(model.selected()[0]).toBe(first);
    });

    it('matches items by compareWith', () => {
      const model = new AndesSelectionModel<Row>({
        compareWith: (a, b) => a.id === b.id,
      });

      model.select(row(1));
      model.select(row(1));
      model.select(row(2));

      expect(ids(model.selected())).toEqual([1, 2]);
      expect(model.isSelected(row(2))).toBe(true);
      expect(model.deselect(row(1))).toBe(true);
      expect(ids(model.selected())).toEqual([2]);
    });

    it('works with compareWith across bulk operations', () => {
      const list = rows(4);
      const model = new AndesSelectionModel<Row>({
        compareWith: (a, b) => a.id === b.id,
        isDisabled: (r) => r.id === 3,
      });

      model.selectAll(list.map((r) => row(r.id)));
      expect(ids(model.selected())).toEqual([1, 2, 4]);
      expect(model.stateOf(list)).toBe('all');
      model.deselectAll([row(1), row(2)]);
      expect(ids(model.selected())).toEqual([4]);
    });

    it('prefers keyOf when both are given', () => {
      const compareWith = vi.fn(() => false);
      const model = new AndesSelectionModel<Row>({
        keyOf: (r) => r.id,
        compareWith,
      });

      model.select(row(1));

      expect(model.isSelected(row(1))).toBe(true);
      expect(compareWith).not.toHaveBeenCalled();
    });

    it('does not confuse the number 1 with the string "1"', () => {
      const model = new AndesSelectionModel<string | number>({
        keyOf: (value) => value,
      });

      model.select(1);

      expect(model.isSelected('1')).toBe(false);
    });
  });

  describe('disabled items', () => {
    const locked = (id: number) => id === 2;
    let model: AndesSelectionModel<Row>;

    beforeEach(() => {
      model = new AndesSelectionModel<Row>({
        keyOf: (r) => r.id,
        isDisabled: (r) => locked(r.id),
      });
    });

    it('reports which items are locked', () => {
      expect(model.isDisabled(row(2))).toBe(true);
      expect(model.isDisabled(row(1))).toBe(false);
      expect(new AndesSelectionModel<Row>().isDisabled(row(2))).toBe(false);
    });

    it('blocks select, deselect and toggle', () => {
      model.setSelection([row(2)]);

      expect(model.select(row(2))).toBe(false);
      expect(model.deselect(row(2))).toBe(false);
      expect(model.toggle(row(2))).toBe(false);
      expect(ids(model.selected())).toEqual([2]);

      model.setSelection([]);
      expect(model.select(row(2))).toBe(false);
      expect(model.toggle(row(2))).toBe(false);
      expect(model.isEmpty()).toBe(true);
    });

    it('lets setSelection pre-select a locked item', () => {
      expect(model.setSelection([row(2), row(1)])).toBe(true);

      expect(ids(model.selected())).toEqual([2, 1]);
    });

    it('keeps locked items on clear', () => {
      model.setSelection([row(1), row(2), row(3)]);

      expect(model.clear()).toBe(true);

      expect(ids(model.selected())).toEqual([2]);
      expect(model.clear()).toBe(false);
    });

    it('skips locked items in selectAll and deselectAll', () => {
      const list = rows(4);
      model.selectAll(list);
      expect(ids(model.selected())).toEqual([1, 3, 4]);

      model.setSelection([row(2), row(3)]);
      model.deselectAll(list);
      expect(ids(model.selected())).toEqual([2]);
    });

    it('does not move the anchor onto a locked item', () => {
      model.select(row(1));
      model.select(row(2));

      expect(model.anchor()).toEqual(row(1));
    });

    it('tracks signals read by the predicate', () => {
      const lockedIds = signal<readonly number[]>([]);
      const reactive = new AndesSelectionModel<Row>({
        keyOf: (r) => r.id,
        isDisabled: (r) => lockedIds().includes(r.id),
      });
      const list = rows(3);
      const state = computed(() => reactive.stateOf(list));
      reactive.select(list[0]);
      expect(state()).toBe('some');

      lockedIds.set([2, 3]);

      expect(state()).toBe('all');
    });
  });

  describe('changes', () => {
    it('reports added and removed items with their source', () => {
      const model = new AndesSelectionModel<string>();

      model.select('a');
      expect(model.changes()).toEqual({
        added: ['a'],
        removed: [],
        source: 'interaction',
      });

      model.setSelection(['b', 'c']);
      expect(model.changes()).toEqual({
        added: ['b', 'c'],
        removed: ['a'],
        source: 'programmatic',
      });
    });

    it('calls onChange synchronously with the published change', () => {
      const received: AndesSelectionChange<string>[] = [];
      const model = new AndesSelectionModel<string>({
        onChange: (change) => received.push(change),
      });

      model.select('a');
      model.deselect('a');
      model.deselect('a');

      expect(received).toHaveLength(2);
      expect(received[1]).toEqual({
        added: [],
        removed: ['a'],
        source: 'interaction',
      });
      expect(received[1]).toBe(model.changes());
    });

    it('does not publish for unchanged calls', () => {
      const model = new AndesSelectionModel<string>({ initial: ['a'] });

      model.select('a');
      model.deselect('x');
      model.setSelection(['a']);
      model.selectAll(['a']);
      model.retainOnly(['a']);

      expect(model.changes()).toBeNull();
    });

    it('triggers an effect once per change, even for repeated identical changes', () => {
      TestBed.runInInjectionContext(() => {
        const model = new AndesSelectionModel<string>();
        const seen: string[] = [];
        effect(() => {
          const change = model.changes();
          if (change) {
            seen.push(`${change.added.join('')}-${change.removed.join('')}`);
          }
        });

        TestBed.tick();
        model.select('a');
        TestBed.tick();
        model.deselect('a');
        TestBed.tick();
        model.select('a');
        TestBed.tick();

        expect(seen).toEqual(['a-', '-a', 'a-']);
      });
    });

    it('reports the change for toggleAll and clear', () => {
      const model = new AndesSelectionModel<string>();

      model.toggleAll(['a', 'b']);
      expect(model.changes()?.added).toEqual(['a', 'b']);
      model.clear();
      expect(model.changes()?.removed).toEqual(['a', 'b']);
    });

    it('is not tracked when a mutation runs inside a reactive context', () => {
      TestBed.runInInjectionContext(() => {
        const model = new AndesSelectionModel<string>();
        let runs = 0;
        effect(() => {
          runs++;
          model.select('a');
        });

        TestBed.tick();
        model.select('b');
        TestBed.tick();

        expect(runs).toBe(1);
      });
    });
  });

  describe('setSelection', () => {
    it('drops duplicates keeping the first', () => {
      const model = new AndesSelectionModel<Row>({ keyOf: (r) => r.id });
      const first = { id: 1, name: 'first' };

      model.setSelection([first, { id: 1, name: 'second' }, row(2)]);

      expect(model.selected()).toHaveLength(2);
      expect(model.selected()[0]).toBe(first);
    });

    it('refreshes instances for the same keys without publishing a change', () => {
      const model = new AndesSelectionModel<Row>({
        keyOf: (r) => r.id,
        initial: [row(1)],
      });
      const fresh = { id: 1, name: 'fresh' };

      expect(model.setSelection([fresh])).toBe(false);

      expect(model.selected()[0]).toBe(fresh);
      expect(model.changes()).toBeNull();
    });

    it('reorders the same members without publishing a change', () => {
      const model = new AndesSelectionModel<string>({
        initial: ['a', 'b', 'c'],
      });

      expect(model.setSelection(['c', 'a', 'b'])).toBe(false);

      expect(model.selected()).toEqual(['c', 'a', 'b']);
      expect(model.changes()).toBeNull();
    });

    it('accepts an empty list', () => {
      const model = new AndesSelectionModel<string>({ initial: ['a'] });

      expect(model.setSelection([])).toBe(true);
      expect(model.isEmpty()).toBe(true);
    });

    it('does not mutate the array it was given', () => {
      const model = new AndesSelectionModel<string>();
      const input = ['a', 'b'];

      model.setSelection(input);
      model.select('c');

      expect(input).toEqual(['a', 'b']);
    });

    it('never hands out an array that later mutations change in place', () => {
      const model = new AndesSelectionModel<string>({ initial: ['a'] });
      const before = model.selected();

      model.select('b');

      expect(before).toEqual(['a']);
      expect(model.selected()).not.toBe(before);
    });
  });

  describe('selectAll, deselectAll and toggleAll', () => {
    it('ignores duplicates in the source list', () => {
      const model = new AndesSelectionModel<string>();

      model.selectAll(['a', 'a', 'b']);

      expect(model.selected()).toEqual(['a', 'b']);
    });

    it('keeps existing selections outside the given list', () => {
      const model = new AndesSelectionModel<string>({ initial: ['z'] });

      model.selectAll(['a', 'b']);
      expect(model.selected()).toEqual(['z', 'a', 'b']);

      model.deselectAll(['a', 'b']);
      expect(model.selected()).toEqual(['z']);
    });

    it('selects nothing from an empty list', () => {
      const model = new AndesSelectionModel<string>();

      expect(model.selectAll([])).toBe(false);
      expect(model.deselectAll([])).toBe(false);
      expect(model.toggleAll([])).toBe(false);
    });

    it('toggles between all and none', () => {
      const model = new AndesSelectionModel<string>();
      const list = ['a', 'b', 'c'];

      model.toggleAll(list);
      expect(model.stateOf(list)).toBe('all');
      model.toggleAll(list);
      expect(model.stateOf(list)).toBe('none');
    });

    it('selects the rest when the state is mixed', () => {
      const model = new AndesSelectionModel<string>({ initial: ['b'] });
      const list = ['a', 'b', 'c'];

      model.toggleAll(list);

      expect(model.selected()).toEqual(['b', 'a', 'c']);
    });

    it('deselects instead when the limit makes selecting impossible', () => {
      const model = new AndesSelectionModel<string>({ max: 2 });
      const list = ['a', 'b', 'c'];

      model.toggleAll(list);
      expect(model.selected()).toEqual(['a', 'b']);
      expect(model.stateOf(list)).toBe('some');

      model.toggleAll(list);
      expect(model.isEmpty()).toBe(true);
    });

    it('treats a list of only locked items as inert', () => {
      const model = new AndesSelectionModel<Row>({
        isDisabled: () => true,
        keyOf: (r) => r.id,
      });

      expect(model.toggleAll(rows(3))).toBe(false);
    });
  });

  describe('invert', () => {
    it('flips unlocked items of the list and leaves the rest alone', () => {
      const list = rows(5);
      const model = new AndesSelectionModel<Row>({
        keyOf: (r) => r.id,
        isDisabled: (r) => r.id === 5,
        initial: [list[0], list[4], row(99)],
      });

      expect(model.invert(list)).toBe(true);

      expect(ids(model.selected())).toEqual([5, 99, 2, 3, 4]);
    });

    it('respects the limit for the newly selected items', () => {
      const list = rows(5);
      const model = new AndesSelectionModel<Row>({
        keyOf: (r) => r.id,
        max: 3,
        initial: [list[0]],
      });

      model.invert(list);

      expect(ids(model.selected())).toEqual([2, 3, 4]);
    });

    it('does nothing in single mode or for an empty list', () => {
      const single = new AndesSelectionModel<string>({ mode: 'single' });
      const multiple = new AndesSelectionModel<string>();

      expect(single.invert(['a'])).toBe(false);
      expect(multiple.invert([])).toBe(false);
    });
  });

  describe('tri-state summary', () => {
    const list = rows(4);
    let model: AndesSelectionModel<Row>;

    beforeEach(() => {
      model = new AndesSelectionModel<Row>({
        keyOf: (r) => r.id,
        isDisabled: (r) => r.id === 4,
      });
    });

    it('is none for an empty selection and for an empty list', () => {
      expect(model.stateOf(list)).toBe('none');
      expect(model.stateOf([])).toBe('none');
      expect(model.allSelected(list)).toBe(false);
      expect(model.someSelected(list)).toBe(false);
    });

    it('is some for a strict subset', () => {
      model.select(list[0]);

      expect(model.stateOf(list)).toBe('some');
      expect(model.someSelected(list)).toBe(true);
      expect(model.allSelected(list)).toBe(false);
    });

    it('is all once every unlocked item is selected, whatever the locked one is', () => {
      model.selectAll(list);

      expect(model.stateOf(list)).toBe('all');
      expect(model.allSelected(list)).toBe(true);
      expect(model.someSelected(list)).toBe(false);
      expect(ids(model.selected())).toEqual([1, 2, 3]);
    });

    it('ignores a locked selected item', () => {
      model.setSelection([list[3]]);

      expect(model.stateOf(list)).toBe('none');
    });

    it('is none when every item is locked', () => {
      const allLocked = new AndesSelectionModel<Row>({
        keyOf: (r) => r.id,
        isDisabled: () => true,
        initial: list,
      });

      expect(allLocked.stateOf(list)).toBe('none');
    });

    it('counts a repeated item once', () => {
      model.select(list[0]);

      expect(model.stateOf([list[0], list[0], row(1)])).toBe('all');
    });

    it('ignores selected items that are not in the list', () => {
      model.setSelection([row(99)]);

      expect(model.stateOf(list)).toBe('none');
      model.select(list[0]);
      expect(model.stateOf([list[0]])).toBe('all');
    });

    it('is reactive inside a computed', () => {
      const source = signal(list);
      const state = computed(() => model.stateOf(source()));
      expect(state()).toBe('none');

      model.select(list[0]);
      expect(state()).toBe('some');

      source.set([list[0]]);
      expect(state()).toBe('all');
    });

    it('works in single mode', () => {
      const single = new AndesSelectionModel<Row>({
        mode: 'single',
        keyOf: (r) => r.id,
      });

      single.select(list[0]);

      expect(single.stateOf([list[0]])).toBe('all');
      expect(single.stateOf(list)).toBe('some');
    });
  });

  describe('ranges', () => {
    const list = rows(8);
    let model: AndesSelectionModel<Row>;

    beforeEach(() => {
      model = new AndesSelectionModel<Row>({
        keyOf: (r) => r.id,
        isDisabled: (r) => r.id === 4,
      });
    });

    it('selects between two items inclusive, skipping locked ones', () => {
      expect(model.selectRange(list, list[1], list[5])).toBe(true);

      expect(ids(model.selected())).toEqual([2, 3, 5, 6]);
    });

    it('uses the list order when the target comes before the anchor', () => {
      model.selectRange(list, list[5], list[1]);

      expect(ids(model.selected())).toEqual([2, 3, 5, 6]);
    });

    it('deselects a range with selected = false', () => {
      model.selectAll(list);

      model.selectRange(list, list[0], list[2], false);

      expect(ids(model.selected())).toEqual([5, 6, 7, 8]);
    });

    it('moves the anchor to the target', () => {
      model.selectRange(list, list[0], list[2]);

      expect(model.anchor()).toBe(list[2]);
    });

    it("supports the shift-click recipe: anchor, then range with the clicked item's new state", () => {
      model.toggle(list[1]);
      const anchor = model.anchor();
      expect(anchor).toBe(list[1]);

      const next = !model.isSelected(list[6]);
      model.selectRange(list, anchor as Row, list[6], next);
      expect(ids(model.selected())).toEqual([2, 3, 5, 6, 7]);
    });

    it('treats a one-item range as that item', () => {
      model.selectRange(list, list[2], list[2]);

      expect(ids(model.selected())).toEqual([3]);
    });

    it('does nothing when either end is not in the list', () => {
      expect(model.selectRange(list, row(99), list[2])).toBe(false);
      expect(model.selectRange(list, list[2], row(99))).toBe(false);
      expect(model.selectRange([], list[0], list[1])).toBe(false);
      expect(model.isEmpty()).toBe(true);
      expect(model.anchor()).toBeUndefined();
    });

    it('matches the ends by identity key, not reference', () => {
      model.selectRange(list, row(2), row(3));

      expect(ids(model.selected())).toEqual([2, 3]);
    });

    it('returns false when the range changes nothing', () => {
      model.selectRange(list, list[0], list[2]);

      expect(model.selectRange(list, list[0], list[2])).toBe(false);
    });

    it('lets the anchor be set directly', () => {
      model.setAnchor(list[4]);
      expect(model.anchor()).toBe(list[4]);
      model.setAnchor(undefined);
      expect(model.anchor()).toBeUndefined();
    });
  });

  describe('removing items from the source list', () => {
    it('retainOnly drops ghosts and keeps selection order', () => {
      const model = new AndesSelectionModel<Row>({
        keyOf: (r) => r.id,
        initial: [row(3), row(1), row(2)],
      });

      expect(model.retainOnly([row(1), row(3), row(9)])).toBe(true);

      expect(ids(model.selected())).toEqual([3, 1]);
      expect(model.changes()).toMatchObject({
        removed: [row(2)],
        source: 'programmatic',
      });
    });

    it('retainOnly ignores locking', () => {
      const model = new AndesSelectionModel<Row>({
        keyOf: (r) => r.id,
        isDisabled: () => true,
        initial: [row(1)],
      });

      model.retainOnly([]);

      expect(model.isEmpty()).toBe(true);
    });

    it('keeps selection of removed items until reconciled, but the summary only sees the list', () => {
      const model = new AndesSelectionModel<Row>({ keyOf: (r) => r.id });
      const list = signal(rows(4));
      const state = computed(() => model.stateOf(list()));
      model.selectAll(list());
      expect(state()).toBe('all');

      list.set(rows(2));

      expect(model.size()).toBe(4);
      expect(state()).toBe('all');
      model.retainOnly(list());
      expect(model.size()).toBe(2);
    });

    it('is a no-op for an empty selection', () => {
      const model = new AndesSelectionModel<string>();

      expect(model.retainOnly(['a'])).toBe(false);
    });
  });

  describe('large inputs', () => {
    it('handles thousands of items with keyed lookups', () => {
      const list = rows(5000);
      const model = new AndesSelectionModel<Row>({ keyOf: (r) => r.id });

      model.selectAll(list);
      expect(model.size()).toBe(5000);
      expect(model.stateOf(list)).toBe('all');

      model.selectRange(list, list[100], list[4000], false);
      expect(model.size()).toBe(5000 - 3901);
      expect(model.isSelected(row(4500))).toBe(true);
      expect(model.isSelected(row(200))).toBe(false);
    });
  });
});
