import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesTag, AndesTagColor, AndesTagVariant } from './tag';

@Component({
  imports: [AndesTag],
  template: `<andes-tag
    [color]="color()"
    [variant]="variant()"
    [disabled]="disabled()"
    [closable]="closable()"
    [href]="href()"
    [target]="target()"
    [checkable]="checkable()"
    [checked]="checked()"
    [clickable]="clickable()"
    (closed)="onClosed()"
    (checkedChange)="onCheckedChange($event)"
    (tagClick)="onTagClick()"
    >Beta</andes-tag
  >`,
})
class HostComponent {
  readonly color = signal<AndesTagColor>('default');
  readonly variant = signal<AndesTagVariant>('outlined');
  readonly disabled = signal(false);
  readonly closable = signal(false);
  readonly href = signal<string | undefined>(undefined);
  readonly target = signal<string | undefined>(undefined);
  readonly checkable = signal(false);
  readonly checked = signal(false);
  readonly clickable = signal(false);

  closedCount = 0;
  lastChecked: boolean | undefined;
  clickCount = 0;

  onClosed(): void {
    this.closedCount++;
  }

  onCheckedChange(value: boolean): void {
    this.lastChecked = value;
  }

  onTagClick(): void {
    this.clickCount++;
  }
}

describe('AndesTag', () => {
  function queryTag(fixture: ReturnType<typeof TestBed.createComponent>) {
    return fixture.nativeElement.querySelector(
      '[data-slot="tag"]',
    ) as HTMLElement;
  }

  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return { fixture, tag: queryTag(fixture) };
  }

  it('renders a static span with the projected label, default color and outlined variant', () => {
    const { tag } = createHost();

    expect(tag.tagName).toBe('SPAN');
    expect(tag.textContent?.trim()).toBe('Beta');
    expect(tag.classList).toContain('andes-tag--color-default');
    expect(tag.classList).toContain('andes-tag--outlined');
  });

  it.each([
    'default',
    'primary',
    'secondary',
    'success',
    'warning',
    'danger',
    'info',
  ] as const)('supports the %s color', (color) => {
    const { fixture, tag } = createHost();
    fixture.componentInstance.color.set(color);
    fixture.detectChanges();

    expect(tag.classList).toContain(`andes-tag--color-${color}`);
  });

  it.each(['outlined', 'filled', 'solid'] as const)(
    'supports the %s variant',
    (variant) => {
      const { fixture, tag } = createHost();
      fixture.componentInstance.variant.set(variant);
      fixture.detectChanges();

      expect(tag.classList).toContain(`andes-tag--${variant}`);
    },
  );

  it('renders a close button when closable and emits closed on click', () => {
    const { fixture } = createHost();
    fixture.componentInstance.closable.set(true);
    fixture.detectChanges();
    const closeButton = fixture.nativeElement.querySelector(
      '.andes-tag__close',
    ) as HTMLButtonElement;

    expect(closeButton).toBeTruthy();
    closeButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closedCount).toBe(1);
  });

  it('does not render a close button by default', () => {
    const { fixture } = createHost();

    expect(
      fixture.nativeElement.querySelector('.andes-tag__close'),
    ).toBeFalsy();
  });

  it('does not emit closed when disabled', () => {
    const { fixture } = createHost();
    fixture.componentInstance.closable.set(true);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    const closeButton = fixture.nativeElement.querySelector(
      '.andes-tag__close',
    ) as HTMLButtonElement;

    expect(closeButton.disabled).toBe(true);
    closeButton.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.closedCount).toBe(0);
  });

  it('renders as an anchor when href is set', () => {
    const { fixture } = createHost();
    fixture.componentInstance.href.set('https://andes-ng.dev');
    fixture.componentInstance.target.set('_blank');
    fixture.detectChanges();
    const tag = queryTag(fixture) as HTMLAnchorElement;

    expect(tag.tagName).toBe('A');
    expect(tag.getAttribute('href')).toBe('https://andes-ng.dev');
    expect(tag.getAttribute('target')).toBe('_blank');

    tag.dispatchEvent(new MouseEvent('click', { cancelable: true }));
    fixture.detectChanges();

    expect(fixture.componentInstance.clickCount).toBe(1);
  });

  it('removes href from the anchor when disabled', () => {
    const { fixture } = createHost();
    fixture.componentInstance.href.set('https://andes-ng.dev');
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture);

    expect(tag.hasAttribute('href')).toBe(false);
  });

  it('closable wins over href - renders a plain span with a close button', () => {
    const { fixture } = createHost();
    fixture.componentInstance.href.set('https://andes-ng.dev');
    fixture.componentInstance.closable.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture);

    expect(tag.tagName).toBe('SPAN');
    expect(
      fixture.nativeElement.querySelector('.andes-tag__close'),
    ).toBeTruthy();
  });

  it('renders as a native button when checkable, ignoring color/variant', () => {
    const { fixture } = createHost();
    fixture.componentInstance.checkable.set(true);
    fixture.componentInstance.color.set('danger');
    fixture.detectChanges();
    const tag = queryTag(fixture);

    expect(tag.tagName).toBe('BUTTON');
    expect(tag.getAttribute('aria-pressed')).toBe('false');
    expect(tag.classList).toContain('andes-tag--checkable');
    expect(tag.classList).not.toContain('andes-tag--color-danger');
  });

  it('toggles checked state and emits checkedChange on click', () => {
    const { fixture } = createHost();
    fixture.componentInstance.checkable.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture) as HTMLButtonElement;

    tag.click();
    fixture.detectChanges();

    expect(tag.getAttribute('aria-pressed')).toBe('true');
    expect(tag.classList).toContain('andes-tag--checked');
    expect(fixture.componentInstance.lastChecked).toBe(true);

    tag.click();
    fixture.detectChanges();

    expect(tag.getAttribute('aria-pressed')).toBe('false');
    expect(fixture.componentInstance.lastChecked).toBe(false);
  });

  it('respects an initial checked input', () => {
    const { fixture } = createHost();
    fixture.componentInstance.checkable.set(true);
    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture);

    expect(tag.getAttribute('aria-pressed')).toBe('true');
    expect(tag.classList).toContain('andes-tag--checked');
  });

  it('renders as a native button when clickable and emits tagClick without aria-pressed', () => {
    const { fixture } = createHost();
    fixture.componentInstance.clickable.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture) as HTMLButtonElement;

    expect(tag.tagName).toBe('BUTTON');
    expect(tag.hasAttribute('aria-pressed')).toBe(false);

    tag.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.clickCount).toBe(1);
  });

  it('does not toggle or click when the interactive tag is disabled', () => {
    const { fixture } = createHost();
    fixture.componentInstance.checkable.set(true);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture) as HTMLButtonElement;

    expect(tag.disabled).toBe(true);
    tag.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.lastChecked).toBeUndefined();
  });

  it('falls back to a plain span with a close button when both closable and checkable are set', () => {
    const { fixture } = createHost();
    fixture.componentInstance.closable.set(true);
    fixture.componentInstance.checkable.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture);

    expect(tag.tagName).toBe('SPAN');
    expect(
      fixture.nativeElement.querySelector('.andes-tag__close'),
    ).toBeTruthy();
  });

  it('reflects disabled with the andes-tag--disabled class and native disabled attribute', () => {
    const { fixture } = createHost();
    fixture.componentInstance.checkable.set(true);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    const tag = queryTag(fixture) as HTMLButtonElement;

    expect(tag.classList).toContain('andes-tag--disabled');
    expect(tag.disabled).toBe(true);
  });

  it('treats bare boolean attributes (no brackets) as true, not the string ""', () => {
    @Component({
      imports: [AndesTag],
      template: `<andes-tag closable disabled>Beta</andes-tag>`,
    })
    class BareAttrHost {}

    const fixture = TestBed.createComponent(BareAttrHost);
    fixture.detectChanges();
    const closeButton = fixture.nativeElement.querySelector(
      '.andes-tag__close',
    ) as HTMLButtonElement;

    expect(closeButton).toBeTruthy();
    expect(closeButton.disabled).toBe(true);
  });
});
