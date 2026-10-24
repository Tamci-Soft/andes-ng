/** Platform a key glyph/label is rendered for. `auto` (see {@link AndesKeyPlatformInput}) resolves
 *  from the browser at render time. */
export type AndesKeyPlatform = 'mac' | 'windows' | 'linux';

/** A concrete platform or `'auto'` to detect it from the running browser. */
export type AndesKeyPlatformInput = AndesKeyPlatform | 'auto';

/** What {@link andesKeySymbol} resolves a key to. */
export interface AndesKeyInfo {
  /** The text drawn on the key cap: a glyph (`⌘`) or a short word (`Ctrl`). */
  readonly symbol: string;
  /** A spoken name for assistive technology (`Command`); equals `symbol` for plain keys. */
  readonly name: string;
  /** True when `symbol` is a pictogram that screen readers announce poorly (needs `name`). */
  readonly isGlyph: boolean;
}

interface KeyDefinition {
  readonly mac: string;
  readonly other: string;
  readonly linux?: string;
  readonly name: string;
  readonly macName?: string;
  readonly otherName?: string;
}

const KEYS: Record<string, KeyDefinition> = {
  mod: { mac: '⌘', other: 'Ctrl', name: 'Control', macName: 'Command' },
  meta: {
    mac: '⌘',
    other: 'Win',
    linux: 'Super',
    name: 'Windows',
    macName: 'Command',
    otherName: 'Windows',
  },
  shift: { mac: '⇧', other: 'Shift', name: 'Shift' },
  alt: { mac: '⌥', other: 'Alt', name: 'Alt', macName: 'Option' },
  ctrl: { mac: '⌃', other: 'Ctrl', name: 'Control' },
  enter: { mac: '⏎', other: 'Enter', name: 'Enter', macName: 'Return' },
  esc: { mac: '⎋', other: 'Esc', name: 'Escape' },
  tab: { mac: '⇥', other: 'Tab', name: 'Tab' },
  space: { mac: '␣', other: 'Space', name: 'Space' },
  backspace: {
    mac: '⌫',
    other: 'Backspace',
    name: 'Backspace',
    macName: 'Delete',
  },
  delete: { mac: '⌦', other: 'Del', name: 'Delete', macName: 'Forward delete' },
  capslock: { mac: '⇪', other: 'Caps', name: 'Caps Lock' },
  pageup: { mac: '⇞', other: 'PgUp', name: 'Page Up' },
  pagedown: { mac: '⇟', other: 'PgDn', name: 'Page Down' },
  home: { mac: '↖', other: 'Home', name: 'Home' },
  end: { mac: '↘', other: 'End', name: 'End' },
  arrowup: { mac: '↑', other: '↑', name: 'Up arrow' },
  arrowdown: { mac: '↓', other: '↓', name: 'Down arrow' },
  arrowleft: { mac: '←', other: '←', name: 'Left arrow' },
  arrowright: { mac: '→', other: '→', name: 'Right arrow' },
  plus: { mac: '+', other: '+', name: 'Plus' },
};

const ALIASES: Record<string, string> = {
  cmd: 'meta',
  command: 'meta',
  super: 'meta',
  win: 'meta',
  windows: 'meta',
  os: 'meta',
  control: 'ctrl',
  option: 'alt',
  opt: 'alt',
  return: 'enter',
  escape: 'esc',
  del: 'delete',
  up: 'arrowup',
  down: 'arrowdown',
  left: 'arrowleft',
  right: 'arrowright',
  pgup: 'pageup',
  pgdn: 'pagedown',
  ' ': 'space',
  spacebar: 'space',
  caps: 'capslock',
  '+': 'plus',
};

/** Best-effort platform guess from the running browser; `windows` when there is no `navigator`
 *  (server rendering). Pass an explicit `platform` wherever the server and client must agree. */
export function andesDetectKeyPlatform(): AndesKeyPlatform {
  if (typeof navigator === 'undefined') {
    return 'windows';
  }
  const uaData = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData;
  const source = `${uaData?.platform ?? ''} ${navigator.platform ?? ''} ${navigator.userAgent ?? ''}`;
  if (/mac|iphone|ipad|ipod/i.test(source)) {
    return 'mac';
  }
  if (/linux|x11|android|cros/i.test(source)) {
    return 'linux';
  }
  return 'windows';
}

function resolvePlatform(
  platform: AndesKeyPlatformInput | undefined,
): AndesKeyPlatform {
  return !platform || platform === 'auto' ? andesDetectKeyPlatform() : platform;
}

/**
 * Resolves a key name to the glyph or label a user of `platform` expects on the key cap.
 *
 * Accepts the `KeyboardEvent.key` spellings (`'ArrowUp'`, `'Escape'`, `' '`) and common aliases
 * (`'Cmd'`, `'Option'`, `'Return'`), case-insensitively. `'Mod'` is the platform's primary
 * shortcut modifier: Command on Mac, Control elsewhere. Anything unknown is returned as written
 * (single letters upper-cased), so `andesKeySymbol('k')` is `'K'`.
 */
export function andesKeyInfo(
  key: string,
  platform?: AndesKeyPlatformInput,
): AndesKeyInfo {
  const resolved = resolvePlatform(platform);
  const lower = key.length === 1 ? key : key.trim().toLowerCase();
  const id = ALIASES[lower] ?? lower;
  const definition = KEYS[id];
  if (!definition) {
    const text = key.length === 1 ? key.toUpperCase() : key.trim();
    return { symbol: text, name: text, isGlyph: false };
  }
  const mac = resolved === 'mac';
  const symbol = mac
    ? definition.mac
    : resolved === 'linux' && definition.linux
      ? definition.linux
      : definition.other;
  const name = mac
    ? (definition.macName ?? definition.name)
    : (definition.otherName ?? definition.name);
  const isGlyph = !/^[A-Za-z0-9]+$/.test(symbol) && symbol !== '+';
  return { symbol, name, isGlyph };
}

/** The text for one key on `platform`, e.g. `andesKeySymbol('Mod', 'mac')` is `'⌘'` and
 *  `andesKeySymbol('Mod', 'windows')` is `'Ctrl'`. See {@link andesKeyInfo}. */
export function andesKeySymbol(
  key: string,
  platform?: AndesKeyPlatformInput,
): string {
  return andesKeyInfo(key, platform).symbol;
}

/**
 * Splits a shortcut string into steps of simultaneous keys: `'Mod+K'` is `[['Mod', 'K']]`,
 * `'G then I'` (or `'G I'`) is `[['G'], ['I']]`. A trailing `+` is the plus key
 * (`'Mod++'` is `[['Mod', '+']]`).
 */
export function andesParseShortcut(shortcut: string): string[][] {
  return shortcut
    .trim()
    .split(/\s+/)
    .filter((step) => step && step.toLowerCase() !== 'then')
    .map((step) => {
      const keys: string[] = [];
      let current = '';
      for (const ch of step) {
        if (ch === '+' && current) {
          keys.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      if (current) {
        keys.push(current);
      }
      return keys;
    })
    .filter((keys) => keys.length > 0);
}
