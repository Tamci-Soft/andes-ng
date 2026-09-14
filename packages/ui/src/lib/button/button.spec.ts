import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesButton,
  AndesButtonShape,
  AndesButtonSize,
  AndesButtonVariant,
} from './button';

@Component({
  imports: [AndesButton],
  template: `<andes-button
    [variant]="variant()"
    [size]="size()"
    [shape]="shape()"
    [disabled]="disabled()"
    [loading]="loading()"
    >Save</andes-button
  >`,
})
class HostComponent {
  readonly variant = signal<AndesButtonVariant>('primary');
  readonly size = signal<AndesButtonSize>('md');
  readonly shape = signal<AndesButtonShape>('default');
  readonly disabled = signal(false);
  readonly loading = signal(false);
}

describe('AndesButton', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'button',
    ) as HTMLButtonElement;
    return { fixture, button };
  }

  it('renders a native button with the projected content', () => {
    const { button } = createHost();

    expect(button).toBeTruthy();
    expect(button.textContent?.trim()).toBe('Save');
  });

  it('defaults to the primary variant and medium size', () => {
    const { button } = createHost();

    expect(button.classList).toContain('andes-button--primary');
    expect(button.classList).toContain('andes-button--md');
  });

  it('applies the requested variant and size', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.variant.set('danger');
    fixture.componentInstance.size.set('lg');
    fixture.detectChanges();

    expect(button.classList).toContain('andes-button--danger');
    expect(button.classList).toContain('andes-button--lg');
  });

  it.each(['outline', 'ghost', 'link'] as const)(
    'supports the %s variant',
    (variant) => {
      const { fixture, button } = createHost();
      fixture.componentInstance.variant.set(variant);
      fixture.detectChanges();

      expect(button.classList).toContain(`andes-button--${variant}`);
    },
  );

  it('supports the icon size', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.size.set('icon');
    fixture.detectChanges();

    expect(button.classList).toContain('andes-button--icon');
  });

  it('applies a pill shape', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.shape.set('full');
    fixture.detectChanges();

    expect(button.classList).toContain('andes-button--full');
  });

  it('reflects disabled state on the native button', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(button.disabled).toBe(true);
  });

  it('disables interaction and marks aria-busy while loading', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();

    expect(button.disabled).toBe(true);
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('.andes-button__spinner')).toBeTruthy();
  });

  it('does not render a spinner or aria-busy when not loading', () => {
    const { button } = createHost();

    expect(button.getAttribute('aria-busy')).toBeNull();
    expect(button.querySelector('.andes-button__spinner')).toBeFalsy();
  });
});
