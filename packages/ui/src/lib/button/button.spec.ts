import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesButton,
  AndesButtonShape,
  AndesButtonSize,
  AndesButtonType,
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
    [loadingDelay]="loadingDelay()"
    [fullWidth]="fullWidth()"
    [href]="href()"
    [target]="target()"
    [type]="type()"
    [ghost]="ghost()"
    >Save</andes-button
  >`,
})
class HostComponent {
  readonly variant = signal<AndesButtonVariant>('primary');
  readonly size = signal<AndesButtonSize>('md');
  readonly shape = signal<AndesButtonShape>('default');
  readonly disabled = signal(false);
  readonly loading = signal(false);
  readonly loadingDelay = signal(0);
  readonly fullWidth = signal(false);
  readonly href = signal<string | undefined>(undefined);
  readonly target = signal<string | undefined>(undefined);
  readonly type = signal<AndesButtonType>('button');
  readonly ghost = signal(false);
}

describe('AndesButton', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      'button, a',
    ) as HTMLButtonElement & HTMLAnchorElement;
    return { fixture, button };
  }

  it('renders a native button with the projected content', () => {
    const { button } = createHost();

    expect(button.tagName).toBe('BUTTON');
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

  it.each(['xs', 'icon-xs', 'icon-sm', 'icon', 'icon-lg'] as const)(
    'supports the %s size',
    (size) => {
      const { fixture, button } = createHost();
      fixture.componentInstance.size.set(size);
      fixture.detectChanges();

      expect(button.classList).toContain(`andes-button--${size}`);
    },
  );

  it('reflects data-slot, data-variant and data-size', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.variant.set('danger');
    fixture.componentInstance.size.set('lg');
    fixture.detectChanges();

    expect(button.getAttribute('data-slot')).toBe('button');
    expect(button.getAttribute('data-variant')).toBe('danger');
    expect(button.getAttribute('data-size')).toBe('lg');
  });

  it('applies a pill shape', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.shape.set('full');
    fixture.detectChanges();

    expect(button.classList).toContain('andes-button--full');
  });

  it('applies full width', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.fullWidth.set(true);
    fixture.detectChanges();

    expect(button.classList).toContain('andes-button--full-width');
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

  it('delays the visible loading state until loadingDelay elapses', () => {
    vi.useFakeTimers();
    try {
      const { fixture, button } = createHost();
      fixture.componentInstance.loadingDelay.set(200);
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      expect(button.disabled).toBe(false);
      expect(button.querySelector('.andes-button__spinner')).toBeFalsy();

      vi.advanceTimersByTime(200);
      fixture.detectChanges();

      expect(button.disabled).toBe(true);
      expect(button.querySelector('.andes-button__spinner')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('skips the delay entirely if loading clears first', () => {
    vi.useFakeTimers();
    try {
      const { fixture, button } = createHost();
      fixture.componentInstance.loadingDelay.set(200);
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();
      fixture.componentInstance.loading.set(false);
      fixture.detectChanges();

      vi.advanceTimersByTime(200);
      fixture.detectChanges();

      expect(button.disabled).toBe(false);
      expect(button.querySelector('.andes-button__spinner')).toBeFalsy();
    } finally {
      vi.useRealTimers();
    }
  });

  it('renders as an anchor when href is set', () => {
    const { fixture } = createHost();
    fixture.componentInstance.href.set('https://andes-ng.dev');
    fixture.detectChanges();
    const anchor = fixture.nativeElement.querySelector('a');

    expect(anchor.tagName).toBe('A');
    expect(anchor.getAttribute('href')).toBe('https://andes-ng.dev');
  });

  it('removes href from the anchor when disabled', () => {
    const { fixture } = createHost();
    fixture.componentInstance.href.set('https://andes-ng.dev');
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    const anchor = fixture.nativeElement.querySelector('a');

    expect(anchor.hasAttribute('href')).toBe(false);
  });

  it('projects icon-start and icon-end content', () => {
    @Component({
      imports: [AndesButton],
      template: `<andes-button
        ><span slot="icon-start">←</span>Back</andes-button
      >`,
    })
    class IconHost {}

    const fixture = TestBed.createComponent(IconHost);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent.trim()).toBe('←Back');
  });

  it('forwards aria-label, aria-invalid etc. to the real button, not the host', () => {
    @Component({
      imports: [AndesButton],
      template: `<andes-button aria-label="Add item" aria-invalid="true"
        >+</andes-button
      >`,
    })
    class AriaHost {}

    const fixture = TestBed.createComponent(AriaHost);
    fixture.detectChanges();
    const host = fixture.nativeElement.querySelector('andes-button');
    const button = fixture.nativeElement.querySelector('button');

    expect(button.getAttribute('aria-label')).toBe('Add item');
    expect(button.getAttribute('aria-invalid')).toBe('true');
    expect(button.classList).toContain('andes-button--invalid');
    expect(host.hasAttribute('aria-label')).toBe(false);
    expect(host.hasAttribute('aria-invalid')).toBe(false);
  });

  it('defaults to type="button", never the native submit default', () => {
    const { button } = createHost();

    expect(button.getAttribute('type')).toBe('button');
  });

  it('sets the native button type when requested', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.type.set('submit');
    fixture.detectChanges();

    expect(button.getAttribute('type')).toBe('submit');
  });

  it('does not set a type attribute on the anchor', () => {
    const { fixture } = createHost();
    fixture.componentInstance.href.set('https://andes-ng.dev');
    fixture.detectChanges();
    const anchor = fixture.nativeElement.querySelector('a');

    expect(anchor.hasAttribute('type')).toBe(false);
  });

  it('sets target on the anchor when href is set', () => {
    const { fixture } = createHost();
    fixture.componentInstance.href.set('https://andes-ng.dev');
    fixture.componentInstance.target.set('_blank');
    fixture.detectChanges();
    const anchor = fixture.nativeElement.querySelector('a');

    expect(anchor.getAttribute('target')).toBe('_blank');
  });

  it('applies ghost mode as a class distinct from the ghost variant', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.ghost.set(true);
    fixture.detectChanges();

    expect(button.classList).toContain('andes-button--ghost-mode');
    expect(button.classList).toContain('andes-button--primary');
  });

  it('treats bare boolean attributes (no brackets) as true, not the string ""', () => {
    @Component({
      imports: [AndesButton],
      template: `<andes-button disabled loading ghost fullWidth
        >Save</andes-button
      >`,
    })
    class BareAttrHost {}

    const fixture = TestBed.createComponent(BareAttrHost);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');

    expect(button.disabled).toBe(true);
    expect(button.classList).toContain('andes-button--ghost-mode');
    expect(button.classList).toContain('andes-button--full-width');
  });
});
