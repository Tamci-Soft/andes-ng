import {
  andesCommandAriaShortcut,
  andesCommandIsApplePlatform,
  andesCommandMatchesHotkey,
  andesCommandParseHotkey,
  andesCommandShortcutKeys,
} from './command-keys';

describe('andesCommandShortcutKeys', () => {
  it('shows Command and Option symbols on Apple platforms', () => {
    expect(andesCommandShortcutKeys('Mod+Shift+P', true)).toEqual([
      '⌘',
      '⇧',
      'P',
    ]);
    expect(andesCommandShortcutKeys('Alt+Enter', true)).toEqual(['⌥', '↵']);
  });

  it('spells modifiers out elsewhere', () => {
    expect(andesCommandShortcutKeys('Mod+k', false)).toEqual(['Ctrl', 'K']);
    expect(andesCommandShortcutKeys('Ctrl+Alt+Delete', false)).toEqual([
      'Ctrl',
      'Alt',
      '⌦',
    ]);
  });

  it('takes an array of keys as given, translating only the names it knows', () => {
    expect(andesCommandShortcutKeys(['Mod', 'B'], false)).toEqual([
      'Ctrl',
      'B',
    ]);
    expect(andesCommandShortcutKeys(['G', 'H'], true)).toEqual(['G', 'H']);
    expect(andesCommandShortcutKeys(['F5'], true)).toEqual(['F5']);
  });

  it('splits a sequence of presses into keys', () => {
    expect(andesCommandShortcutKeys('G D', true)).toEqual(['G', 'D']);
    expect(andesCommandShortcutKeys('Mod + K', false)).toEqual(['Ctrl', 'K']);
  });

  it('returns nothing for no shortcut', () => {
    expect(andesCommandShortcutKeys(undefined)).toEqual([]);
    expect(andesCommandShortcutKeys('')).toEqual([]);
  });
});

describe('andesCommandAriaShortcut', () => {
  it('names the modifiers the way aria-keyshortcuts does', () => {
    expect(andesCommandAriaShortcut('Mod+K', true)).toBe('Meta+K');
    expect(andesCommandAriaShortcut('Mod+K', false)).toBe('Control+K');
    expect(andesCommandAriaShortcut(['⌘', 'shift', 'p'], true)).toBe(
      'Meta+shift+P',
    );
    expect(andesCommandAriaShortcut(undefined)).toBeNull();
    expect(andesCommandAriaShortcut('G D')).toBeNull();
  });
});

describe('hotkeys', () => {
  it('parses modifiers and a key', () => {
    expect(andesCommandParseHotkey('mod+k')).toEqual({
      key: 'k',
      mod: true,
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    });
    expect(andesCommandParseHotkey('Ctrl + Shift + P')).toMatchObject({
      key: 'p',
      ctrl: true,
      shift: true,
    });
    expect(andesCommandParseHotkey('alt+space')?.key).toBe(' ');
    expect(andesCommandParseHotkey('')).toBeNull();
    expect(andesCommandParseHotkey('mod+')).toBeNull();
    expect(andesCommandParseHotkey(null)).toBeNull();
  });

  const event = (init: Partial<KeyboardEvent>) => ({
    key: 'k',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    ...init,
  });

  it('matches mod as Command on Apple platforms and Control elsewhere', () => {
    const hotkey = andesCommandParseHotkey('mod+k');
    if (!hotkey) {
      throw new Error('hotkey');
    }
    expect(
      andesCommandMatchesHotkey(event({ metaKey: true }), hotkey, true),
    ).toBe(true);
    expect(
      andesCommandMatchesHotkey(event({ ctrlKey: true }), hotkey, true),
    ).toBe(false);
    expect(
      andesCommandMatchesHotkey(event({ ctrlKey: true }), hotkey, false),
    ).toBe(true);
    expect(
      andesCommandMatchesHotkey(event({ metaKey: true }), hotkey, false),
    ).toBe(false);
  });

  it('does not match with extra modifiers or another key', () => {
    const hotkey = andesCommandParseHotkey('mod+k');
    if (!hotkey) {
      throw new Error('hotkey');
    }
    expect(
      andesCommandMatchesHotkey(
        event({ ctrlKey: true, shiftKey: true }),
        hotkey,
        false,
      ),
    ).toBe(false);
    expect(
      andesCommandMatchesHotkey(
        event({ ctrlKey: true, key: 'j' }),
        hotkey,
        false,
      ),
    ).toBe(false);
    expect(
      andesCommandMatchesHotkey(
        event({ ctrlKey: true, key: 'K' }),
        hotkey,
        false,
      ),
    ).toBe(true);
  });

  it('detects Apple platforms from the platform or user agent', () => {
    expect(andesCommandIsApplePlatform({ platform: 'MacIntel' })).toBe(true);
    expect(
      andesCommandIsApplePlatform({ userAgent: 'Mozilla (iPhone; CPU)' }),
    ).toBe(true);
    expect(
      andesCommandIsApplePlatform({ platform: 'Win32', userAgent: 'Windows' }),
    ).toBe(false);
    expect(andesCommandIsApplePlatform(undefined)).toBe(false);
  });
});
