import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesSelect } from './select';

const css = (file: string) =>
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), file), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ');

@Component({
  imports: [AndesSelect],
  template: `<andes-select
    aria-label="Fruit"
    allowClear
    [clearLabel]="label()"
    [options]="options"
    [(value)]="value"
  />`,
})
class ClearHost {
  readonly label = signal('Clear');
  readonly options = [
    { value: 'apple', label: 'Apple' },
    { value: 'pear', label: 'Pear' },
  ];
  readonly value = signal<unknown>('apple');
}

function setup() {
  const fixture = TestBed.createComponent(ClearHost);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const clear = () =>
    root.querySelector<HTMLButtonElement>('[data-slot="select-clear"]');
  const combobox = () => root.querySelector<HTMLElement>('[role="combobox"]');
  return { fixture, clear, combobox };
}

describe('AndesSelect clear button', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('is named by clearLabel, "Clear" by default', () => {
    const { fixture, clear } = setup();
    expect(clear()?.getAttribute('aria-label')).toBe('Clear');

    fixture.componentInstance.label.set('Borrar');
    fixture.detectChanges();
    expect(clear()?.getAttribute('aria-label')).toBe('Borrar');
  });

  it('is a keyboard stop of its own, and clearing from it hands focus back to the combobox', () => {
    const { fixture, clear, combobox } = setup();
    expect(clear()?.hasAttribute('tabindex')).toBe(false);
    expect(clear()?.tabIndex).toBe(0);

    clear()?.focus();
    clear()?.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBeNull();
    expect(clear()).toBeNull();
    expect(document.activeElement).toBe(combobox());
  });

  it('keeps a mouse press from moving focus', () => {
    const { clear } = setup();
    const press = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    clear()?.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(true);
  });

  it('draws the shared glyph: a filled disc with the "x" knocked out of it', () => {
    const { clear } = setup();
    const glyph = clear()?.querySelector('svg.andes-select__clear-glyph');
    expect(glyph?.querySelector('circle')).toBeTruthy();
    expect(css('select-trigger.css')).toContain(
      '.andes-select__clear-glyph path { fill: none; stroke: var(--andes-color-background);',
    );
  });

  it('has a 24px hit area that does not grow the box, and a focus ring', () => {
    const styles = css('select-trigger.css');
    const rule = styles.match(/\.andes-select__clear \{[^}]*\}/)?.[0] ?? '';
    expect(rule).toContain('padding: calc((1.5rem - 1em) / 2);');
    expect(rule).toContain('margin: calc((1em - 1.5rem) / 2);');
    expect(styles).toContain(
      '.andes-select__clear:focus-visible { outline: 2px solid var(--andes-color-focus-ring);',
    );
  });
});

describe('AndesSelect panel exit animation', () => {
  it('mirrors the enter animation while the overlay marks the panel closing', () => {
    const styles = css('select-content.css');
    expect(styles).toMatch(
      /@keyframes andes-select-panel-exit \{ from \{ opacity: 1; transform: none; \} to \{ opacity: 0; transform: scale\(0\.97\); \} \}/,
    );
    expect(styles).toContain(
      '.andes-select__panel[data-andes-closing] { transform-origin: top center; animation: andes-select-panel-exit var(--andes-duration-fast, 120ms) var(--andes-ease-in, ease-in) forwards; }',
    );
  });

  it('only animates when motion is allowed', () => {
    const styles = css('select-content.css');
    const motion = styles.slice(
      styles.indexOf('@media (prefers-reduced-motion: no-preference)'),
    );
    expect(motion).toContain('.andes-select__panel[data-andes-closing]');
    expect(styles.indexOf('[data-andes-closing]')).toBeGreaterThan(
      styles.indexOf('@media (prefers-reduced-motion: no-preference)'),
    );
  });
});
