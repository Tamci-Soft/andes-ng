import type {
  AndesCascaderFieldNames,
  AndesCascaderOption,
  AndesCascaderPath,
  AndesCascaderSearch,
  AndesCascaderValue,
} from './cascader-types';

/**
 * Pure helpers behind the cascader: turning option objects into a tree of nodes, looking
 * values up by path, searching across every path and splitting labels for highlighting.
 * Nothing here knows about Angular, so it is tested on its own.
 */

export const ANDES_CASCADER_DEFAULT_FIELD_NAMES: Required<AndesCascaderFieldNames> =
  {
    value: 'value',
    label: 'label',
    children: 'children',
    disabled: 'disabled',
    isLeaf: 'isLeaf',
  };

/** One option as the cascader sees it. */
export interface AndesCascaderNode {
  /** Position in the build order; stable ids for the DOM are derived from it. */
  readonly id: number;
  /** Identifies the path from the first level to this node. */
  readonly key: string;
  readonly value: AndesCascaderValue;
  readonly label: string;
  readonly option: AndesCascaderOption;
  readonly disabled: boolean;
  /** The `isLeaf` flag as given: `undefined` when the option does not say. */
  readonly isLeaf: boolean | undefined;
  /** Whether the option has a children field at all (even an empty one). */
  readonly hasChildrenField: boolean;
  readonly parent: AndesCascaderNode | null;
  /** Zero-based depth. */
  readonly level: number;
  readonly children: AndesCascaderNode[];
}

export interface AndesCascaderTree {
  readonly roots: AndesCascaderNode[];
  readonly byKey: ReadonlyMap<string, AndesCascaderNode>;
}

/** A string that identifies a path of values (strictly: `1` and `'1'` differ). */
export function pathKey(path: AndesCascaderPath): string {
  return JSON.stringify(path);
}

function readField(option: AndesCascaderOption, field: string): unknown {
  return option[field];
}

/** Builds the node tree from option objects, reading fields as `fieldNames` says. */
export function buildTree(
  options: readonly AndesCascaderOption[] | null | undefined,
  fieldNames?: AndesCascaderFieldNames | null,
): AndesCascaderTree {
  const names = { ...ANDES_CASCADER_DEFAULT_FIELD_NAMES, ...fieldNames };
  const byKey = new Map<string, AndesCascaderNode>();
  let nextId = 0;

  const build = (
    list: readonly AndesCascaderOption[],
    parent: AndesCascaderNode | null,
    parentPath: AndesCascaderValue[],
  ): AndesCascaderNode[] => {
    const nodes: AndesCascaderNode[] = [];
    for (const option of list) {
      const rawValue = readField(option, names.value);
      if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
        continue;
      }
      const path = [...parentPath, rawValue];
      const key = pathKey(path);
      if (byKey.has(key)) {
        continue;
      }
      const rawLabel = readField(option, names.label);
      const rawChildren = readField(option, names.children);
      const rawLeaf = readField(option, names.isLeaf);
      const node: AndesCascaderNode = {
        id: nextId++,
        key,
        value: rawValue,
        label:
          rawLabel === undefined || rawLabel === null
            ? String(rawValue)
            : String(rawLabel),
        option,
        disabled: readField(option, names.disabled) === true,
        isLeaf: typeof rawLeaf === 'boolean' ? rawLeaf : undefined,
        hasChildrenField: Array.isArray(rawChildren),
        parent,
        level: parentPath.length,
        children: [],
      };
      byKey.set(key, node);
      if (Array.isArray(rawChildren)) {
        node.children.push(
          ...build(rawChildren as AndesCascaderOption[], node, path),
        );
      }
      nodes.push(node);
    }
    return nodes;
  };

  return { roots: build(options ?? [], null, []), byKey };
}

/** The nodes from the first level down to `node`. */
export function nodePath(node: AndesCascaderNode): AndesCascaderNode[] {
  const path: AndesCascaderNode[] = [];
  for (let current: AndesCascaderNode | null = node; current;) {
    path.unshift(current);
    current = current.parent;
  }
  return path;
}

/** The values from the first level down to `node`. */
export function nodeValues(node: AndesCascaderNode): AndesCascaderValue[] {
  return nodePath(node).map((entry) => entry.value);
}

/** The node a path of values leads to, or `null` when there is none. */
export function findNode(
  tree: AndesCascaderTree,
  path: AndesCascaderPath,
): AndesCascaderNode | null {
  return path.length === 0 ? null : (tree.byKey.get(pathKey(path)) ?? null);
}

/** Every node below `node` (or `node` itself) that `isBranch` says has nothing to expand. */
export function collectTerminals(
  node: AndesCascaderNode,
  isBranch: (node: AndesCascaderNode) => boolean,
): AndesCascaderNode[] {
  if (node.children.length === 0 || !isBranch(node)) {
    return [node];
  }
  return node.children.flatMap((child) => collectTerminals(child, isBranch));
}

/** A path of nodes matched by a search, ready to render. */
export interface AndesCascaderSearchResult {
  readonly key: string;
  readonly nodes: AndesCascaderNode[];
  readonly labels: string[];
  /** The path holds a disabled option: it is listed but cannot be picked. */
  readonly disabled: boolean;
}

const DEFAULT_SEARCH_LIMIT = 50;

function defaultFilter(
  inputValue: string,
  path: AndesCascaderOption[],
  labelOf: (option: AndesCascaderOption) => string,
): boolean {
  const needle = inputValue.toLowerCase();
  return path.some((option) => labelOf(option).toLowerCase().includes(needle));
}

/**
 * Finds the paths that match `text`. Candidates are the nodes `isCandidate` accepts (leaves,
 * or every node when a branch can be picked too); each is tested with the path leading to it.
 */
export function searchPaths(
  tree: AndesCascaderTree,
  text: string,
  options: {
    search?: AndesCascaderSearch;
    isCandidate: (node: AndesCascaderNode) => boolean;
  },
): AndesCascaderSearchResult[] {
  const needle = text.trim();
  if (!needle) {
    return [];
  }
  const labels = new Map<AndesCascaderOption, string>();
  const results: AndesCascaderSearchResult[] = [];

  const visit = (nodes: readonly AndesCascaderNode[]) => {
    for (const node of nodes) {
      if (options.isCandidate(node)) {
        const path = nodePath(node);
        for (const entry of path) {
          labels.set(entry.option, entry.label);
        }
        const optionsPath = path.map((entry) => entry.option);
        const matches = options.search?.filter
          ? options.search.filter(needle, optionsPath)
          : defaultFilter(
              needle,
              optionsPath,
              (option) => labels.get(option) ?? '',
            );
        if (matches) {
          results.push({
            key: node.key,
            nodes: path,
            labels: path.map((entry) => entry.label),
            disabled: path.some((entry) => entry.disabled),
          });
        }
      }
      visit(node.children);
    }
  };
  visit(tree.roots);

  const sort = options.search?.sort;
  if (sort) {
    results.sort((a, b) =>
      sort(
        a.nodes.map((entry) => entry.option),
        b.nodes.map((entry) => entry.option),
        needle,
      ),
    );
  }
  const limit = options.search?.limit ?? DEFAULT_SEARCH_LIMIT;
  return limit === false ? results : results.slice(0, Math.max(limit, 0));
}

/** A piece of a label, flagged when it is what the search text matched. */
export interface AndesCascaderTextPart {
  text: string;
  match: boolean;
}

/** Splits `label` around every case-insensitive occurrence of `needle`. */
export function highlightParts(
  label: string,
  needle: string,
): AndesCascaderTextPart[] {
  const text = needle.trim();
  if (!text) {
    return [{ text: label, match: false }];
  }
  const parts: AndesCascaderTextPart[] = [];
  const haystack = label.toLowerCase();
  const target = text.toLowerCase();
  let from = 0;
  for (;;) {
    const index = haystack.indexOf(target, from);
    if (index < 0) {
      break;
    }
    if (index > from) {
      parts.push({ text: label.slice(from, index), match: false });
    }
    parts.push({
      text: label.slice(index, index + target.length),
      match: true,
    });
    from = index + target.length;
  }
  if (from < label.length) {
    parts.push({ text: label.slice(from), match: false });
  }
  return parts.length > 0 ? parts : [{ text: label, match: false }];
}
