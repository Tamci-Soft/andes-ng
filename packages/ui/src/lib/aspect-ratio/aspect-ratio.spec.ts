import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesAspectRatio,
  AndesAspectRatioFit,
  andesAspectRatioToCss,
} from './aspect-ratio';

@Component({
  imports: [AndesAspectRatio],
  template: `<andes-aspect-ratio
    [ratio]="ratio()"
    [fit]="fit()"
    [position]="position()"
    [fill]="fill()"
    ><img alt="" src="data:,"
  /></andes-aspect-ratio>`,
})
class HostComponent {
  readonly ratio = signal<number | string>(1);
  readonly fit = signal<AndesAspectRatioFit>('cover');
  readonly position = signal('center');
  readonly fill = signal(true);
}

describe('andesAspectRatioToCss', () => {
  it.each([
    [1.5, '1.5'],
    [1, '1'],
    ['16/9', '16 / 9'],
    ['16 / 9', '16 / 9'],
    ['4:3', '4 / 3'],
    [' 2.5 : 1 ', '2.5 / 1'],
    ['1.25', '1.25'],
  ])('converts %j to %s', (input, expected) => {
    expect(andesAspectRatioToCss(input)).toBe(expected);
  });

  it.each([
    0,
    -2,
    NaN,
    Infinity,
    '',
    'wide',
    '16/0',
    '0/9',
    '-1/2',
    null,
    undefined,
  ])('falls back to a square for %j', (input) => {
    expect(andesAspectRatioToCss(input as never)).toBe('1');
  });
});

describe('AndesAspectRatio', () => {
  function create() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector(
      'andes-aspect-ratio',
    ) as HTMLElement;
    return { fixture, host: fixture.componentInstance, el };
  }

  it('renders the slot attributes and projects its content', () => {
    const { el } = create();
    expect(el.classList.contains('andes-aspect-ratio')).toBe(true);
    expect(el.getAttribute('data-slot')).toBe('aspect-ratio');
    expect(el.querySelector('img')).not.toBeNull();
  });

  it('defaults to a square that fills and covers', () => {
    const { el } = create();
    expect(el.style.getPropertyValue('--andes-aspect-ratio')).toBe('1');
    expect(el.hasAttribute('data-fill')).toBe(true);
    expect(el.getAttribute('data-fit')).toBe('cover');
    expect(el.style.getPropertyValue('--andes-aspect-ratio-fit')).toBe('cover');
    expect(el.style.getPropertyValue('--andes-aspect-ratio-position')).toBe(
      'center',
    );
  });

  it('exposes a numeric ratio as the aspect-ratio custom property', () => {
    const { fixture, host, el } = create();
    host.ratio.set(1.5);
    fixture.detectChanges();
    expect(el.style.getPropertyValue('--andes-aspect-ratio')).toBe('1.5');
  });

  it('parses fraction strings', () => {
    const { fixture, host, el } = create();
    host.ratio.set('16/9');
    fixture.detectChanges();
    expect(el.style.getPropertyValue('--andes-aspect-ratio')).toBe('16 / 9');
    host.ratio.set('4:3');
    fixture.detectChanges();
    expect(el.style.getPropertyValue('--andes-aspect-ratio')).toBe('4 / 3');
  });

  it('ignores an invalid ratio instead of collapsing the box', () => {
    const { fixture, host, el } = create();
    host.ratio.set('nope');
    fixture.detectChanges();
    expect(el.style.getPropertyValue('--andes-aspect-ratio')).toBe('1');
  });

  it('forwards fit and position', () => {
    const { fixture, host, el } = create();
    host.fit.set('contain');
    host.position.set('top');
    fixture.detectChanges();
    expect(el.getAttribute('data-fit')).toBe('contain');
    expect(el.style.getPropertyValue('--andes-aspect-ratio-fit')).toBe(
      'contain',
    );
    expect(el.style.getPropertyValue('--andes-aspect-ratio-position')).toBe(
      'top',
    );
  });

  it('drops the fill marker when fill is off', () => {
    const { fixture, host, el } = create();
    host.fill.set(false);
    fixture.detectChanges();
    expect(el.hasAttribute('data-fill')).toBe(false);
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(
      join(process.cwd(), 'packages/ui/src/lib/aspect-ratio/aspect-ratio.css'),
      'utf8',
    ).replace(/\s+/g, ' ');

    it('sizes the box with the aspect-ratio property from the custom property', () => {
      expect(css).toContain('aspect-ratio: var(--andes-aspect-ratio, 1)');
    });

    it('takes filling children out of the flow and stretches them', () => {
      expect(css).toContain('.andes-aspect-ratio[data-fill] > * {');
      expect(css).toMatch(/position: absolute; inset: 0;/);
    });

    it('applies object-fit from the custom property to media', () => {
      expect(css).toContain('object-fit: var(--andes-aspect-ratio-fit, cover)');
    });

    it('sets no colours', () => {
      expect(css).not.toMatch(/color|background/);
    });
  });
});
