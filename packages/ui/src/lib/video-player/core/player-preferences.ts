/** What the player remembers between visits when it has a `persistKey`. */
export interface AndesPlayerPreferences {
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  /** Caption language; `null` = the viewer turned captions off. */
  captionLanguage?: string | null;
}

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
