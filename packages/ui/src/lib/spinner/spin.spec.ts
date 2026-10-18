import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesSpin } from './spin';
import { AndesSpinnerPercent, AndesSpinnerVariant } from './spinner';

@Component({
  imports: [AndesSpin],
  template: `<andes-spin
    [spinning]="spinning()"
    [delay]="delay()"
    [tip]="tip()"
    [variant]="variant()"
    [percent]="percent()"
    [fullscreen]="fullscreen()"
    ><button type="button" (click)="clicks = clicks + 1">
      Save
    </button></andes-spin
  >`,
})
class HostComponent {
  readonly spinning = signal(true);
  readonly delay = signal(0);
  readonly tip = signal<string | undefined>(undefined);
  readonly variant = signal<AndesSpinnerVariant>('ring');
  readonly percent = signal<AndesSpinnerPercent | undefined>(undefined);
  readonly fullscreen = signal(false);
  clicks = 0;
}

describe('AndesSpin', () => {
  function create(configure?: (host: HostComponent) => void) {
    const fixture = TestBed.createComponent(HostComponent);
    configure?.(fixture.componentInstance);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector(
      'andes-spin',
    ) as HTMLElement;
    return { fixture, host };
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the indicator over the content while spinning', () => {
    const { host } = create();

    expect(host.querySelector('[data-slot="spin-mask"]')).not.toBeNull();
    expect(host.querySelector('andes-spinner')?.getAttribute('role')).toBe(
      'status',
    );
    expect(host.querySelector('button')?.textContent?.trim()).toBe('Save');
    expect(
      host
        .querySelector('[data-slot="spin-content"]')
        ?.hasAttribute('data-dimmed'),
    ).toBe(true);
  });

  it('marks the region busy and the content dimmed only while spinning', () => {
    const { fixture, host } = create();
    expect(host.getAttribute('aria-busy')).toBe('true');
    expect(host.hasAttribute('data-spinning')).toBe(true);

    fixture.componentInstance.spinning.set(false);
    fixture.detectChanges();

    expect(host.hasAttribute('aria-busy')).toBe(false);
    expect(host.querySelector('[data-slot="spin-mask"]')).toBeNull();
    expect(
      host
        .querySelector('[data-slot="spin-content"]')
        ?.hasAttribute('data-dimmed'),
    ).toBe(false);
  });

  it('renders nothing when it starts idle, and the content stays reachable', () => {
    const { host } = create((component) => component.spinning.set(false));

    expect(host.querySelector('[data-slot="spin-mask"]')).toBeNull();
    expect(host.querySelector('button')).not.toBeNull();
  });

  it('passes tip, variant and percent to the spinner', () => {
    const { fixture, host } = create();
    fixture.componentInstance.tip.set('Saving');
    fixture.componentInstance.variant.set('dots');
    fixture.detectChanges();
    const spinner = host.querySelector('andes-spinner') as HTMLElement;

    expect(spinner.getAttribute('data-variant')).toBe('dots');
    expect(
      spinner.querySelector('[data-slot="spinner-tip"]')?.textContent,
    ).toBe('Saving');

    fixture.componentInstance.percent.set(70);
    fixture.detectChanges();
    expect(spinner.getAttribute('aria-valuenow')).toBe('70');
  });

  describe('delay', () => {
    it('does not show the indicator until the delay has passed', () => {
      vi.useFakeTimers();
      const { fixture, host } = create((component) => component.delay.set(300));

      expect(host.querySelector('[data-slot="spin-mask"]')).toBeNull();
      expect(host.getAttribute('aria-busy')).toBe('true');

      vi.advanceTimersByTime(299);
      fixture.detectChanges();
      expect(host.querySelector('[data-slot="spin-mask"]')).toBeNull();

      vi.advanceTimersByTime(1);
      fixture.detectChanges();
      expect(host.querySelector('[data-slot="spin-mask"]')).not.toBeNull();
    });

    it('never flashes for a load that finishes inside the delay', () => {
      vi.useFakeTimers();
      const { fixture, host } = create((component) => component.delay.set(300));

      vi.advanceTimersByTime(100);
      fixture.componentInstance.spinning.set(false);
      fixture.detectChanges();
      vi.advanceTimersByTime(1000);
      fixture.detectChanges();

      expect(host.querySelector('[data-slot="spin-mask"]')).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('hides a visible indicator immediately when spinning stops', () => {
      vi.useFakeTimers();
      const { fixture, host } = create((component) => component.delay.set(50));
      vi.advanceTimersByTime(50);
      fixture.detectChanges();
      expect(host.querySelector('[data-slot="spin-mask"]')).not.toBeNull();

      fixture.componentInstance.spinning.set(false);
      fixture.detectChanges();
      expect(host.querySelector('[data-slot="spin-mask"]')).toBeNull();
    });

    it('restarts the delay when spinning turns back on', () => {
      vi.useFakeTimers();
      const { fixture, host } = create((component) => component.delay.set(200));
      vi.advanceTimersByTime(200);
      fixture.detectChanges();
      fixture.componentInstance.spinning.set(false);
      fixture.detectChanges();
      fixture.componentInstance.spinning.set(true);
      fixture.detectChanges();
      expect(host.querySelector('[data-slot="spin-mask"]')).toBeNull();

      vi.advanceTimersByTime(200);
      fixture.detectChanges();
      expect(host.querySelector('[data-slot="spin-mask"]')).not.toBeNull();
    });
  });

  describe('fullscreen', () => {
    it('flags the host and leaves the content undimmed', () => {
      const { host } = create((component) => component.fullscreen.set(true));

      expect(host.hasAttribute('data-fullscreen')).toBe(true);
      expect(host.querySelector('[data-slot="spin-mask"]')).not.toBeNull();
      expect(
        host
          .querySelector('[data-slot="spin-content"]')
          ?.hasAttribute('data-dimmed'),
      ).toBe(false);
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(
      join(process.cwd(), 'packages/ui/src/lib/spinner/spin.css'),
      'utf8',
    ).replace(/\s+/g, ' ');

    it('blocks pointer input and dims and blurs the content', () => {
      expect(css).toContain('pointer-events: none');
      expect(css).toContain('opacity: var(--andes-spin-content-opacity, 0.5)');
      expect(css).toContain('blur(var(--andes-spin-content-blur, 1px))');
    });

    it('centres the indicator on the visible viewport for tall content', () => {
      expect(css).toContain('position: sticky');
      expect(css).toContain(
        'block-size: min(100%, var(--andes-spin-viewport, 100dvh))',
      );
    });

    it('fixes the fullscreen mask to the viewport above the page', () => {
      expect(css).toContain('position: fixed');
      expect(css).toContain('var(--andes-z-index-overlay');
    });

    it('drops its transitions under reduced motion', () => {
      const reduced = css.slice(css.indexOf('prefers-reduced-motion'));
      expect(reduced).toContain('transition: none');
      expect(reduced).toContain('animation: none');
    });
  });
});
