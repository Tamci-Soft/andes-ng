import type { AndesChapter, AndesThumbnail } from './player-types';

/** One cue of a WebVTT file: times in seconds and the raw payload text. */
export interface AndesVttCue {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

/** `hh:mm:ss.ttt` or `mm:ss.ttt` to seconds; `NaN` when malformed. */
export function parseVttTimestamp(value: string): number {
  const match = /^(?:(\d+):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/.exec(
    value.trim(),
  );
  if (!match) {
    return Number.NaN;
  }
  const [, h, m, s, ms] = match;
  return (
    Number(h ?? 0) * 3600 +
    Number(m) * 60 +
    Number(s) +
    Number((ms ?? '0').padEnd(3, '0')) / 1000
  );
}

/**
 * A small WebVTT reader for metadata files (storyboards, chapters): timing lines and payload
 * text only. Cue settings, styles and regions are ignored; captions themselves go through the
 * browser's own `<track>` parser instead.
 */
export function parseVtt(text: string): AndesVttCue[] {
  const cues: AndesVttCue[] = [];
  const blocks = text.replace(/\r\n?/g, '\n').split(/\n{2,}/);
  for (const block of blocks) {
    const lines = block.split('\n').filter((line) => line.trim() !== '');
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex === -1) {
      continue;
    }
    const [startText, rest] = lines[timingIndex].split('-->');
    const endText = (rest ?? '').trim().split(/\s+/)[0] ?? '';
    const start = parseVttTimestamp(startText);
    const end = parseVttTimestamp(endText);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      continue;
    }
    cues.push({
      start,
      end,
      text: lines
        .slice(timingIndex + 1)
        .join('\n')
        .trim(),
    });
  }
  return cues;
}

/** Resolves `relative` against `base` (absolute or page-relative), keeping it as is if it can't. */
export function resolveUrl(relative: string, base: string): string {
  try {
    const origin =
      typeof location !== 'undefined' ? location.href : 'http://localhost/';
    return new URL(relative, new URL(base, origin)).href;
  } catch {
    return relative;
  }
}

/**
 * Storyboard cues (`sprite.jpg#xywh=x,y,w,h`, or a plain image per cue) to thumbnails. Image
 * paths resolve against the VTT file's own URL.
 */
export function thumbnailsFromVtt(
  cues: readonly AndesVttCue[],
  vttUrl: string,
): AndesThumbnail[] {
  const thumbnails: AndesThumbnail[] = [];
  for (const cue of cues) {
    const [path, fragment] = cue.text.split('#');
    if (!path) {
      continue;
    }
    const xywh = /xywh=(\d+),(\d+),(\d+),(\d+)/.exec(fragment ?? '');
    thumbnails.push({
      start: cue.start,
      end: cue.end,
      src: resolveUrl(path.trim(), vttUrl),
      x: xywh ? Number(xywh[1]) : 0,
      y: xywh ? Number(xywh[2]) : 0,
      width: xywh ? Number(xywh[3]) : 0,
      height: xywh ? Number(xywh[4]) : 0,
    });
  }
  return thumbnails;
}

/** A regular sprite grid to thumbnails. */
export function thumbnailsFromGrid(
  config: {
    src: string;
    width: number;
    height: number;
    columns: number;
    interval: number;
    count?: number;
  },
  duration: number,
): AndesThumbnail[] {
  const interval = Math.max(config.interval, 0.001);
  const count =
    config.count ??
    (Number.isFinite(duration) && duration > 0
      ? Math.ceil(duration / interval)
      : 0);
  const columns = Math.max(1, Math.floor(config.columns));
  const thumbnails: AndesThumbnail[] = [];
  for (let index = 0; index < count; index++) {
    thumbnails.push({
      start: index * interval,
      end: (index + 1) * interval,
      src: config.src,
      x: (index % columns) * config.width,
      y: Math.floor(index / columns) * config.height,
      width: config.width,
      height: config.height,
    });
  }
  return thumbnails;
}

/** The entry covering `time` in a sorted list of `[start, end)` windows. */
export function findTimed<T extends { start: number; end: number }>(
  entries: readonly T[],
  time: number,
): T | null {
  let low = 0;
  let high = entries.length - 1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    const entry = entries[middle];
    if (time < entry.start) {
      high = middle - 1;
    } else if (time >= entry.end) {
      low = middle + 1;
    } else {
      return entry;
    }
  }
  return null;
}

/** Chapter cues to chapters, sorted by start. */
export function chaptersFromCues(
  cues: readonly { start: number; end: number; text: string }[],
): AndesChapter[] {
  return cues
    .filter((cue) => cue.text.trim() !== '')
    .map((cue) => ({ start: cue.start, end: cue.end, title: cue.text.trim() }))
    .sort((a, b) => a.start - b.start);
}
