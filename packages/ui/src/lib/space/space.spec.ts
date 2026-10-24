import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  andesSpaceGaps,
  AndesSpace,
  AndesSpaceAlign,
  AndesSpaceDirection,
  AndesSpaceSize,
} from './space';
import { AndesSpaceCompact } from './space-compact';
import { AndesSpaceItem } from './space-item';

@Component({
  imports: [AndesSpace],
  template: `<andes-space
    [direction]="direction()"
    [size]="size()"
    [align]="align()"
    [wrap]="wrap()"
    ><span>a</span><span>b</span></andes-space
  >`,
})
class LayoutHost {
  readonly direction = signal<AndesSpaceDirection>('horizontal');
  readonly size = signal<AndesSpaceSize>('sm');
  readonly align = signal<AndesSpaceAlign | undefined>(undefined);
  readonly wrap = signal(false);
}

@Component({
  imports: [AndesSpace, AndesSpaceItem],
  template: `
    <andes-space [split]="split()">
      <span andesSpaceItem id="a">A</span>
      @if (showB()) {
        <span andesSpaceItem id="b">B</span>
      }
      <span andesSpaceItem id="c">C</span>
    </andes-space>
  `,
})
class SplitHost {
  readonly split = signal<string | TemplateRef<unknown> | null>('|');
  readonly showB = signal(true);
}

@Component({
  imports: [AndesSpace, AndesSpaceItem],
  template: `
    <ng-template #sep><hr class="custom-sep" /></ng-template>
    <andes-space [split]="sep">
      <a andesSpaceItem>One</a>
      <a andesSpaceItem>Two</a>
      <a andesSpaceItem>Three</a>
    </andes-space>
  `,
})
class TemplateSplitHost {
  readonly sep = viewChild<TemplateRef<unknown>>('sep');
}

@Component({
  imports: [AndesSpace, AndesSpaceItem],
  template: `
    <andes-space split="/">
      @for (item of items(); track item) {
        <span andesSpaceItem>{{ item }}</span>
      }
    </andes-space>
  `,
})
class ListHost {
  readonly items = signal(['x', 'y']);
}

@Component({
  imports: [AndesSpace],
  template: `<andes-space split="|"
    ><span>no marker</span><span>none</span></andes-space
  >`,
})
class UnmarkedHost {}

@Component({
  imports: [AndesSpaceCompact],
  template: `<andes-space-compact
    [direction]="direction()"
    [block]="block()"
    aria-label="Search"
    ><button type="button">One</button
    ><button type="button">Two</button></andes-space-compact
  >`,
})
class CompactHost {
  readonly direction = signal<'horizontal' | 'vertical'>('horizontal');
  readonly block = signal(false);
}

function texts(el: Element): string[] {
  return Array.from(el.children).map((child) =>
    (child.textContent ?? '').trim(),
  );
}

describe('andesSpaceGaps', () => {
  it('maps the presets to spacing tokens', () => {
    expect(andesSpaceGaps('sm').horizontal).toBe(
      'var(--andes-space-2, 0.5rem)',
    );
    expect(andesSpaceGaps('md').horizontal).toBe('var(--andes-space-4, 1rem)');
    expect(andesSpaceGaps('lg').vertical).toBe('var(--andes-space-6, 1.5rem)');
  });

  it('uses one value for both axes', () => {
    expect(andesSpaceGaps(12)).toEqual({
      horizontal: '12px',
      vertical: '12px',
    });
    expect(andesSpaceGaps('2rem')).toEqual({
      horizontal: '2rem',
      vertical: '2rem',
    });
    expect(andesSpaceGaps('10')).toEqual({
      horizontal: '10px',
      vertical: '10px',
    });
  });

  it('takes a [horizontal, vertical] pair', () => {
    expect(andesSpaceGaps([16, 'sm'])).toEqual({
      horizontal: '16px',
      vertical: 'var(--andes-space-2, 0.5rem)',
    });
  });
});

describe('AndesSpace layout', () => {
  function create() {
    const fixture = TestBed.createComponent(LayoutHost);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector(
      'andes-space',
    ) as HTMLElement;
    return { fixture, host: fixture.componentInstance, el };
  }

  it('is a horizontal, centred space with the small gap by default', () => {
    const { el } = create();
    expect(el.classList.contains('andes-space')).toBe(true);
    expect(el.getAttribute('data-slot')).toBe('space');
    expect(el.getAttribute('data-direction')).toBe('horizontal');
    expect(el.getAttribute('data-align')).toBe('center');
    expect(el.hasAttribute('data-wrap')).toBe(false);
    expect(el.style.columnGap).toContain('--andes-space-2');
    expect(el.style.rowGap).toContain('--andes-space-2');
  });

  it('does not wrap children in extra elements', () => {
    const { el } = create();
    expect(texts(el)).toEqual(['a', 'b']);
  });

  it('stretches (no align) in a vertical space unless told otherwise', () => {
    const { fixture, host, el } = create();
    host.direction.set('vertical');
    fixture.detectChanges();
    expect(el.getAttribute('data-direction')).toBe('vertical');
    expect(el.hasAttribute('data-align')).toBe(false);
    host.align.set('end');
    fixture.detectChanges();
    expect(el.getAttribute('data-align')).toBe('end');
  });

  it('applies explicit align, wrap and sizes', () => {
    const { fixture, host, el } = create();
    host.align.set('baseline');
    host.wrap.set(true);
    host.size.set([24, 8]);
    fixture.detectChanges();
    expect(el.getAttribute('data-align')).toBe('baseline');
    expect(el.hasAttribute('data-wrap')).toBe(true);
    expect(el.style.columnGap).toBe('24px');
    expect(el.style.rowGap).toBe('8px');
  });
});

describe('AndesSpace split', () => {
  function create<T>(type: new () => T) {
    const fixture = TestBed.createComponent(type);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector(
      'andes-space',
    ) as HTMLElement;
    return { fixture, host: fixture.componentInstance, el };
  }

  const split = (el: HTMLElement) =>
    Array.from(el.querySelectorAll('.andes-space__split'));

  it('renders a text separator between items, never after the last', () => {
    const { el } = create(SplitHost);
    expect(texts(el)).toEqual(['A', '|', 'B', '|', 'C']);
    expect(el.lastElementChild?.id).toBe('c');
  });

  it('hides separators from assistive technology', () => {
    const { el } = create(SplitHost);
    expect(split(el)).toHaveLength(2);
    for (const separator of split(el)) {
      expect(separator.getAttribute('aria-hidden')).toBe('true');
    }
  });

  it('keeps separators between what is shown when an item comes and goes', () => {
    const { fixture, host, el } = create(SplitHost);
    host.showB.set(false);
    fixture.detectChanges();
    expect(texts(el)).toEqual(['A', '|', 'C']);
    host.showB.set(true);
    fixture.detectChanges();
    expect(texts(el)).toEqual(['A', '|', 'B', '|', 'C']);
  });

  it('removes the separators when split is cleared and brings them back', () => {
    const { fixture, host, el } = create(SplitHost);
    host.split.set(null);
    fixture.detectChanges();
    expect(texts(el)).toEqual(['A', 'B', 'C']);
    host.split.set('/');
    fixture.detectChanges();
    expect(texts(el)).toEqual(['A', '/', 'B', '/', 'C']);
  });

  it('renders a template separator as a real element', () => {
    const { fixture, el } = create(TemplateSplitHost);
    fixture.detectChanges();
    expect(el.querySelectorAll('hr.custom-sep')).toHaveLength(2);
    const order = Array.from(el.children).map((child) =>
      child.matches('a') ? (child.textContent ?? '').trim() : 'sep',
    );
    expect(order).toEqual(['One', 'sep', 'Two', 'sep', 'Three']);
    expect(split(el)).toHaveLength(2);
  });

  it('follows a list that grows and shrinks', () => {
    const { fixture, host, el } = create(ListHost);
    expect(texts(el)).toEqual(['x', '/', 'y']);
    host.items.set(['x', 'y', 'z']);
    fixture.detectChanges();
    expect(texts(el)).toEqual(['x', '/', 'y', '/', 'z']);
    host.items.set(['z']);
    fixture.detectChanges();
    expect(texts(el)).toEqual(['z']);
  });

  it('draws nothing for children that are not marked as items', () => {
    const { el } = create(UnmarkedHost);
    expect(split(el)).toHaveLength(0);
  });
});

describe('AndesSpaceCompact', () => {
  function create() {
    const fixture = TestBed.createComponent(CompactHost);
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector(
      'andes-space-compact',
    ) as HTMLElement;
    return { fixture, host: fixture.componentInstance, el };
  }

  it('is a labelled group of its children', () => {
    const { el } = create();
    expect(el.getAttribute('role')).toBe('group');
    expect(el.getAttribute('aria-label')).toBe('Search');
    expect(el.getAttribute('data-slot')).toBe('space-compact');
    expect(el.getAttribute('data-direction')).toBe('horizontal');
    expect(el.querySelectorAll('button')).toHaveLength(2);
  });

  it('switches direction and block mode', () => {
    const { fixture, host, el } = create();
    host.direction.set('vertical');
    host.block.set(true);
    fixture.detectChanges();
    expect(el.getAttribute('data-direction')).toBe('vertical');
    expect(el.classList.contains('andes-space-compact--block')).toBe(true);
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(
      join(process.cwd(), 'packages/ui/src/lib/space/space-compact.css'),
      'utf8',
    )
      .replace(/\s+/g, ' ')
      .replace(/\( /g, '(')
      .replace(/ \)/g, ')');

    it('collapses the shared border with a 1px overlap along the inline axis', () => {
      expect(css).toMatch(
        /andes-space-compact--horizontal > :not\(:first-child\) \{ margin-inline-start: -1px;/,
      );
    });

    it('collapses it along the block axis when vertical', () => {
      expect(css).toMatch(
        /andes-space-compact--vertical > :not\(:first-child\) \{ margin-block-start: -1px;/,
      );
    });

    it('squares the inner corners of the child and of its first element', () => {
      expect(css).toContain(
        'andes-space-compact--horizontal > :not(:first-child) > * { border-start-start-radius: 0; border-end-start-radius: 0;',
      );
      expect(css).toContain(
        'andes-space-compact--horizontal > :not(:last-child) > * { border-start-end-radius: 0; border-end-end-radius: 0;',
      );
    });

    it('raises the hovered, focused and open control', () => {
      expect(css).toMatch(/:is\(:hover, :focus-within\)[^{]*\{ z-index: 1;/);
      expect(css).toContain("[aria-expanded='true']");
    });

    it('never starts a line with a combinator (prettier-wrapped selectors)', () => {
      const raw = readFileSync(
        join(process.cwd(), 'packages/ui/src/lib/space/space-compact.css'),
        'utf8',
      );
      expect(raw.split('\n').filter((line) => /^\s*[>+~]/.test(line))).toEqual(
        [],
      );
    });

    it('uses logical properties only (RTL-safe)', () => {
      expect(css).not.toMatch(
        /margin-left|margin-right|border-top-left|border-top-right|border-bottom-left|border-bottom-right/,
      );
    });

    it('keeps the :has() rule apart so older browsers still get the others', () => {
      const hasRules = css.split('}').filter((rule) => rule.includes(':has('));
      expect(hasRules).toHaveLength(1);
      expect(hasRules[0]).not.toContain(',');
    });
  });
});
