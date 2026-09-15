import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesSkeleton, AndesSkeletonShape } from './skeleton';

@Component({
  imports: [AndesSkeleton],
  template: `<andes-skeleton
    [shape]="shape()"
    [width]="width()"
    [height]="height()"
    [animated]="animated()"
  />`,
})
class HostComponent {
  readonly shape = signal<AndesSkeletonShape>('text');
  readonly width = signal<string | number | undefined>(undefined);
  readonly height = signal<string | number | undefined>(undefined);
  readonly animated = signal(true);
}

describe('AndesSkeleton', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector(
      '[data-slot="skeleton"]',
    ) as HTMLElement;
    const host = fixture.nativeElement.querySelector(
      'andes-skeleton',
    ) as HTMLElement;
    return { fixture, bar, host };
  }

  it('defaults to the text shape', () => {
    const { bar } = createHost();

    expect(bar.classList).toContain('andes-skeleton--text');
    expect(bar.getAttribute('data-shape')).toBe('text');
  });

  it.each(['text', 'circular', 'rectangular'] as const)(
    'supports the %s shape',
    (shape) => {
      const { fixture, bar } = createHost();
      fixture.componentInstance.shape.set(shape);
      fixture.detectChanges();

      expect(bar.classList).toContain(`andes-skeleton--${shape}`);
      expect(bar.getAttribute('data-shape')).toBe(shape);
    },
  );

  it('always renders aria-hidden on the host, regardless of shape', () => {
    const { host } = createHost();

    expect(host.getAttribute('aria-hidden')).toBe('true');
  });

  it('does not set an inline width/height by default', () => {
    const { bar } = createHost();

    expect(bar.style.width).toBe('');
    expect(bar.style.height).toBe('');
  });

  it('applies a numeric width/height as pixels', () => {
    const { fixture, bar } = createHost();
    fixture.componentInstance.width.set(120);
    fixture.componentInstance.height.set(16);
    fixture.detectChanges();

    expect(bar.style.width).toBe('120px');
    expect(bar.style.height).toBe('16px');
  });

  it('applies a string width/height verbatim', () => {
    const { fixture, bar } = createHost();
    fixture.componentInstance.width.set('50%');
    fixture.componentInstance.height.set('3rem');
    fixture.detectChanges();

    expect(bar.style.width).toBe('50%');
    expect(bar.style.height).toBe('3rem');
  });

  it('is animated by default', () => {
    const { bar } = createHost();

    expect(bar.classList).not.toContain('andes-skeleton--static');
  });

  it('can disable the pulse animation', () => {
    const { fixture, bar } = createHost();
    fixture.componentInstance.animated.set(false);
    fixture.detectChanges();

    expect(bar.classList).toContain('andes-skeleton--static');
  });

  it('treats a bare animated attribute (no brackets) as true', () => {
    @Component({
      imports: [AndesSkeleton],
      template: `<andes-skeleton shape="circular" />`,
    })
    class BareAttrHost {}

    const fixture = TestBed.createComponent(BareAttrHost);
    fixture.detectChanges();
    const bar = fixture.nativeElement.querySelector('[data-slot="skeleton"]');

    expect(bar.classList).toContain('andes-skeleton--circular');
    expect(bar.classList).not.toContain('andes-skeleton--static');
  });
});
