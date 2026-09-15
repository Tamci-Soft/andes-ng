import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesProgress,
  AndesProgressSize,
  AndesProgressVariant,
} from './progress';

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
