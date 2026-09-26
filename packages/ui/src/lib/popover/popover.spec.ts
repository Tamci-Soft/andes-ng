import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { AndesOverlayPrimitive } from '@andes-ng/primitives';

import { AndesButton } from '../button/button';
import type {
  AndesPopoverPlacement,
  AndesPopoverRenderable,
  AndesPopoverTriggerAction,
} from './popover-types';

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

// ---------------------------------------------------------------------------
// Extended features: structured title/content, trigger modes, placements,
// collision handling, destroyOnHidden, zIndex, disabled handling.
// ---------------------------------------------------------------------------

@Component({
  imports: [AndesPopover, AndesPopoverTrigger],
  template: `
    <button type="button" id="outside">Outside</button>
    <input id="other" />
    <andes-popover
      [title]="title()"
      [content]="content()"
      [placement]="placement()"
      [trigger]="trigger()"
      [openDelay]="openDelay()"
      [closeDelay]="closeDelay()"
      [disabled]="disabled()"
      [destroyOnHidden]="destroyOnHidden()"
      [zIndex]="zIndex()"
      [showArrow]="showArrow()"
      [arrowPointAtCenter]="pointAtCenter()"
      [autoAdjustOverflow]="autoAdjust()"
      [(open)]="open"
      (openChange)="changes.push($event)"
    >
      <button
        type="button"
        id="trigger"
        andesPopoverTrigger
        [attr.aria-disabled]="triggerDisabled() || null"
      >
        Open
      </button>
    </andes-popover>
    <ng-template #titleTpl><em id="title-tpl">Rich title</em></ng-template>
    <ng-template #bodyTpl>
      <input id="body-input" />
      <span id="body-tpl">Rich body</span>
    </ng-template>
  `,
})
class FeatureHost {
  readonly title = signal<AndesPopoverRenderable | undefined>('Title');
  readonly content = signal<AndesPopoverRenderable | undefined>('Body');
  readonly placement = signal<AndesPopoverPlacement | undefined>(undefined);
  readonly trigger = signal<
    AndesPopoverTriggerAction | AndesPopoverTriggerAction[]
  >('click');
  readonly openDelay = signal(100);
  readonly closeDelay = signal(100);
  readonly disabled = signal(false);
  readonly destroyOnHidden = signal(false);
  readonly zIndex = signal<number | undefined>(undefined);
  readonly showArrow = signal(false);
  readonly pointAtCenter = signal(false);
  readonly autoAdjust = signal(true);
  readonly triggerDisabled = signal(false);
  readonly open = signal(false);
  readonly changes: boolean[] = [];
  readonly titleTpl = viewChild.required<TemplateRef<unknown>>('titleTpl');
  readonly bodyTpl = viewChild.required<TemplateRef<unknown>>('bodyTpl');
}

@Component({
  imports: [AndesPopover, AndesPopoverTrigger, AndesButton],
  template: `
    <andes-popover title="Static title" content="Body">
      <andes-button id="wrapper" andesPopoverTrigger>Open</andes-button>
    </andes-popover>
    <andes-popover content="Body">
      <andes-button id="disabled-wrapper" andesPopoverTrigger disabled
        >Disabled</andes-button
      >
    </andes-popover>
  `,
})
class WrapperHost {}

describe('AndesPopover - extended features', () => {
  withElementGeometry();

  function setup() {
    const fixture = TestBed.createComponent(FeatureHost);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const byId = (id: string) => document.getElementById(id) as HTMLElement;
    const panel = () =>
      document.querySelector('.andes-popover-content') as HTMLElement | null;
    const overlay = fixture.debugElement
      .query(By.directive(AndesPopover))
      .injector.get(AndesOverlayPrimitive);
    const update = () => fixture.detectChanges();
    return {
      fixture,
      host,
      byId,
      panel,
      overlay,
      update,
      trigger: () => byId('trigger'),
    };
  }

  function fire(element: Element, type: string, init: EventInit = {}) {
    const event = new MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      ...init,
    });
    element.dispatchEvent(event);
    return event;
  }

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('title and content', () => {
    it('renders string title and content as structured header/body parts', () => {
      const { trigger, panel, update } = setup();
      trigger().click();
      update();

      const title = panel()?.querySelector('.andes-popover-title');
      const body = panel()?.querySelector('.andes-popover-body');
      expect(title?.textContent?.trim()).toBe('Title');
      expect(body?.textContent?.trim()).toBe('Body');
      expect(panel()?.getAttribute('role')).toBe('dialog');
      expect(panel()?.getAttribute('aria-labelledby')).toBe(title?.id);
    });

    it('renders template title and content', () => {
      const { host, trigger, panel, update } = setup();
      host.title.set(host.titleTpl());
      host.content.set(host.bodyTpl());
      update();
      trigger().click();
      update();

      expect(
        panel()?.querySelector('.andes-popover-title #title-tpl')?.textContent,
      ).toBe('Rich title');
      expect(
        panel()?.querySelector('.andes-popover-body #body-tpl')?.textContent,
      ).toBe('Rich body');
    });

    it('omits the header and aria-labelledby without a title', () => {
      const { host, trigger, panel, update } = setup();
      host.title.set(undefined);
      update();
      trigger().click();
      update();

      expect(panel()?.querySelector('.andes-popover-title')).toBeNull();
      expect(panel()?.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('does not leak a static title attribute onto the host (no native tooltip)', () => {
      const fixture = TestBed.createComponent(WrapperHost);
      fixture.detectChanges();

      expect(
        fixture.nativeElement
          .querySelector('andes-popover')
          .hasAttribute('title'),
      ).toBe(false);
    });
  });

  describe('trigger modes', () => {
    it('hover: opens after openDelay and closes after closeDelay, without moving focus', async () => {
      vi.useFakeTimers();
      const { host, trigger, panel, update, byId } = setup();
      host.trigger.set('hover');
      update();
      byId('other').focus();

      fire(trigger(), 'mouseenter');
      vi.advanceTimersByTime(99);
      update();
      expect(panel()).toBeNull();

      vi.advanceTimersByTime(1);
      update();
      await vi.runOnlyPendingTimersAsync();
      update();
      expect(panel()).toBeTruthy();
      expect(document.activeElement).toBe(byId('other'));

      fire(trigger(), 'mouseleave');
      vi.advanceTimersByTime(100);
      update();
      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(byId('other'));
    });

    it('hover: moving the pointer onto the panel keeps it open', () => {
      vi.useFakeTimers();
      const { host, trigger, panel, update } = setup();
      host.trigger.set('hover');
      host.openDelay.set(0);
      update();

      fire(trigger(), 'mouseenter');
      update();
      expect(panel()).toBeTruthy();

      fire(trigger(), 'mouseleave');
      vi.advanceTimersByTime(50);
      fire(panel() as HTMLElement, 'mouseenter');
      vi.advanceTimersByTime(200);
      update();
      expect(panel()).toBeTruthy();

      fire(panel() as HTMLElement, 'mouseleave');
      vi.advanceTimersByTime(100);
      update();
      expect(panel()).toBeNull();
    });

    it('hover only: a click does not open it', () => {
      const { host, trigger, panel, update } = setup();
      host.trigger.set('hover');
      update();

      trigger().click();
      update();
      expect(panel()).toBeNull();
    });

    it('focus: opens on focus and closes when focus leaves', () => {
      const { host, trigger, panel, update, byId } = setup();
      host.trigger.set('focus');
      update();

      trigger().focus();
      update();
      expect(panel()).toBeTruthy();
      expect(document.activeElement).toBe(trigger());

      byId('other').focus();
      update();
      expect(panel()).toBeNull();
    });

    it('contextMenu: opens on right click and suppresses the native menu', () => {
      const { host, trigger, panel, update } = setup();
      host.trigger.set('contextMenu');
      update();

      trigger().click();
      update();
      expect(panel()).toBeNull();

      const event = fire(trigger(), 'contextmenu');
      update();
      expect(event.defaultPrevented).toBe(true);
      expect(panel()).toBeTruthy();
    });

    it('combined hover + click: a click pins a hover-opened panel', () => {
      vi.useFakeTimers();
      const { host, trigger, panel, update } = setup();
      host.trigger.set(['hover', 'click']);
      host.openDelay.set(0);
      update();

      fire(trigger(), 'mouseenter');
      update();
      expect(panel()).toBeTruthy();

      trigger().click();
      update();
      fire(trigger(), 'mouseleave');
      vi.advanceTimersByTime(500);
      update();
      expect(panel()).toBeTruthy();

      trigger().click();
      update();
      expect(panel()).toBeNull();
    });
  });

  describe('placement', () => {
    it.each([
      ['top', 'top', 'center'],
      ['topLeft', 'top', 'start'],
      ['topRight', 'top', 'end'],
      ['bottom', 'bottom', 'center'],
      ['bottomLeft', 'bottom', 'start'],
      ['bottomRight', 'bottom', 'end'],
      ['left', 'left', 'center'],
      ['leftTop', 'left', 'start'],
      ['leftBottom', 'left', 'end'],
      ['right', 'right', 'center'],
      ['rightTop', 'right', 'start'],
      ['rightBottom', 'right', 'end'],
    ] as const)('%s maps to side=%s align=%s', (placement, side, align) => {
      const { host, trigger, panel, update, overlay } = setup();
      host.placement.set(placement);
      update();
      trigger().click();
      update();

      expect(panel()?.getAttribute('data-side')).toBe(side);
      expect(panel()?.getAttribute('data-align')).toBe(align);
      expect(overlay.config().positioning).toMatchObject({ side, align });
    });
  });

  describe('collision handling and arrow', () => {
    function mockGeometry(rects: {
      trigger: Partial<DOMRect>;
      panel: Partial<DOMRect>;
    }) {
      const toRect = (r: Partial<DOMRect>) => {
        const left = r.left ?? 0;
        const top = r.top ?? 0;
        const width = r.width ?? 0;
        const height = r.height ?? 0;
        return {
          left,
          top,
          width,
          height,
          x: left,
          y: top,
          right: left + width,
          bottom: top + height,
          toJSON: () => ({}),
        } as DOMRect;
      };
      vi.spyOn(
        HTMLElement.prototype,
        'getBoundingClientRect',
      ).mockImplementation(function (this: HTMLElement) {
        if (this.id === 'trigger') {
          return toRect(rects.trigger);
        }
        if (this.classList.contains('cdk-overlay-pane')) {
          return toRect(rects.panel);
        }
        return toRect({});
      });
    }

    it('flips to the opposite side when the preferred one does not fit', async () => {
      const { fixture, trigger, panel, update, overlay } = setup();
      const viewportHeight = window.innerHeight;
      mockGeometry({
        trigger: { left: 100, top: viewportHeight - 40, width: 80, height: 30 },
        panel: { left: 60, top: 0, width: 200, height: 120 },
      });

      trigger().click();
      update();
      await fixture.whenStable();
      update();

      expect(panel()?.getAttribute('data-side')).toBe('top');
      expect(overlay.config().positioning).toMatchObject({ side: 'top' });
    });

    it('keeps the requested side when autoAdjustOverflow is off', async () => {
      const { fixture, host, trigger, panel, update } = setup();
      host.autoAdjust.set(false);
      update();
      mockGeometry({
        trigger: {
          left: 100,
          top: window.innerHeight - 40,
          width: 80,
          height: 30,
        },
        panel: { left: 60, top: 0, width: 200, height: 120 },
      });

      trigger().click();
      update();
      await fixture.whenStable();
      update();

      expect(panel()?.getAttribute('data-side')).toBe('bottom');
    });

    it('places a start-aligned arrow near the aligned edge', async () => {
      const { fixture, host, trigger, panel, update } = setup();
      host.placement.set('bottomLeft');
      host.showArrow.set(true);
      update();
      mockGeometry({
        trigger: { left: 100, top: 100, width: 200, height: 30 },
        panel: { left: 100, top: 138, width: 240, height: 80 },
      });

      trigger().click();
      update();
      await fixture.whenStable();
      update();

      const arrow = panel()?.querySelector<HTMLElement>('.andes-popover-arrow');
      expect(arrow?.style.left).toBe('16px');
    });

    it('arrowPointAtCenter shifts the panel so the arrow points at the trigger center', async () => {
      const { fixture, host, trigger, panel, update, overlay } = setup();
      host.placement.set('bottomLeft');
      host.showArrow.set(true);
      host.pointAtCenter.set(true);
      update();
      mockGeometry({
        trigger: { left: 100, top: 100, width: 200, height: 30 },
        panel: { left: 184, top: 138, width: 240, height: 80 },
      });

      trigger().click();
      update();
      await fixture.whenStable();
      update();

      // 200 / 2 - 16px arrow inset.
      expect(overlay.config().positioning).toMatchObject({ alignOffset: 84 });
      const arrow = panel()?.querySelector<HTMLElement>('.andes-popover-arrow');
      expect(arrow?.style.left).toBe('16px');
    });
  });

  describe('openChange', () => {
    it('emits for changes the popover makes, not for parent writes', () => {
      const { host, trigger, update } = setup();

      host.open.set(true);
      update();
      host.open.set(false);
      update();
      expect(host.changes).toEqual([]);

      trigger().click();
      update();
      trigger().click();
      update();
      expect(host.changes).toEqual([true, false]);
    });

    it('emits false when Escape closes it', () => {
      const { host, trigger, update } = setup();
      trigger().click();
      update();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          keyCode: 27,
          bubbles: true,
        }),
      );
      update();
      expect(host.changes).toEqual([true, false]);
      expect(host.open()).toBe(false);
    });
  });

  describe('destroyOnHidden', () => {
    function typeAndReopen(destroyOnHidden: boolean) {
      const { host, trigger, update, byId } = setup();
      host.content.set(host.bodyTpl());
      host.destroyOnHidden.set(destroyOnHidden);
      update();

      trigger().click();
      update();
      const first = byId('body-input') as HTMLInputElement;
      first.value = 'draft';

      trigger().click();
      update();
      expect(document.getElementById('body-input')).toBeNull();

      trigger().click();
      update();
      const second = byId('body-input') as HTMLInputElement;
      return { first, second };
    }

    it('keeps template content alive between opens by default', () => {
      const { first, second } = typeAndReopen(false);
      expect(second).toBe(first);
      expect(second.value).toBe('draft');
    });

    it('re-creates template content on every open when set', () => {
      const { first, second } = typeAndReopen(true);
      expect(second).not.toBe(first);
      expect(second.value).toBe('');
    });
  });

  it('zIndex overrides the stacking layer', () => {
    const { host, trigger, update, overlay } = setup();
    host.zIndex.set(4242);
    update();
    trigger().click();
    update();

    expect(overlay.panelElement()?.parentElement?.style.zIndex).toBe('4242');
  });

  describe('disabled', () => {
    it('never opens while disabled, and closes when it becomes disabled', () => {
      const { host, trigger, panel, update } = setup();
      host.disabled.set(true);
      update();
      trigger().click();
      update();
      expect(panel()).toBeNull();

      host.disabled.set(false);
      update();
      trigger().click();
      update();
      expect(panel()).toBeTruthy();

      host.disabled.set(true);
      update();
      expect(panel()).toBeNull();
      expect(host.open()).toBe(false);
    });

    it('ignores a trigger marked aria-disabled', () => {
      const { host, trigger, panel, update } = setup();
      host.triggerDisabled.set(true);
      update();
      trigger().click();
      update();
      expect(panel()).toBeNull();
    });

    it('ignores an andes-button trigger whose inner button is disabled', async () => {
      const fixture = TestBed.createComponent(WrapperHost);
      fixture.detectChanges();
      await fixture.whenStable();

      const wrapper = document.getElementById(
        'disabled-wrapper',
      ) as HTMLElement;
      fire(wrapper, 'click');
      fixture.detectChanges();
      expect(document.querySelector('.andes-popover-content')).toBeNull();
    });
  });

  describe('andes-button trigger', () => {
    it('mirrors the trigger ARIA onto the inner button and restores focus to it', async () => {
      const fixture = TestBed.createComponent(WrapperHost);
      fixture.detectChanges();
      await fixture.whenStable();

      const inner = document.querySelector('#wrapper button') as HTMLElement;
      expect(inner.getAttribute('aria-haspopup')).toBe('dialog');
      expect(inner.getAttribute('aria-expanded')).toBe('false');

      inner.focus();
      inner.click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(inner.getAttribute('aria-expanded')).toBe('true');
      expect(inner.getAttribute('aria-controls')).toBe(
        document.querySelector('.andes-popover-content')?.id,
      );

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          keyCode: 27,
          bubbles: true,
        }),
      );
      fixture.detectChanges();
      expect(document.activeElement).toBe(inner);
    });
  });

  it('does not steal focus back from an input clicked outside', async () => {
    const { fixture, host, trigger, panel, update, byId } = setup();
    host.content.set(host.bodyTpl());
    update();
    trigger().click();
    update();
    await fixture.whenStable();
    expect(panel()?.contains(document.activeElement)).toBe(true);

    const other = byId('other');
    other.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    other.focus();
    fire(other, 'click');
    update();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(other);
  });
});
