import { computed, isSignal, signal, Signal, untracked } from '@angular/core';

import type {
  AndesCheckedStrategy,
  AndesCheckedTreeConfig,
  AndesCheckState,
  AndesSelectionChange,
  AndesSelectionChangeSource,
  AndesSelectionState,
} from './selection-model-types';

/**
 * A tree flattened into parallel arrays in depth-first pre-order. Pre-order means a node's index
 * is always greater than its parent's, so walking the arrays forwards visits parents first and
 * backwards visits children first — both propagation directions become one linear pass, with no
 * recursion and no sorting.
 */
interface TreeIndex<T, K> {
  readonly keys: readonly K[];
  readonly nodes: readonly T[];
  /** Index of each node's parent, or -1 for a root. */
  readonly parents: Int32Array;
  readonly children: readonly (readonly number[])[];
  readonly byKey: ReadonlyMap<K, number>;
}

interface CheckFlags {
  readonly checked: Uint8Array;
  readonly half: Uint8Array;
}

function identity<T>(value: T): unknown {
  return value;
}

function buildIndex<T, K>(
  roots: readonly T[],
  childrenOf: (node: T) => readonly T[] | null | undefined,
  keyOf: (node: T) => K,
): TreeIndex<T, K> {
  const keys: K[] = [];
  const nodes: T[] = [];
  const parentList: number[] = [];
  const children: number[][] = [];
  const byKey = new Map<K, number>();

  // An explicit stack instead of recursion: a degenerate chain of thousands of nodes must not
  // overflow the call stack. Children are pushed in reverse so they pop in source order.
  const stack: { node: T; parent: number }[] = [];
  for (let i = roots.length - 1; i >= 0; i--) {
    stack.push({ node: roots[i], parent: -1 });
  }
  for (let entry = stack.pop(); entry; entry = stack.pop()) {
    const key = keyOf(entry.node);
    if (byKey.has(key)) {
      continue;
    }
    const index = keys.length;
    byKey.set(key, index);
    keys.push(key);
    nodes.push(entry.node);
    parentList.push(entry.parent);
    children.push([]);
    if (entry.parent >= 0) {
      children[entry.parent].push(index);
    }
    const kids = childrenOf(entry.node);
    if (kids) {
      for (let i = kids.length - 1; i >= 0; i--) {
        stack.push({ node: kids[i], parent: index });
      }
    }
  }

  return {
    keys,
    nodes,
    parents: Int32Array.from(parentList),
    children,
    byKey,
  };
}

/**
 * Turns the nodes a caller considers checked (`seed`) into the full state.
 *
 * Strict mode returns the seed untouched. Otherwise: a checked node checks all its unlocked
 * descendants (stopping at a locked node, whose subtree is cut off), then every unlocked parent
 * with at least one unlocked child is recomputed bottom-up — checked when all its unlocked
 * children are, mixed when only some are touched, unchecked otherwise. A parent whose children
 * are all locked has nothing to aggregate and keeps its seed. Locked nodes keep their seed.
 */
function conduct<T, K>(
  index: TreeIndex<T, K>,
  locked: Uint8Array,
  seed: Uint8Array,
  strict: boolean,
): CheckFlags {
  const size = index.keys.length;
  const checked = seed.slice();
  const half = new Uint8Array(size);
  if (strict) {
    return { checked, half };
  }

  for (let i = 0; i < size; i++) {
    const parent = index.parents[i];
    if (
      parent >= 0 &&
      !checked[i] &&
      !locked[i] &&
      !locked[parent] &&
      checked[parent]
    ) {
      checked[i] = 1;
    }
  }

  for (let i = size - 1; i >= 0; i--) {
    const kids = index.children[i];
    if (locked[i] || kids.length === 0) {
      continue;
    }
    let considered = 0;
    let all = true;
    let some = false;
    for (const child of kids) {
      if (locked[child]) {
        continue;
      }
      considered++;
      if (checked[child]) {
        some = true;
      } else {
        all = false;
        if (half[child]) {
          some = true;
        }
      }
    }
    if (considered === 0) {
      continue;
    }
    checked[i] = all ? 1 : 0;
    half[i] = !all && some ? 1 : 0;
  }
  return { checked, half };
}

/**
 * Check state for a hierarchy — a tree, a cascader with multiple values, or a table whose rows
 * have child rows — with parent/child propagation.
 *
 * Checking a node checks everything below it; a parent is checked once all its children are and
 * is `mixed` (half-checked) while only some are. The `strict` option turns propagation off so
 * every node is independent. Locked nodes (`isDisabled`) are islands: they keep their state and
 * neither receive nor pass on a cascade, so a parent aggregates only its unlocked children and
 * a partially locked parent can still be checked by its available children alone.
 *
 * The model stores keys, not nodes, because a checked value usually arrives from a form or a
 * lazy-loading source before (or without) the node being present. Keys that match no node are
 * kept and reported by `checkedKeys` until {@link prune} removes them, so a source list that
 * is temporarily empty or paged does not erase the value. The index is rebuilt once per
 * `nodes` change and every update is a single linear pass, which keeps a few thousand nodes
 * instantaneous.
 *
 * ```ts
 * readonly tree = new AndesCheckedTree<Folder, string>({
 *   nodes: this.folders,              // a signal
 *   childrenOf: (folder) => folder.children,
 *   keyOf: (folder) => folder.id,
 *   strict: this.checkStrictly,       // a signal input
 *   onChange: (change) => this.checkedChange.emit(change),
 * });
 * // template: [checked]="tree.stateOf(id) === 'checked'" [indeterminate]="tree.stateOf(id) === 'mixed'"
 * ```
 */
export class AndesCheckedTree<T, K = T> {
  private readonly nodesSource: () => readonly T[];
  private readonly childrenOf: (node: T) => readonly T[] | null | undefined;
  private readonly keyOf: (node: T) => K;
  private readonly disabledPredicate: ((node: T) => boolean) | undefined;
  private readonly onChange:
    ((change: AndesSelectionChange<K>) => void) | undefined;

  private readonly raw = signal<readonly K[]>([]);
  private readonly lastChange = signal<AndesSelectionChange<K> | null>(null);

  private readonly index: Signal<TreeIndex<T, K>>;
  private readonly locked: Signal<Uint8Array>;
  private readonly flags: Signal<CheckFlags>;
  private readonly unknownKeys: Signal<readonly K[]>;

  /** Whether propagation is off. */
  readonly strict: Signal<boolean>;

  /** Every checked node's key, parents included, in tree order. */
  readonly checked: Signal<ReadonlySet<K>>;

  /** Keys of parents with some, but not all, unlocked children checked. Always empty when strict. */
  readonly halfChecked: Signal<ReadonlySet<K>>;

  /**
   * The checked value: {@link checked} in tree order, followed by keys that match no node
   * (kept until {@link prune}). This is what a form control or two-way binding holds.
   */
  readonly checkedKeys: Signal<readonly K[]>;

  /**
   * Summary over every unlocked node: `all` when each is checked, `none` when none is, `some`
   * otherwise. Drives a tree-wide "select all" checkbox.
   */
  readonly overallState: Signal<AndesSelectionState>;

  /** The most recent change, or `null`. A fresh object per change; see `AndesSelectionModel.changes`. */
  readonly changes: Signal<AndesSelectionChange<K> | null>;

  constructor(config: AndesCheckedTreeConfig<T, K>) {
    const nodes = config.nodes;
    this.nodesSource = typeof nodes === 'function' ? nodes : () => nodes;
    this.childrenOf = config.childrenOf;
    this.keyOf = config.keyOf ?? (identity as (node: T) => K);
    this.disabledPredicate = config.isDisabled;
    this.onChange = config.onChange;

    const strictSource = config.strict ?? false;
    this.strict = isSignal(strictSource)
      ? strictSource
      : signal(strictSource).asReadonly();

    this.index = computed(() =>
      buildIndex(this.nodesSource(), this.childrenOf, this.keyOf),
    );
    this.locked = computed(() => {
      const { nodes: list } = this.index();
      const result = new Uint8Array(list.length);
      const isDisabled = this.disabledPredicate;
      if (isDisabled) {
        list.forEach((node, i) => {
          result[i] = isDisabled(node) ? 1 : 0;
        });
      }
      return result;
    });
    this.flags = computed(() => {
      const index = this.index();
      const seed = new Uint8Array(index.keys.length);
      for (const key of this.raw()) {
        const position = index.byKey.get(key);
        if (position !== undefined) {
          seed[position] = 1;
        }
      }
      return conduct(index, this.locked(), seed, this.strict());
    });
    this.unknownKeys = computed(() => {
      const { byKey } = this.index();
      return this.raw().filter((key) => !byKey.has(key));
    });

    this.checked = computed(() => this.keysWhere(this.flags().checked));
    this.halfChecked = computed(() => this.keysWhere(this.flags().half));
    this.checkedKeys = computed(() => [
      ...this.checked(),
      ...this.unknownKeys(),
    ]);
    this.overallState = computed(() => {
      const locked = this.locked();
      const { checked } = this.flags();
      let considered = 0;
      let chosen = 0;
      for (let i = 0; i < checked.length; i++) {
        if (!locked[i]) {
          considered++;
          chosen += checked[i];
        }
      }
      if (chosen === 0) {
        return 'none';
      }
      return chosen === considered ? 'all' : 'some';
    });
    this.changes = this.lastChange.asReadonly();

    if (config.initial) {
      this.raw.set([...new Set(config.initial)]);
    }
  }

  /** Whether the tree has a node with this key. */
  has(key: K): boolean {
    return this.index().byKey.has(key);
  }

  /** The key of a node's parent, or `undefined` for roots and unknown keys. */
  parentKeyOf(key: K): K | undefined {
    const index = this.index();
    const position = index.byKey.get(key);
    const parent = position === undefined ? -1 : index.parents[position];
    return parent >= 0 ? index.keys[parent] : undefined;
  }

  /** The keys of a node's children, in source order; empty for leaves and unknown keys. */
  childKeysOf(key: K): readonly K[] {
    const index = this.index();
    const position = index.byKey.get(key);
    return position === undefined
      ? []
      : index.children[position].map((child) => index.keys[child]);
  }

  /** Whether the node is locked by `isDisabled`. Unknown keys are not locked. */
  isDisabled(key: K): boolean {
    const position = this.index().byKey.get(key);
    return position !== undefined && this.locked()[position] === 1;
  }

  /** Whether the node is fully checked. */
  isChecked(key: K): boolean {
    return this.stateOf(key) === 'checked';
  }

  /** Whether the node is a parent with only some of its children checked. */
  isHalfChecked(key: K): boolean {
    return this.stateOf(key) === 'mixed';
  }

  /** The node's state, shaped for `aria-checked`. Unknown keys are `unchecked`. */
  stateOf(key: K): AndesCheckState {
    const position = this.index().byKey.get(key);
    if (position === undefined) {
      return 'unchecked';
    }
    const { checked, half } = this.flags();
    if (checked[position]) {
      return 'checked';
    }
    return half[position] ? 'mixed' : 'unchecked';
  }

  /**
   * The checked keys narrowed to what a consumer wants reported: `all` (the default), `parent`
   * (a checked folder stands for its subtree) or `child` (leaves only). Strict mode has no
   * hierarchy to collapse, so it always reports everything. Keys with no node are appended
   * unchanged in every strategy because they cannot be classified.
   */
  checkedKeysByStrategy(strategy: AndesCheckedStrategy): readonly K[] {
    if (strategy === 'all' || this.strict()) {
      return this.checkedKeys();
    }
    const index = this.index();
    const { checked } = this.flags();
    const keys: K[] = [];
    for (let i = 0; i < index.keys.length; i++) {
      if (!checked[i]) {
        continue;
      }
      const parent = index.parents[i];
      const include =
        strategy === 'parent'
          ? parent < 0 || !checked[parent]
          : index.children[i].length === 0;
      if (include) {
        keys.push(index.keys[i]);
      }
    }
    return [...keys, ...this.unknownKeys()];
  }

  /**
   * Checks a node (and, unless strict, everything below it). Does nothing for an unknown key,
   * a locked node, or a node that is already checked.
   *
   * @returns whether the checked value changed.
   */
  check(key: K): boolean {
    return untracked(() => this.setNode(key, true));
  }

  /**
   * Unchecks a node, everything reachable below it and, unless strict, the ancestors that were
   * checked only because this node was — which then become `mixed` if siblings stay checked.
   * A `mixed` parent is unchecked too. Does nothing for an unknown or locked key, or a node
   * with nothing checked in it.
   *
   * @returns whether the checked value changed.
   */
  uncheck(key: K): boolean {
    return untracked(() => this.setNode(key, false));
  }

  /**
   * Flips a node: a `checked` node is unchecked; `unchecked` and `mixed` ones are checked, which
   * is what completes a half-checked parent on click.
   *
   * @returns whether the checked value changed.
   */
  toggle(key: K): boolean {
    return untracked(() => {
      const position = this.index().byKey.get(key);
      if (position === undefined) {
        return false;
      }
      return this.setNode(key, !this.flags().checked[position]);
    });
  }

  /**
   * Checks every unlocked node. Locked nodes keep their state.
   *
   * @returns whether the checked value changed.
   */
  checkAll(): boolean {
    return untracked(() => {
      const locked = this.locked();
      const seed = this.flags().checked.slice();
      for (let i = 0; i < seed.length; i++) {
        if (!locked[i]) {
          seed[i] = 1;
        }
      }
      return this.commit(seed, this.unknownKeys(), 'interaction');
    });
  }

  /**
   * Unchecks every unlocked node and forgets keys that match no node; a locked checked node
   * stays checked, since the user cannot change it.
   *
   * @returns whether the checked value changed.
   */
  clear(): boolean {
    return untracked(() => {
      const locked = this.locked();
      const seed = this.flags().checked.slice();
      for (let i = 0; i < seed.length; i++) {
        if (!locked[i]) {
          seed[i] = 0;
        }
      }
      return this.commit(seed, [], 'interaction');
    });
  }

  /**
   * Replaces the checked value, as a form or a two-way binding writes it in. The keys are taken
   * as the seed: unless strict, a listed parent checks its whole subtree and a parent whose
   * children are all listed becomes checked. Locking is ignored. Keys with no node are kept.
   *
   * Reports `source: 'programmatic'`.
   *
   * @returns whether the checked value changed.
   */
  setChecked(keys: readonly K[]): boolean {
    return untracked(() => {
      const { byKey } = this.index();
      const seed = new Uint8Array(byKey.size);
      const unknown = new Set<K>();
      for (const key of keys) {
        const position = byKey.get(key);
        if (position === undefined) {
          unknown.add(key);
        } else {
          seed[position] = 1;
        }
      }
      return this.commit(seed, [...unknown], 'programmatic');
    });
  }

  /**
   * Forgets keys that match no node. Call it after the source list shrinks and the leftover
   * value should not be reported any more. Reports `source: 'programmatic'`.
   *
   * @returns whether any key was dropped.
   */
  prune(): boolean {
    return untracked(() =>
      this.commit(this.flags().checked, [], 'programmatic'),
    );
  }

  private keysWhere(flags: Uint8Array): ReadonlySet<K> {
    const { keys } = this.index();
    const result = new Set<K>();
    for (let i = 0; i < keys.length; i++) {
      if (flags[i]) {
        result.add(keys[i]);
      }
    }
    return result;
  }

  private setNode(key: K, checked: boolean): boolean {
    const index = this.index();
    const position = index.byKey.get(key);
    const locked = this.locked();
    if (position === undefined || locked[position]) {
      return false;
    }
    const { checked: current, half } = this.flags();
    const already = checked
      ? current[position] === 1
      : current[position] === 0 && half[position] === 0;
    if (already) {
      return false;
    }

    const seed = current.slice();
    seed[position] = checked ? 1 : 0;
    if (!checked && !this.strict()) {
      // Clear what a cascade from this node reaches, then the ancestors, so that re-running
      // the cascade does not simply re-check the node from a parent that still says "checked".
      const pending = [position];
      for (let at = pending.pop(); at !== undefined; at = pending.pop()) {
        for (const child of index.children[at]) {
          if (!locked[child]) {
            seed[child] = 0;
            pending.push(child);
          }
        }
      }
      for (let p = index.parents[position]; p >= 0; p = index.parents[p]) {
        if (!locked[p]) {
          seed[p] = 0;
        }
      }
    }
    return this.commit(seed, this.unknownKeys(), 'interaction');
  }

  /**
   * The single write path: runs propagation on `seed`, stores the normalized keys (so the stored
   * value is always the full checked set, parents included) and publishes `{added, removed}`
   * relative to the previous `checkedKeys`.
   */
  private commit(
    seed: Uint8Array,
    unknown: readonly K[],
    source: AndesSelectionChangeSource,
  ): boolean {
    const index = this.index();
    const { checked } = conduct(index, this.locked(), seed, this.strict());
    const next: K[] = [];
    for (let i = 0; i < index.keys.length; i++) {
      if (checked[i]) {
        next.push(index.keys[i]);
      }
    }
    next.push(...unknown);

    const previous = this.checkedKeys();
    const before = new Set(previous);
    const after = new Set(next);
    const added = next.filter((key) => !before.has(key));
    const removed = previous.filter((key) => !after.has(key));
    if (added.length === 0 && removed.length === 0) {
      return false;
    }

    this.raw.set(next);
    const change: AndesSelectionChange<K> = { added, removed, source };
    this.lastChange.set(change);
    this.onChange?.(change);
    return true;
  }
}
