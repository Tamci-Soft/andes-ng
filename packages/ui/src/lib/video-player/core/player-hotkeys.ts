/** Everything a hotkey can do. */
export type AndesPlayerHotkeyAction =
  | 'togglePlay'
  | 'toggleMute'
  | 'toggleFullscreen'
  | 'exitFullscreen'
  | 'seekBackward'
  | 'seekForward'
  | 'seekBackwardLarge'
  | 'seekForwardLarge'
  | 'seekToStart'
  | 'seekToEnd'
  | 'seekToPercent'
  | 'volumeUp'
  | 'volumeDown'
  | 'slower'
  | 'faster'
  | 'toggleCaptions'
  | 'togglePictureInPicture';

/**
 * Keys per action. A key is a `KeyboardEvent.key` value, optionally prefixed with modifiers
 * joined by `+` (`Shift+ArrowLeft`, `Control+k`); `Space` stands for `' '`. Letters match in
 * either case. `seekToPercent` keys are digits: `3` jumps to 30%.
 */
export type AndesPlayerKeyMap = Readonly<
  Record<AndesPlayerHotkeyAction, readonly string[]>
>;

export const ANDES_PLAYER_DEFAULT_KEY_MAP: AndesPlayerKeyMap = {
  togglePlay: ['Space', 'k'],
  toggleMute: ['m'],
  toggleFullscreen: ['f'],
  exitFullscreen: ['Escape'],
  seekBackward: ['ArrowLeft'],
  seekForward: ['ArrowRight'],
  seekBackwardLarge: ['j', 'Shift+ArrowLeft'],
  seekForwardLarge: ['l', 'Shift+ArrowRight'],
  seekToStart: ['Home'],
  seekToEnd: ['End'],
  seekToPercent: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  volumeUp: ['ArrowUp'],
  volumeDown: ['ArrowDown'],
  slower: ['<'],
  faster: ['>'],
  toggleCaptions: ['c'],
  togglePictureInPicture: ['i'],
};

interface ParsedKey {
  readonly key: string;
  readonly shift: boolean;
  readonly ctrl: boolean;
  readonly alt: boolean;
  readonly meta: boolean;
}

function normalizeKey(key: string): string {
  if (key === 'Space' || key === 'Spacebar') {
    return ' ';
  }
  return key.length === 1 ? key.toLowerCase() : key;
}

function parseKey(descriptor: string): ParsedKey {
  // A lone `+` is the key itself, not a separator.
  const parts = descriptor === '+' ? ['+'] : descriptor.split('+');
  const key = parts.pop() || '+';
  const modifiers = new Set(parts.map((part) => part.toLowerCase()));
  return {
    key: normalizeKey(key),
    shift: modifiers.has('shift'),
    ctrl: modifiers.has('control') || modifiers.has('ctrl'),
    alt: modifiers.has('alt'),
    meta: modifiers.has('meta') || modifiers.has('cmd'),
  };
}

function isLetter(key: string): boolean {
  return key.length === 1 && key.toLowerCase() !== key.toUpperCase();
}

/** Whether a keyboard event is the given key descriptor. */
export function matchesKey(event: KeyboardEvent, descriptor: string): boolean {
  const parsed = parseKey(descriptor);
  if (normalizeKey(event.key ?? '') !== parsed.key) {
    return false;
  }
  if (
    event.ctrlKey !== parsed.ctrl ||
    event.altKey !== parsed.alt ||
    event.metaKey !== parsed.meta
  ) {
    return false;
  }
  // Symbols such as `<` are typed with Shift, so Shift only counts for letters and named keys.
  const shiftMatters = parsed.key.length > 1 || isLetter(parsed.key);
  return !shiftMatters || event.shiftKey === parsed.shift;
}

/** The action a keyboard event triggers under a key map, with its key (for digits). */
export function resolveHotkey(
  event: KeyboardEvent,
  keyMap: AndesPlayerKeyMap,
): { action: AndesPlayerHotkeyAction; key: string } | null {
  for (const action of Object.keys(keyMap) as AndesPlayerHotkeyAction[]) {
    for (const descriptor of keyMap[action]) {
      if (matchesKey(event, descriptor)) {
        return { action, key: parseKey(descriptor).key };
      }
    }
  }
  return null;
}

/** Merges a partial key map over the defaults (an empty list turns an action off). */
export function mergeKeyMap(
  overrides: Partial<AndesPlayerKeyMap> | null | undefined,
): AndesPlayerKeyMap {
  return { ...ANDES_PLAYER_DEFAULT_KEY_MAP, ...(overrides ?? {}) };
}

/**
 * The `aria-keyshortcuts` value for an action: its keys in the ARIA syntax
 * (`K Space`, `Shift+ArrowLeft`), or `null` when the action has no key.
 */
export function ariaKeyShortcuts(
  keyMap: AndesPlayerKeyMap,
  action: AndesPlayerHotkeyAction,
): string | null {
  const keys = keyMap[action] ?? [];
  if (keys.length === 0) {
    return null;
  }
  return keys
    .map((descriptor) => {
      const parts = descriptor === '+' ? ['+'] : descriptor.split('+');
      return parts
        .map((part) => {
          if (part === ' ' || part === 'Space') {
            return 'Space';
          }
          if (part.toLowerCase() === 'ctrl') {
            return 'Control';
          }
          return part.length === 1 ? part.toUpperCase() : part;
        })
        .join('+');
    })
    .join(' ');
}

/** The first key of an action in a short visible form (`K`, `Space`), for tooltips. */
export function hotkeyHint(
  keyMap: AndesPlayerKeyMap,
  action: AndesPlayerHotkeyAction,
): string | null {
  const keys = keyMap[action] ?? [];
  const preferred = keys.find((key) => key.length === 1) ?? keys[0];
  if (!preferred) {
    return null;
  }
  return preferred === ' ' || preferred === 'Space'
    ? 'Space'
    : preferred.length === 1
      ? preferred.toUpperCase()
      : preferred;
}

/**
 * Whether a key event belongs to something else: a text field, a select, an editable region,
 * an open menu, a slider (which owns its arrows) or a button (which owns Space/Enter). Hotkeys
 * never fire for those.
 */
export function isKeyOwnedByTarget(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null;
  if (!target || typeof target.closest !== 'function') {
    return false;
  }
  if (
    target.isContentEditable ||
    target.closest(
      'input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="menu"], [role="listbox"]',
    )
  ) {
    return true;
  }
  const key = event.key;
  if (target.closest('[role="slider"]')) {
    return (
      key.startsWith('Arrow') ||
      key === 'Home' ||
      key === 'End' ||
      key === 'PageUp' ||
      key === 'PageDown'
    );
  }
  if (target.closest('button, a[href], [role="button"], [role="menuitem"]')) {
    return key === ' ' || key === 'Enter';
  }
  return false;
}
