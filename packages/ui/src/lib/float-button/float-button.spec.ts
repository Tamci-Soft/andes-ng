import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import { AndesFloatButton } from './float-button';
import { andesFloatInsets } from './float-button-types';

@Component({
  imports: [AndesFloatButton],
  template: `<andes-float-button
    aria-label="Help"
    [type]="type()"
    [shape]="shape()"
    [size]="size()"
    [disabled]="disabled()"
    [description]="description()"
    [tooltip]="tooltip()"
    [href]="href()"
    [target]="target()"
    [badgeCount]="badgeCount()"
    [badgeDot]="badgeDot()"
    [fixed]="fixed()"
    [right]="right()"
    [bottom]="bottom()"
    [left]="left()"
    [top]="top()"
    ><svg id="icon"></svg
  ></andes-float-button>`,
})
class HostComponent {
  readonly type = signal<'default' | 'primary' | undefined>(undefined);
  readonly shape = signal<'circle' | 'square' | undefined>(undefined);
  readonly size = signal<'sm' | 'md' | 'lg' | undefined>(undefined);
  readonly disabled = signal(false);
  readonly description = signal<string | undefined>(undefined);
  readonly tooltip = signal<string | undefined>(undefined);
  readonly href = signal<string | undefined>(undefined);
  readonly target = signal<string | undefined>(undefined);
  readonly badgeCount = signal<number | string | undefined>(undefined);
  readonly badgeDot = signal(false);
  readonly fixed = signal(true);
  readonly right = signal<string | number | undefined>(undefined);
  readonly bottom = signal<string | number | undefined>(undefined);
  readonly left = signal<string | number | undefined>(undefined);
  readonly top = signal<string | number | undefined>(undefined);
}

describe('andesFloatInsets', () => {
  it('defaults to the inline end / bottom with safe-area insets', () => {
    expect(andesFloatInsets({})).toEqual({
      insetInlineEnd: 'calc(1.5rem + env(safe-area-inset-right, 0px))',
      insetInlineStart: null,
      top: null,
      bottom: 'calc(3rem + env(safe-area-inset-bottom, 0px))',
    });
  });

  it('accepts numbers as pixels and CSS lengths', () => {
    const insets = andesFloatInsets({ right: 16, bottom: 'max(1rem, 5vh)' });
    expect(insets.insetInlineEnd).toBe(
      'calc(16px + env(safe-area-inset-right, 0px))',
    );
    expect(insets.bottom).toBe(
      'calc(max(1rem, 5vh) + env(safe-area-inset-bottom, 0px))',
    );
  });

  it('anchors to the start / top edge when only those are given', () => {
    const insets = andesFloatInsets({ left: 8, top: 12 });
    expect(insets.insetInlineEnd).toBeNull();
    expect(insets.insetInlineStart).toBe(
      'calc(8px + env(safe-area-inset-left, 0px))',
    );
    expect(insets.bottom).toBeNull();
    expect(insets.top).toBe('calc(12px + env(safe-area-inset-top, 0px))');
  });
});

describe('AndesFloatButton', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      el: root.querySelector('andes-float-button') as HTMLElement,
      control: () =>
        root.querySelector('[data-slot="float-button-control"]') as HTMLElement,
    };
  }

  it('renders a button with the label on the inner control', () => {
    const { control, el } = setup();
    expect(control().tagName).toBe('BUTTON');
    expect(control().getAttribute('type')).toBe('button');
    expect(control().getAttribute('aria-label')).toBe('Help');
    expect(el.hasAttribute('aria-label')).toBe(false);
    expect(control().querySelector('#icon')).not.toBeNull();
  });

  it('defaults to a default-type md circle fixed to the viewport', () => {
    const { el } = setup();
    expect(el.getAttribute('data-type')).toBe('default');
    expect(el.getAttribute('data-shape')).toBe('circle');
    expect(el.getAttribute('data-size')).toBe('md');
    expect(el.hasAttribute('data-fixed')).toBe(true);
    expect(el.style.insetInlineEnd).toContain('1.5rem');
    expect(el.style.bottom).toContain('3rem');
  });

  it('applies type, shape and size', () => {
    const { fixture, host, el } = setup();
    host.type.set('primary');
    host.shape.set('square');
    host.size.set('lg');
    fixture.detectChanges();
    expect(el.getAttribute('data-type')).toBe('primary');
    expect(el.getAttribute('data-shape')).toBe('square');
    expect(el.getAttribute('data-size')).toBe('lg');
  });

  it('positions from right and bottom with safe-area insets', () => {
    const { fixture, host, el } = setup();
    host.right.set(16);
    host.bottom.set('2rem');
    fixture.detectChanges();
    expect(el.style.insetInlineEnd).toContain('16px');
    expect(el.style.insetInlineEnd).toContain('safe-area-inset-right');
    expect(el.style.bottom).toContain('2rem');
    expect(el.style.bottom).toContain('safe-area-inset-bottom');
  });

  it('is laid out in the flow when fixed is false', () => {
    const { fixture, host, el } = setup();
    host.fixed.set(false);
    fixture.detectChanges();
    expect(el.hasAttribute('data-fixed')).toBe(false);
    expect(el.style.bottom).toBe('');
  });

  it('shows a description caption', () => {
    const { fixture, host, el, control } = setup();
    host.description.set('Help');
    fixture.detectChanges();
    expect(
      control().querySelector('.andes-float-button__description')?.textContent,
    ).toBe('Help');
    expect(el.hasAttribute('data-description')).toBe(true);
  });

  it('sets a native tooltip', () => {
    const { fixture, host, control } = setup();
    host.tooltip.set('Get help');
    fixture.detectChanges();
    expect(control().getAttribute('title')).toBe('Get help');
  });

  it('renders an anchor with href and a safe rel for new tabs', () => {
    const { fixture, host, control } = setup();
    host.href.set('https://example.com/help');
    host.target.set('_blank');
    fixture.detectChanges();
    expect(control().tagName).toBe('A');
    expect(control().getAttribute('href')).toBe('https://example.com/help');
    expect(control().getAttribute('target')).toBe('_blank');
    expect(control().getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('disables the button and the anchor', () => {
    const { fixture, host, control } = setup();
    host.disabled.set(true);
    fixture.detectChanges();
    expect((control() as HTMLButtonElement).disabled).toBe(true);

    host.href.set('/x');
    fixture.detectChanges();
    expect(control().hasAttribute('href')).toBe(false);
    expect(control().getAttribute('aria-disabled')).toBe('true');
    expect(control().getAttribute('tabindex')).toBe('-1');
  });

  describe('badge', () => {
    it('shows a count', () => {
      const { fixture, host, control } = setup();
      host.badgeCount.set(7);
      fixture.detectChanges();
      expect(
        control().querySelector('[data-slot="float-button-badge"]')
          ?.textContent,
      ).toBe('7');
    });

    it('caps the count at the overflow limit', () => {
      const { fixture, host, control } = setup();
      host.badgeCount.set(250);
      fixture.detectChanges();
      expect(
        control().querySelector('[data-slot="float-button-badge"]')
          ?.textContent,
      ).toBe('99+');
    });

    it('hides a zero count', () => {
      const { fixture, host, control } = setup();
      host.badgeCount.set(0);
      fixture.detectChanges();
      expect(control().querySelector('.andes-float-button__badge')).toBeNull();
    });

    it('shows a decorative dot that wins over the count', () => {
      const { fixture, host, control } = setup();
      host.badgeCount.set(3);
      host.badgeDot.set(true);
      fixture.detectChanges();
      const badge = control().querySelector(
        '.andes-float-button__badge',
      ) as HTMLElement;
      expect(badge.hasAttribute('data-dot')).toBe(true);
      expect(badge.getAttribute('aria-hidden')).toBe('true');
      expect(badge.textContent?.trim()).toBe('');
    });
  });
});

describe('float button stylesheet contract', () => {
  const css = readFileSync(
    'packages/ui/src/lib/float-button/float-button.css',
    'utf8',
  );

  it('sizes the button 32 / 40 / 48px', () => {
    expect(css).toContain('--_size: 2.5rem');
    expect(css).toMatch(/data-size='sm'\]\)\s*\{[^}]*--_size: 2rem/);
    expect(css).toMatch(/data-size='lg'\]\)\s*\{[^}]*--_size: 3rem/);
  });

  it('is built from tokens and keeps a visible focus ring', () => {
    expect(css).toContain('--andes-color-primary');
    expect(css).toContain('--andes-color-background');
    expect(css).toContain('--andes-shadow-md');
    expect(css).toContain('.andes-float-button__control:focus-visible');
    expect(css).toContain('outline: 2px solid var(--_ring)');
  });

  it('fixes the button above the page content', () => {
    expect(css).toMatch(/\[data-fixed\]\)\s*\{\s*position: fixed/);
  });

  it('uses logical properties for the badge corner', () => {
    expect(css).toContain('inset-inline-end: -0.25rem');
    expect(css).not.toMatch(/\bright:|\bleft:/);
  });

  it('lifts on hover and sinks on press', () => {
    expect(css).toMatch(
      /:hover:not\(:disabled\)[^{]*\{[^}]*translateY\(-2px\)/,
    );
    expect(css).toMatch(/:active:not\(:disabled\)[^{]*\{[^}]*scale\(0\.94\)/);
    expect(css).toContain('transform 150ms cubic-bezier(0.2, 0, 0, 1)');
  });

  it('pops the badge in without overshoot', () => {
    expect(css).toContain('@keyframes andes-float-button-badge-in');
    expect(css).not.toMatch(/cubic-bezier\([^)]*(1\.\d|-\d)/);
  });

  it('drops transitions, lifts and the badge pop under reduced motion', () => {
    const reduced = css.slice(css.indexOf('prefers-reduced-motion'));
    expect(reduced).toContain('transition: none');
    expect(reduced).toContain('transform: none');
    expect(reduced).toContain('animation: none');
  });
});
