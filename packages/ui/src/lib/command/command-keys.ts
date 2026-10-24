/** Whether the page is running on an Apple platform, where `Mod` means Command. */
export function andesCommandIsApplePlatform(
  source:
    { platform?: string; userAgent?: string } | undefined = typeof navigator ===
  'undefined'
    ? undefined
    : navigator,
): boolean {
  const text = `${source?.platform ?? ''} ${source?.userAgent ?? ''}`;
  return /mac|iphone|ipad|ipod/i.test(text);
}

const MAC_SYMBOLS: Readonly<Record<string, string>> = {
  mod: '⌘',
  cmd: '⌘',
  meta: '⌘',
  command: '⌘',
  ctrl: '⌃',
  control: '⌃',
  alt: '⌥',
  option: '⌥',
  shift: '⇧',
};

const COMMON_SYMBOLS: Readonly<Record<string, string>> = {
  enter: '↵',
  return: '↵',
  backspace: '⌫',
  delete: '⌦',
  escape: 'Esc',
  esc: 'Esc',
  arrowup: '↑',
  arrowdown: '↓',
  arrowleft: '←',
  arrowright: '→',
  tab: '⇥',
  space: 'Space',
};

const OTHER_NAMES: Readonly<Record<string, string>> = {
  mod: 'Ctrl',
  cmd: 'Win',
  meta: 'Win',
  command: 'Win',
  ctrl: 'Ctrl',
  control: 'Ctrl',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift',
};

/**
 * The keys of a shortcut, ready to show one by one: `'Mod+Shift+P'` becomes `['⌘', '⇧', 'P']`
 * on an Apple platform and `['Ctrl', 'Shift', 'P']` elsewhere, and a sequence such as `'G D'`
 * becomes `['G', 'D']`. An array is taken as the keys already and only has its modifier names
 * translated.
 */
export function andesCommandShortcutKeys(
  shortcut: string | readonly string[] | undefined,
  apple = andesCommandIsApplePlatform(),
): string[] {
  if (!shortcut) {
    return [];
  }
  const keys =
    typeof shortcut === 'string'
      ? shortcut.split('+').flatMap((part) => part.trim().split(/\s+/))
      : [...shortcut];
  return keys
    .filter((key) => key.length > 0)
    .map((key) => {
      const lower = key.toLowerCase();
      const common = COMMON_SYMBOLS[lower];
      if (common) {
        return common;
      }
      const modifier = apple ? MAC_SYMBOLS[lower] : OTHER_NAMES[lower];
      if (modifier) {
        return modifier;
      }
      return key.length === 1 ? key.toUpperCase() : key;
    });
}

/**
 * The shortcut in the form `aria-keyshortcuts` expects (`Control+K`, `Meta+Shift+P`), or `null`
 * when there is none or it is a sequence of separate presses (`'G D'`), which that attribute
 * cannot express.
 */
export function andesCommandAriaShortcut(
  shortcut: string | readonly string[] | undefined,
  apple = andesCommandIsApplePlatform(),
): string | null {
  if (!shortcut) {
    return null;
  }
  const keys =
    typeof shortcut === 'string'
      ? shortcut.split('+').map((key) => key.trim())
      : [...shortcut];
  if (keys.some((key) => /\s/.test(key))) {
    return null;
  }
  const names = keys
    .filter((key) => key.length > 0)
    .map((key) => {
      switch (key.toLowerCase()) {
        case 'mod':
          return apple ? 'Meta' : 'Control';
        case 'cmd':
        case 'command':
        case 'meta':
          return 'Meta';
        case 'ctrl':
        case 'control':
          return 'Control';
        case 'option':
          return 'Alt';
        case '⌘':
          return 'Meta';
        case '⌃':
          return 'Control';
        case '⌥':
          return 'Alt';
        case '⇧':
          return 'Shift';
        default:
          return key.length === 1 ? key.toUpperCase() : key;
      }
    });
  return names.length > 0 ? names.join('+') : null;
}

/** A shortcut the page listens for: modifiers plus one key. */
export interface AndesCommandHotkey {
  readonly key: string;
  readonly mod: boolean;
  readonly ctrl: boolean;
  readonly meta: boolean;
  readonly alt: boolean;
  readonly shift: boolean;
}

/**
 * Parses `'mod+k'`, `'ctrl+shift+p'`, `'alt+space'`. `mod` is Command on Apple platforms and
 * Control elsewhere. Returns `null` for an empty or key-less shortcut.
 */
export function andesCommandParseHotkey(
  spec: string | null | undefined,
): AndesCommandHotkey | null {
  if (!spec) {
    return null;
  }
  const parts = spec
    .toLowerCase()
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean);
  const flags = {
    mod: false,
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
  };
  let key = '';
  for (const part of parts) {
    switch (part) {
      case 'mod':
        flags.mod = true;
        break;
      case 'ctrl':
      case 'control':
        flags.ctrl = true;
        break;
      case 'meta':
      case 'cmd':
      case 'command':
        flags.meta = true;
        break;
      case 'alt':
      case 'option':
        flags.alt = true;
        break;
      case 'shift':
        flags.shift = true;
        break;
      default:
        key = part === 'space' ? ' ' : part;
    }
  }
  return key ? { key, ...flags } : null;
}

/** Whether a keyboard event is exactly the hotkey (no extra modifiers). */
export function andesCommandMatchesHotkey(
  event: Pick<
    KeyboardEvent,
    'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'shiftKey'
  >,
  hotkey: AndesCommandHotkey,
  apple = andesCommandIsApplePlatform(),
): boolean {
  const wantMeta = hotkey.meta || (hotkey.mod && apple);
  const wantCtrl = hotkey.ctrl || (hotkey.mod && !apple);
  return (
    event.key.toLowerCase() === hotkey.key &&
    event.metaKey === wantMeta &&
    event.ctrlKey === wantCtrl &&
    event.altKey === hotkey.alt &&
    event.shiftKey === hotkey.shift
  );
}
