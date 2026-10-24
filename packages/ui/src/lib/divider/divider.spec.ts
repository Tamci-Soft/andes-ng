import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesDivider,
  AndesDividerAlign,
  AndesDividerOrientation,
  AndesDividerSpacing,
  AndesDividerVariant,
  AndesSeparator,
} from './divider';

@Component({
  imports: [AndesDivider],
  template: `<andes-divider
    [orientation]="orientation()"
    [variant]="variant()"
    [dashed]="dashed()"
    [dotted]="dotted()"
    [align]="align()"
    [orientationMargin]="margin()"
    [plain]="plain()"
    [size]="size()"
    [decorative]="decorative()"
    [aria-label]="label()"
    >{{ text() }}</andes-divider
  >`,
})
class HostComponent {
  readonly orientation = signal<AndesDividerOrientation>('horizontal');
  readonly variant = signal<AndesDividerVariant>('solid');
  readonly dashed = signal(false);
  readonly dotted = signal(false);
  readonly align = signal<AndesDividerAlign>('center');
  readonly margin = signal<number | string | undefined>(undefined);
  readonly plain = signal(false);
  readonly size = signal<AndesDividerSpacing>('md');
  readonly decorative = signal(false);
  readonly label = signal<string | undefined>(undefined);
  readonly text = signal('');
}

@Component({
  imports: [AndesSeparator],
  template: `<andes-separator orientation="vertical" />`,
})
class SeparatorHostComponent {}

describe('AndesDivider', () => {
  function create() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector(
      'andes-divider',
    ) as HTMLElement;
    const line = host.querySelector(
      '[data-slot="divider-line"]',
    ) as HTMLElement;
    return { fixture, host, line };
  }

  it('is a horizontal separator by default', () => {
    const { host, line } = create();

    expect(line.getAttribute('role')).toBe('separator');
    expect(line.getAttribute('aria-orientation')).toBe('horizontal');
    expect(host.getAttribute('data-orientation')).toBe('horizontal');
    expect(host.getAttribute('data-variant')).toBe('solid');
    expect(host.getAttribute('role')).toBeNull();
  });

  it('announces a vertical orientation', () => {
    const { fixture, host, line } = create();
    fixture.componentInstance.orientation.set('vertical');
    fixture.detectChanges();

    expect(line.getAttribute('aria-orientation')).toBe('vertical');
    expect(host.getAttribute('data-orientation')).toBe('vertical');
    expect(host.getAttribute('data-align')).toBeNull();
  });

  it('can be decorative: role none and no separator ARIA', () => {
    const { fixture, line } = create();
    fixture.componentInstance.label.set('Section');
    fixture.componentInstance.decorative.set(true);
    fixture.detectChanges();

    expect(line.getAttribute('role')).toBe('none');
    expect(line.hasAttribute('aria-orientation')).toBe(false);
    expect(line.hasAttribute('aria-label')).toBe(false);
  });

  it('puts the accessible name on the separator and not on the host', () => {
    const { fixture, host, line } = create();
    fixture.componentInstance.label.set('Account sections');
    fixture.detectChanges();

    expect(line.getAttribute('aria-label')).toBe('Account sections');
    expect(host.hasAttribute('aria-label')).toBe(false);
  });

  it('keeps the second line only for the text layout', () => {
    const { fixture, host } = create();
    const text = host.querySelector(
      '[data-slot="divider-text"]',
    ) as HTMLElement;
    expect(text.textContent).toBe('');

    fixture.componentInstance.text.set('Or continue with');
    fixture.detectChanges();
    expect(text.textContent).toBe('Or continue with');
  });

  it('resolves the line variant, with the shorthands winning over solid', () => {
    const { fixture, host } = create();
    fixture.componentInstance.variant.set('dashed');
    fixture.detectChanges();
    expect(host.getAttribute('data-variant')).toBe('dashed');

    fixture.componentInstance.variant.set('solid');
    fixture.componentInstance.dashed.set(true);
    fixture.detectChanges();
    expect(host.getAttribute('data-variant')).toBe('dashed');

    fixture.componentInstance.dotted.set(true);
    fixture.detectChanges();
    expect(host.getAttribute('data-variant')).toBe('dotted');
  });

  it.each(['start', 'center', 'end'] as const)('aligns text %s', (align) => {
    const { fixture, host } = create();
    fixture.componentInstance.align.set(align);
    fixture.detectChanges();

    expect(host.getAttribute('data-align')).toBe(align);
  });

  it('turns orientationMargin into a CSS length', () => {
    const { fixture, host } = create();
    fixture.componentInstance.margin.set(40);
    fixture.detectChanges();
    expect(host.style.getPropertyValue('--andes-divider-offset')).toBe('40px');

    fixture.componentInstance.margin.set('10%');
    fixture.detectChanges();
    expect(host.style.getPropertyValue('--andes-divider-offset')).toBe('10%');

    fixture.componentInstance.margin.set(undefined);
    fixture.detectChanges();
    expect(host.style.getPropertyValue('--andes-divider-offset')).toBe('');
  });

  it('marks plain text', () => {
    const { fixture, host } = create();
    expect(host.hasAttribute('data-plain')).toBe(false);

    fixture.componentInstance.plain.set(true);
    fixture.detectChanges();
    expect(host.hasAttribute('data-plain')).toBe(true);
  });

  it('uses a size preset, or a custom spacing as a CSS variable', () => {
    const { fixture, host } = create();
    expect(host.getAttribute('data-size')).toBe('md');
    expect(host.style.getPropertyValue('--andes-divider-margin')).toBe('');

    fixture.componentInstance.size.set('lg');
    fixture.detectChanges();
    expect(host.getAttribute('data-size')).toBe('lg');

    fixture.componentInstance.size.set(36);
    fixture.detectChanges();
    expect(host.getAttribute('data-size')).toBeNull();
    expect(host.style.getPropertyValue('--andes-divider-margin')).toBe('36px');
  });

  it('answers to the andes-separator selector as well', () => {
    const fixture = TestBed.createComponent(SeparatorHostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector(
      'andes-separator',
    ) as HTMLElement;

    expect(host.getAttribute('data-slot')).toBe('divider');
    expect(
      host
        .querySelector('[role="separator"]')
        ?.getAttribute('aria-orientation'),
    ).toBe('vertical');
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(
      join(process.cwd(), 'packages/ui/src/lib/divider/divider.css'),
      'utf8',
    ).replace(/\s+/g, ' ');

    it('draws the line from the border token and uses logical properties', () => {
      expect(css).toContain(
        'var(--andes-divider-color, var(--andes-color-border))',
      );
      expect(css).toContain('border-block-start:');
      expect(css).toContain('border-inline-start:');
      expect(css).not.toMatch(/border-(left|right|top|bottom)\b/);
    });

    it('hides the second line when there is no text', () => {
      expect(css).toContain(
        '.andes-divider__text:empty + .andes-divider__line { display: none; }',
      );
    });

    it('supports dashed and dotted lines in both orientations', () => {
      expect(css).toContain('border-block-start-style: dashed');
      expect(css).toContain('border-block-start-style: dotted');
      expect(css).toContain('border-inline-start-style: dashed');
      expect(css).toContain('border-inline-start-style: dotted');
    });
  });
});
