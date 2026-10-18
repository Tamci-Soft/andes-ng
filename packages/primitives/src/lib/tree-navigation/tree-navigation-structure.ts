import type {
  AndesTreeNavigationKey,
  AndesTreeNavigationNode,
  AndesTreeNavigationNodeInfo,
} from './tree-navigation-types';

/**
 * One resolved node of the hierarchy. Mutable only while {@link buildTreeStructure} is wiring
 * it up; everything afterwards treats it as read-only.
 *
 * @internal
 */
export class TreeNodeRecord implements AndesTreeNavigationNodeInfo {
  parent: TreeNodeRecord | null = null;
  readonly children: TreeNodeRecord[] = [];
  level = 1;
  posInSet = 1;
  setSize = 1;
  expandable: boolean;

  readonly key: AndesTreeNavigationKey;
  readonly disabled: boolean;
  /** Typeahead text supplied with the node, if any. */
  readonly label: string | undefined;

  /** The `parentKey` the node was declared with, before it is checked against the known nodes. */
  readonly declaredParentKey: AndesTreeNavigationKey | null;
  private readonly declaredExpandable: boolean | undefined;

  constructor(node: AndesTreeNavigationNode) {
    this.key = node.key;
    this.declaredParentKey = node.parentKey ?? null;
    this.disabled = node.disabled ?? false;
    this.label = node.label;
    this.declaredExpandable = node.expandable;
    this.expandable = node.expandable ?? false;
  }

  get parentKey(): AndesTreeNavigationKey | null {
    return this.parent?.key ?? null;
  }

  /** Settles `expandable` once the children are known. */
  resolveExpandable(): void {
    this.expandable = this.declaredExpandable ?? this.children.length > 0;
  }
}

/** The hierarchy of every known node, independent of what is expanded. @internal */
export interface TreeStructure {
  readonly byKey: ReadonlyMap<AndesTreeNavigationKey, TreeNodeRecord>;
  readonly roots: readonly TreeNodeRecord[];
}

/**
 * Wires a flat list of nodes into a hierarchy.
 *
 * It follows `parentKey` links rather than list position, so parents need not precede their
 * children. A node whose parent is unknown (or itself) becomes a root; the first node wins when
 * a key repeats; and a cycle, which has no root to hang from, simply stays unreachable instead
 * of looping.
 *
 * @internal
 */
export function buildTreeStructure(
  nodes: readonly AndesTreeNavigationNode[],
): TreeStructure {
  const byKey = new Map<AndesTreeNavigationKey, TreeNodeRecord>();
  for (const node of nodes) {
    if (!byKey.has(node.key)) {
      byKey.set(node.key, new TreeNodeRecord(node));
    }
  }

  // Link in list order so siblings keep the order they were given in.
  const roots: TreeNodeRecord[] = [];
  for (const record of byKey.values()) {
    const parentKey = record.declaredParentKey;
    const parent =
      parentKey === null || parentKey === record.key
        ? undefined
        : byKey.get(parentKey);
    if (parent) {
      record.parent = parent;
      parent.children.push(record);
    } else {
      roots.push(record);
    }
  }

  assignHierarchyFacts(roots);
  return { byKey, roots };
}

/** Levels, sibling positions and expandability, walked breadth first so depth costs nothing. */
function assignHierarchyFacts(roots: readonly TreeNodeRecord[]): void {
  setSiblingFacts(roots);
  const queue: TreeNodeRecord[] = [...roots];
  for (let index = 0; index < queue.length; index++) {
    const record = queue[index];
    record.resolveExpandable();
    setSiblingFacts(record.children);
    for (const child of record.children) {
      child.level = record.level + 1;
      queue.push(child);
    }
  }
}

function setSiblingFacts(siblings: readonly TreeNodeRecord[]): void {
  siblings.forEach((sibling, index) => {
    sibling.posInSet = index + 1;
    sibling.setSize = siblings.length;
  });
}

/**
 * The nodes a user can reach, in reading order: depth first, descending only into expanded
 * nodes. Iterative, so a very deep tree cannot overflow the stack.
 *
 * @internal
 */
export function collectVisibleNodes(
  roots: readonly TreeNodeRecord[],
  expanded: ReadonlySet<AndesTreeNavigationKey>,
): TreeNodeRecord[] {
  const visible: TreeNodeRecord[] = [];
  const stack: TreeNodeRecord[] = [];
  for (let index = roots.length - 1; index >= 0; index--) {
    stack.push(roots[index]);
  }
  while (stack.length > 0) {
    const record = stack.pop() as TreeNodeRecord;
    visible.push(record);
    if (record.children.length > 0 && expanded.has(record.key)) {
      for (let index = record.children.length - 1; index >= 0; index--) {
        stack.push(record.children[index]);
      }
    }
  }
  return visible;
}
