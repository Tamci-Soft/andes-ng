import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesFlex, AndesFlexLayout, andesFlexGap } from './flex';

@Component({
  imports: [AndesFlex],
  template: `<andes-flex
    [vertical]="vertical()"
    [reverse]="reverse()"
    [wrap]="wrap()"
    [justify]="justify()"
    [align]="align()"
    [gap]="gap()"
    [flex]="flex()"
    [inline]="inline()"
    ><span>a</span><span>b</span></andes-flex
  >`,
})
class ElementHost {
  readonly vertical = signal(false);
  readonly reverse = signal(false);
  readonly wrap = signal<
    'nowrap' | 'wrap' | 'wrap-reverse' | boolean | undefined
  >(undefined);
  readonly justify = signal<'center' | 'space-between' | undefined>(undefined);
  readonly align = signal<'center' | 'flex-end' | undefined>(undefined);
  readonly gap = signal<'sm' | 'md' | 'lg' | number | string | undefined>(
    undefined,
  );
  readonly flex = signal<string | number | undefined>(undefined);
  readonly inline = signal(false);
}

@Component({
  imports: [AndesFlexLayout],
  template: `
    <section andesFlex vertical gap="md" id="section"><i></i></section>
    <ul andesFlex wrap justify="space-between" gap="12" id="list">
      <li></li>
    </ul>
    <div andesFlex id="plain"></div>
  `,
})
class AttributeHost {}

describe('andesFlexGap', () => {
  it('maps the named sizes to spacing tokens with literal fallbacks', () => {
    expect(andesFlexGap('sm')).toBe('var(--andes-space-2, 0.5rem)');
    expect(andesFlexGap('md')).toBe('var(--andes-space-4, 1rem)');
    expect(andesFlexGap('lg')).toBe('var(--andes-space-6, 1.5rem)');
  });

  it('treats numbers and numeric strings as pixels', () => {
    expect(andesFlexGap(0)).toBe('0px');
    expect(andesFlexGap(12)).toBe('12px');
    expect(andesFlexGap('12')).toBe('12px');
    expect(andesFlexGap('1.5')).toBe('1.5px');
  });

  it('passes any other CSS length through', () => {
    expect(andesFlexGap('1.5rem')).toBe('1.5rem');
    expect(andesFlexGap('var(--andes-space-3)')).toBe('var(--andes-space-3)');
    expect(andesFlexGap('8px 16px')).toBe('8px 16px');
  });

  it('returns nothing for empty values', () => {
    expect(andesFlexGap(undefined)).toBeNull();
    expect(andesFlexGap(null)).toBeNull();
    expect(andesFlexGap('')).toBeNull();
    expect(andesFlexGap(NaN)).toBeNull();
  });
});

describe('AndesFlex (element)', () => {
  function create() {
    const fixture = TestBed.createComponent(ElementHost);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('andes-flex') as HTMLElement;
    return { fixture, host: fixture.componentInstance, el };
  }

  it('is a horizontal flex row with no other inline styles by default', () => {
    const { el } = create();
    expect(el.style.display).toBe('flex');
    expect(el.style.flexDirection).toBe('row');
    expect(el.getAttribute('data-slot')).toBe('flex');
    expect(el.getAttribute('data-orientation')).toBe('horizontal');
    expect(el.style.flexWrap).toBe('');
    expect(el.style.justifyContent).toBe('');
    expect(el.style.alignItems).toBe('');
    expect(el.style.gap).toBe('');
    expect(el.style.flex).toBe('');
    expect(el.querySelectorAll('span')).toHaveLength(2);
  });

  it('stacks vertically and reverses', () => {
    const { fixture, host, el } = create();
    host.vertical.set(true);
    fixture.detectChanges();
    expect(el.style.flexDirection).toBe('column');
    expect(el.getAttribute('data-orientation')).toBe('vertical');
    host.reverse.set(true);
    fixture.detectChanges();
    expect(el.style.flexDirection).toBe('column-reverse');
    host.vertical.set(false);
    fixture.detectChanges();
    expect(el.style.flexDirection).toBe('row-reverse');
  });

  it('applies wrap from a keyword or a boolean', () => {
    const { fixture, host, el } = create();
    host.wrap.set(true);
    fixture.detectChanges();
    expect(el.style.flexWrap).toBe('wrap');
    host.wrap.set(false);
    fixture.detectChanges();
    expect(el.style.flexWrap).toBe('nowrap');
    host.wrap.set('wrap-reverse');
    fixture.detectChanges();
    expect(el.style.flexWrap).toBe('wrap-reverse');
  });

  it('applies justify, align and flex', () => {
    const { fixture, host, el } = create();
    host.justify.set('space-between');
    host.align.set('center');
    host.flex.set(1);
    fixture.detectChanges();
    expect(el.style.justifyContent).toBe('space-between');
    expect(el.style.alignItems).toBe('center');
    expect(el.style.flex).toBe('1 1 0%');
  });

  it('resolves the gap presets, numbers and lengths', () => {
    const { fixture, host, el } = create();
    host.gap.set('md');
    fixture.detectChanges();
    expect(el.style.gap).toContain('--andes-space-4');
    host.gap.set(24);
    fixture.detectChanges();
    expect(el.style.gap).toBe('24px');
    host.gap.set('2rem');
    fixture.detectChanges();
    expect(el.style.gap).toBe('2rem');
    host.gap.set(undefined);
    fixture.detectChanges();
    expect(el.style.gap).toBe('');
  });

  it('can render inline', () => {
    const { fixture, host, el } = create();
    host.inline.set(true);
    fixture.detectChanges();
    expect(el.style.display).toBe('inline-flex');
  });
});

describe('andesFlex (attribute)', () => {
  function create() {
    const fixture = TestBed.createComponent(AttributeHost);
    fixture.detectChanges();
    const q = (id: string) =>
      fixture.nativeElement.querySelector(`#${id}`) as HTMLElement;
    return { section: q('section'), list: q('list'), plain: q('plain') };
  }

  it('turns the element it is applied to into a flex container', () => {
    const { section } = create();
    expect(section.tagName).toBe('SECTION');
    expect(section.style.display).toBe('flex');
    expect(section.style.flexDirection).toBe('column');
    expect(section.style.gap).toContain('--andes-space-4');
    expect(section.getAttribute('data-slot')).toBe('flex');
  });

  it('reads bare and string attributes', () => {
    const { list } = create();
    expect(list.tagName).toBe('UL');
    expect(list.style.flexWrap).toBe('wrap');
    expect(list.style.justifyContent).toBe('space-between');
    expect(list.style.gap).toBe('12px');
    expect(list.style.flexDirection).toBe('row');
  });

  it('with no inputs only makes a row', () => {
    const { plain } = create();
    expect(plain.style.display).toBe('flex');
    expect(plain.style.gap).toBe('');
    expect(plain.style.flexWrap).toBe('');
  });
});
