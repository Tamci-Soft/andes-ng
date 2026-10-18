import { computed, isSignal, signal, Signal, untracked } from '@angular/core';

import type {
  AndesSelectionChange,
  AndesSelectionChangeSource,
  AndesSelectionMode,
  AndesSelectionModelConfig,
  AndesSelectionState,
} from './selection-model-types';

/** A growable set of items that answers "is this one in it", by key or by comparison. */
interface Lookup<T> {
  has(item: T): boolean;
  add(item: T): void;
}

function identity<T>(value: T): unknown {
  return value;
}

/** `SameValueZero`, the equality `Set` uses, so `keyOf` results compare like they hash. */
function sameKey(a: unknown, b: unknown): boolean {
  return a === b || (a !== a && b !== b);
}

function isSameSequence<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/**
 * A signal-based selection over a list of items: single or multiple, with a maximum, per-item
 * locking, object identity by key, change reporting, shift-click ranges and the tri-state
 * "select all" summary.
 *
 * It is plain TypeScript state — no DOM, no injection context — so any component, directive or
 * service can own one. The recurring shapes it replaces are a table's row selection, a
 * checkbox group, a transfer list's two panes, a multi-select's value and a list's selected
 * rows.
 *
 * Every mutating method returns whether the selection actually changed, so a caller can skip
 * emitting an output for a click that was blocked or redundant. Interaction methods
 * (`select`, `deselect`, `toggle`, `clear`, `selectAll`, `deselectAll`, `toggleAll`,
 * `invert`, `selectRange`) honor `isDisabled` and `max`; `setSelection` and `retainOnly` are
 * programmatic and do not.
 *
 * ```ts
 * readonly rows = signal<readonly Row[]>([]);
 * readonly selection = new AndesSelectionModel<Row>({
 *   keyOf: (row) => row.id,
 *   isDisabled: (row) => row.locked,
 *   onChange: (change) => this.selectionChange.emit(change),
 * });
 * readonly headerState = computed(() => this.selection.stateOf(this.rows()));
 *
 * onRowClick(row: Row, event: MouseEvent) {
 *   if (event.shiftKey && this.selection.anchor()) {
 *     this.selection.selectRange(this.rows(), this.selection.anchor()!, row, !this.selection.isSelected(row));
 *   } else {
 *     this.selection.toggle(row);
 *   }
 * }
 * ```
 */
export class AndesSelectionModel<T> {
  private readonly keyOf: ((item: T) => unknown) | undefined;
  private readonly compareWith: ((a: T, b: T) => boolean) | undefined;
  private readonly disabledPredicate: ((item: T) => boolean) | undefined;
  private readonly onChange:
    ((change: AndesSelectionChange<T>) => void) | undefined;

  private readonly raw = signal<readonly T[]>([]);
  private readonly lastChange = signal<AndesSelectionChange<T> | null>(null);
  private readonly anchorItem = signal<T | undefined>(undefined);

  /** Current mode. */
  readonly mode: Signal<AndesSelectionMode>;

  /** The effective limit of `multiple` mode, or `undefined` for none. */
  readonly max: Signal<number | undefined>;

  /**
   * The selected items in the order they were selected. Never longer than the mode and `max`
   * allow, even if those were lowered after items were selected: the extra, later items are
   * simply not part of the selection any more.
   */
  readonly selected: Signal<readonly T[]>;

  /** Number of selected items. */
  readonly size: Signal<number>;

  /** Whether nothing is selected. */
  readonly isEmpty: Signal<boolean>;

  /**
   * The most recent change, or `null` before the first one. Each change is a fresh object, so
   * an `effect` reading this runs once per change — including two consecutive changes that
   * add the same item. Unchanged calls never publish.
   */
  readonly changes: Signal<AndesSelectionChange<T> | null>;

  /**
   * The item the last interaction targeted — the starting point of a shift-click range.
   * Blocked interactions (a disabled item) leave it alone.
   */
  readonly anchor: Signal<T | undefined>;

  private readonly limit: Signal<number>;
  private readonly selectedLookup: Signal<Lookup<T>>;

  constructor(config: AndesSelectionModelConfig<T> = {}) {
    this.keyOf = config.keyOf;
    this.compareWith = config.keyOf ? undefined : config.compareWith;
    this.disabledPredicate = config.isDisabled;
    this.onChange = config.onChange;

    const modeSource = config.mode ?? 'multiple';
    const maxSource = config.max;
    this.mode = isSignal(modeSource)
      ? modeSource
      : signal<AndesSelectionMode>(modeSource).asReadonly();
    const rawMax = isSignal(maxSource)
      ? maxSource
      : signal<number | undefined>(maxSource).asReadonly();
    this.max = computed(() => {
      const value = rawMax();
      return value === undefined || Number.isNaN(value) || value === Infinity
        ? undefined
        : Math.max(0, Math.floor(value));
    });
    this.limit = computed(() =>
      this.mode() === 'single' ? 1 : (this.max() ?? Infinity),
    );

    this.selected = computed(() => {
      const items = this.raw();
      const limit = this.limit();
      return items.length > limit ? items.slice(0, limit) : items;
    });
    this.size = computed(() => this.selected().length);
    this.isEmpty = computed(() => this.size() === 0);
    this.selectedLookup = computed(() => this.createLookup(this.selected()));
    this.changes = this.lastChange.asReadonly();
    this.anchor = this.anchorItem.asReadonly();

    if (config.initial) {
      this.raw.set(this.clip(this.dedupe(config.initial)));
    }
  }

  /** Whether `item` is selected. Reactive when called from a `computed` or a template. */
  isSelected(item: T): boolean {
    return this.selectedLookup().has(item);
  }

  /** Whether `isDisabled` locks `item`. Reactive if the predicate reads signals. */
  isDisabled(item: T): boolean {
    return this.disabledPredicate?.(item) === true;
  }

  /**
   * Selects `item`. In `single` mode it replaces the current item, unless that one is locked.
   * In `multiple` mode it is refused once `max` is reached.
   *
   * @returns whether the selection changed.
   */
  select(item: T): boolean {
    return untracked(() => {
      if (this.isDisabled(item)) {
        return false;
      }
      this.anchorItem.set(item);
      return this.addOne(item);
    });
  }

  /**
   * Deselects `item`; a locked item stays selected.
   *
   * @returns whether the selection changed.
   */
  deselect(item: T): boolean {
    return untracked(() => {
      if (this.isDisabled(item)) {
        return false;
      }
      this.anchorItem.set(item);
      return this.removeOne(item);
    });
  }

  /**
   * Flips `item`. In `single` mode a selected item is deselected too, so a list can be
   * emptied by clicking its selected row; use `select` for radio behavior.
   *
   * @returns whether the selection changed.
   */
  toggle(item: T): boolean {
    return untracked(() => {
      if (this.isDisabled(item)) {
        return false;
      }
      this.anchorItem.set(item);
      return this.selectedLookup().has(item)
        ? this.removeOne(item)
        : this.addOne(item);
    });
  }

  /**
   * Deselects everything the user is allowed to change. Locked items stay: a "clear" button
   * must not silently drop a mandatory choice.
   *
   * @returns whether the selection changed.
   */
  clear(): boolean {
    return untracked(() =>
      this.apply(
        this.selected().filter((item) => this.isDisabled(item)),
        'interaction',
      ),
    );
  }

  /**
   * Replaces the selection, as a form or a two-way binding writes a value in. Duplicates are
   * dropped (the first wins), the list is cut to what the mode and `max` allow, and locking
   * is ignored — a disabled option can still be pre-selected.
   *
   * Unlike the interaction methods this reports `source: 'programmatic'`.
   *
   * @returns whether membership changed. Swapping in new object instances for the same keys
   * updates `selected()` but returns `false` and publishes no change.
   */
  setSelection(items: readonly T[]): boolean {
    return untracked(() =>
      this.apply(this.clip(this.dedupe(items)), 'programmatic'),
    );
  }

  /**
   * Drops selected items that are not in `items`, keeping the order of the rest. Call it when
   * the source list loses entries and the selection must not point at ghosts. Locking is
   * ignored: a row that no longer exists cannot stay selected just because it was locked.
   *
   * @returns whether anything was dropped.
   */
  retainOnly(items: readonly T[]): boolean {
    return untracked(() => {
      const keep = this.createLookup(items);
      return this.apply(
        this.selected().filter((item) => keep.has(item)),
        'programmatic',
      );
    });
  }

  /**
   * Selects every unlocked item of `items`. With `max` it fills the remaining room in list
   * order and stops, rather than refusing the whole call, so "select all" on a long list
   * still does something useful. Does nothing in `single` mode, where "all" has no meaning.
   *
   * @returns whether the selection changed.
   */
  selectAll(items: readonly T[]): boolean {
    return untracked(() => this.addMany(items));
  }

  /**
   * Deselects every unlocked item of `items`. Selected items outside `items`, and locked ones,
   * are untouched — which is what lets one pane's "select none" leave another pane alone.
   *
   * @returns whether the selection changed.
   */
  deselectAll(items: readonly T[]): boolean {
    return untracked(() => this.removeMany(items));
  }

  /**
   * The header checkbox's click: deselects the unlocked items of `items` when all of them are
   * selected, otherwise selects them. If selecting changes nothing because `max` is already
   * reached, it deselects instead, so the control can never get stuck in the mixed state.
   * Does nothing in `single` mode.
   *
   * @returns whether the selection changed.
   */
  toggleAll(items: readonly T[]): boolean {
    return untracked(() => {
      if (this.mode() === 'single') {
        return false;
      }
      if (this.stateOf(items) === 'all') {
        return this.removeMany(items);
      }
      return this.addMany(items) || this.removeMany(items);
    });
  }

  /**
   * Flips the selection of every unlocked item of `items`: selected ones are deselected and the
   * rest selected (a table's "invert selection"). Items outside `items` and locked items are
   * untouched. With `max`, newly selected items fill whatever room is left, in list order.
   * Does nothing in `single` mode.
   *
   * @returns whether the selection changed.
   */
  invert(items: readonly T[]): boolean {
    return untracked(() => {
      if (this.mode() === 'single') {
        return false;
      }
      const flippable = this.dedupe(items).filter(
        (item) => !this.isDisabled(item),
      );
      const chosen = this.selectedLookup();
      const doomed = this.createLookup(flippable.filter((i) => chosen.has(i)));
      const kept = this.selected().filter((item) => !doomed.has(item));
      const room = this.limit() - kept.length;
      const added = flippable
        .filter((item) => !chosen.has(item))
        .slice(0, room);
      return this.apply([...kept, ...added], 'interaction');
    });
  }

  /**
   * Applies shift-click semantics: every unlocked item between `from` and `to` (inclusive, in
   * the order of `items`, whichever comes first) is selected, or deselected with
   * `selected = false`. Callers pass the item that was last interacted with, normally
   * {@link anchor}, as `from`, and take `selected` from the item being clicked, so a range
   * extends whatever the click would have done on its own.
   *
   * `to` becomes the new anchor. If either item is not in `items` nothing happens; in `single`
   * mode only `to` is acted on.
   *
   * @returns whether the selection changed.
   */
  selectRange(items: readonly T[], from: T, to: T, selected = true): boolean {
    return untracked(() => {
      const start = items.findIndex((item) => this.same(item, from));
      const end = items.findIndex((item) => this.same(item, to));
      if (start === -1 || end === -1) {
        return false;
      }
      const target = items[end];
      if (!this.isDisabled(target)) {
        this.anchorItem.set(target);
      }
      if (this.mode() === 'single') {
        if (this.isDisabled(target)) {
          return false;
        }
        return selected ? this.addOne(target) : this.removeOne(target);
      }
      const range = items.slice(Math.min(start, end), Math.max(start, end) + 1);
      return selected ? this.addMany(range) : this.removeMany(range);
    });
  }

  /**
   * Summarizes the selection over `items`: `all` when every unlocked item is selected, `none`
   * when none is, `some` otherwise. Locked items and repeated items are not counted — a locked
   * item can never be changed by "select all", so counting it would leave the control
   * mixed forever. Items selected but absent from `items` are ignored, so a filtered page
   * reports on what it shows.
   *
   * With a `max` below the number of unlocked items `all` is unreachable; see {@link toggleAll}.
   *
   * Reactive: wrap it in `computed(() => model.stateOf(items()))` for a list signal.
   */
  stateOf(items: readonly T[]): AndesSelectionState {
    const selected = this.selectedLookup();
    const seen = this.createLookup();
    let considered = 0;
    let chosen = 0;
    for (const item of items) {
      if (seen.has(item)) {
        continue;
      }
      seen.add(item);
      if (this.isDisabled(item)) {
        continue;
      }
      considered++;
      if (selected.has(item)) {
        chosen++;
      }
    }
    if (chosen === 0) {
      return 'none';
    }
    return chosen === considered ? 'all' : 'some';
  }

  /** Whether {@link stateOf} is `all`: a "select all" checkbox is checked. */
  allSelected(items: readonly T[]): boolean {
    return this.stateOf(items) === 'all';
  }

  /**
   * Whether {@link stateOf} is `some`: a strict subset is selected, i.e. the checkbox is
   * indeterminate. It is `false` for an empty or complete selection.
   */
  someSelected(items: readonly T[]): boolean {
    return this.stateOf(items) === 'some';
  }

  /** Sets the shift-click anchor directly, for example after a programmatic focus move. */
  setAnchor(item: T | undefined): void {
    this.anchorItem.set(item);
  }

  private addOne(item: T): boolean {
    if (this.selectedLookup().has(item)) {
      return false;
    }
    const current = this.selected();
    if (this.mode() === 'single') {
      if (current.some((existing) => this.isDisabled(existing))) {
        return false;
      }
      return this.apply([item], 'interaction');
    }
    if (current.length >= this.limit()) {
      return false;
    }
    return this.apply([...current, item], 'interaction');
  }

  private removeOne(item: T): boolean {
    return this.apply(
      this.selected().filter((existing) => !this.same(existing, item)),
      'interaction',
    );
  }

  private addMany(items: readonly T[]): boolean {
    if (this.mode() === 'single') {
      return false;
    }
    const current = this.selected();
    const known = this.createLookup(current);
    const room = this.limit() - current.length;
    const added: T[] = [];
    for (const item of items) {
      if (added.length >= room) {
        break;
      }
      if (this.isDisabled(item) || known.has(item)) {
        continue;
      }
      known.add(item);
      added.push(item);
    }
    return added.length > 0
      ? this.apply([...current, ...added], 'interaction')
      : false;
  }

  private removeMany(items: readonly T[]): boolean {
    const doomed = this.createLookup(
      items.filter((item) => !this.isDisabled(item)),
    );
    return this.apply(
      this.selected().filter((item) => !doomed.has(item)),
      'interaction',
    );
  }

  /**
   * The single write path: derives `{added, removed}` by membership, stores the new array and
   * publishes the change. A call that only swaps instances or reorders members is stored but
   * stays silent.
   */
  private apply(
    next: readonly T[],
    source: AndesSelectionChangeSource,
  ): boolean {
    const previous = this.selected();
    const before = this.selectedLookup();
    const after = this.createLookup(next);
    const added = next.filter((item) => !before.has(item));
    const removed = previous.filter((item) => !after.has(item));

    if (added.length === 0 && removed.length === 0) {
      if (
        this.raw().length !== next.length ||
        !isSameSequence(previous, next)
      ) {
        this.raw.set(next);
      }
      return false;
    }

    this.raw.set(next);
    const change: AndesSelectionChange<T> = { added, removed, source };
    this.lastChange.set(change);
    this.onChange?.(change);
    return true;
  }

  private clip(items: readonly T[]): readonly T[] {
    const limit = this.limit();
    return items.length > limit ? items.slice(0, limit) : items;
  }

  private dedupe(items: readonly T[]): T[] {
    const seen = this.createLookup();
    const unique: T[] = [];
    for (const item of items) {
      if (!seen.has(item)) {
        seen.add(item);
        unique.push(item);
      }
    }
    return unique;
  }

  private same(a: T, b: T): boolean {
    if (this.keyOf) {
      return sameKey(this.keyOf(a), this.keyOf(b));
    }
    return this.compareWith ? this.compareWith(a, b) : sameKey(a, b);
  }

  private createLookup(items: readonly T[] = []): Lookup<T> {
    const compare = this.compareWith;
    if (compare) {
      const list = [...items];
      return {
        has: (item) => list.some((existing) => compare(existing, item)),
        add: (item) => void list.push(item),
      };
    }
    const keyOf = this.keyOf ?? identity;
    const keys = new Set<unknown>(items.map((item) => keyOf(item)));
    return {
      has: (item) => keys.has(keyOf(item)),
      add: (item) => void keys.add(keyOf(item)),
    };
  }
}
