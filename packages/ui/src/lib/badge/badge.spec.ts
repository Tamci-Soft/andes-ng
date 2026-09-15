import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesBadge, AndesBadgeSize, AndesBadgeVariant } from './badge';

@Component({
  imports: [AndesBadge],
  template: `<andes-badge
    [count]="count()"
    [max]="max()"
    [dot]="dot()"
    [showZero]="showZero()"
    [variant]="variant()"
    [size]="size()"
    [processing]="processing()"
    [offset]="offset()"
    [title]="title()"
    [standalone]="standalone()"
    ><span class="anchor">Bell</span
    ><span slot="label">Active</span></andes-badge
  >`,
})
class HostComponent {
  readonly count = signal<number | undefined>(undefined);
  readonly max = signal(99);
  readonly dot = signal(false);
  readonly showZero = signal(false);
  readonly variant = signal<AndesBadgeVariant>('danger');
  readonly size = signal<AndesBadgeSize>('default');
  readonly processing = signal(false);
  readonly offset = signal<[number, number] | undefined>(undefined);
  readonly title = signal<string | undefined>(undefined);
  readonly standalone = signal(false);
}

describe('AndesBadge', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector(
      '.andes-badge',
    ) as HTMLElement | null;
    return { fixture, badge };
  }

  it('projects the wrapped element', () => {
    const { fixture } = createHost();

    expect(
      fixture.nativeElement.querySelector('.anchor').textContent.trim(),
    ).toBe('Bell');
  });

  it('renders nothing when count is undefined and dot is false', () => {
    const { badge } = createHost();

    expect(badge).toBeFalsy();
  });

  it('renders the numeric count', () => {
    const { fixture, badge } = createHost();
    fixture.componentInstance.count.set(5);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.andes-badge')?.textContent.trim(),
    ).toBe('5');
    expect(badge).toBeDefined();
  });

  it('hides the badge when count is 0 and showZero is false', () => {
    const { fixture } = createHost();
    fixture.componentInstance.count.set(0);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.andes-badge')).toBeFalsy();
  });

  it('shows a zero count when showZero is true', () => {
    const { fixture } = createHost();
    fixture.componentInstance.count.set(0);
    fixture.componentInstance.showZero.set(true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.andes-badge')?.textContent.trim(),
    ).toBe('0');
  });

  it('caps the display value at max with a trailing +', () => {
    const { fixture } = createHost();
    fixture.componentInstance.count.set(150);
    fixture.componentInstance.max.set(99);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.andes-badge')?.textContent.trim(),
    ).toBe('99+');
  });

  it('renders a dot with no numeric content regardless of count', () => {
    const { fixture } = createHost();
    fixture.componentInstance.dot.set(true);
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.andes-badge');

    expect(badge).toBeTruthy();
    expect(badge.classList).toContain('andes-badge--dot');
    expect(badge.textContent.trim()).toBe('');
  });

  it.each([
    'primary',
    'secondary',
    'danger',
    'success',
    'warning',
    'info',
  ] as const)('supports the %s variant', (variant) => {
    const { fixture } = createHost();
    fixture.componentInstance.count.set(1);
    fixture.componentInstance.variant.set(variant);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.andes-badge').classList,
    ).toContain(`andes-badge--${variant}`);
  });

  it('renders as a standalone status indicator with a projected label', () => {
    const { fixture } = createHost();
    fixture.componentInstance.standalone.set(true);
    fixture.componentInstance.dot.set(true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.andes-badge-wrapper--standalone'),
    ).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.anchor')).toBeFalsy();
    expect(fixture.nativeElement.textContent.replace(/\s+/g, ' ').trim()).toBe(
      'Active',
    );
  });

  it('sets the provided aria-label on the badge element', () => {
    @Component({
      imports: [AndesBadge],
      template: `<andes-badge [count]="3" aria-label="3 unread messages"
        ><span>Bell</span></andes-badge
      >`,
    })
    class AriaHost {}

    const fixture = TestBed.createComponent(AriaHost);
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.andes-badge');

    expect(badge.getAttribute('aria-label')).toBe('3 unread messages');
  });

  it('treats bare boolean attributes (no brackets) as true, not the string ""', () => {
    @Component({
      imports: [AndesBadge],
      template: `<andes-badge dot showZero><span>Bell</span></andes-badge>`,
    })
    class BareAttrHost {}

    const fixture = TestBed.createComponent(BareAttrHost);
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.andes-badge');

    expect(badge).toBeTruthy();
    expect(badge.classList).toContain('andes-badge--dot');
  });

  it('applies the small size class', () => {
    const { fixture } = createHost();
    fixture.componentInstance.count.set(1);
    fixture.componentInstance.size.set('small');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.andes-badge').classList,
    ).toContain('andes-badge--small');
  });

  it('renders a pulsing ping element when processing', () => {
    const { fixture } = createHost();
    fixture.componentInstance.dot.set(true);
    fixture.componentInstance.processing.set(true);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.andes-badge__ping'),
    ).toBeTruthy();
  });

  it('does not render a ping element by default', () => {
    const { fixture } = createHost();
    fixture.componentInstance.count.set(1);
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.andes-badge__ping'),
    ).toBeFalsy();
  });

  it('applies the offset as CSS custom properties', () => {
    const { fixture } = createHost();
    fixture.componentInstance.count.set(1);
    fixture.componentInstance.offset.set([4, -6]);
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector(
      '.andes-badge',
    ) as HTMLElement;

    expect(badge.style.getPropertyValue('--andes-badge-offset-x')).toBe('4px');
    expect(badge.style.getPropertyValue('--andes-badge-offset-y')).toBe('-6px');
  });

  it('sets a native title tooltip on the indicator', () => {
    const { fixture } = createHost();
    fixture.componentInstance.count.set(1);
    fixture.componentInstance.title.set('3 unread messages');
    fixture.detectChanges();

    expect(
      fixture.nativeElement.querySelector('.andes-badge').getAttribute('title'),
    ).toBe('3 unread messages');
  });
});
