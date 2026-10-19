import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesButtonGroup } from './button-group';
import {
  AndesButton,
  AndesButtonColor,
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
    [color]="color()"
    [danger]="danger()"
    [ripple]="ripple()"
    >Save</andes-button
  >`,
})
class HostComponent {
  readonly variant = signal<AndesButtonVariant>('primary');
  readonly size = signal<AndesButtonSize | undefined>('md');
  readonly shape = signal<AndesButtonShape>('default');
  readonly disabled = signal(false);
  readonly loading = signal(false);
  readonly loadingDelay = signal(0);
  readonly fullWidth = signal(false);
  readonly href = signal<string | undefined>(undefined);
  readonly target = signal<string | undefined>(undefined);
  readonly type = signal<AndesButtonType>('button');
  readonly ghost = signal(false);
  readonly color = signal<AndesButtonColor | undefined>(undefined);
  readonly danger = signal(false);
  readonly ripple = signal(true);
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

  it.each(['outline', 'dashed', 'ghost', 'link'] as const)(
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

  it('sizes the anchor border-box like the native button, so both share one outer height', () => {
    const { fixture } = createHost();
    fixture.componentInstance.href.set('https://andes-ng.dev');
    fixture.detectChanges();
    const anchor = fixture.nativeElement.querySelector('a');

    expect(getComputedStyle(anchor).boxSizing).toBe('border-box');
    expect(getComputedStyle(anchor).whiteSpace).toBe('nowrap');
  });

  it('removes href from the anchor when disabled', () => {
    const { fixture } = createHost();
    fixture.componentInstance.href.set('https://andes-ng.dev');
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    const anchor = fixture.nativeElement.querySelector('a');

    expect(anchor.hasAttribute('href')).toBe(false);
  });

  it('announces the disabled anchor via aria-disabled', () => {
    const { fixture } = createHost();
    fixture.componentInstance.href.set('https://andes-ng.dev');
    fixture.detectChanges();
    const anchor = fixture.nativeElement.querySelector('a');

    expect(anchor.hasAttribute('aria-disabled')).toBe(false);

    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();

    expect(anchor.getAttribute('aria-disabled')).toBe('true');
  });

  it('marks the anchor aria-busy and aria-disabled while loading', () => {
    const { fixture } = createHost();
    fixture.componentInstance.href.set('https://andes-ng.dev');
    fixture.detectChanges();
    const anchor = fixture.nativeElement.querySelector('a');

    expect(anchor.getAttribute('aria-busy')).toBeNull();

    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();

    expect(anchor.getAttribute('aria-busy')).toBe('true');
    expect(anchor.getAttribute('aria-disabled')).toBe('true');
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

  it('renders the default spinner when loading with no custom loadingIcon', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();

    expect(button.querySelector('.andes-button__spinner')).toBeTruthy();
  });

  it('renders a custom loadingIcon template instead of the default spinner', () => {
    @Component({
      imports: [AndesButton],
      template: `
        <ng-template #customLoader
          ><span class="my-loader">…</span></ng-template
        >
        <andes-button [loading]="true" [loadingIcon]="customLoader"
          >Save</andes-button
        >
      `,
    })
    class CustomLoaderHost {}

    const fixture = TestBed.createComponent(CustomLoaderHost);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');

    expect(button.querySelector('.my-loader')).toBeTruthy();
    expect(button.querySelector('.andes-button__spinner')).toBeFalsy();
  });

  describe('spinner sizing', () => {
    // jsdom does not resolve em/max() against a real font, so the contract is asserted on the
    // stylesheet text: the spinner must be the icon's 1em box, border included.
    const css = readFileSync(
      resolve(process.cwd(), 'packages/ui/src/lib/button/button.css'),
      'utf8',
    );
    const rule =
      (/\.andes-button__spinner\s*{([^}]*)}/.exec(css) ?? [])[1] ?? '';

    it('is a border-box 1em square that cannot shrink', () => {
      expect(rule).toMatch(/box-sizing:\s*border-box/);
      expect(rule).toMatch(/\bwidth:\s*1em/);
      expect(rule).toMatch(/\bheight:\s*1em/);
      expect(rule).toMatch(/flex-shrink:\s*0/);
    });

    it('scales its border with the type size instead of a fixed 2px', () => {
      expect(rule).toMatch(/border:\s*max\(1\.5px,\s*0\.12em\)\s+solid/);
    });

    it('replaces the projected icon of an icon-only button while loading', () => {
      @Component({
        imports: [AndesButton],
        template: `<andes-button
          size="icon"
          [loading]="loading()"
          aria-label="Search"
          ><svg class="projected-icon"></svg
        ></andes-button>`,
      })
      class IconOnlyHost {
        readonly loading = signal(false);
      }

      const fixture = TestBed.createComponent(IconOnlyHost);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button');

      expect(button.querySelector('.projected-icon')).toBeTruthy();

      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      expect(button.querySelector('.andes-button__spinner')).toBeTruthy();
      expect(button.querySelector('.projected-icon')).toBeFalsy();
    });

    it('keeps the label next to the spinner on a text button', () => {
      const { fixture, button } = createHost();
      fixture.componentInstance.loading.set(true);
      fixture.detectChanges();

      expect(button.textContent).toContain('Save');
    });
  });

  describe('press ripple', () => {
    const original = window.matchMedia;

    function stubReducedMotion(reduce: boolean): void {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: (query: string) => ({
          matches: reduce && query === '(prefers-reduced-motion: reduce)',
          media: query,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
        }),
      });
    }

    afterEach(() => {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: original,
      });
    });

    function press(): HTMLButtonElement {
      const { fixture, button } = createHost();
      (
        fixture.nativeElement.querySelector('andes-button') as HTMLElement
      ).dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
      return button;
    }

    it('adds a ripple on press', () => {
      stubReducedMotion(false);

      expect(press().querySelector('.andes-button__ripple')).toBeTruthy();
    });

    it('adds no ripple when the user prefers reduced motion', () => {
      stubReducedMotion(true);

      expect(press().querySelector('.andes-button__ripple')).toBeNull();
    });
  });

  it('falls back to the medium size when size is left unset', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.size.set(undefined);
    fixture.detectChanges();

    expect(button.classList).toContain('andes-button--md');
    expect(button.getAttribute('data-size')).toBe('md');
  });

  it('supports the filled variant', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.variant.set('filled');
    fixture.detectChanges();

    expect(button.classList).toContain('andes-button--filled');
  });

  it('tints the variant with the requested color', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.variant.set('outline');
    fixture.componentInstance.color.set('success');
    fixture.detectChanges();

    expect(button.classList).toContain('andes-button--colored');
    expect(button.classList).toContain('andes-button--color-success');
    expect(button.getAttribute('data-color')).toBe('success');
  });

  it('adds no color class or data-color when no color is set', () => {
    const { button } = createHost();

    expect(button.classList).not.toContain('andes-button--colored');
    expect(button.hasAttribute('data-color')).toBe(false);
  });

  it('treats danger as the danger color, winning over color', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.variant.set('ghost');
    fixture.componentInstance.color.set('info');
    fixture.componentInstance.danger.set(true);
    fixture.detectChanges();

    expect(button.classList).toContain('andes-button--color-danger');
    expect(button.classList).not.toContain('andes-button--color-info');
  });

  it('renders round as the pill shape', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.shape.set('round');
    fixture.detectChanges();

    expect(button.classList).toContain('andes-button--full');
  });

  it('applies the circle shape', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.shape.set('circle');
    fixture.detectChanges();

    expect(button.classList).toContain('andes-button--circle');
    expect(button.classList).not.toContain('andes-button--full');
  });

  it('adds a ripple on press by default', () => {
    const { button } = createHost();
    button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 4 }),
    );

    expect(button.querySelector('.andes-button__ripple')).toBeTruthy();
  });

  it('keeps the ripple a faint wash and the spinner at a calm pace', () => {
    const { fixture, button } = createHost();
    button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 4 }),
    );
    const ripple = button.querySelector('.andes-button__ripple') as HTMLElement;

    expect(getComputedStyle(ripple).opacity).toBe('0.1');

    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    const spinner = button.querySelector(
      '.andes-button__spinner',
    ) as HTMLElement;

    expect(getComputedStyle(spinner).animation).toContain(' 1s ');
  });

  it('skips the ripple when ripple is false', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.ripple.set(false);
    fixture.detectChanges();
    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));

    expect(button.querySelector('.andes-button__ripple')).toBeFalsy();
  });

  it('marks a disabled anchor aria-disabled', () => {
    const { fixture, button } = createHost();
    fixture.componentInstance.href.set('/orders');
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    const anchor = fixture.nativeElement.querySelector('a');

    expect(anchor.getAttribute('aria-disabled')).toBe('true');
    expect(button).toBeTruthy();
  });

  it('marks a loading anchor aria-busy', () => {
    const { fixture } = createHost();
    fixture.componentInstance.href.set('/orders');
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    const anchor = fixture.nativeElement.querySelector('a');

    expect(anchor.getAttribute('aria-busy')).toBe('true');
    expect(anchor.getAttribute('aria-disabled')).toBe('true');
  });

  describe('inside a button group', () => {
    @Component({
      imports: [AndesButton, AndesButtonGroup],
      template: `<andes-button-group
        [size]="groupSize()"
        [orientation]="orientation()"
        aria-label="Actions"
      >
        <andes-button>One</andes-button>
        <andes-button size="lg">Two</andes-button>
      </andes-button-group>`,
    })
    class GroupHost {
      readonly groupSize = signal<AndesButtonSize | undefined>('sm');
      readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
    }

    function createGroup() {
      const fixture = TestBed.createComponent(GroupHost);
      fixture.detectChanges();
      const group = fixture.nativeElement.querySelector(
        'andes-button-group',
      ) as HTMLElement;
      const buttons = Array.from(
        group.querySelectorAll('button'),
      ) as HTMLButtonElement[];
      return { fixture, group, buttons };
    }

    it('exposes the group role and its orientation', () => {
      const { fixture, group } = createGroup();

      expect(group.getAttribute('role')).toBe('group');
      expect(group.classList).toContain('andes-button-group--horizontal');

      fixture.componentInstance.orientation.set('vertical');
      fixture.detectChanges();

      expect(group.classList).toContain('andes-button-group--vertical');
      expect(group.getAttribute('data-orientation')).toBe('vertical');
    });

    it('gives its size to buttons without their own', () => {
      const { buttons } = createGroup();

      expect(buttons[0].classList).toContain('andes-button--sm');
      expect(buttons[1].classList).toContain('andes-button--lg');
    });

    it('lets buttons fall back to medium when the group has no size', () => {
      const { fixture, buttons } = createGroup();
      fixture.componentInstance.groupSize.set(undefined);
      fixture.detectChanges();

      expect(buttons[0].classList).toContain('andes-button--md');
    });
  });
});
