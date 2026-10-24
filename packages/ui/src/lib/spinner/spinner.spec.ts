import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesSpinner,
  AndesSpinnerPercent,
  AndesSpinnerSize,
  AndesSpinnerVariant,
} from './spinner';

@Component({
  imports: [AndesSpinner],
  template: `<andes-spinner
    [variant]="variant()"
    [size]="size()"
    [tip]="tip()"
    [label]="label()"
    [percent]="percent()"
  />`,
})
class HostComponent {
  readonly variant = signal<AndesSpinnerVariant>('ring');
  readonly size = signal<AndesSpinnerSize>('md');
  readonly tip = signal<string | undefined>(undefined);
  readonly label = signal('Loading');
  readonly percent = signal<AndesSpinnerPercent | undefined>(undefined);
}

describe('AndesSpinner', () => {
  function create() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector(
      'andes-spinner',
    ) as HTMLElement;
    return { fixture, host };
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is a status with a visually hidden label and an aria-hidden indicator', () => {
    const { host } = create();

    expect(host.getAttribute('role')).toBe('status');
    expect(host.querySelector('[data-slot="spinner-label"]')?.textContent).toBe(
      'Loading',
    );
    expect(
      host
        .querySelector('[data-slot="spinner-indicator"]')
        ?.getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('uses a custom label', () => {
    const { fixture, host } = create();
    fixture.componentInstance.label.set('Loading invoices');
    fixture.detectChanges();

    expect(host.querySelector('[data-slot="spinner-label"]')?.textContent).toBe(
      'Loading invoices',
    );
  });

  it('shows the tip and lets it stand in for the hidden label', () => {
    const { fixture, host } = create();
    fixture.componentInstance.tip.set('Fetching data...');
    fixture.detectChanges();

    expect(host.querySelector('[data-slot="spinner-tip"]')?.textContent).toBe(
      'Fetching data...',
    );
    expect(host.querySelector('[data-slot="spinner-label"]')).toBeNull();
  });

  it('draws the ring by default and switches to dots and bars', () => {
    const { fixture, host } = create();
    expect(host.querySelector('svg circle.andes-spinner__arc')).not.toBeNull();

    fixture.componentInstance.variant.set('dots');
    fixture.detectChanges();
    expect(host.getAttribute('data-variant')).toBe('dots');
    expect(host.querySelectorAll('.andes-spinner__dot')).toHaveLength(3);
    expect(host.querySelector('svg')).toBeNull();

    fixture.componentInstance.variant.set('bars');
    fixture.detectChanges();
    expect(host.querySelectorAll('.andes-spinner__bar')).toHaveLength(3);
  });

  it.each([
    ['sm', '16px'],
    ['md', '24px'],
    ['lg', '40px'],
    [56, '56px'],
    ['3rem', '3rem'],
    ['30', '30px'],
  ] as const)('sizes %s as %s', (size, expected) => {
    const { fixture, host } = create();
    fixture.componentInstance.size.set(size);
    fixture.detectChanges();

    expect(host.style.getPropertyValue('--andes-spinner-size')).toBe(expected);
  });

  describe('determinate', () => {
    it('becomes a progressbar with value attributes and a name', () => {
      const { fixture, host } = create();
      fixture.componentInstance.percent.set(42);
      fixture.detectChanges();

      expect(host.getAttribute('role')).toBe('progressbar');
      expect(host.getAttribute('aria-valuemin')).toBe('0');
      expect(host.getAttribute('aria-valuemax')).toBe('100');
      expect(host.getAttribute('aria-valuenow')).toBe('42');
      expect(host.getAttribute('aria-label')).toBe('Loading');
      expect(
        host.querySelector('[data-slot="spinner-percent"]')?.textContent,
      ).toBe('42%');
      expect(host.hasAttribute('data-determinate')).toBe(true);
    });

    it('clamps the value and fills the arc proportionally', () => {
      const { fixture, host } = create();
      const arc = () =>
        host.querySelector('.andes-spinner__arc') as SVGCircleElement;

      fixture.componentInstance.percent.set(250);
      fixture.detectChanges();
      expect(host.getAttribute('aria-valuenow')).toBe('100');

      fixture.componentInstance.percent.set(50);
      fixture.detectChanges();
      const [filled, total] = (arc().getAttribute('stroke-dasharray') ?? '')
        .split(' ')
        .map(Number);
      expect(filled / total).toBeCloseTo(0.5, 2);
    });

    it('hides the arc at 0% so the rounded cap does not draw a dot', () => {
      const { fixture, host } = create();
      const arc = () => host.querySelector('.andes-spinner__arc') as SVGElement;
      fixture.componentInstance.percent.set(0);
      fixture.detectChanges();
      expect(arc().getAttribute('stroke-opacity')).toBe('0');

      fixture.componentInstance.percent.set(5);
      fixture.detectChanges();
      expect(arc().hasAttribute('stroke-opacity')).toBe(false);
    });

    it('uses the tip as the progressbar name', () => {
      const { fixture, host } = create();
      fixture.componentInstance.percent.set(10);
      fixture.componentInstance.tip.set('Uploading');
      fixture.detectChanges();

      expect(host.getAttribute('aria-label')).toBe('Uploading');
    });

    it('simulates progress with auto: rises, slows, and never completes', () => {
      vi.useFakeTimers();
      const { fixture, host } = create();
      fixture.componentInstance.percent.set('auto');
      fixture.detectChanges();
      expect(host.getAttribute('aria-valuenow')).toBe('0');

      vi.advanceTimersByTime(1000);
      fixture.detectChanges();
      const early = Number(host.getAttribute('aria-valuenow'));
      expect(early).toBeGreaterThan(0);

      vi.advanceTimersByTime(600_000);
      fixture.detectChanges();
      const late = Number(host.getAttribute('aria-valuenow'));
      expect(late).toBeGreaterThan(early);
      expect(late).toBeLessThan(100);
    });

    it('stops the simulation when leaving auto', () => {
      vi.useFakeTimers();
      const { fixture } = create();
      fixture.componentInstance.percent.set('auto');
      fixture.detectChanges();
      fixture.componentInstance.percent.set(undefined);
      fixture.detectChanges();

      expect(vi.getTimerCount()).toBe(0);
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(
      join(process.cwd(), 'packages/ui/src/lib/spinner/spinner.css'),
      'utf8',
    ).replace(/\s+/g, ' ');
    const reduced = css.slice(css.indexOf('prefers-reduced-motion'));

    it('turns the ring once a second, linear', () => {
      expect(css).toContain('animation: andes-spinner-turn 1s linear infinite');
    });

    it('colours from the primary token and exposes hooks', () => {
      expect(css).toContain(
        'var(--andes-spinner-color, var(--andes-color-primary))',
      );
      expect(css).toContain('--andes-spinner-track-color');
    });

    it('slows the loop under reduced motion instead of removing it', () => {
      expect(reduced).toContain('animation-duration: 3s');
      expect(reduced).toContain('animation-name: andes-spinner-fade');
      expect(reduced).not.toMatch(/animation:\s*none/);
    });

    it('never overshoots: no bounce easing or scale above 1', () => {
      expect(css).not.toMatch(/cubic-bezier\(\s*[^)]*-/);
      expect(css).not.toMatch(/scale\(1\.\d/);
    });
  });
});
