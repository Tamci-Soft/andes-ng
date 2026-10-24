import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import { AndesStatistic, AndesStatisticTrend } from './statistic';
import {
  AndesStatisticFormatOptions,
  AndesStatisticValue,
  formatStatisticValue,
} from './statistic-format';

@Component({
  imports: [AndesStatistic],
  template: `
    <andes-statistic
      [title]="title()"
      [value]="value()"
      [precision]="precision()"
      [prefix]="prefix()"
      [suffix]="suffix()"
      [locale]="locale()"
      [formatOptions]="formatOptions()"
      [grouping]="grouping()"
      [groupSeparator]="groupSeparator()"
      [decimalSeparator]="decimalSeparator()"
      [formatter]="formatter()"
      [loading]="loading()"
      [trend]="trend()"
      [favorable]="favorable()"
      [trendIcon]="trendIcon()"
      [size]="size()"
      [aria-label]="ariaLabel()"
    >
      <span class="extra">vs last month</span>
    </andes-statistic>
    <ng-template #tpl><b class="tpl">Rich</b></ng-template>
  `,
})
class HostComponent {
  readonly title = signal<string | TemplateRef<unknown> | undefined>('Revenue');
  readonly value = signal<AndesStatisticValue>(1234.5);
  readonly precision = signal<number | undefined>(undefined);
  readonly prefix = signal<string | TemplateRef<unknown> | undefined>(
    undefined,
  );
  readonly suffix = signal<string | TemplateRef<unknown> | undefined>(
    undefined,
  );
  readonly locale = signal<string | undefined>('en-US');
  readonly formatOptions = signal<Intl.NumberFormatOptions | undefined>(
    undefined,
  );
  readonly grouping = signal(true);
  readonly groupSeparator = signal<string | undefined>(undefined);
  readonly decimalSeparator = signal<string | undefined>(undefined);
  readonly formatter = signal<((v: unknown) => string) | undefined>(undefined);
  readonly loading = signal(false);
  readonly trend = signal<AndesStatisticTrend | null>(null);
  readonly favorable = signal<AndesStatisticTrend>('up');
  readonly trendIcon = signal(true);
  readonly size = signal<'small' | 'default' | 'large'>('default');
  readonly ariaLabel = signal<string | undefined>(undefined);
  readonly tpl = viewChild.required<TemplateRef<unknown>>('tpl');
}

describe('formatStatisticValue', () => {
  const format = (
    value: AndesStatisticValue,
    options: AndesStatisticFormatOptions = { locale: 'en-US' },
  ) => {
    const parts = formatStatisticValue(value, options);
    return parts.integer + parts.decimal + parts.tail;
  };

  it('groups thousands and keeps the locale decimals', () => {
    expect(format(1234567.891)).toBe('1,234,567.891');
    expect(format(1234.5, { locale: 'de-DE' })).toBe('1.234,5');
  });

  it('fixes the number of fraction digits with precision', () => {
    expect(format(3, { locale: 'en-US', precision: 2 })).toBe('3.00');
    expect(format(2.456, { locale: 'en-US', precision: 1 })).toBe('2.5');
    expect(format(2.9, { locale: 'en-US', precision: 0 })).toBe('3');
  });

  it('splits the fraction from the integer part', () => {
    const parts = formatStatisticValue(1234.56, { locale: 'en-US' });

    expect(parts).toEqual({
      integer: '1,234',
      decimal: '.56',
      tail: '',
      numeric: true,
    });
  });

  it('formats currency with the symbol in the integer part', () => {
    const parts = formatStatisticValue(1234.5, {
      locale: 'en-US',
      format: { style: 'currency', currency: 'USD' },
    });

    expect(parts.integer).toBe('$1,234');
    expect(parts.decimal).toBe('.50');
  });

  it('puts trailing symbols in the tail', () => {
    const compact = formatStatisticValue(1500, {
      locale: 'en-US',
      format: { notation: 'compact' },
    });
    const percent = formatStatisticValue(0.256, {
      locale: 'en-US',
      format: { style: 'percent' },
    });

    expect(compact.tail).toBe('K');
    expect(percent.tail).toBe('%');
  });

  it('turns grouping off', () => {
    expect(format(1234567, { locale: 'en-US', grouping: false })).toBe(
      '1234567',
    );
  });

  it('replaces the separators', () => {
    expect(
      format(1234567.5, {
        locale: 'en-US',
        groupSeparator: ' ',
        decimalSeparator: ',',
      }),
    ).toBe('1 234 567,5');
  });

  it('formats numeric strings and bigints as numbers', () => {
    expect(format('1234.5')).toBe('1,234.5');
    expect(format(12345678901234567890n)).toBe('12,345,678,901,234,567,890');
  });

  it('shows anything non-numeric as given', () => {
    expect(formatStatisticValue('N/A', { locale: 'en-US' })).toEqual({
      integer: 'N/A',
      decimal: '',
      tail: '',
      numeric: false,
    });
    expect(format(Number.NaN)).toBe('NaN');
    expect(format(Number.POSITIVE_INFINITY)).toBe('Infinity');
  });

  it('shows the placeholder for empty values', () => {
    expect(format(null)).toBe('—');
    expect(format(undefined, { placeholder: 'n/a' })).toBe('n/a');
    expect(format('')).toBe('—');
  });

  it('survives an invalid locale', () => {
    expect(format(12, { locale: 'not_a_locale!!' })).toBe('12');
  });

  it('keeps negative numbers together', () => {
    expect(format(-1234.5)).toBe('-1,234.5');
  });
});

describe('AndesStatistic', () => {
  function create() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const root = fixture.nativeElement.querySelector(
      'andes-statistic',
    ) as HTMLElement;
    const q = <T extends HTMLElement = HTMLElement>(selector: string) =>
      fixture.nativeElement.querySelector(selector) as T | null;
    return { fixture, host, root, q };
  }

  function flush(fixture: ComponentFixture<HostComponent>) {
    fixture.detectChanges();
    fixture.detectChanges();
  }

  describe('rendering', () => {
    it('renders a definition list with title and figure', () => {
      const { fixture, q } = create();

      expect(fixture.nativeElement.querySelector('dl')).toBeTruthy();
      expect(q('dt')?.textContent?.trim()).toBe('Revenue');
      expect(q('dd.andes-statistic__value')?.textContent).toContain('1,234.5');
    });

    it('splits the figure into integer and decimal spans', () => {
      const { q } = create();

      expect(q('.andes-statistic__integer')?.textContent).toBe('1,234');
      expect(q('.andes-statistic__decimal')?.textContent).toBe('.5');
    });

    it('applies precision', () => {
      const { fixture, host, q } = create();
      host.precision.set(2);
      flush(fixture);

      expect(q('.andes-statistic__decimal')?.textContent).toBe('.50');
    });

    it('uses the locale', () => {
      const { fixture, host, q } = create();
      host.locale.set('de-DE');
      flush(fixture);

      expect(q('.andes-statistic__integer')?.textContent).toBe('1.234');
      expect(q('.andes-statistic__decimal')?.textContent).toBe(',5');
    });

    it('formats currency from formatOptions', () => {
      const { fixture, host, q } = create();
      host.formatOptions.set({ style: 'currency', currency: 'EUR' });
      flush(fixture);

      expect(q('.andes-statistic__integer')?.textContent).toBe('€1,234');
    });

    it('supports separator overrides and no grouping', () => {
      const { fixture, host, q } = create();
      host.groupSeparator.set("'");
      host.value.set(1234567);
      flush(fixture);
      expect(q('.andes-statistic__integer')?.textContent).toBe("1'234'567");

      host.grouping.set(false);
      flush(fixture);
      expect(q('.andes-statistic__integer')?.textContent).toBe('1234567');
    });

    it('lets a formatter replace the built-in formatting', () => {
      const { fixture, host, q } = create();
      host.formatter.set((value) => `~${String(value)} units`);
      flush(fixture);

      expect(q('.andes-statistic__figure')?.textContent).toBe('~1234.5 units');
    });

    it('does not call the formatter for an empty value', () => {
      const { fixture, host, q } = create();
      const spy = vi.fn(() => 'x');
      host.formatter.set(spy);
      host.value.set(null);
      flush(fixture);

      expect(spy).not.toHaveBeenCalled();
      expect(q('.andes-statistic__figure')?.textContent).toBe('—');
    });

    it('renders text and template affixes', () => {
      const { fixture, host, q } = create();
      host.prefix.set('S/');
      host.suffix.set(host.tpl());
      flush(fixture);

      expect(q('.andes-statistic__prefix')?.textContent?.trim()).toBe('S/');
      expect(q('.andes-statistic__suffix .tpl')).toBeTruthy();
    });

    it('renders a template title', () => {
      const { fixture, host, q } = create();
      host.title.set(host.tpl());
      flush(fixture);

      expect(q('dt .tpl')).toBeTruthy();
    });

    it('projects extra content under the figure', () => {
      const { q } = create();

      expect(q('.andes-statistic__extra .extra')?.textContent).toBe(
        'vs last month',
      );
    });

    it('mirrors the size', () => {
      const { fixture, host, root } = create();
      host.size.set('large');
      flush(fixture);

      expect(root.getAttribute('data-size')).toBe('large');
    });
  });

  describe('accessibility', () => {
    it('does not leave the aria-label or title on the host', () => {
      const { root } = create();

      expect(root.hasAttribute('aria-label')).toBe(false);
      expect(root.hasAttribute('title')).toBe(false);
    });

    it('hides the term when there is no title or label', () => {
      const { fixture, host, q } = create();
      host.title.set(undefined);
      flush(fixture);

      expect(q('dt')?.hasAttribute('hidden')).toBe(true);
    });

    it('keeps an aria-label as visually hidden term text', () => {
      const { fixture, host, q } = create();
      host.title.set(undefined);
      host.ariaLabel.set('Open orders');
      flush(fixture);

      expect(q('dt')?.hasAttribute('hidden')).toBe(false);
      expect(q('dt')?.classList.contains('andes-statistic__sr')).toBe(true);
      expect(q('dt')?.textContent?.trim()).toBe('Open orders');
    });
  });

  describe('loading', () => {
    it('swaps the figure for a skeleton and marks the block busy', () => {
      const { fixture, host, q } = create();
      host.loading.set(true);
      flush(fixture);

      expect(q('.andes-statistic__skeleton')).toBeTruthy();
      expect(q('.andes-statistic__figure')).toBeNull();
      expect(q('dl')?.getAttribute('aria-busy')).toBe('true');
      expect(q('.andes-statistic__sr')?.textContent).toBe('Loading');
    });

    it('is not busy by default', () => {
      const { q } = create();

      expect(q('dl')?.hasAttribute('aria-busy')).toBe(false);
      expect(q('.andes-statistic__skeleton')).toBeNull();
    });
  });

  describe('trend', () => {
    it('has no trend by default', () => {
      const { root, q } = create();

      expect(root.hasAttribute('data-trend')).toBe(false);
      expect(q('.andes-statistic__trend-icon')).toBeNull();
    });

    it('colours an increase as good and adds helper classes', () => {
      const { fixture, host, root, q } = create();
      host.trend.set('up');
      flush(fixture);

      expect(root.getAttribute('data-trend')).toBe('up');
      expect(root.getAttribute('data-tone')).toBe('good');
      expect(root.classList.contains('andes-statistic--up')).toBe(true);
      expect(root.classList.contains('andes-statistic--good')).toBe(true);
      expect(q('.andes-statistic__trend-icon')).toBeTruthy();
      expect(q('.andes-statistic__value')?.textContent).toContain('Increase');
    });

    it('colours a decrease as bad', () => {
      const { fixture, host, root, q } = create();
      host.trend.set('down');
      flush(fixture);

      expect(root.getAttribute('data-tone')).toBe('bad');
      expect(root.classList.contains('andes-statistic--down')).toBe(true);
      expect(root.classList.contains('andes-statistic--bad')).toBe(true);
      expect(q('.andes-statistic__value')?.textContent).toContain('Decrease');
    });

    it('flips the colours when down is favorable', () => {
      const { fixture, host, root } = create();
      host.trend.set('down');
      host.favorable.set('down');
      flush(fixture);

      expect(root.getAttribute('data-tone')).toBe('good');
    });

    it('can hide the arrow and still announce the direction', () => {
      const { fixture, host, q } = create();
      host.trend.set('up');
      host.trendIcon.set(false);
      flush(fixture);

      expect(q('.andes-statistic__trend-icon')).toBeNull();
      expect(q('.andes-statistic__value')?.textContent).toContain('Increase');
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(
      'packages/ui/src/lib/statistic/statistic.css',
      'utf8',
    );

    it('exposes the documented custom properties', () => {
      for (const name of [
        '--andes-statistic-title-color',
        '--andes-statistic-title-size',
        '--andes-statistic-value-color',
        '--andes-statistic-value-size',
        '--andes-statistic-value-weight',
        '--andes-statistic-value-font-family',
        '--andes-statistic-decimal-size',
        '--andes-statistic-affix-size',
      ]) {
        expect(css).toContain(name);
      }
    });

    it('uses tabular figures and honours reduced motion', () => {
      expect(css).toContain('tabular-nums');
      expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    });

    it('uses logical properties only', () => {
      expect(css).not.toMatch(/\b(?:margin|padding)-(?:left|right)\b/);
    });
  });
});
