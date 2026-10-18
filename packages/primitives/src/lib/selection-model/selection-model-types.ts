import type { Signal } from '@angular/core';

/**
 * How many items a selection may hold.
 *
 * - `single` — at most one item; selecting another replaces it (radio-like lists, a single
 *   select, a table with radio selection).
 * - `multiple` — any number of items, bounded only by `max` (checkbox groups, multi selects,
 *   transfer lists, tables with checkbox selection).
 */
export type AndesSelectionMode = 'single' | 'multiple';

/**
 * Aggregate state of a selection over a list of items — what a "select all" control renders.
 *
 * - `none` — no considered item is selected (also the answer when nothing is considered).
 * - `some` — a strict subset is selected: the "mixed" / indeterminate state.
 * - `all` — every considered item is selected.
 */
export type AndesSelectionState = 'none' | 'some' | 'all';

/**
 * Where a change came from.
 *
 * Forms integrations need the distinction: an `interaction` (the user clicked, a key was
 * pressed) must be reported to the form, while a `programmatic` write (a form pushing its own
 * value in, a source list being reconciled) must not be echoed back at it.
 */
export type AndesSelectionChangeSource = 'interaction' | 'programmatic';

/**
 * What one mutation changed. Membership only: a call that merely refreshes object instances
 * or reorders the same members reports nothing.
 */
export interface AndesSelectionChange<T> {
  /** Items that became selected, in the order they were added. */
  readonly added: readonly T[];
  /** Items that stopped being selected, in their former selection order. */
  readonly removed: readonly T[];
  /** Whether the change was an `interaction` or a `programmatic` write. */
  readonly source: AndesSelectionChangeSource;
}

/** Options for {@link AndesSelectionModel}. Every key is optional. */
export interface AndesSelectionModelConfig<T> {
  /**
   * Single or multiple selection; a `Signal` keeps the model in step with a component input.
   * Switching to `single` while several items are selected shows only the earliest one
   * selected. Default `'multiple'`.
   */
  mode?: AndesSelectionMode | Signal<AndesSelectionMode>;
  /**
   * The most items `multiple` mode may hold; `undefined` means no limit. Lowering it below the
   * current size shows only the earliest items selected. Default `undefined`.
   */
  max?: number | undefined | Signal<number | undefined>;
  /**
   * Maps an item to the value used to tell items apart (an id, a path string). Use it when
   * the same logical item can arrive as different object instances — rows re-fetched from a
   * server, options rebuilt on every change detection. It is hashed, so lookups stay O(1)
   * with thousands of items. Default: the item itself.
   */
  keyOf?: (item: T) => unknown;
  /**
   * Escape hatch for equality that cannot be reduced to a key. Every lookup scans the
   * selection, so prefer `keyOf` for large selections. Ignored when `keyOf` is given.
   */
  compareWith?: (a: T, b: T) => boolean;
  /**
   * Marks items the user cannot change: selecting, deselecting, clearing or range-selecting
   * them does nothing, and "select all" ignores them. It may read signals; the model's
   * derived state tracks them. Programmatic writes (`setSelection`) bypass it so a form can
   * still pre-select a disabled option.
   */
  isDisabled?: (item: T) => boolean;
  /** Items selected from the start, without reporting a change. */
  initial?: readonly T[];
  /**
   * Called synchronously after every change, with the same object that `changes` publishes.
   * Components use it to emit an output at the exact moment the selection changes.
   */
  onChange?: (change: AndesSelectionChange<T>) => void;
}

/**
 * Check state of one tree node, mirroring `aria-checked`.
 *
 * `mixed` is a parent with some, but not all, of its checkable descendants checked.
 */
export type AndesCheckState = 'checked' | 'unchecked' | 'mixed';

/**
 * Which checked nodes a consumer wants reported when parents cascade.
 *
 * - `all` — every checked node, parents included.
 * - `parent` — only the topmost checked nodes: a checked folder stands for its whole subtree.
 * - `child` — only checked nodes without children (the leaves).
 */
export type AndesCheckedStrategy = 'all' | 'parent' | 'child';

/** Options for {@link AndesCheckedTree}. */
export interface AndesCheckedTreeConfig<T, K = T> {
  /**
   * The root nodes, or a function (typically a signal) returning them. Read reactively: when
   * it returns a new array the tree is re-indexed. Treat nodes as immutable — mutating a
   * `children` array in place is not noticed.
   */
  nodes: readonly T[] | (() => readonly T[]);
  /**
   * Reads a node's children. Nodes without a children field can return `undefined`.
   */
  childrenOf: (node: T) => readonly T[] | null | undefined;
  /**
   * Identifies a node. Keys must be unique: when a key repeats, the first node wins and the
   * later one (with its subtree) is ignored, which also makes cyclic data harmless.
   * Default: the node itself.
   */
  keyOf?: (node: T) => K;
  /**
   * Locks a node's checkbox. A locked node keeps whatever state it has, cannot be toggled by
   * the user, and takes no part in propagation: a cascade neither reaches it (nor anything
   * below it) and its state is ignored when a parent aggregates its children.
   */
  isDisabled?: (node: T) => boolean;
  /**
   * `true` makes every node independent (no propagation in either direction); a `Signal`
   * keeps the tree in step with a component input. Default `false`.
   */
  strict?: boolean | Signal<boolean>;
  /** Keys checked from the start, without reporting a change. */
  initial?: readonly K[];
  /** Called synchronously after every change, with the same object `changes` publishes. */
  onChange?: (change: AndesSelectionChange<K>) => void;
}
