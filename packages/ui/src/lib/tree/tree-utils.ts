import type {
  AndesFlatTreeNode,
  AndesFlattenOptions,
  AndesTreeCheckedStrategy,
  AndesTreeCheckState,
  AndesTreeDropPosition,
  AndesTreeEntry,
  AndesTreeFieldNames,
  AndesTreeFilterResult,
  AndesTreeIndex,
  AndesTreeKey,
  AndesTreeNode,
  AndesTreeTextSegment,
} from './tree-types';

/* -------------------------------------------------------------------------------------------
 * Indexing
 * ----------------------------------------------------------------------------------------- */

/**
 * Resolves a tree of node objects into keyed entries: each carries its level, its position among
 * its siblings, its parent and its resolved flags. A node without a key gets its position path
 * (`'0-2-1'`) as one.
 */
export function andesCreateTreeIndex(
  nodes: readonly AndesTreeNode[] | null | undefined,
  fieldNames?: AndesTreeFieldNames,
): AndesTreeIndex {
  const keyField = fieldNames?.key ?? 'key';
  const titleField = fieldNames?.title ?? 'title';
  const childrenField = fieldNames?.children ?? 'children';
  const byKey = new Map<AndesTreeKey, AndesTreeEntry>();
  const order: AndesTreeKey[] = [];

  const build = (
    list: readonly AndesTreeNode[],
    parent: AndesTreeEntry | null,
    path: string,
  ): AndesTreeEntry[] => {
    const entries: AndesTreeEntry[] = [];
    list.forEach((node, index) => {
      const position = path ? `${path}-${index}` : `${index}`;
      const rawKey = node[keyField];
      const key: AndesTreeKey =
        typeof rawKey === 'string' || typeof rawKey === 'number'
          ? rawKey
          : position;
      const rawChildren = node[childrenField];
      const hasChildrenField = Array.isArray(rawChildren);
      const children: AndesTreeEntry[] = [];
      const disabled = node.disabled === true;
      const disableCheckbox = disabled || node.disableCheckbox === true;
      const entry: AndesTreeEntry = {
        key,
        node,
        title: String(node[titleField] ?? ''),
        parent,
        level: parent ? parent.level + 1 : 1,
        index,
        siblingCount: list.length,
        children,
        hasChildrenField,
        disabled,
        selectable: !disabled && node.selectable !== false,
        checkable: node.checkable !== false,
        disableCheckbox,
        isLeafFlag: typeof node.isLeaf === 'boolean' ? node.isLeaf : undefined,
      };
      byKey.set(key, entry);
      order.push(key);
      if (hasChildrenField) {
        children.push(
          ...build(rawChildren as AndesTreeNode[], entry, position),
        );
      }
      entries.push(entry);
    });
    return entries;
  };

  return { roots: build(nodes ?? [], null, ''), byKey, order };
}

/** Finds a node's entry by key. */
export function andesFindTreeEntry(
  nodes: readonly AndesTreeNode[],
  key: AndesTreeKey,
  fieldNames?: AndesTreeFieldNames,
): AndesTreeEntry | undefined {
  return andesCreateTreeIndex(nodes, fieldNames).byKey.get(key);
}

/** Finds a node object by key. */
export function andesFindTreeNode(
  nodes: readonly AndesTreeNode[],
  key: AndesTreeKey,
  fieldNames?: AndesTreeFieldNames,
): AndesTreeNode | undefined {
  return andesFindTreeEntry(nodes, key, fieldNames)?.node;
}

/** The entries above a node, from the root down to its parent. */
export function andesGetTreeAncestors(entry: AndesTreeEntry): AndesTreeEntry[] {
  const ancestors: AndesTreeEntry[] = [];
  for (let current = entry.parent; current; current = current.parent) {
    ancestors.unshift(current);
  }
  return ancestors;
}

/** Every entry below a node, depth first. */
export function andesGetTreeDescendants(
  entry: AndesTreeEntry,
): AndesTreeEntry[] {
  const descendants: AndesTreeEntry[] = [];
  const visit = (list: readonly AndesTreeEntry[]) => {
    for (const child of list) {
      descendants.push(child);
      visit(child.children);
    }
  };
  visit(entry.children);
  return descendants;
}

/** The keys of every node that has children: what "expand all" opens. */
export function andesGetExpandableKeys(index: AndesTreeIndex): AndesTreeKey[] {
  return index.order.filter(
    (key) => (index.byKey.get(key)?.children.length ?? 0) > 0,
  );
}

/* -------------------------------------------------------------------------------------------
 * Flattening
 * ----------------------------------------------------------------------------------------- */

/**
 * Flattens already indexed entries into rows, depth first. Position and set size count only the
 * entries `include` lets through, so a filtered tree still reports correct `aria-posinset` and
 * `aria-setsize`.
 */
export function andesFlattenEntries(
  roots: readonly AndesTreeEntry[],
  options: Pick<AndesFlattenOptions, 'expandedKeys' | 'include'> = {},
): AndesFlatTreeNode[] {
  const { expandedKeys, include } = options;
  const rows: AndesFlatTreeNode[] = [];

  const walk = (
    entries: readonly AndesTreeEntry[],
    parentKey: AndesTreeKey | null,
    trail: readonly boolean[],
  ) => {
    const shown = include ? entries.filter(include) : entries;
    shown.forEach((entry, index) => {
      const isLast = index === shown.length - 1;
      const hasChildren = include
        ? entry.children.some(include)
        : entry.children.length > 0;
      rows.push({
        key: entry.key,
        node: entry.node,
        entry,
        title: entry.title,
        parentKey,
        level: entry.level,
        posInSet: index + 1,
        setSize: shown.length,
        isLast,
        connectors: trail.length > 0 ? [...trail.slice(1), !isLast] : [],
        hasChildren,
      });
      if (hasChildren && (!expandedKeys || expandedKeys.has(entry.key))) {
        walk(entry.children, entry.key, [...trail, !isLast]);
      }
    });
  };

  walk(roots, null, []);
  return rows;
}

/**
 * Flattens a tree of nodes into rows, depth first, each with its level, its position among its
 * siblings and the connector-line flags. Without `expandedKeys` every node is returned; with it,
 * only the nodes whose ancestors are all expanded (the rows a tree shows).
 */
export function andesFlattenTree(
  nodes: readonly AndesTreeNode[] | null | undefined,
  options: AndesFlattenOptions = {},
): AndesFlatTreeNode[] {
  const index = andesCreateTreeIndex(nodes, options.fieldNames);
  return andesFlattenEntries(index.roots, options);
}

/* -------------------------------------------------------------------------------------------
 * Check propagation
 * ----------------------------------------------------------------------------------------- */

/** The descendants a check on `entry` reaches: it stops at (and skips) nodes with a locked box. */
function conductibleDescendants(entry: AndesTreeEntry): AndesTreeEntry[] {
  const result: AndesTreeEntry[] = [];
  const visit = (list: readonly AndesTreeEntry[]) => {
    for (const child of list) {
      if (child.disableCheckbox) {
        continue;
      }
      result.push(child);
      visit(child.children);
    }
  };
  visit(entry.children);
  return result;
}

/**
 * Works out the full check state from the keys a consumer considers checked.
 *
 * With `strict`, the keys are taken as they are. Otherwise checking cascades: every selectable
 * descendant of a checked node is checked, and a parent is checked when all its descendants are,
 * half-checked when only some are. Nodes with a locked checkbox (disabled, or `disableCheckbox`)
 * neither receive nor pass on a cascade; they keep their own state.
 */
export function andesConductCheck(
  checkedKeys: Iterable<AndesTreeKey>,
  index: AndesTreeIndex,
  strict = false,
): AndesTreeCheckState {
  const seed = new Set<AndesTreeKey>();
  for (const key of checkedKeys) {
    if (index.byKey.has(key)) {
      seed.add(key);
    }
  }

  if (strict) {
    return { checked: seed, halfChecked: new Set() };
  }

  const checked = new Set<AndesTreeKey>(seed);
  for (const key of seed) {
    const entry = index.byKey.get(key);
    if (entry) {
      for (const descendant of conductibleDescendants(entry)) {
        checked.add(descendant.key);
      }
    }
  }

  const halfChecked = new Set<AndesTreeKey>();
  // Deepest parents first, so a parent always sees its children's final state.
  const parents = index.order
    .map((key) => index.byKey.get(key) as AndesTreeEntry)
    .filter((entry) => entry.children.length > 0)
    .sort((a, b) => b.level - a.level);

  for (const parent of parents) {
    if (parent.disableCheckbox) {
      continue;
    }
    const considered = parent.children.filter(
      (child) => !child.disableCheckbox,
    );
    if (considered.length === 0) {
      continue;
    }
    if (considered.every((child) => checked.has(child.key))) {
      checked.add(parent.key);
      halfChecked.delete(parent.key);
    } else if (
      considered.some(
        (child) => checked.has(child.key) || halfChecked.has(child.key),
      )
    ) {
      checked.delete(parent.key);
      halfChecked.add(parent.key);
    } else {
      checked.delete(parent.key);
    }
  }

  return { checked, halfChecked };
}

/**
 * The check state after one node is checked or unchecked. Unchecking also clears the node's
 * ancestors, so a parent whose children were all checked does not re-check the node on the way
 * back down.
 */
export function andesToggleCheck(
  current: ReadonlySet<AndesTreeKey>,
  index: AndesTreeIndex,
  key: AndesTreeKey,
  checked: boolean,
  strict = false,
): AndesTreeCheckState {
  const entry = index.byKey.get(key);
  if (!entry) {
    return andesConductCheck(current, index, strict);
  }

  const seed = new Set(current);
  if (strict) {
    if (checked) {
      seed.add(key);
    } else {
      seed.delete(key);
    }
    return andesConductCheck(seed, index, true);
  }

  if (checked) {
    seed.add(key);
  } else {
    seed.delete(key);
    for (const descendant of conductibleDescendants(entry)) {
      seed.delete(descendant.key);
    }
    for (let parent = entry.parent; parent; parent = parent.parent) {
      if (!parent.disableCheckbox) {
        seed.delete(parent.key);
      }
    }
  }
  return andesConductCheck(seed, index, false);
}

/**
 * Narrows the checked keys to what a consumer wants reported: `all` every checked node, `parent`
 * only the topmost ones (a checked folder stands for everything in it), `child` only the leaves.
 */
export function andesCheckedKeysByStrategy(
  checked: ReadonlySet<AndesTreeKey>,
  index: AndesTreeIndex,
  strategy: AndesTreeCheckedStrategy,
): AndesTreeKey[] {
  return index.order.filter((key) => {
    if (!checked.has(key)) {
      return false;
    }
    const entry = index.byKey.get(key) as AndesTreeEntry;
    switch (strategy) {
      case 'parent':
        return !entry.parent || !checked.has(entry.parent.key);
      case 'child':
        return entry.children.length === 0;
      default:
        return true;
    }
  });
}

/* -------------------------------------------------------------------------------------------
 * Filtering and highlighting
 * ----------------------------------------------------------------------------------------- */

interface FoldedText {
  readonly folded: string;
  /** For each folded character, where its source starts in the original text. */
  readonly starts: readonly number[];
  /** For each folded character, where its source ends in the original text. */
  readonly ends: readonly number[];
}

/** Lower-cases text and drops accents, remembering where each character came from. */
function foldText(text: string): FoldedText {
  let folded = '';
  const starts: number[] = [];
  const ends: number[] = [];
  let offset = 0;
  for (const character of text) {
    const end = offset + character.length;
    const piece = character
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase();
    for (const unit of piece) {
      for (let i = 0; i < unit.length; i++) {
        starts.push(offset);
        ends.push(end);
      }
      folded += unit;
    }
    offset = end;
  }
  return { folded, starts, ends };
}

/** Whether a title contains the query, ignoring case and accents. */
export function andesTreeTitleMatches(title: string, query: string): boolean {
  const needle = foldText(query.trim()).folded;
  return needle.length > 0 && foldText(title).folded.includes(needle);
}

/**
 * Splits text around the places a query matches, ignoring case and accents, so a template can
 * wrap the matches in a mark. Text with no match, or an empty query, comes back as one segment.
 */
export function andesHighlightSegments(
  text: string,
  query: string,
): AndesTreeTextSegment[] {
  const needle = foldText(query.trim()).folded;
  if (!needle || !text) {
    return [{ text, match: false }];
  }
  const { folded, starts, ends } = foldText(text);
  const segments: AndesTreeTextSegment[] = [];
  let cursor = 0;
  let from = 0;
  for (;;) {
    const found = folded.indexOf(needle, from);
    if (found === -1) {
      break;
    }
    const start = starts[found];
    const end = ends[found + needle.length - 1];
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), match: false });
    }
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
    from = found + needle.length;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }
  return segments.length ? segments : [{ text, match: false }];
}

/**
 * Filters a tree: a node is shown when it matches, when something below it matches (so a match
 * is never orphaned from its ancestors), or when it sits under a match (a matched folder shows
 * its contents). `expand` lists the nodes that must be open to reveal a match.
 */
export function andesFilterTree(
  index: AndesTreeIndex,
  query: string,
  matches: (entry: AndesTreeEntry, query: string) => boolean = (entry, text) =>
    andesTreeTitleMatches(entry.title, text),
): AndesTreeFilterResult {
  const matched = new Set<AndesTreeKey>();
  const visible = new Set<AndesTreeKey>();
  const expand = new Set<AndesTreeKey>();

  if (!query.trim()) {
    for (const key of index.order) {
      visible.add(key);
    }
    return { matched, visible, expand };
  }

  const visit = (entry: AndesTreeEntry, underMatch: boolean): boolean => {
    const isMatch = matches(entry, query);
    if (isMatch) {
      matched.add(entry.key);
    }
    let matchBelow = false;
    for (const child of entry.children) {
      if (visit(child, underMatch || isMatch)) {
        matchBelow = true;
      }
    }
    if (matchBelow) {
      expand.add(entry.key);
    }
    if (isMatch || matchBelow || underMatch) {
      visible.add(entry.key);
    }
    return isMatch || matchBelow;
  };

  for (const root of index.roots) {
    visit(root, false);
  }
  // Report each set in tree order, whatever order the walk happened to find them in.
  const inOrder = (set: Set<AndesTreeKey>) =>
    new Set(index.order.filter((key) => set.has(key)));
  return {
    matched: inOrder(matched),
    visible: inOrder(visible),
    expand: inOrder(expand),
  };
}

/* -------------------------------------------------------------------------------------------
 * Moving
 * ----------------------------------------------------------------------------------------- */

/** Whether `candidate` is `entry` itself or lies anywhere below it. */
export function andesIsTreeDescendantOrSelf(
  entry: AndesTreeEntry,
  candidate: AndesTreeEntry,
): boolean {
  for (let current: AndesTreeEntry | null = candidate; current;) {
    if (current === entry) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

/**
 * Returns a copy of the tree with one node moved before, inside (as the first child of) or after
 * another. Only the arrays along the changed paths are copied. `null` when the move makes no
 * sense: a missing key, or a node dropped onto itself or into its own subtree.
 */
export function andesMoveTreeNode(
  nodes: readonly AndesTreeNode[],
  dragKey: AndesTreeKey,
  targetKey: AndesTreeKey,
  position: AndesTreeDropPosition,
  fieldNames?: AndesTreeFieldNames,
): AndesTreeNode[] | null {
  const index = andesCreateTreeIndex(nodes, fieldNames);
  const drag = index.byKey.get(dragKey);
  const target = index.byKey.get(targetKey);
  if (!drag || !target || andesIsTreeDescendantOrSelf(drag, target)) {
    return null;
  }
  const childrenField = fieldNames?.children ?? 'children';

  // One pass over the original arrays: the dragged node is left out where it was and put in
  // beside (or into) the target, copying only the arrays along the changed paths. Both nodes are
  // found by identity in the original tree, which is why removal and insertion cannot be separate
  // passes - the first would replace the target with a copy the second could no longer find.
  const rebuild = (
    list: readonly AndesTreeNode[],
  ): readonly AndesTreeNode[] => {
    const result: AndesTreeNode[] = [];
    let changed = false;
    for (const node of list) {
      if (node === drag.node) {
        changed = true;
        continue;
      }
      let next = node;
      const children = node[childrenField];
      if (Array.isArray(children)) {
        const rebuilt = rebuild(children as AndesTreeNode[]);
        if (rebuilt !== children) {
          next = { ...node, [childrenField]: rebuilt };
        }
      }
      if (node === target.node) {
        changed = true;
        if (position === 'before') {
          result.push(drag.node, next);
          continue;
        }
        if (position === 'inside') {
          const existing = next[childrenField];
          next = {
            ...next,
            [childrenField]: [
              drag.node,
              ...(Array.isArray(existing) ? (existing as AndesTreeNode[]) : []),
            ],
          };
        }
        result.push(next);
        if (position === 'after') {
          result.push(drag.node);
        }
        continue;
      }
      changed ||= next !== node;
      result.push(next);
    }
    return changed ? result : list;
  };

  return [...rebuild(nodes)];
}
