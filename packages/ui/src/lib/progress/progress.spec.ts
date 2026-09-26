import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import {
  AndesProgress,
  AndesProgressSize,
  AndesProgressVariant,
} from './progress';

const SVG_NS = 'http://www.w3.org/2000/svg';

@Component({
  imports: [AndesProgress],
  template: `<andes-progress
    [value]="value()"
    [min]="min()"
    [max]="max()"
    [variant]="variant()"
    [size]="size()"
    [aria-valuetext]="ariaValuetext()"
    [aria-label]="ariaLabel()"
  />`,
})
class HostComponent {
  readonly value = signal<number | null>(null);
  readonly min = signal(0);
  readonly max = signal(100);
  readonly variant = signal<AndesProgressVariant>('primary');
  readonly size = signal<AndesProgressSize>('md');
  readonly ariaValuetext = signal<string | undefined>(undefined);
  readonly ariaLabel = signal<string | undefined>(undefined);
}

describe('AndesProgress', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement.querySelector(
      '[role="progressbar"]',
    ) as HTMLElement;
    const indicator = fixture.nativeElement.querySelector(
      '.andes-progress__indicator',
    ) as HTMLElement;
    return { fixture, root, indicator };
  }

  it('renders with role="progressbar"', () => {
    const { root } = createHost();

    expect(root).toBeTruthy();
    expect(root.getAttribute('data-slot')).toBe('progress');
  });

  it('defaults to the indeterminate state when no value is provided', () => {
    const { root, indicator } = createHost();

    expect(root.hasAttribute('aria-valuenow')).toBe(false);
    expect(root.getAttribute('aria-valuemin')).toBe('0');
    expect(root.getAttribute('aria-valuemax')).toBe('100');
    expect(root.getAttribute('data-indeterminate')).toBe('');
    expect(indicator.getAttribute('data-indeterminate')).toBe('');
  });

  it('sets aria-valuenow and the indicator width for a determinate value', () => {
    const { fixture, root, indicator } = createHost();
    fixture.componentInstance.value.set(42);
    fixture.detectChanges();

    expect(root.getAttribute('aria-valuenow')).toBe('42');
    expect(root.hasAttribute('data-indeterminate')).toBe(false);
    expect(root.getAttribute('data-progressing')).toBe('');
    expect(indicator.style.width).toBe('42%');
  });

  it('marks the complete state once the value reaches max', () => {
    const { fixture, root } = createHost();
    fixture.componentInstance.value.set(100);
    fixture.detectChanges();

    expect(root.getAttribute('aria-valuenow')).toBe('100');
    expect(root.getAttribute('data-complete')).toBe('');
    expect(root.hasAttribute('data-progressing')).toBe(false);
  });

  it('clamps a value above max down to max', () => {
    const { fixture, root, indicator } = createHost();
    fixture.componentInstance.value.set(150);
    fixture.detectChanges();

    expect(root.getAttribute('aria-valuenow')).toBe('100');
    expect(root.getAttribute('data-complete')).toBe('');
    expect(indicator.style.width).toBe('100%');
  });

  it('clamps a value below min up to min', () => {
    const { fixture, root, indicator } = createHost();
    fixture.componentInstance.value.set(-20);
    fixture.detectChanges();

    expect(root.getAttribute('aria-valuenow')).toBe('0');
    expect(indicator.style.width).toBe('0%');
    // At exactly min, it is neither "progressing" nor "complete".
    expect(root.hasAttribute('data-progressing')).toBe(false);
    expect(root.hasAttribute('data-complete')).toBe(false);
  });

  it('respects a custom min/max range', () => {
    const { fixture, root, indicator } = createHost();
    fixture.componentInstance.min.set(50);
    fixture.componentInstance.max.set(150);
    fixture.componentInstance.value.set(100);
    fixture.detectChanges();

    expect(root.getAttribute('aria-valuemin')).toBe('50');
    expect(root.getAttribute('aria-valuemax')).toBe('150');
    expect(root.getAttribute('aria-valuenow')).toBe('100');
    expect(indicator.style.width).toBe('50%');
  });

  it('reflects an explicit aria-valuetext', () => {
    const { fixture, root } = createHost();
    fixture.componentInstance.value.set(56);
    fixture.componentInstance.ariaValuetext.set('56 of 100 uploaded');
    fixture.detectChanges();

    expect(root.getAttribute('aria-valuetext')).toBe('56 of 100 uploaded');
  });

  it('omits aria-valuetext when not provided', () => {
    const { root } = createHost();

    expect(root.hasAttribute('aria-valuetext')).toBe(false);
  });

  it('forwards aria-label for an accessible name', () => {
    const { fixture, root } = createHost();
    fixture.componentInstance.ariaLabel.set('Upload progress');
    fixture.detectChanges();

    expect(root.getAttribute('aria-label')).toBe('Upload progress');
  });

  it.each(['primary', 'success', 'warning', 'danger'] as const)(
    'supports the %s variant',
    (variant) => {
      const { fixture, root } = createHost();
      fixture.componentInstance.variant.set(variant);
      fixture.detectChanges();

      expect(root.classList).toContain(`andes-progress--${variant}`);
    },
  );

  it.each(['sm', 'md', 'lg'] as const)('supports the %s size', (size) => {
    const { fixture, root } = createHost();
    fixture.componentInstance.size.set(size);
    fixture.detectChanges();

    expect(root.classList).toContain(`andes-progress--${size}`);
  });
});

describe('AndesProgress (extended options)', () => {
  function create(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(AndesProgress);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      el,
      root: el.querySelector('[role="progressbar"]') as HTMLElement,
      q: <T extends Element = HTMLElement>(selector: string) =>
        el.querySelector(selector) as T | null,
      qa: <T extends Element = HTMLElement>(selector: string) =>
        Array.from(el.querySelectorAll(selector)) as T[],
    };
  }

  function set(
    fixture: ComponentFixture<AndesProgress>,
    inputs: Record<string, unknown>,
  ) {
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    fixture.detectChanges();
  }

  function dash(el: Element | null): number[] {
    return ((el as SVGElement).style.strokeDasharray || '')
      .split(/[\s,]+/)
      .map((part) => Number.parseFloat(part));
  }

  describe('percent', () => {
    it('drives the bar on a 0-100 scale and wins over value/min/max', () => {
      const { root, q } = create({ percent: 30, value: 5, min: 0, max: 10 });

      expect(root.getAttribute('aria-valuenow')).toBe('30');
      expect(root.getAttribute('aria-valuemin')).toBe('0');
      expect(root.getAttribute('aria-valuemax')).toBe('100');
      expect(q('.andes-progress__indicator')?.style.width).toBe('30%');
      expect(root.hasAttribute('data-indeterminate')).toBe(false);
    });

    it('clamps percent into 0-100 and marks completion', () => {
      const { root, fixture } = create({ percent: 140 });
      expect(root.getAttribute('aria-valuenow')).toBe('100');
      expect(root.hasAttribute('data-complete')).toBe(true);

      set(fixture, { percent: -5 });
      expect(root.getAttribute('aria-valuenow')).toBe('0');
    });
  });

  describe('info (showInfo / format)', () => {
    it('keeps a line bare by default but shows the percentage on request', () => {
      const { fixture, q } = create({ percent: 42 });
      expect(q('.andes-progress__info')).toBeNull();

      set(fixture, { showInfo: true });
      expect(q('.andes-progress__info')?.textContent?.trim()).toBe('42%');
      expect(q('.andes-progress__info')?.getAttribute('aria-hidden')).toBe(
        'true',
      );
    });

    it('shows at most one decimal, never rounding up to 100%', () => {
      const { q } = create({ percent: 99.96, showInfo: true });

      expect(q('.andes-progress__info')?.textContent?.trim()).toBe('99.9%');
    });

    it('is not thrown off by float noise from value/min/max', () => {
      const { q } = create({ value: 0.57, min: 0, max: 1, showInfo: true });

      expect(q('.andes-progress__info')?.textContent?.trim()).toBe('57%');
    });

    it('shows info on circles by default and can hide it', () => {
      const { fixture, q } = create({ percent: 42, type: 'circle' });
      expect(q('.andes-progress__info')?.textContent?.trim()).toBe('42%');

      set(fixture, { showInfo: false });
      expect(q('.andes-progress__info')).toBeNull();
    });

    it('never shows info while indeterminate', () => {
      const { q } = create({ type: 'circle', showInfo: true });

      expect(q('.andes-progress__info')).toBeNull();
    });

    it('uses a format function for the text and aria-valuetext', () => {
      const format = vi.fn(
        (percent: number, success: number | undefined) =>
          `${percent} done, ${success} ok`,
      );
      const { root, q } = create({
        percent: 60,
        showInfo: true,
        success: { percent: 20 },
        format,
      });

      expect(format).toHaveBeenCalledWith(60, 20);
      expect(q('.andes-progress__info')?.textContent?.trim()).toBe(
        '60 done, 20 ok',
      );
      expect(root.getAttribute('aria-valuetext')).toBe('60 done, 20 ok');
    });

    it('lets an explicit aria-valuetext win over format', () => {
      const { root } = create({
        percent: 60,
        format: () => 'formatted',
        'aria-valuetext': 'explicit',
      });

      expect(root.getAttribute('aria-valuetext')).toBe('explicit');
    });

    it('renders a format template with percent and successPercent', () => {
      @Component({
        imports: [AndesProgress],
        template: `
          <ng-template #fmt let-percent let-success="successPercent">
            <b class="custom">{{ percent }}/{{ success }}</b>
          </ng-template>
          <andes-progress
            [percent]="75"
            [success]="{ percent: 25 }"
            [showInfo]="true"
            [format]="fmt"
            aria-label="Upload"
          />
        `,
      })
      class TemplateHost {}

      const fixture = TestBed.createComponent(TemplateHost);
      fixture.detectChanges();
      const custom = fixture.nativeElement.querySelector('.custom');

      expect(custom?.textContent).toBe('75/25');
      // A template can't be announced as text, so no aria-valuetext is derived.
      expect(
        fixture.nativeElement
          .querySelector('[role="progressbar"]')
          .hasAttribute('aria-valuetext'),
      ).toBe(false);
    });
  });

  describe('status', () => {
    it('success paints green and swaps the text for a check icon', () => {
      const { root, q } = create({
        percent: 100,
        status: 'success',
        showInfo: true,
        variant: 'warning',
      });

      expect(root.classList).toContain('andes-progress--success');
      expect(root.classList).not.toContain('andes-progress--warning');
      expect(root.getAttribute('data-status')).toBe('success');
      expect(q('.andes-progress__icon--success')).not.toBeNull();
      expect(q('.andes-progress__info')?.textContent?.trim()).toBe('');
    });

    it('exception paints red and shows a close icon (outlined on circles)', () => {
      const { root, q } = create({
        percent: 70,
        status: 'exception',
        type: 'circle',
      });

      expect(root.classList).toContain('andes-progress--danger');
      const icon = q('.andes-progress__icon--exception');
      expect(icon).not.toBeNull();
      expect(
        icon?.querySelector('.andes-progress__icon-stroke'),
      ).not.toBeNull();
    });

    it('keeps the text when a format is supplied', () => {
      const { q } = create({
        percent: 100,
        status: 'success',
        showInfo: true,
        format: () => 'Done',
      });

      expect(q('.andes-progress__icon')).toBeNull();
      expect(q('.andes-progress__info')?.textContent?.trim()).toBe('Done');
    });

    it('active animates the filled bar, but not an indeterminate one', () => {
      const { fixture, q } = create({ percent: 50, status: 'active' });
      expect(
        q('.andes-progress__indicator')?.classList.contains(
          'andes-progress__indicator--active',
        ),
      ).toBe(true);

      set(fixture, { percent: undefined, value: null });
      expect(
        q('.andes-progress__indicator')?.classList.contains(
          'andes-progress__indicator--active',
        ),
      ).toBe(false);
    });
  });

  describe('success segment', () => {
    it('draws a success bar on top of the line', () => {
      const { q } = create({
        percent: 60,
        success: { percent: 30, strokeColor: 'rgb(1, 2, 3)' },
      });
      const segment = q('.andes-progress__success');

      expect(segment?.style.width).toBe('30%');
      expect(segment?.style.backgroundColor).toBe('rgb(1, 2, 3)');
    });

    it('draws a success arc on circles', () => {
      const { q } = create({
        type: 'circle',
        percent: 60,
        success: { percent: 30 },
        strokeLinecap: 'butt',
      });
      const arc = q('.andes-progress__circle-success');
      const rail = q('.andes-progress__circle-rail');

      expect(arc).not.toBeNull();
      expect(dash(arc)[0]).toBeCloseTo(dash(rail)[0] * 0.3, 3);
    });

    it('omits the segment when success is not configured', () => {
      const { q } = create({ percent: 60 });

      expect(q('.andes-progress__success')).toBeNull();
    });
  });

  describe('line styling', () => {
    it('applies a solid strokeColor and trailColor', () => {
      const { q } = create({
        percent: 50,
        strokeColor: 'rgb(255, 0, 0)',
        trailColor: 'rgb(0, 0, 255)',
      });

      expect(q('.andes-progress__indicator')?.style.background).toContain(
        'rgb(255, 0, 0)',
      );
      expect(q('.andes-progress__track')?.style.backgroundColor).toBe(
        'rgb(0, 0, 255)',
      );
    });

    it('turns a from/to gradient into a linear-gradient', () => {
      const component = TestBed.createComponent(AndesProgress);
      component.componentRef.setInput('percent', 50);
      component.componentRef.setInput('strokeColor', {
        from: 'red',
        to: 'blue',
      });
      component.detectChanges();
      const lineBackground = (
        component.componentInstance as unknown as {
          lineBackground: () => string;
        }
      ).lineBackground();

      expect(lineBackground).toBe(
        'linear-gradient(to right, red 0%, blue 100%)',
      );
    });

    it('sorts percent-keyed gradient stops', () => {
      const component = TestBed.createComponent(AndesProgress);
      component.componentRef.setInput('strokeColor', {
        '100%': 'blue',
        '0%': 'red',
        '50%': 'green',
        direction: 'to left',
      });
      component.detectChanges();

      expect(
        (
          component.componentInstance as unknown as {
            lineBackground: () => string;
          }
        ).lineBackground(),
      ).toBe('linear-gradient(to left, red 0%, green 50%, blue 100%)');
    });

    it('drops the rounding for butt/square linecaps', () => {
      const { root } = create({ percent: 50, strokeLinecap: 'square' });

      expect(root.classList).toContain('andes-progress--square');
    });

    it('uses strokeWidth as the bar thickness', () => {
      const { q } = create({ percent: 50, strokeWidth: 14 });

      expect(q('.andes-progress__track')?.style.height).toBe('14px');
    });
  });

  describe('size', () => {
    it.each([
      ['small', 'andes-progress--sm'],
      ['default', 'andes-progress--md'],
    ] as const)('maps named preset %s to %s', (size, cls) => {
      const { root } = create({ percent: 50, size });

      expect(root.classList).toContain(cls);
    });

    it('treats a number as the line thickness', () => {
      const { q } = create({ percent: 50, size: 12 });

      expect(q('.andes-progress__track')?.style.height).toBe('12px');
    });

    it('accepts [width, height] and { width, height } for lines', () => {
      const { fixture, q } = create({ percent: 50, size: [240, 10] });
      expect(q('.andes-progress__body')?.style.width).toBe('240px');
      expect(q('.andes-progress__track')?.style.height).toBe('10px');

      set(fixture, { size: { width: '50%', height: 4 } });
      expect(q('.andes-progress__body')?.style.width).toBe('50%');
      expect(q('.andes-progress__track')?.style.height).toBe('4px');
    });

    it('sizes circles by diameter (presets and numbers)', () => {
      const { fixture, q } = create({ type: 'circle', percent: 50 });
      expect(q('.andes-progress__circle')?.style.width).toBe('120px');
      expect(q('.andes-progress__circle')?.style.fontSize).toBe('24px');

      set(fixture, { size: 'small' });
      expect(q('.andes-progress__circle')?.style.width).toBe('60px');

      set(fixture, { size: 80 });
      expect(q('.andes-progress__circle')?.style.height).toBe('80px');
    });

    it('drops the info on a tiny (<= 20px) circle', () => {
      const { root, q } = create({ type: 'circle', percent: 50, size: 16 });

      expect(root.classList).toContain('andes-progress--tiny');
      expect(q('.andes-progress__info')).toBeNull();
    });
  });

  describe('percentPosition', () => {
    it('defaults to outer/end after the track', () => {
      const { root, q } = create({ percent: 50, showInfo: true });

      expect(root.classList).toContain('andes-progress--align-end');
      expect(
        q('.andes-progress__track + .andes-progress__info'),
      ).not.toBeNull();
    });

    it('puts the text inside the filled bar for type inner', () => {
      const { root, q } = create({
        percent: 50,
        showInfo: true,
        percentPosition: { type: 'inner', align: 'center' },
      });

      expect(root.classList).toContain('andes-progress--inner');
      expect(root.classList).toContain('andes-progress--align-center');
      expect(
        q(
          '.andes-progress__indicator .andes-progress__info',
        )?.textContent?.trim(),
      ).toBe('50%');
    });

    it.each(['start', 'center'] as const)(
      'supports outer %s alignment',
      (align) => {
        const { root } = create({
          percent: 50,
          showInfo: true,
          percentPosition: { align, type: 'outer' },
        });

        expect(root.classList).toContain(`andes-progress--align-${align}`);
        expect(root.classList).not.toContain('andes-progress--inner');
      },
    );
  });

  describe('steps', () => {
    it('renders segmented blocks and fills round(steps * percent)', () => {
      const { root, q, qa } = create({ percent: 50, steps: 5 });

      expect(root.classList).toContain('andes-progress--steps');
      expect(q('.andes-progress__track')).toBeNull();
      expect(qa('.andes-progress__step')).toHaveLength(5);
      // round(2.5) = 3
      expect(qa('.andes-progress__step--active')).toHaveLength(3);
      expect(qa('.andes-progress__step')[0].style.width).toBe('14px');
      expect(qa('.andes-progress__step')[0].style.height).toBe('8px');
    });

    it('supports a custom rounding function', () => {
      const { qa } = create({ percent: 50, steps: 5, rounding: Math.floor });

      expect(qa('.andes-progress__step--active')).toHaveLength(2);
    });

    it('colors each filled step from a strokeColor array', () => {
      const { qa } = create({
        percent: 100,
        steps: 3,
        strokeColor: ['rgb(1, 1, 1)', 'rgb(2, 2, 2)', 'rgb(3, 3, 3)'],
        size: 'small',
      });
      const steps = qa('.andes-progress__step');

      expect(steps.map((step) => step.style.backgroundColor)).toEqual([
        'rgb(1, 1, 1)',
        'rgb(2, 2, 2)',
        'rgb(3, 3, 3)',
      ]);
      expect(steps[0].style.width).toBe('2px');
    });

    it('segments circles too', () => {
      const { q, qa } = create({
        type: 'dashboard',
        percent: 50,
        steps: { count: 4, gap: 4 },
      });

      expect(q('.andes-progress__circle-rail')).toBeNull();
      expect(qa('.andes-progress__circle-step')).toHaveLength(4);
      expect(qa('.andes-progress__circle-step--active')).toHaveLength(2);
    });
  });

  describe('circle / dashboard', () => {
    it('renders SVG circles in the SVG namespace, hidden from AT', () => {
      const { q, qa } = create({ type: 'circle', percent: 25 });
      const svg = q('svg.andes-progress__svg');

      expect(svg?.getAttribute('aria-hidden')).toBe('true');
      expect(q('.andes-progress__track')).toBeNull();
      for (const circle of qa('circle')) {
        expect(circle.namespaceURI).toBe(SVG_NS);
      }
    });

    it("starts a full ring at 12 o'clock and fills percent of it", () => {
      const { q } = create({
        type: 'circle',
        percent: 25,
        strokeLinecap: 'butt',
      });
      const rail = q('.andes-progress__circle-rail');
      const indicator = q('.andes-progress__circle-indicator');
      const radius = 50 - 6 / 2;
      const perimeter = 2 * Math.PI * radius;

      expect(Number(rail?.getAttribute('r'))).toBe(radius);
      expect(rail?.getAttribute('transform')).toBe('rotate(-90 50 50)');
      expect(dash(rail)[0]).toBeCloseTo(perimeter, 3);
      expect(dash(indicator)[0]).toBeCloseTo(perimeter / 4, 3);
    });

    it('shortens the dash by half a stroke for round caps', () => {
      const { q } = create({ type: 'circle', percent: 50 });
      const perimeter = 2 * Math.PI * 47;

      expect(dash(q('.andes-progress__circle-indicator'))[0]).toBeCloseTo(
        perimeter / 2 - 3,
        3,
      );
    });

    it('hides the arc entirely at 0%', () => {
      const { q } = create({ type: 'circle', percent: 0 });

      expect(q('.andes-progress__circle-indicator')?.style.opacity).toBe('0');
    });

    it('opens a 75deg gap at the bottom of a dashboard by default', () => {
      const { q } = create({ type: 'dashboard', percent: 50 });
      const rail = q('.andes-progress__circle-rail');
      const perimeter = 2 * Math.PI * 47;

      expect(rail?.getAttribute('transform')).toBe('rotate(127.5 50 50)');
      expect(dash(rail)[0]).toBeCloseTo(perimeter * (285 / 360), 3);
    });

    it.each([
      [{ gapPlacement: 'top' }, 270 + 30],
      [{ gapPlacement: 'start' }, 180 + 30],
      [{ gapPlacement: 'end' }, 0 + 30],
      [{ gapPosition: 'left' }, 180 + 30],
      [{ gapPosition: 'right', gapPlacement: 'bottom' }, 90 + 30],
    ])('places the gap for %o', (inputs, rotation) => {
      const { q } = create({ type: 'dashboard', gapDegree: 60, ...inputs });

      expect(q('.andes-progress__circle-rail')?.getAttribute('transform')).toBe(
        `rotate(${rotation} 50 50)`,
      );
    });

    it('clamps gapDegree to 0-295 and allows a gap-less dashboard', () => {
      const { fixture, q } = create({ type: 'dashboard', gapDegree: 400 });
      const perimeter = 2 * Math.PI * 47;
      expect(dash(q('.andes-progress__circle-rail'))[0]).toBeCloseTo(
        perimeter * (65 / 360),
        3,
      );

      set(fixture, { gapDegree: 0 });
      expect(q('.andes-progress__circle-rail')?.getAttribute('transform')).toBe(
        'rotate(-90 50 50)',
      );
    });

    it('uses strokeWidth (as % of the diameter), linecap and trailColor', () => {
      const { q } = create({
        type: 'circle',
        percent: 50,
        strokeWidth: 10,
        strokeLinecap: 'square',
        trailColor: 'rgb(9, 9, 9)',
      });
      const rail = q('.andes-progress__circle-rail');

      expect(rail?.getAttribute('stroke-width')).toBe('10');
      expect(rail?.getAttribute('r')).toBe('45');
      expect(rail?.getAttribute('stroke-linecap')).toBe('square');
      expect(rail?.style.stroke).toBe('rgb(9, 9, 9)');
    });

    it('gives each instance its own gradient id', () => {
      @Component({
        imports: [AndesProgress],
        template: `
          <andes-progress
            type="circle"
            [percent]="50"
            [strokeColor]="gradient"
            aria-label="A"
          />
          <andes-progress
            type="circle"
            [percent]="80"
            [strokeColor]="gradient"
            aria-label="B"
          />
        `,
      })
      class TwoRings {
        readonly gradient = { '0%': 'red', '100%': 'blue' };
      }

      const fixture = TestBed.createComponent(TwoRings);
      fixture.detectChanges();
      const el = fixture.nativeElement as HTMLElement;
      const gradients = Array.from(el.querySelectorAll('linearGradient'));
      const indicators = Array.from(
        el.querySelectorAll<SVGElement>('.andes-progress__circle-indicator'),
      );

      expect(gradients).toHaveLength(2);
      expect(gradients[0].id).not.toBe(gradients[1].id);
      expect(indicators[0].style.stroke).toContain(`#${gradients[0].id}`);
      expect(indicators[1].style.stroke).toContain(`#${gradients[1].id}`);
      expect(
        Array.from(gradients[0].querySelectorAll('stop')).map((stop) => [
          stop.getAttribute('offset'),
          stop.getAttribute('stop-color'),
        ]),
      ).toEqual([
        ['0%', 'red'],
        ['100%', 'blue'],
      ]);
    });

    it('keeps the indeterminate state as an animated arc', () => {
      const { root, q } = create({ type: 'circle' });
      const indicator = q('.andes-progress__circle-indicator');

      expect(root.hasAttribute('aria-valuenow')).toBe(false);
      expect(indicator?.hasAttribute('data-indeterminate')).toBe(true);
      expect(indicator?.style.strokeDasharray).toBe('');
    });
  });
});
