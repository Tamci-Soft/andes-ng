import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import {
  AndesKbd,
  AndesKbdPlatform,
  AndesKbdSeparator,
  AndesKbdSize,
} from './kbd';
import { AndesKbdGroup } from './kbd-group';
import { andesKeyInfo, andesKeySymbol, andesParseShortcut } from './kbd-key';

describe('andesKeySymbol', () => {
  it.each([
    ['Mod', 'mac', '⌘'],
    ['Mod', 'windows', 'Ctrl'],
    ['Mod', 'linux', 'Ctrl'],
    ['Meta', 'mac', '⌘'],
    ['Meta', 'windows', 'Win'],
    ['Meta', 'linux', 'Super'],
    ['Shift', 'mac', '⇧'],
    ['Shift', 'windows', 'Shift'],
    ['Alt', 'mac', '⌥'],
    ['Alt', 'windows', 'Alt'],
    ['Ctrl', 'mac', '⌃'],
    ['Ctrl', 'windows', 'Ctrl'],
    ['Enter', 'mac', '⏎'],
    ['Enter', 'windows', 'Enter'],
    ['Esc', 'mac', '⎋'],
    ['Escape', 'windows', 'Esc'],
    ['ArrowUp', 'mac', '↑'],
    ['ArrowDown', 'windows', '↓'],
    ['ArrowLeft', 'linux', '←'],
    ['ArrowRight', 'mac', '→'],
    ['Backspace', 'mac', '⌫'],
    ['Tab', 'mac', '⇥'],
  ] as const)('%s on %s is %s', (key, platform, expected) => {
    expect(andesKeySymbol(key, platform)).toBe(expected);
  });

  it('accepts aliases and any letter case', () => {
    expect(andesKeySymbol('cmd', 'mac')).toBe('⌘');
    expect(andesKeySymbol('OPTION', 'mac')).toBe('⌥');
    expect(andesKeySymbol('return', 'mac')).toBe('⏎');
    expect(andesKeySymbol('up', 'windows')).toBe('↑');
    expect(andesKeySymbol(' ', 'windows')).toBe('Space');
    expect(andesKeySymbol('control', 'windows')).toBe('Ctrl');
  });

  it('upper-cases single letters and returns unknown keys as written', () => {
    expect(andesKeySymbol('k', 'mac')).toBe('K');
    expect(andesKeySymbol('F5', 'windows')).toBe('F5');
    expect(andesKeySymbol('+', 'windows')).toBe('+');
  });

  it('resolves the platform from the browser when omitted', () => {
    const symbol = andesKeySymbol('Mod');
    expect(['⌘', 'Ctrl']).toContain(symbol);
    expect(andesKeySymbol('Mod', 'auto')).toBe(symbol);
  });

  it('flags glyphs and gives them a spoken name', () => {
    expect(andesKeyInfo('Mod', 'mac')).toEqual({
      symbol: '⌘',
      name: 'Command',
      isGlyph: true,
    });
    expect(andesKeyInfo('Mod', 'windows')).toEqual({
      symbol: 'Ctrl',
      name: 'Control',
      isGlyph: false,
    });
    expect(andesKeyInfo('Alt', 'mac').name).toBe('Option');
  });
});

describe('andesParseShortcut', () => {
  it('splits a combination on +', () => {
    expect(andesParseShortcut('Mod+Shift+P')).toEqual([['Mod', 'Shift', 'P']]);
  });

  it('keeps the plus key', () => {
    expect(andesParseShortcut('Mod++')).toEqual([['Mod', '+']]);
    expect(andesParseShortcut('+')).toEqual([['+']]);
  });

  it('splits sequences on whitespace and the word then', () => {
    expect(andesParseShortcut('G then I')).toEqual([['G'], ['I']]);
    expect(andesParseShortcut('G I')).toEqual([['G'], ['I']]);
  });

  it('returns nothing for an empty string', () => {
    expect(andesParseShortcut('  ')).toEqual([]);
  });
});

@Component({
  imports: [AndesKbd],
  template: `<andes-kbd
    [key]="key()"
    [shortcut]="shortcut()"
    [platform]="platform()"
    [size]="size()"
    [separator]="separator()"
    >Esc</andes-kbd
  >`,
})
class KbdHostComponent {
  readonly key = signal<string | undefined>(undefined);
  readonly shortcut = signal<string | undefined>(undefined);
  readonly platform = signal<AndesKbdPlatform>('mac');
  readonly size = signal<AndesKbdSize>('md');
  readonly separator = signal<AndesKbdSeparator>('+');
}

describe('AndesKbd', () => {
  function setup() {
    const fixture = TestBed.createComponent(KbdHostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      kbds: () => Array.from(root.querySelectorAll('kbd')),
      kbd: root.querySelector('andes-kbd') as HTMLElement,
    };
  }

  it('renders projected content in a single kbd element', () => {
    const { kbds } = setup();
    expect(kbds()).toHaveLength(1);
    expect(kbds()[0].textContent?.trim()).toBe('Esc');
    expect(kbds()[0].getAttribute('data-slot')).toBe('kbd-key');
  });

  it('renders a platform glyph for key with a spoken name', () => {
    const { fixture, host, kbds } = setup();
    host.key.set('Mod');
    fixture.detectChanges();

    const cap = kbds()[0];
    expect(cap.querySelector('[aria-hidden="true"]')?.textContent).toBe('⌘');
    expect(cap.textContent).toContain('Command');
  });

  it('renders the label on platforms without a glyph', () => {
    const { fixture, host, kbds } = setup();
    host.key.set('Mod');
    host.platform.set('windows');
    fixture.detectChanges();

    expect(kbds()[0].querySelector('[aria-hidden]')).toBeNull();
    expect(kbds()[0].textContent?.trim()).toBe('Ctrl');
  });

  it('renders a shortcut as one cap per key with separators', () => {
    const { fixture, host, kbds, kbd } = setup();
    host.shortcut.set('Mod+K');
    host.platform.set('windows');
    fixture.detectChanges();

    expect(kbds().map((k) => k.textContent?.trim())).toEqual(['Ctrl', 'K']);
    const separators = kbd.querySelectorAll('[data-slot="kbd-separator"]');
    expect(separators).toHaveLength(1);
    expect(separators[0].textContent?.trim()).toBe('+');
  });

  it('omits the separator for none and uses custom text', () => {
    const { fixture, host, kbd } = setup();
    host.shortcut.set('Mod+K');
    host.separator.set('none');
    fixture.detectChanges();
    expect(kbd.querySelectorAll('[data-slot="kbd-separator"]')).toHaveLength(0);

    host.separator.set('/');
    fixture.detectChanges();
    expect(
      kbd.querySelector('[data-slot="kbd-separator"]')?.textContent?.trim(),
    ).toBe('/');
  });

  it('joins sequence steps with then', () => {
    const { fixture, host, kbd, kbds } = setup();
    host.shortcut.set('G then I');
    fixture.detectChanges();

    expect(kbds().map((k) => k.textContent?.trim())).toEqual(['G', 'I']);
    expect(kbd.querySelector('[data-slot="kbd-separator"]')?.textContent).toBe(
      'then',
    );
  });

  it('prefers shortcut over key and projected content', () => {
    const { fixture, host, kbds } = setup();
    host.key.set('Shift');
    host.shortcut.set('Alt+F');
    fixture.detectChanges();
    expect(kbds()).toHaveLength(2);
  });

  it('exposes size on the host', () => {
    const { fixture, host, kbd } = setup();
    expect(kbd.getAttribute('data-size')).toBe('md');
    host.size.set('lg');
    fixture.detectChanges();
    expect(kbd.getAttribute('data-size')).toBe('lg');
  });
});

@Component({
  imports: [AndesKbdGroup, AndesKbd],
  template: `<andes-kbd-group
      aria-label="Open palette"
      [keys]="keys()"
      [separator]="separator()"
      platform="windows"
    />
    <andes-kbd-group id="projected" separator="then">
      <andes-kbd>G</andes-kbd><andes-kbd>I</andes-kbd>
    </andes-kbd-group>`,
})
class GroupHostComponent {
  readonly keys = signal<string[]>(['Mod', 'Shift', 'P']);
  readonly separator = signal<AndesKbdSeparator>('+');
}

describe('AndesKbdGroup', () => {
  function setup() {
    const fixture = TestBed.createComponent(GroupHostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const groups = root.querySelectorAll('andes-kbd-group');
    return {
      fixture,
      host: fixture.componentInstance,
      data: groups[0] as HTMLElement,
      projected: groups[1] as HTMLElement,
    };
  }

  it('is a labelled group', () => {
    const { data } = setup();
    expect(data.getAttribute('role')).toBe('group');
    expect(data.getAttribute('aria-label')).toBe('Open palette');
  });

  it('renders a cap per key with separators between them', () => {
    const { data } = setup();
    expect(
      Array.from(data.querySelectorAll('kbd')).map((k) =>
        k.textContent?.trim(),
      ),
    ).toEqual(['Ctrl', 'Shift', 'P']);
    expect(data.querySelectorAll('.andes-kbd-group__separator')).toHaveLength(
      2,
    );
  });

  it('updates when the keys or separator change', () => {
    const { fixture, host, data } = setup();
    host.keys.set(['Mod', 'K']);
    host.separator.set('then');
    fixture.detectChanges();
    expect(data.querySelectorAll('kbd')).toHaveLength(2);
    expect(
      data.querySelector('.andes-kbd-group__separator')?.textContent?.trim(),
    ).toBe('then');
  });

  it('publishes the separator for projected keys as a CSS string', () => {
    const { projected } = setup();
    expect(projected.style.getPropertyValue('--_kbd-separator')).toBe('"then"');
    expect(projected.querySelectorAll('andes-kbd')).toHaveLength(2);
  });
});

describe('kbd stylesheet contract', () => {
  const css = readFileSync('packages/ui/src/lib/kbd/kbd.css', 'utf8');

  it('styles the key cap with tokens and the mono font fallback', () => {
    expect(css).toContain('--andes-color-muted');
    expect(css).toContain('--andes-color-border');
    expect(css).toContain('--andes-radius-sm');
    expect(css).toContain('--andes-font-family-mono');
    expect(css).toMatch(/monospace/);
    expect(css).toContain('font-size: var(--_kbd-font-size)');
    expect(css).toContain('--_kbd-height: 1.25rem');
    expect(css).toContain('--_kbd-font-size: 0.75rem');
  });
});
