import type { AndesTableRowKey } from './table-context';

/**
 * Pure helpers for tree data - rows that contain child rows. Like the other row
 * helpers, they never own state: `AndesTable.expandedKeys` says which parents are
 * open, and these turn the nested records into the flat list of rows to render.
 *
 * ```ts
 * readonly nodes = computed(() =>
 *   andesFlattenTree(this.accounts(), {
 *     key: (account) => account.id,
 *     children: (account) => account.children,
 *     expandedKeys: this.expanded(),
 *   }),
 * );
 * ```
 *
 * ```html
 * @for (node of nodes(); track node.key) {
 *   <tr andesTableRow [rowKey]="node.key" [level]="node.level">
 *     <td andesTableCell indent>
 *       <andes-table-expand-toggle [spacer]="!node.hasChildren" />
 *       {{ node.row.name }}
 *     </td>
 *   </tr>
 * }
 * ```
 */

/** How to read keys and children out of the consumer's records. */
export interface AndesTreeAccessors<TRow> {
  /** Unique key of a record, used as the row's `rowKey`. */
  readonly key: (row: TRow) => AndesTableRowKey;
  /** Child records, or nothing for a leaf. An empty array is a leaf too. */
  readonly children: (row: TRow) => readonly TRow[] | null | undefined;
}

/** Options for `andesFlattenTree`. */
export interface AndesFlattenTreeOptions<
  TRow,
> extends AndesTreeAccessors<TRow> {
  /** Keys of the open parents - normally `AndesTable.expandedKeys`. */
  readonly expandedKeys: Iterable<AndesTableRowKey>;
  /**
   * Orders one set of siblings, e.g. with `andesSortRows`. Applied at every
   * level, so children are sorted among themselves and stay under their parent.
   */
  readonly sortSiblings?: (rows: readonly TRow[]) => readonly TRow[];
}

/** One rendered row of a flattened tree. */
export interface AndesTreeNode<TRow> {
  readonly row: TRow;
  readonly key: AndesTableRowKey;
  /** Depth, 0 for a top-level row. Bind it to the row's `level`. */
  readonly level: number;
  /** Key of the parent row; `undefined` at the top level. */
  readonly parentKey: AndesTableRowKey | undefined;
  /** Whether the record has children, i.e. whether to show an expand toggle. */
  readonly hasChildren: boolean;
  /** Whether its children are shown. */
  readonly expanded: boolean;
}

/**
 * Depth-first list of the rows to render: every top-level record, followed by
 * the children of each expanded one, recursively. Children of a collapsed parent
 * are left out, however deep.
 */
export function andesFlattenTree<TRow>(
  rows: readonly TRow[],
  options: AndesFlattenTreeOptions<TRow>,
): readonly AndesTreeNode<TRow>[] {
  const expanded = new Set(options.expandedKeys);
  const sort =
    options.sortSiblings ?? ((siblings: readonly TRow[]) => siblings);
  const result: AndesTreeNode<TRow>[] = [];

  const visit = (
    siblings: readonly TRow[],
    level: number,
    parentKey: AndesTableRowKey | undefined,
  ): void => {
    for (const row of sort(siblings)) {
      const key = options.key(row);
      const children = options.children(row) ?? [];
      const isOpen = children.length > 0 && expanded.has(key);

      result.push({
        row,
        key,
        level,
        parentKey,
        hasChildren: children.length > 0,
        expanded: isOpen,
      });

      if (isOpen) {
        visit(children, level + 1, key);
      }
    }
  };

  visit(rows, 0, undefined);
  return result;
}

/**
 * Parent/child structure of a tree, by key. Hand it to `AndesTable.selectionTree`
 * to make selection cascade: selecting a parent selects all its descendants, and
 * a parent counts as selected exactly when all its children are.
 */
export interface AndesTableTree {
  readonly parentOf: ReadonlyMap<AndesTableRowKey, AndesTableRowKey>;
  readonly childrenOf: ReadonlyMap<
    AndesTableRowKey,
    readonly AndesTableRowKey[]
  >;
}

/**
 * Indexes every record of a tree - collapsed ones included - by key. Its
 * `childrenOf` keys are exactly the expandable rows, which makes "expand all"
 * `expandedKeys.set([...tree.childrenOf.keys()])`.
 */
export function andesTreeIndex<TRow>(
  rows: readonly TRow[],
  accessors: AndesTreeAccessors<TRow>,
): AndesTableTree {
  const parentOf = new Map<AndesTableRowKey, AndesTableRowKey>();
  const childrenOf = new Map<AndesTableRowKey, AndesTableRowKey[]>();

  const visit = (
    siblings: readonly TRow[],
    parentKey: AndesTableRowKey | undefined,
  ): void => {
    for (const row of siblings) {
      const key = accessors.key(row);
      if (parentKey !== undefined) {
        parentOf.set(key, parentKey);
        childrenOf.get(parentKey)?.push(key);
      }

      const children = accessors.children(row) ?? [];
      if (children.length > 0) {
        childrenOf.set(key, []);
        visit(children, key);
      }
    }
  };

  visit(rows, undefined);
  return { parentOf, childrenOf };
}

/** Every key below `key` in `tree`, depth first, not including `key` itself. */
export function andesTreeDescendants(
  tree: AndesTableTree,
  key: AndesTableRowKey,
): AndesTableRowKey[] {
  const result: AndesTableRowKey[] = [];
  const stack = [...(tree.childrenOf.get(key) ?? [])].reverse();

  while (stack.length > 0) {
    const next = stack.pop() as AndesTableRowKey;
    result.push(next);
    const children = tree.childrenOf.get(next);
    if (children) {
      for (let i = children.length - 1; i >= 0; i--) {
        stack.push(children[i]);
      }
    }
  }
  return result;
}
