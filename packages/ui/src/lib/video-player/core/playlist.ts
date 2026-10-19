import { resolveMimeType } from './media-adapter';
import type {
  AndesMediaSource,
  AndesPlayerRepeat,
  AndesPlaylistItem,
} from './player-types';

/** The sources of a playlist entry: its `sources`, else its `src` with an inferred type. */
export function playlistItemSources(
  item: AndesPlaylistItem,
  audio = false,
): readonly AndesMediaSource[] {
  if (item.sources && item.sources.length > 0) {
    return item.sources;
  }
  return item.src
    ? [{ src: item.src, type: resolveMimeType(item.src, audio) }]
    : [];
}

/** A stable key for an entry: its `id`, else its first source URL, else its position. */
export function playlistItemKey(
  item: AndesPlaylistItem,
  index: number,
): string {
  return item.id ?? item.sources?.[0]?.src ?? item.src ?? `item-${index}`;
}

/**
 * A shuffled play order (Fisher-Yates) that starts with `first`, so turning shuffle on never
 * interrupts the entry that is playing. `random` is injectable for tests.
 */
export function shuffledOrder(
  length: number,
  first: number,
  random: () => number = Math.random,
): number[] {
  const rest = Array.from({ length }, (_, index) => index).filter(
    (index) => index !== first,
  );
  for (let index = rest.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [rest[index], rest[swap]] = [rest[swap], rest[index]];
  }
  return first >= 0 && first < length ? [first, ...rest] : rest;
}

/**
 * The entry after (`1`) or before (`-1`) `current` in a play order, or `null` at either end
 * when the playlist does not wrap. `repeat: 'one'` still moves: a skip is an explicit request.
 */
export function stepPlaylist(
  order: readonly number[],
  current: number,
  direction: 1 | -1,
  repeat: AndesPlayerRepeat,
): number | null {
  if (order.length === 0) {
    return null;
  }
  const position = order.indexOf(current);
  const next = (position < 0 ? 0 : position) + direction;
  if (next >= 0 && next < order.length) {
    return order[next];
  }
  return repeat === 'all' ? order[(next + order.length) % order.length] : null;
}
