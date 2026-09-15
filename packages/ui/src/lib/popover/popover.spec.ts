import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesPopoverContent } from './popover-content';
import { AndesPopoverTrigger } from './popover-trigger';
import { AndesPopover } from './popover';
import type { AndesOverlayAlign, AndesOverlaySide } from '@andes-ng/primitives';

/**
 * jsdom reports zero geometry for every element, which makes CDK's
 * `InteractivityChecker` treat them all as invisible and therefore untabbable -
 * the same workaround the shared overlay primitive's own spec uses.
 */
function withElementGeometry() {
  const descriptors = (['offsetWidth', 'offsetHeight'] as const).map(
    (prop) =>
      [
        prop,
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop),
      ] as const,
  );

  beforeAll(() => {
    for (const [prop] of descriptors) {
      Object.defineProperty(HTMLElement.prototype, prop, {
        configurable: true,
        get: () => 1,
      });
    }
  });

  afterAll(() => {
    for (const [prop, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, prop, descriptor);
      } else {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>)[
          prop
        ];
      }
    }
  });
}

@Component({
  imports: [AndesPopover, AndesPopoverTrigger, AndesPopoverContent],
  template: `
    <button type="button" id="outside">Outside</button>
    <andes-popover
      [side]="side()"
      [align]="align()"
      [showArrow]="showArrow()"
      [(open)]="open"
    >
      <button type="button" id="trigger" andesPopoverTrigger>Open</button>
      <andes-popover-content>
        <button type="button" id="first">First</button>
        <input id="middle" />
      </andes-popover-content>
    </andes-popover>
  `,
})
class HostComponent {
  readonly side = signal<AndesOverlaySide>('bottom');
  readonly align = signal<AndesOverlayAlign>('center');
  readonly showArrow = signal(false);
  readonly open = signal(false);
}

describe('AndesPopover', () => {
  withElementGeometry();

  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const query = (id: string) =>
      (document.querySelector(`#${id}`) as HTMLElement) ?? null;

    return {
      fixture,
      host: fixture.componentInstance,
      trigger: () => query('trigger'),
      outside: () => query('outside'),
      panel: () =>
        document.querySelector('.andes-popover-content') as HTMLElement | null,
      first: () => query('first'),
      middle: () => query('middle'),
    };
  }

  function pressEscape() {
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        keyCode: 27,
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  function clickOn(element: Element) {
    element.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
    );
    element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
  }

  it('renders nothing until the trigger is clicked', () => {
    const { panel } = createHost();

    expect(panel()).toBeNull();
  });

  it('opens the panel on trigger click', () => {
    const { fixture, trigger, panel } = createHost();

    trigger().click();
    fixture.detectChanges();

    expect(panel()).toBeTruthy();
  });

  it('closes the panel on a second trigger click (toggle)', () => {
    const { fixture, trigger, panel } = createHost();

    trigger().click();
    fixture.detectChanges();
    expect(panel()).toBeTruthy();

    trigger().click();
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  it('closes on Escape', () => {
    const { fixture, trigger, panel } = createHost();

    trigger().click();
    fixture.detectChanges();
    expect(panel()).toBeTruthy();

    pressEscape();
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  it('closes on an outside click', () => {
    const { fixture, trigger, outside, panel } = createHost();

    trigger().click();
    fixture.detectChanges();
    expect(panel()).toBeTruthy();

    clickOn(outside());
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  it('does not close on a click inside the panel', () => {
    const { fixture, trigger, middle, panel } = createHost();

    trigger().click();
    fixture.detectChanges();

    clickOn(middle());
    fixture.detectChanges();

    expect(panel()).toBeTruthy();
  });

  it('renders the panel inside the CDK overlay container, positioned relative to the trigger', () => {
    const { fixture, trigger, panel } = createHost();

    trigger().click();
    fixture.detectChanges();

    const rendered = panel();
    expect(rendered?.closest('.cdk-overlay-container')).toBeTruthy();
    expect(
      rendered
        ?.closest('.cdk-overlay-connected-position-bounding-box')
        ?.classList.contains('cdk-overlay-connected-position-bounding-box'),
    ).toBe(true);
  });

  it('exposes aria-haspopup/aria-expanded/aria-controls on the trigger', () => {
    const { fixture, trigger, panel } = createHost();

    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');

    trigger().click();
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().getAttribute('aria-controls')).toBe(panel()?.id);
  });

  it('does not trap focus - Tab can move focus out of the panel while open', async () => {
    const { fixture, trigger, outside } = createHost();

    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();

    outside().focus();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(document.activeElement).toBe(outside());
  });

  it('moves focus into the panel on open, without trapping it', async () => {
    const { fixture, trigger, first } = createHost();

    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.activeElement).toBe(first());
  });

  it('restores focus to the trigger on close', async () => {
    const { fixture, trigger } = createHost();

    trigger().focus();
    trigger().click();
    fixture.detectChanges();
    await fixture.whenStable();

    pressEscape();
    fixture.detectChanges();

    expect(document.activeElement).toBe(trigger());
  });

  it.each([
    ['top', 'start'],
    ['right', 'center'],
    ['bottom', 'end'],
    ['left', 'center'],
  ] as const)(
    'reflects side=%s align=%s as data attributes on the panel',
    (side, align) => {
      const { fixture, host, trigger, panel } = createHost();
      host.side.set(side);
      host.align.set(align);
      fixture.detectChanges();

      trigger().click();
      fixture.detectChanges();

      expect(panel()?.getAttribute('data-side')).toBe(side);
      expect(panel()?.getAttribute('data-align')).toBe(align);
    },
  );

  it('renders no arrow by default', () => {
    const { fixture, trigger, panel } = createHost();

    trigger().click();
    fixture.detectChanges();

    expect(panel()?.querySelector('.andes-popover-arrow')).toBeFalsy();
  });

  it('renders an arrow when showArrow is set', () => {
    const { fixture, host, trigger, panel } = createHost();
    host.showArrow.set(true);
    fixture.detectChanges();

    trigger().click();
    fixture.detectChanges();

    const arrow = panel()?.querySelector('.andes-popover-arrow');
    expect(arrow).toBeTruthy();
    expect(arrow?.getAttribute('data-side')).toBe('bottom');
  });

  it('supports controlled usage via the two-way open binding', () => {
    const { fixture, host, panel } = createHost();

    host.open.set(true);
    fixture.detectChanges();

    expect(panel()).toBeTruthy();

    host.open.set(false);
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  it('renders no backdrop, matching the non-modal popover preset', () => {
    const { fixture, trigger } = createHost();

    trigger().click();
    fixture.detectChanges();

    expect(document.querySelector('.andes-overlay-backdrop')).toBeNull();
  });
});
