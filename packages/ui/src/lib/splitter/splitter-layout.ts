/**
 * Pure sizing maths for the splitter. Nothing here touches the DOM, so the rules (how a
 * specification becomes pixels, how a drag redistributes space, how collapsing hands space to a
 * neighbour) can be unit tested on their own.
 */

/** A pane size: pixels (`240`, `'240px'`), a share of the available space (`'30%'`) or `auto`. */
export type AndesSplitterSize = number | string | undefined;

export interface AndesSplitterPanelSpec {
  size: AndesSplitterSize;
  min: AndesSplitterSize;
  max: AndesSplitterSize;
  collapsed: boolean;
  collapsedSize: number;
}

export interface AndesSplitterBounds {
  min: number;
  max: number;
}

const EPSILON = 0.01;

/** Turns a size specification into pixels; `undefined` means "take what is left" (`auto`). */
export function parseSplitterSize(
  value: AndesSplitterSize | null,
  available: number,
): number | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.max(0, value) : undefined;
  }
  const text = value.trim().toLowerCase();
  if (text === '' || text === 'auto') {
    return undefined;
  }
  const amount = Number.parseFloat(text);
  if (!Number.isFinite(amount)) {
    return undefined;
  }
  return Math.max(0, text.endsWith('%') ? (available * amount) / 100 : amount);
}

export function splitterBounds(
  spec: AndesSplitterPanelSpec,
  available: number,
): AndesSplitterBounds {
  const min = parseSplitterSize(spec.min, available) ?? 0;
  const max =
    parseSplitterSize(spec.max, available) ?? Number.POSITIVE_INFINITY;
  return { min, max: Math.max(min, max) };
}

function clamp(value: number, bounds: AndesSplitterBounds): number {
  return Math.min(bounds.max, Math.max(bounds.min, value));
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Makes `sizes` add up to `total`. Non-frozen panes are clamped to their bounds, then the
 * remaining difference is shared between the panes that still have room, in proportion to
 * their current size (the way flex shrink/grow behaves).
 */
export function fitSizes(
  sizes: readonly number[],
  bounds: readonly AndesSplitterBounds[],
  frozen: readonly boolean[],
  total: number,
): number[] {
  const out = sizes.map((size, i) =>
    frozen[i] ? size : clamp(size, bounds[i]),
  );
  for (let pass = 0; pass <= out.length; pass++) {
    const diff = total - sum(out);
    if (Math.abs(diff) < EPSILON) {
      break;
    }
    const flexible = [...out.keys()].filter(
      (i) =>
        !frozen[i] &&
        (diff > 0
          ? out[i] < bounds[i].max - EPSILON
          : out[i] > bounds[i].min + EPSILON),
    );
    if (flexible.length === 0) {
      break;
    }
    const weight = sum(flexible.map((i) => Math.max(out[i], 1)));
    for (const i of flexible) {
      out[i] = clamp(out[i] + (diff * Math.max(out[i], 1)) / weight, bounds[i]);
    }
  }
  return out;
}

/** Resolves the declared sizes into pixels that fill `available` exactly (as far as bounds allow). */
export function resolveSizes(
  specs: readonly AndesSplitterPanelSpec[],
  available: number,
): number[] {
  const bounds = specs.map((spec) => splitterBounds(spec, available));
  const frozen = specs.map((spec) => spec.collapsed);
  const declared = specs.map((spec) =>
    spec.collapsed
      ? spec.collapsedSize
      : parseSplitterSize(spec.size, available),
  );
  const autoIndexes = declared
    .map((size, i) => (size === undefined ? i : -1))
    .filter((i) => i >= 0);
  const used = sum(declared.map((size) => size ?? 0));
  const sizes = declared.map((size) =>
    size === undefined
      ? Math.max(0, available - used) / Math.max(1, autoIndexes.length)
      : size,
  );
  if (autoIndexes.length === 0 && sum(sizes) <= 0) {
    // Nothing declared a size and everything is collapsed - nothing to share out.
    return sizes;
  }
  return fitSizes(sizes, bounds, frozen, available);
}

/** Scales the open panes proportionally when the container changes size. */
export function rescaleSizes(
  previous: readonly number[],
  specs: readonly AndesSplitterPanelSpec[],
  available: number,
): number[] {
  const bounds = specs.map((spec) => splitterBounds(spec, available));
  const frozen = specs.map((spec) => spec.collapsed);
  const fixed = sum(previous.filter((_, i) => frozen[i]));
  const open = sum(previous.filter((_, i) => !frozen[i]));
  const target = Math.max(0, available - fixed);
  const scale = open > 0 ? target / open : 1;
  const scaled = previous.map((size, i) => (frozen[i] ? size : size * scale));
  return fitSizes(scaled, bounds, frozen, available);
}

/**
 * Moves the boundary after panel `index` by `delta` pixels from `start`. Only the two
 * neighbouring panels change and each respects its own bounds; `±Infinity` means "as far as
 * the bounds allow".
 */
export function resizePair(
  start: readonly number[],
  bounds: readonly AndesSplitterBounds[],
  index: number,
  delta: number,
): number[] {
  const out = [...start];
  const before = bounds[index];
  const after = bounds[index + 1];
  if (!before || !after) {
    return out;
  }
  const pair = start[index] + start[index + 1];
  const low = Math.max(before.min, pair - after.max);
  const high = Math.min(before.max, pair - after.min);
  if (low > high) {
    return out;
  }
  const next = Math.min(high, Math.max(low, start[index] + delta));
  out[index] = next;
  out[index + 1] = pair - next;
  return out;
}

/** Pixel range the panel before the handle can occupy, given its neighbour's limits. */
export function pairRange(
  sizes: readonly number[],
  bounds: readonly AndesSplitterBounds[],
  index: number,
): AndesSplitterBounds {
  const pair = sizes[index] + sizes[index + 1];
  const min = Math.max(bounds[index].min, pair - bounds[index + 1].max);
  const max = Math.min(bounds[index].max, pair - bounds[index + 1].min);
  return { min, max: Math.max(min, max) };
}

/** Nearest panel that is still open: the next one first, then the previous, then further out. */
export function nearestOpenPanel(
  index: number,
  collapsed: readonly boolean[],
): number | undefined {
  for (let step = 1; step < collapsed.length; step++) {
    for (const candidate of [index + step, index - step]) {
      if (
        candidate >= 0 &&
        candidate < collapsed.length &&
        !collapsed[candidate]
      ) {
        return candidate;
      }
    }
  }
  return undefined;
}

export interface AndesSplitterCollapseResult {
  sizes: number[];
  restore: number | undefined;
}

/** Collapses panel `index` to `collapsedSize`; the freed space goes to `partner`. */
export function collapsePanel(
  sizes: readonly number[],
  bounds: readonly AndesSplitterBounds[],
  collapsed: readonly boolean[],
  index: number,
  partner: number | undefined,
  collapsedSize: number,
  available: number,
): AndesSplitterCollapseResult {
  const next = [...sizes];
  const restore = sizes[index];
  const freed = sizes[index] - collapsedSize;
  next[index] = collapsedSize;
  if (partner !== undefined) {
    next[partner] += freed;
  }
  const frozen = collapsed.map((flag, i) => flag || i === index);
  return { sizes: fitSizes(next, bounds, frozen, available), restore };
}

/** Re-opens panel `index` to `target`, taking the space from `partner` first. */
export function expandPanel(
  sizes: readonly number[],
  bounds: readonly AndesSplitterBounds[],
  collapsed: readonly boolean[],
  index: number,
  partner: number | undefined,
  target: number,
  available: number,
): number[] {
  const others = sum(sizes.filter((_, i) => i !== index && collapsed[i]));
  const minOthers = sum(
    bounds.filter((_, i) => i !== index && !collapsed[i]).map((b) => b.min),
  );
  const size = Math.min(
    clamp(target, bounds[index]),
    Math.max(0, available - others - minOthers),
  );
  const next = [...sizes];
  const grow = size - sizes[index];
  next[index] = size;
  if (partner !== undefined) {
    next[partner] = Math.max(bounds[partner].min, next[partner] - grow);
  }
  const frozen = collapsed.map((flag, i) => (i === index ? true : flag));
  return fitSizes(next, bounds, frozen, available);
}

/** Layout saved by `storageKey`: shares of the available space, so it survives a resize. */
export interface AndesSplitterStoredLayout {
  v: 1;
  fractions: number[];
  restore: (number | null)[];
  collapsed: boolean[];
}

export function readStoredLayout(
  key: string,
  panelCount: number,
): AndesSplitterStoredLayout | null {
  try {
    const raw = globalThis.localStorage?.getItem(storageName(key));
    if (!raw) {
      return null;
    }
    const value = JSON.parse(raw) as Partial<AndesSplitterStoredLayout>;
    if (
      value.v !== 1 ||
      !Array.isArray(value.fractions) ||
      value.fractions.length !== panelCount ||
      !value.fractions.every((f) => typeof f === 'number' && Number.isFinite(f))
    ) {
      return null;
    }
    return {
      v: 1,
      fractions: value.fractions,
      restore: Array.isArray(value.restore) ? value.restore : [],
      collapsed: Array.isArray(value.collapsed) ? value.collapsed : [],
    };
  } catch {
    return null;
  }
}

export function writeStoredLayout(
  key: string,
  layout: AndesSplitterStoredLayout,
): void {
  try {
    globalThis.localStorage?.setItem(storageName(key), JSON.stringify(layout));
  } catch {
    // Storage can be full, blocked or absent (private windows, SSR): persistence is best effort.
  }
}

function storageName(key: string): string {
  return `andes-splitter:${key}`;
}
