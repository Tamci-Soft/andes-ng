import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import { AndesFloatButton } from './float-button';
import { AndesFloatButtonGroup } from './float-button-group';
import {
  AndesFloatButtonPlacement,
  AndesFloatButtonShape,
  AndesFloatButtonTrigger,
} from './float-button-types';

@Component({
  imports: [AndesFloatButtonGroup, AndesFloatButton],
  template: `<button id="outside">outside</button>
    <andes-float-button-group
      aria-label="Quick actions"
      [trigger]="trigger()"
      [placement]="placement()"
      [shape]="shape()"
      type="primary"
      [(open)]="open"
      [right]="right()"
    >
      <andes-float-button id="b1" aria-label="Chat" />
      <andes-float-button id="b2" aria-label="Help" size="lg" />
      <andes-float-button id="b3" aria-label="Docs" />
    </andes-float-button-group>`,
})
class HostComponent {
  readonly trigger = signal<AndesFloatButtonTrigger | undefined>('click');
  readonly placement = signal<AndesFloatButtonPlacement>('up');
  readonly shape = signal<AndesFloatButtonShape>('circle');
  readonly open = signal(false);
  readonly right = signal<string | number | undefined>(undefined);
}

function pointer(type: string, init: PointerEventInit = {}) {
  return new PointerEvent(type, {
    bubbles: true,
    pointerType: 'mouse',
    ...init,
  });
}

describe('AndesFloatButtonGroup', () => {
  function setup(trigger: AndesFloatButtonTrigger | 'none' = 'click') {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.trigger.set(
      trigger === 'none' ? undefined : trigger,
    );
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const group = root.querySelector('andes-float-button-group') as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      root,
      group,
      menu: () =>
        group.querySelector(
          '[data-slot="float-button-group-menu"]',
        ) as HTMLElement,
      trigger: () =>
        group.querySelector(
          '.andes-float-button-group__trigger button',
        ) as HTMLButtonElement,
    };
  }

  it('is a group and fixed to the viewport', () => {
    const { group } = setup();
    expect(group.getAttribute('role')).toBe('group');
    expect(group.hasAttribute('data-fixed')).toBe(true);
    expect(group.style.bottom).toContain('safe-area-inset-bottom');
  });

  it('keeps the grouped buttons out of fixed positioning and gives them the group look', () => {
    const { root } = setup();
    const b1 = root.querySelector('#b1') as HTMLElement;
    const b2 = root.querySelector('#b2') as HTMLElement;
    expect(b1.hasAttribute('data-fixed')).toBe(false);
    expect(b1.getAttribute('data-type')).toBe('primary');
    expect(b1.getAttribute('data-shape')).toBe('circle');
    expect(b2.getAttribute('data-size')).toBe('lg');
  });

  describe('click trigger', () => {
    it('starts closed with a labelled trigger wired to the menu', () => {
      const { group, menu, trigger } = setup();
      expect(trigger().getAttribute('aria-label')).toBe('Quick actions');
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
      expect(trigger().getAttribute('aria-controls')).toBe(menu().id);
      expect(menu().getAttribute('data-state')).toBe('closed');
      expect(menu().hasAttribute('inert')).toBe(true);
      expect(group.getAttribute('data-state')).toBe('closed');
    });

    it('opens and closes on trigger clicks and updates the open model', () => {
      const { fixture, host, menu, trigger } = setup();
      trigger().click();
      fixture.detectChanges();
      expect(host.open()).toBe(true);
      expect(trigger().getAttribute('aria-expanded')).toBe('true');
      expect(menu().getAttribute('data-state')).toBe('open');
      expect(menu().hasAttribute('inert')).toBe(false);

      trigger().click();
      fixture.detectChanges();
      expect(host.open()).toBe(false);
    });

    it('turns the default plus into the close cross instead of swapping it', () => {
      const { fixture, trigger } = setup();
      const glyph = () =>
        trigger().querySelector<SVGElement>('.andes-float-button-group__glyph');
      expect(glyph()).toBeTruthy();
      expect(
        glyph()?.classList.contains('andes-float-button-group__glyph--open'),
      ).toBe(false);
      trigger().click();
      fixture.detectChanges();
      expect(
        glyph()?.classList.contains('andes-float-button-group__glyph--open'),
      ).toBe(true);
    });

    it('closes with Escape and returns focus to the trigger', () => {
      const { fixture, host, root, group, trigger } = setup();
      trigger().click();
      fixture.detectChanges();
      (root.querySelector('#b1 button') as HTMLButtonElement).focus();

      group.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          bubbles: true,
          cancelable: true,
        }),
      );
      fixture.detectChanges();
      expect(host.open()).toBe(false);
      expect(document.activeElement).toBe(trigger());
    });

    it('closes when pressing outside, but not inside', () => {
      const { fixture, host, root, trigger } = setup();
      trigger().click();
      fixture.detectChanges();

      (root.querySelector('#b2') as HTMLElement).dispatchEvent(
        pointer('pointerdown'),
      );
      fixture.detectChanges();
      expect(host.open()).toBe(true);

      (root.querySelector('#outside') as HTMLElement).dispatchEvent(
        pointer('pointerdown'),
      );
      fixture.detectChanges();
      expect(host.open()).toBe(false);
    });

    it('reflects the open model set from outside', () => {
      const { fixture, host, menu } = setup();
      host.open.set(true);
      fixture.detectChanges();
      expect(menu().getAttribute('data-state')).toBe('open');
    });

    it('indexes the buttons for the staggered entrance', () => {
      const { root } = setup();
      const indexes = ['#b1', '#b2', '#b3'].map((s) =>
        (root.querySelector(s) as HTMLElement).style.getPropertyValue(
          '--andes-float-button-index',
        ),
      );
      expect(indexes).toEqual(['0', '1', '2']);
    });

    it('exposes the placement', () => {
      const { fixture, host, group } = setup();
      for (const placement of ['up', 'down', 'start', 'end'] as const) {
        host.placement.set(placement);
        fixture.detectChanges();
        expect(group.getAttribute('data-placement')).toBe(placement);
      }
    });
  });

  describe('hover trigger', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('opens on mouse hover and closes shortly after leaving', () => {
      vi.useFakeTimers();
      const { fixture, host, group } = setup('hover');
      group.dispatchEvent(pointer('pointerenter'));
      fixture.detectChanges();
      expect(host.open()).toBe(true);

      group.dispatchEvent(pointer('pointerleave'));
      vi.advanceTimersByTime(50);
      expect(host.open()).toBe(true);
      vi.advanceTimersByTime(100);
      fixture.detectChanges();
      expect(host.open()).toBe(false);
    });

    it('stays open when the pointer returns within the grace period', () => {
      vi.useFakeTimers();
      const { host, group } = setup('hover');
      group.dispatchEvent(pointer('pointerenter'));
      group.dispatchEvent(pointer('pointerleave'));
      vi.advanceTimersByTime(60);
      group.dispatchEvent(pointer('pointerenter'));
      vi.advanceTimersByTime(300);
      expect(host.open()).toBe(true);
    });

    it('does not close the menu when a mouse click follows the hover', () => {
      const { fixture, host, group, trigger } = setup('hover');
      group.dispatchEvent(pointer('pointerenter'));
      trigger().click();
      fixture.detectChanges();
      expect(host.open()).toBe(true);
    });

    it('toggles on touch taps, which have no hover', () => {
      const { fixture, host, group, trigger } = setup('hover');
      group.dispatchEvent(pointer('pointerenter', { pointerType: 'touch' }));
      expect(host.open()).toBe(false);
      trigger().click();
      fixture.detectChanges();
      expect(host.open()).toBe(true);
      trigger().click();
      fixture.detectChanges();
      expect(host.open()).toBe(false);
    });
  });

  describe('without a trigger', () => {
    it('shows every button with no trigger or menu', () => {
      const { group, root } = setup('none');
      expect(group.getAttribute('data-trigger')).toBe('none');
      expect(
        group.querySelector('[data-slot="float-button-group-menu"]'),
      ).toBeNull();
      expect(root.querySelectorAll('andes-float-button')).toHaveLength(3);
    });

    it('is labelled as a group', () => {
      const { group } = setup('none');
      expect(group.getAttribute('aria-label')).toBe('Quick actions');
    });

    it('supports the square shape', () => {
      const { fixture, host, group } = setup('none');
      host.shape.set('square');
      fixture.detectChanges();
      expect(group.getAttribute('data-shape')).toBe('square');
    });
  });
});

describe('float button group stylesheet contract', () => {
  const css = readFileSync(
    'packages/ui/src/lib/float-button/float-button-group.css',
    'utf8',
  );

  it('staggers the entrance by 35ms per button over 160ms, growing from 70%', () => {
    expect(css).toMatch(
      /opacity 160ms cubic-bezier\(0\.2, 0, 0, 1\)\s+calc\(var\(--andes-float-button-index, 0\) \* 35ms\)/,
    );
    expect(css).toContain('scale(0.7)');
  });

  it('turns the default plus into the close cross instead of swapping icons', () => {
    expect(css).toMatch(
      /\.andes-float-button-group__glyph--open\s*\{\s*transform: rotate\(135deg\)/,
    );
    expect(css).toContain('@keyframes andes-float-button-swap');
  });

  it('exits quicker than it enters, without bounce', () => {
    expect(css).toContain('opacity 110ms ease-in');
    expect(css).not.toMatch(/cubic-bezier\([^)]*(1\.\d|-\d)/);
  });

  it('opens the menu in every direction with logical offsets', () => {
    for (const placement of ['up', 'down', 'start', 'end']) {
      expect(css).toContain(
        `[data-placement='${placement}']) .andes-float-button-group__menu {`,
      );
    }
    expect(css).not.toMatch(/\bleft:|\bright:/);
  });

  it('mirrors the horizontal slide in right-to-left layouts', () => {
    expect(css).toContain(':dir(rtl)');
  });

  it('turns the transitions off under reduced motion', () => {
    const reduced = css.slice(css.indexOf('prefers-reduced-motion'));
    expect(reduced).toContain('transition: none');
    expect(reduced).toContain('transform: none');
  });
});
