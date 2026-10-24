import { readCaptionStyle } from './caption-style';
import type { AndesCaptionStyle } from './player-types';

/** What the player remembers between visits when it has a `persistKey`. */
export interface AndesPlayerPreferences {
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  /** Caption language; `null` = the viewer turned captions off. */
  captionLanguage?: string | null;
  captionStyle?: AndesCaptionStyle;
  /** Resume positions per source URL, newest last (see `ANDES_PLAYER_MAX_POSITIONS`). */
  positions?: Record<string, number>;
}

/** How many resume positions one key keeps; the oldest are dropped first. */
export const ANDES_PLAYER_MAX_POSITIONS = 20;

const PREFIX = 'andes-player:';

/**
 * `window.localStorage`, or `null` where it is missing or blocked. Merely reading the property
 * throws a `SecurityError` when storage is disabled, so even the lookup is guarded.
 */
function storage(): Storage | null {
  try {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function isFiniteBetween(value: unknown, min: number, max: number): boolean {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}

function readPositions(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const result: Record<string, number> = {};
  for (const [key, time] of Object.entries(value as Record<string, unknown>)) {
    if (isFiniteBetween(time, 0, Number.MAX_SAFE_INTEGER)) {
      result[key] = time as number;
    }
  }
  return result;
}

/**
 * The positions map with `key` set to `time` (or removed for `null`), moved to the end and
 * trimmed to the newest {@link ANDES_PLAYER_MAX_POSITIONS} entries.
 */
export function withPosition(
  positions: Readonly<Record<string, number>> | undefined,
  key: string,
  time: number | null,
): Record<string, number> {
  const entries = Object.entries(positions ?? {}).filter(([k]) => k !== key);
  if (time !== null) {
    entries.push([key, Math.round(time * 10) / 10]);
  }
  return Object.fromEntries(entries.slice(-ANDES_PLAYER_MAX_POSITIONS));
}

/** Reads and validates saved preferences; anything unreadable is simply left out. */
export function readPlayerPreferences(key: string): AndesPlayerPreferences {
  try {
    const raw = storage()?.getItem(PREFIX + key);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const result: AndesPlayerPreferences = {};
    if (isFiniteBetween(parsed['volume'], 0, 1)) {
      result.volume = parsed['volume'] as number;
    }
    if (typeof parsed['muted'] === 'boolean') {
      result.muted = parsed['muted'];
    }
    if (isFiniteBetween(parsed['playbackRate'], 0.0625, 16)) {
      result.playbackRate = parsed['playbackRate'] as number;
    }
    const language = parsed['captionLanguage'];
    if (language === null || typeof language === 'string') {
      result.captionLanguage = language;
    }
    const captionStyle = readCaptionStyle(parsed['captionStyle']);
    if (captionStyle) {
      result.captionStyle = captionStyle;
    }
    const positions = readPositions(parsed['positions']);
    if (positions) {
      result.positions = positions;
    }
    return result;
  } catch {
    return {};
  }
}

/** Saves preferences; a full or blocked storage is ignored. Returns whether it was written. */
export function writePlayerPreferences(
  key: string,
  preferences: AndesPlayerPreferences,
): boolean {
  try {
    const target = storage();
    if (!target) {
      return false;
    }
    target.setItem(PREFIX + key, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
