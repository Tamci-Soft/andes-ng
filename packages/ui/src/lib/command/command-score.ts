/** A matched stretch of the text: start (inclusive) and end (exclusive) indices. */
export type AndesCommandRange = readonly [start: number, end: number];

/** How well a query matches a text, and where. */
export interface AndesCommandMatch {
  /** `0` when the query does not match; otherwise higher is better, at most `1`. */
  readonly score: number;
  /** The stretches of the text that matched, in order, for highlighting. */
  readonly ranges: readonly AndesCommandRange[];
}

/** A slice of a text, either matched by the query or not. */
export interface AndesCommandSegment {
  readonly text: string;
  readonly match: boolean;
}

const NO_MATCH: AndesCommandMatch = { score: 0, ranges: [] };

/** Texts longer than this are only matched against their head: the fuzzy pass is quadratic. */
const MAX_FUZZY_LENGTH = 160;

/** What a keyword match is worth next to the same match on the text itself. */
const KEYWORD_FACTOR = 0.9;

/**
 * Lower-cases a text and strips accents without changing its length, so an index in the result
 * is the same index in the original. A character whose normalised form is not exactly one
 * character keeps its plain lower-case form.
 */
export function andesCommandNormalize(text: string): string {
  let result = '';
  for (const char of text) {
    const lower = char.toLowerCase();
    const stripped = lower.normalize('NFD').replace(/\p{M}/gu, '');
    // Anything not 1:1 in UTF-16 units would shift every index after it.
    result +=
      stripped.length === char.length
        ? stripped
        : lower.length === char.length
          ? lower
          : char;
  }
  return result;
}

function isWordChar(char: string | undefined): boolean {
  return !!char && /[\p{L}\p{N}]/u.test(char);
}

/** Whether `index` starts a word: the first character, or one after a non-letter/digit. */
function isBoundary(text: string, index: number): boolean {
  return index === 0 || !isWordChar(text[index - 1]);
}

/**
 * Scores one query word as a contiguous stretch of the text. Exact, prefix and word-start
 * hits beat a hit in the middle of a word, and earlier hits beat later ones. Always above
 * what {@link fuzzyWord} can reach.
 */
function substringWord(text: string, word: string): AndesCommandMatch {
  let best: { index: number; value: number } | null = null;
  let from = text.indexOf(word);
  while (from >= 0) {
    let value: number;
    if (text === word) {
      value = 1;
    } else if (from === 0) {
      value = 0.95;
    } else if (isBoundary(text, from)) {
      value = 0.8;
    } else {
      value = 0.65;
    }
    value -= Math.min(from, 40) * 0.002;
    if (!best || value > best.value) {
      best = { index: from, value };
    }
    from = text.indexOf(word, from + 1);
  }
  if (!best) {
    return NO_MATCH;
  }
  // A longer share of the text is a closer match.
  const share = word.length / text.length;
  return {
    score: Math.min(1, best.value + share * 0.03),
    ranges: [[best.index, best.index + word.length]],
  };
}

/**
 * Scores one query word as an in-order subsequence of the text ("gh" in "GitHub Home"), by
 * finding the alignment that favours word starts and consecutive characters and penalises gaps.
 * Never reaches {@link substringWord}'s range.
 */
function fuzzyWord(text: string, word: string): AndesCommandMatch {
  const t =
    text.length > MAX_FUZZY_LENGTH ? text.slice(0, MAX_FUZZY_LENGTH) : text;
  const n = t.length;
  const m = word.length;
  if (m > n) {
    return NO_MATCH;
  }

  const NEG = Number.NEGATIVE_INFINITY;
  // best[i][j]: the best raw score with word[i] matched at t[j]; from[i][j]: where word[i-1] was.
  const best: number[][] = Array.from({ length: m }, () =>
    new Array<number>(n).fill(NEG),
  );
  const from: number[][] = Array.from({ length: m }, () =>
    new Array<number>(n).fill(-1),
  );

  for (let i = 0; i < m; i++) {
    for (let j = i; j < n; j++) {
      if (t[j] !== word[i]) {
        continue;
      }
      const base = 1 + (isBoundary(t, j) ? 3 : 0);
      if (i === 0) {
        best[0][j] = base - Math.min(j, 10) * 0.05;
        continue;
      }
      for (let k = i - 1; k < j; k++) {
        const previous = best[i - 1][k];
        if (previous === NEG) {
          continue;
        }
        const gap = j - k - 1;
        const candidate =
          previous + base + (gap === 0 ? 2 : -Math.min(gap, 10) * 0.15);
        if (candidate > best[i][j]) {
          best[i][j] = candidate;
          from[i][j] = k;
        }
      }
    }
  }

  let end = -1;
  let raw = NEG;
  for (let j = 0; j < n; j++) {
    if (best[m - 1][j] > raw) {
      raw = best[m - 1][j];
      end = j;
    }
  }
  if (end < 0) {
    return NO_MATCH;
  }

  const indices: number[] = [];
  for (let i = m - 1, j = end; i >= 0; i--) {
    indices.unshift(j);
    j = from[i][j];
  }

  const ranges: [number, number][] = [];
  for (const index of indices) {
    const last = ranges[ranges.length - 1];
    if (last && last[1] === index) {
      last[1] = index + 1;
    } else {
      ranges.push([index, index + 1]);
    }
  }

  const ratio = Math.min(Math.max(raw / (m * 6), 0), 1);
  return { score: 0.05 + 0.45 * ratio, ranges };
}

function scoreWord(text: string, word: string): AndesCommandMatch {
  const direct = substringWord(text, word);
  return direct.score > 0 ? direct : fuzzyWord(text, word);
}

function mergeRanges(
  ranges: readonly AndesCommandRange[],
): AndesCommandRange[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) {
      last[1] = Math.max(last[1], end);
    } else {
      merged.push([start, end]);
    }
  }
  return merged;
}

/** Matches a normalised query against one normalised text; every word has to match. */
function matchText(text: string, query: string): AndesCommandMatch {
  const words = query.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return { score: 1, ranges: [] };
  }
  const matches = words.map((word) => scoreWord(text, word));
  if (matches.some((match) => match.score === 0)) {
    return NO_MATCH;
  }
  const mean =
    matches.reduce((sum, match) => sum + match.score, 0) / matches.length;
  return {
    score: mean,
    ranges: mergeRanges(matches.flatMap((match) => match.ranges)),
  };
}

/**
 * Matches `query` against `text` (and, at a discount, against each of `keywords`).
 *
 * The query is split into words and every word has to match. A word matches as a stretch of
 * the text (best when it is the whole text, then a prefix, then the start of a word, then
 * anywhere) or, failing that, as an in-order subsequence of characters, which is what makes
 * "gh" find "GitHub Home". Case and accents are ignored. The ranges are indices into `text`
 * and are empty when the match came through a keyword.
 */
export function andesCommandMatch(
  text: string,
  query: string,
  keywords: readonly string[] = [],
): AndesCommandMatch {
  const needle = andesCommandNormalize(query).trim();
  if (!needle) {
    return { score: 1, ranges: [] };
  }

  let result = matchText(andesCommandNormalize(text), needle);
  for (const keyword of keywords) {
    const viaKeyword = matchText(andesCommandNormalize(keyword), needle);
    const score = viaKeyword.score * KEYWORD_FACTOR;
    if (score > result.score) {
      result = { score, ranges: [] };
    }
  }
  return result;
}

/** The score of {@link andesCommandMatch}, for callers that do not highlight. */
export function andesCommandScore(
  text: string,
  query: string,
  keywords: readonly string[] = [],
): number {
  return andesCommandMatch(text, query, keywords).score;
}

/** Cuts `text` into matched and unmatched slices along `ranges`. */
export function andesCommandSegments(
  text: string,
  ranges: readonly AndesCommandRange[],
): AndesCommandSegment[] {
  if (ranges.length === 0) {
    return text ? [{ text, match: false }] : [];
  }
  const segments: AndesCommandSegment[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), match: false });
    }
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }
  return segments;
}
