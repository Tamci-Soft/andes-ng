import {
  Component,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  andesOverlayPreset,
  ANDES_OVERLAY_DEFAULT_CONFIG,
  type AndesOverlayCloseReason,
  type AndesOverlayConfig,
} from './overlay-config';
import { AndesOverlayClosePrimitive } from './overlay-close-primitive';
import { AndesOverlayContentPrimitive } from './overlay-content-primitive';
import {
  AndesOverlayPrimitive,
  provideAndesOverlay,
} from './overlay-primitive';
import { AndesOverlayTriggerPrimitive } from './overlay-trigger-primitive';

/**
 * jsdom reports zero geometry for every element, which makes CDK's
 * `InteractivityChecker` treat them all as invisible and therefore untabbable.
 * Giving elements a nominal size is the only way to exercise real focus-trap
 * behavior here; it says nothing about the primitive itself.
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

/**
 * CDK (correctly) refuses to block scroll on a document that cannot scroll, and
 * jsdom reports every document as unscrollable.
 */
function withScrollableDocument() {
  beforeEach(() => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      get: () => 5000,
    });
  });

  afterEach(() => {
    delete (document.documentElement as unknown as Record<string, unknown>)[
      'scrollHeight'
    ];
  });
}

@Component({
  imports: [
    AndesOverlayTriggerPrimitive,
    AndesOverlayContentPrimitive,
    AndesOverlayClosePrimitive,
  ],
  providers: [provideAndesOverlay()],
  template: `
    <button type="button" id="outside">Outside</button>
    @if (showTrigger()) {
      <button
        type="button"
        id="trigger"
        andesOverlayTrigger
        [ariaAttachment]="ariaAttachment()"
        (click)="toggle()"
      >
        Open
      </button>
    }
    <ng-template #content>
      <div andesOverlayContent aria-label="Panel">
        <button type="button" id="first">First</button>
        <input id="middle" />
        <button type="button" id="close" andesOverlayClose>Close</button>
      </div>
    </ng-template>
  `,
})
class OverlayHost {
  readonly overlay = inject(AndesOverlayPrimitive);
  readonly content = viewChild.required<TemplateRef<unknown>>('content');
  readonly showTrigger = signal(true);
  readonly ariaAttachment = signal<'expanded' | 'described-by' | 'none'>(
    'expanded',
  );

  toggle(): void {
    this.overlay.toggle(this.content());
  }

  open(): void {
    this.overlay.open(this.content());
  }
}

describe('AndesOverlayPrimitive', () => {
  withElementGeometry();

  function createHost(config: Partial<AndesOverlayConfig> = {}) {
    const fixture = TestBed.createComponent(OverlayHost);
    fixture.componentInstance.overlay.configure(config);
    fixture.detectChanges();

    const overlay = fixture.componentInstance.overlay;
    // Scoped to this fixture and its own overlay, so nesting tests with two
    // fixtures in one document do not resolve each other's elements.
    const element = (id: string) =>
      ((fixture.nativeElement as HTMLElement).querySelector(`#${id}`) ??
        overlay.panelElement()?.querySelector(`#${id}`)) as HTMLElement;

    return {
      fixture,
      overlay,
      host: fixture.componentInstance,
      element,
      trigger: () => element('trigger'),
      outside: () => element('outside'),
      pane: () => overlay.panelElement(),
      hostWrapper: () => overlay.panelElement()?.parentElement ?? null,
      content: () => overlay.contentElement(),
      backdrop: () => overlay.backdropElement(),
    };
  }

  function pressEscape(target: EventTarget = document.body) {
    target.dispatchEvent(
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

  describe('portal rendering', () => {
    it('is closed and renders nothing until opened', () => {
      const { pane, content } = createHost();

      expect(pane()).toBeNull();
      expect(content()).toBeNull();
    });

    it('renders content outside the host component, inside the CDK overlay container', () => {
      const { fixture, host, content } = createHost();
      host.open();
      fixture.detectChanges();

      const rendered = content();
      expect(rendered).toBeTruthy();
      expect(fixture.nativeElement.contains(rendered)).toBe(false);
      expect(rendered?.closest('.cdk-overlay-container')).toBeTruthy();
    });

    it('never uses the native top layer, so z-index tokens still govern stacking', () => {
      const { fixture, host, hostWrapper } = createHost();
      host.open();
      fixture.detectChanges();

      expect(hostWrapper()?.hasAttribute('popover')).toBe(false);
    });

    it('removes the content from the DOM on close', () => {
      const { fixture, host, overlay, content } = createHost();
      host.open();
      fixture.detectChanges();
      overlay.close();
      fixture.detectChanges();

      expect(content()).toBeNull();
      expect(overlay.isOpen()).toBe(false);
    });

    it('ignores a second open() while already open', () => {
      const { fixture, host } = createHost();
      host.open();
      fixture.detectChanges();
      host.open();
      fixture.detectChanges();

      expect(document.querySelectorAll('.andes-overlay-pane')).toHaveLength(1);
    });
  });

  describe('z-index, from the --andes-z-index-* tokens', () => {
    it.each([
      ['dialog', 'modal', 1050],
      ['drawer', 'overlay', 1040],
      ['popover', 'popover', 1060],
      ['menu', 'dropdown', 1000],
      ['tooltip', 'tooltip', 1070],
    ] as const)(
      'assigns the %s preset the %s layer',
      (preset, layer, fallback) => {
        const { fixture, host, hostWrapper } = createHost(
          andesOverlayPreset(preset),
        );
        host.open();
        fixture.detectChanges();

        expect(hostWrapper()?.style.getPropertyValue('z-index')).toBe(
          `var(--andes-z-index-${layer}, ${fallback})`,
        );
      },
    );

    it('puts the backdrop on the same layer as its panel', () => {
      const { fixture, host, backdrop, hostWrapper } = createHost(
        andesOverlayPreset('dialog'),
      );
      host.open();
      fixture.detectChanges();

      expect(backdrop()?.style.getPropertyValue('z-index')).toBe(
        hostWrapper()?.style.getPropertyValue('z-index'),
      );
    });

    it('re-applies the layer when reconfigured while open', () => {
      const { fixture, host, overlay, hostWrapper } = createHost(
        andesOverlayPreset('popover'),
      );
      host.open();
      fixture.detectChanges();
      overlay.configure({ layer: 'toast' });
      fixture.detectChanges();

      expect(hostWrapper()?.style.getPropertyValue('z-index')).toBe(
        'var(--andes-z-index-toast, 1080)',
      );
    });
  });

  describe('backdrop scrim', () => {
    it('renders a scrim coloured by --andes-color-overlay for dialogs', () => {
      const { fixture, host, backdrop } = createHost(
        andesOverlayPreset('dialog'),
      );
      host.open();
      fixture.detectChanges();

      expect(backdrop()?.style.getPropertyValue('background')).toBe(
        'var(--andes-color-overlay, rgb(15 23 42 / 45%))',
      );
    });

    it.each(['popover', 'menu', 'tooltip'] as const)(
      'renders no backdrop for the %s preset',
      (preset) => {
        const { fixture, host, backdrop } = createHost(
          andesOverlayPreset(preset),
        );
        host.open();
        fixture.detectChanges();

        expect(backdrop()).toBeNull();
      },
    );

    it('adds a consumer backdrop class alongside the andes one', () => {
      const { fixture, host, backdrop } = createHost({
        ...andesOverlayPreset('dialog'),
        backdropClass: 'my-scrim',
      });
      host.open();
      fixture.detectChanges();

      expect(backdrop()?.classList).toContain('andes-overlay-backdrop');
      expect(backdrop()?.classList).toContain('my-scrim');
    });

    it('adds a consumer panel class alongside the andes one', () => {
      const { fixture, host, pane } = createHost({ panelClass: ['my-panel'] });
      host.open();
      fixture.detectChanges();

      expect(pane()?.classList).toContain('andes-overlay-pane');
      expect(pane()?.classList).toContain('my-panel');
    });
  });

  describe('focus trap', () => {
    it('moves focus to the first tabbable element inside the overlay on open', async () => {
      const { fixture, host, element } = createHost(
        andesOverlayPreset('dialog'),
      );
      host.open();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(element('first'));
    });

    it('keeps focus inside the overlay while open', async () => {
      const { fixture, host, element, outside, pane } = createHost(
        andesOverlayPreset('dialog'),
      );
      host.open();
      fixture.detectChanges();
      await fixture.whenStable();

      outside().focus();
      // CDK's inert strategy re-traps focus on a macrotask.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(pane()?.contains(document.activeElement)).toBe(true);
      expect(document.activeElement).toBe(element('first'));
    });

    it('lets focus leave when trapFocus is off', async () => {
      const { fixture, host, outside } = createHost({
        ...andesOverlayPreset('dialog'),
        trapFocus: false,
      });
      host.open();
      fixture.detectChanges();
      await fixture.whenStable();

      outside().focus();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(document.activeElement).toBe(outside());
    });

    it('still moves focus in without trapping it, for popovers and menus', async () => {
      const { fixture, host, element } = createHost(
        andesOverlayPreset('popover'),
      );
      host.open();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(element('first'));
      expect(host.overlay.config().trapFocus).toBe(false);
    });

    it('leaves focus alone entirely for tooltips', async () => {
      const { fixture, host, trigger } = createHost(
        andesOverlayPreset('tooltip'),
      );
      trigger().focus();
      host.open();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(trigger());
    });

    it('focuses the pane itself when autoFocus is "container"', async () => {
      const { fixture, host, pane, content } = createHost({
        ...andesOverlayPreset('dialog'),
        autoFocus: 'container',
      });
      host.open();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(document.activeElement).toBe(pane());
      expect(content()?.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('focus restoration', () => {
    it('returns focus to the trigger on close', async () => {
      const { fixture, host, overlay, trigger } = createHost(
        andesOverlayPreset('dialog'),
      );
      trigger().focus();
      host.open();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(document.activeElement).not.toBe(trigger());

      overlay.close();
      fixture.detectChanges();

      expect(document.activeElement).toBe(trigger());
    });

    it('returns focus to the trigger regardless of what was focused at open time', async () => {
      const { fixture, host, overlay, trigger, outside } = createHost(
        andesOverlayPreset('dialog'),
      );
      outside().focus();
      host.open();
      fixture.detectChanges();
      await fixture.whenStable();

      overlay.close();
      fixture.detectChanges();

      expect(document.activeElement).toBe(trigger());
    });

    it('falls back to whatever was focused at open time when there is no trigger', async () => {
      const { fixture, host, overlay, outside } = createHost(
        andesOverlayPreset('dialog'),
      );
      host.showTrigger.set(false);
      fixture.detectChanges();
      outside().focus();
      host.open();
      fixture.detectChanges();
      await fixture.whenStable();

      overlay.close();
      fixture.detectChanges();

      expect(document.activeElement).toBe(outside());
    });

    it('does not throw when the trigger was removed while the overlay was open', async () => {
      const { fixture, host, overlay, trigger } = createHost(
        andesOverlayPreset('dialog'),
      );
      trigger().focus();
      host.open();
      fixture.detectChanges();
      await fixture.whenStable();

      host.showTrigger.set(false);
      fixture.detectChanges();

      expect(() => {
        overlay.close();
        fixture.detectChanges();
      }).not.toThrow();
    });

    it('honours an explicit restoreFocusTo target', async () => {
      const { fixture, host, overlay, outside } = createHost(
        andesOverlayPreset('dialog'),
      );
      overlay.open(host.content(), { restoreFocusTo: outside() });
      fixture.detectChanges();
      await fixture.whenStable();

      overlay.close();
      fixture.detectChanges();

      expect(document.activeElement).toBe(outside());
    });

    it('leaves focus where it is when restoreFocus is off', async () => {
      const { fixture, host, overlay, trigger, element } = createHost({
        ...andesOverlayPreset('dialog'),
        restoreFocus: false,
      });
      trigger().focus();
      host.open();
      fixture.detectChanges();
      await fixture.whenStable();
      const focusedInside = element('first');
      expect(document.activeElement).toBe(focusedInside);

      overlay.close();
      fixture.detectChanges();

      expect(document.activeElement).not.toBe(trigger());
    });
  });

  describe('escape to close', () => {
    it('closes on Escape', () => {
      const { fixture, host, overlay } = createHost(
        andesOverlayPreset('dialog'),
      );
      host.open();
      fixture.detectChanges();

      pressEscape();
      fixture.detectChanges();

      expect(overlay.isOpen()).toBe(false);
    });

    it('reports "escape-key" as the close reason', () => {
      const { fixture, host, overlay } = createHost(
        andesOverlayPreset('dialog'),
      );
      const reasons: AndesOverlayCloseReason[] = [];
      overlay.closed.subscribe((reason) => reasons.push(reason));
      host.open();
      fixture.detectChanges();

      pressEscape();

      expect(reasons).toEqual(['escape-key']);
    });

    it('is skippable per consumer', () => {
      const { fixture, host, overlay } = createHost({
        ...andesOverlayPreset('dialog'),
        closeOnEscape: false,
      });
      host.open();
      fixture.detectChanges();

      pressEscape();
      fixture.detectChanges();

      expect(overlay.isOpen()).toBe(true);
    });

    it('ignores Escape with a modifier key held', () => {
      const { fixture, host, overlay } = createHost(
        andesOverlayPreset('dialog'),
      );
      host.open();
      fixture.detectChanges();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          keyCode: 27,
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
      fixture.detectChanges();

      expect(overlay.isOpen()).toBe(true);
    });

    it('closes on Escape without an outside click also being needed, independently of closeOnOutsideClick', () => {
      const { fixture, host, overlay } = createHost({
        ...andesOverlayPreset('alert-dialog'),
      });
      host.open();
      fixture.detectChanges();
      expect(overlay.config().closeOnOutsideClick).toBe(false);

      pressEscape();
      fixture.detectChanges();

      expect(overlay.isOpen()).toBe(false);
    });

    it('forwards every keydown to consumers, closing or not', () => {
      const { fixture, host, overlay } = createHost({
        ...andesOverlayPreset('menu'),
      });
      const keys: string[] = [];
      overlay.keydownEvents.subscribe((event) => keys.push(event.key));
      host.open();
      fixture.detectChanges();

      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          keyCode: 40,
          bubbles: true,
        }),
      );

      expect(keys).toEqual(['ArrowDown']);
      expect(overlay.isOpen()).toBe(true);
    });
  });

  describe('click outside to close', () => {
    it('closes on a pointer event outside the overlay', () => {
      const { fixture, host, overlay, outside } = createHost(
        andesOverlayPreset('popover'),
      );
      host.open();
      fixture.detectChanges();

      clickOn(outside());
      fixture.detectChanges();

      expect(overlay.isOpen()).toBe(false);
    });

    it('reports "outside-click" as the close reason', () => {
      const { fixture, host, overlay, outside } = createHost(
        andesOverlayPreset('popover'),
      );
      const reasons: AndesOverlayCloseReason[] = [];
      overlay.closed.subscribe((reason) => reasons.push(reason));
      host.open();
      fixture.detectChanges();

      clickOn(outside());

      expect(reasons).toEqual(['outside-click']);
    });

    it('is skippable per consumer — an alert dialog stays open', () => {
      const { fixture, host, overlay, outside } = createHost(
        andesOverlayPreset('alert-dialog'),
      );
      host.open();
      fixture.detectChanges();

      clickOn(outside());
      fixture.detectChanges();

      expect(overlay.isOpen()).toBe(true);
    });

    it('does not close on a click inside the overlay', () => {
      const { fixture, host, overlay, element } = createHost(
        andesOverlayPreset('popover'),
      );
      host.open();
      fixture.detectChanges();

      clickOn(element('middle'));
      fixture.detectChanges();

      expect(overlay.isOpen()).toBe(true);
    });

    it('leaves a click on the trigger to the trigger, so a toggle does not flicker', () => {
      const { fixture, overlay, trigger } = createHost(
        andesOverlayPreset('popover'),
      );
      clickOn(trigger());
      fixture.detectChanges();
      expect(overlay.isOpen()).toBe(true);

      const reasons: AndesOverlayCloseReason[] = [];
      overlay.closed.subscribe((reason) => reasons.push(reason));
      clickOn(trigger());
      fixture.detectChanges();

      expect(overlay.isOpen()).toBe(false);
      expect(reasons).toEqual(['trigger']);
    });

    it('closes on a backdrop click, with its own reason', () => {
      const { fixture, host, overlay, backdrop } = createHost(
        andesOverlayPreset('dialog'),
      );
      const reasons: AndesOverlayCloseReason[] = [];
      overlay.closed.subscribe((reason) => reasons.push(reason));
      host.open();
      fixture.detectChanges();

      const scrim = backdrop();
      expect(scrim).toBeTruthy();
      clickOn(scrim as HTMLElement);
      fixture.detectChanges();

      expect(overlay.isOpen()).toBe(false);
      expect(reasons).toEqual(['backdrop-click']);
    });

    it('does not close on a backdrop click when outside-click dismissal is off', () => {
      const { fixture, host, overlay, backdrop } = createHost(
        andesOverlayPreset('alert-dialog'),
      );
      host.open();
      fixture.detectChanges();

      clickOn(backdrop() as HTMLElement);
      fixture.detectChanges();

      expect(overlay.isOpen()).toBe(true);
    });

    it('forwards outside pointer events to consumers even when it does not close', () => {
      const { fixture, host, overlay, outside } = createHost(
        andesOverlayPreset('alert-dialog'),
      );
      const seen: string[] = [];
      overlay.outsidePointerEvents.subscribe((event) => seen.push(event.type));
      host.open();
      fixture.detectChanges();

      clickOn(outside());

      expect(seen).toEqual(['click']);
    });
  });

  describe('close affordance inside the content', () => {
    it('closes via andesOverlayClose with a "close-button" reason', () => {
      const { fixture, host, overlay, element } = createHost(
        andesOverlayPreset('dialog'),
      );
      const reasons: AndesOverlayCloseReason[] = [];
      overlay.closed.subscribe((reason) => reasons.push(reason));
      host.open();
      fixture.detectChanges();

      element('close').click();
      fixture.detectChanges();

      expect(overlay.isOpen()).toBe(false);
      expect(reasons).toEqual(['close-button']);
    });
  });

  describe('scroll lock', () => {
    withScrollableDocument();

    it('blocks document scroll for a dialog and releases it on close', () => {
      const { fixture, host, overlay } = createHost(
        andesOverlayPreset('dialog'),
      );
      host.open();
      fixture.detectChanges();

      expect(
        document.documentElement.classList.contains('cdk-global-scrollblock'),
      ).toBe(true);

      overlay.close();
      fixture.detectChanges();

      expect(
        document.documentElement.classList.contains('cdk-global-scrollblock'),
      ).toBe(false);
    });

    it.each(['popover', 'menu', 'tooltip'] as const)(
      'does not block scroll for the %s preset',
      (preset) => {
        const { fixture, host } = createHost(andesOverlayPreset(preset));
        host.open();
        fixture.detectChanges();

        expect(
          document.documentElement.classList.contains('cdk-global-scrollblock'),
        ).toBe(false);
      },
    );

    it('is independently toggleable off for a modal-looking overlay', () => {
      const { fixture, host } = createHost({
        ...andesOverlayPreset('dialog'),
        lockScroll: false,
      });
      host.open();
      fixture.detectChanges();

      expect(
        document.documentElement.classList.contains('cdk-global-scrollblock'),
      ).toBe(false);
    });

    it('releases the lock when the providing component is destroyed', () => {
      const { fixture, host } = createHost(andesOverlayPreset('dialog'));
      host.open();
      fixture.detectChanges();
      expect(
        document.documentElement.classList.contains('cdk-global-scrollblock'),
      ).toBe(true);

      fixture.destroy();

      expect(
        document.documentElement.classList.contains('cdk-global-scrollblock'),
      ).toBe(false);
    });
  });

  describe('nested overlays', () => {
    withScrollableDocument();

    function openTwoDialogs() {
      const outer = createHost(andesOverlayPreset('dialog'));
      const inner = createHost(andesOverlayPreset('dialog'));
      outer.host.open();
      outer.fixture.detectChanges();
      inner.host.open();
      inner.fixture.detectChanges();
      return { outer, inner };
    }

    it('keeps the scroll lock while an inner overlay opens and closes', () => {
      const { outer, inner } = openTwoDialogs();
      const locked = () =>
        document.documentElement.classList.contains('cdk-global-scrollblock');
      expect(locked()).toBe(true);

      inner.overlay.close();
      inner.fixture.detectChanges();
      expect(locked()).toBe(true);

      outer.overlay.close();
      outer.fixture.detectChanges();
      expect(locked()).toBe(false);
    });

    it('gives the topmost overlay the active focus trap', async () => {
      const { outer, inner } = openTwoDialogs();
      await inner.fixture.whenStable();

      outer.outside().focus();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(inner.pane()).not.toBe(outer.pane());
      expect(document.activeElement?.closest('.andes-overlay-pane')).toBe(
        inner.pane(),
      );
    });

    it('only the topmost overlay reacts to Escape', () => {
      const { outer, inner } = openTwoDialogs();

      pressEscape();
      outer.fixture.detectChanges();
      inner.fixture.detectChanges();

      expect(inner.overlay.isOpen()).toBe(false);
      expect(outer.overlay.isOpen()).toBe(true);
    });
  });

  describe('positioning', () => {
    it('centers a dialog in the viewport', () => {
      const { fixture, host, hostWrapper } = createHost(
        andesOverlayPreset('dialog'),
      );
      host.open();
      fixture.detectChanges();

      const wrapper = hostWrapper();
      expect(wrapper?.classList).toContain('cdk-global-overlay-wrapper');
      expect(wrapper?.style.justifyContent).toBe('center');
      expect(wrapper?.style.alignItems).toBe('center');
    });

    it('pins a drawer to an edge and spans that edge', () => {
      const { fixture, host, hostWrapper, pane } = createHost(
        andesOverlayPreset('drawer'),
      );
      host.open();
      fixture.detectChanges();

      expect(hostWrapper()?.style.justifyContent).toBe('flex-end');
      expect(pane()?.style.height).toBe('100%');
    });

    it('pins a bottom sheet to the bottom edge and spans the width', () => {
      const { fixture, host, hostWrapper, pane } = createHost({
        ...andesOverlayPreset('drawer'),
        positioning: { kind: 'edge', edge: 'bottom' },
      });
      host.open();
      fixture.detectChanges();

      expect(hostWrapper()?.style.alignItems).toBe('flex-end');
      expect(pane()?.style.width).toBe('100%');
    });

    it('anchors a popover to its trigger with a flexible connected strategy', () => {
      const { fixture, host, hostWrapper } = createHost(
        andesOverlayPreset('popover'),
      );
      host.open();
      fixture.detectChanges();

      expect(hostWrapper()?.classList).toContain(
        'cdk-overlay-connected-position-bounding-box',
      );
    });

    it('lets an explicit size win over the positioning-implied one', () => {
      const { fixture, host, pane } = createHost({
        ...andesOverlayPreset('drawer'),
        size: { height: '50%', width: '320px' },
      });
      host.open();
      fixture.detectChanges();

      expect(pane()?.style.height).toBe('50%');
      expect(pane()?.style.width).toBe('320px');
    });
  });

  describe('ARIA wiring', () => {
    it('relates trigger and content for a dialog', () => {
      const { fixture, host, overlay, trigger, content } = createHost(
        andesOverlayPreset('dialog'),
      );

      expect(trigger().getAttribute('aria-expanded')).toBe('false');
      expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
      expect(trigger().hasAttribute('aria-controls')).toBe(false);

      host.open();
      fixture.detectChanges();

      expect(trigger().getAttribute('aria-expanded')).toBe('true');
      expect(trigger().getAttribute('aria-controls')).toBe(overlay.contentId);
      expect(content()?.id).toBe(overlay.contentId);
      expect(content()?.getAttribute('role')).toBe('dialog');
      expect(content()?.getAttribute('aria-modal')).toBe('true');
      expect(trigger().getAttribute('data-state')).toBe('open');
      expect(content()?.getAttribute('data-state')).toBe('open');
    });

    it('uses role="alertdialog" but aria-haspopup="dialog" for an alert dialog', () => {
      const { fixture, host, trigger, content } = createHost(
        andesOverlayPreset('alert-dialog'),
      );
      host.open();
      fixture.detectChanges();

      expect(content()?.getAttribute('role')).toBe('alertdialog');
      expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
    });

    it('uses role="menu" and aria-haspopup="menu" for a dropdown menu', () => {
      const { fixture, host, trigger, content } = createHost(
        andesOverlayPreset('menu'),
      );
      host.open();
      fixture.detectChanges();

      expect(content()?.getAttribute('role')).toBe('menu');
      expect(trigger().getAttribute('aria-haspopup')).toBe('menu');
      expect(content()?.hasAttribute('aria-modal')).toBe(false);
    });

    it('describes rather than expands the trigger for a tooltip', () => {
      const { fixture, host, overlay, trigger, content } = createHost(
        andesOverlayPreset('tooltip'),
      );
      host.ariaAttachment.set('described-by');
      fixture.detectChanges();
      host.open();
      fixture.detectChanges();

      expect(trigger().getAttribute('aria-describedby')).toBe(
        overlay.contentId,
      );
      expect(trigger().hasAttribute('aria-expanded')).toBe(false);
      expect(trigger().hasAttribute('aria-haspopup')).toBe(false);
      expect(content()?.getAttribute('role')).toBe('tooltip');
    });

    it('wires no ARIA at all when the consumer opts out', () => {
      const { fixture, host, trigger } = createHost(
        andesOverlayPreset('dialog'),
      );
      host.ariaAttachment.set('none');
      fixture.detectChanges();
      host.open();
      fixture.detectChanges();

      expect(trigger().hasAttribute('aria-expanded')).toBe(false);
      expect(trigger().hasAttribute('aria-controls')).toBe(false);
      expect(trigger().hasAttribute('aria-haspopup')).toBe(false);
    });

    it('omits role and aria-modal when the consumer sets role "none"', () => {
      const { fixture, host, content } = createHost({ role: 'none' });
      host.open();
      fixture.detectChanges();

      expect(content()?.hasAttribute('role')).toBe(false);
      expect(content()?.hasAttribute('aria-modal')).toBe(false);
    });
  });

  describe('lifecycle and defaults', () => {
    it('defaults to the least invasive overlay', () => {
      const { overlay } = createHost();

      expect(overlay.config()).toEqual(ANDES_OVERLAY_DEFAULT_CONFIG);
      expect(ANDES_OVERLAY_DEFAULT_CONFIG.trapFocus).toBe(false);
      expect(ANDES_OVERLAY_DEFAULT_CONFIG.lockScroll).toBe(false);
      expect(ANDES_OVERLAY_DEFAULT_CONFIG.hasBackdrop).toBe(false);
    });

    it('emits opened when attached', () => {
      const { fixture, host, overlay } = createHost();
      let opens = 0;
      overlay.opened.subscribe(() => opens++);

      host.open();
      fixture.detectChanges();

      expect(opens).toBe(1);
    });

    it('emits "imperative" for a plain close()', () => {
      const { fixture, host, overlay } = createHost();
      const reasons: AndesOverlayCloseReason[] = [];
      overlay.closed.subscribe((reason) => reasons.push(reason));
      host.open();
      fixture.detectChanges();

      overlay.close();

      expect(reasons).toEqual(['imperative']);
    });

    it('ignores close() when already closed', () => {
      const { overlay } = createHost();
      const reasons: AndesOverlayCloseReason[] = [];
      overlay.closed.subscribe((reason) => reasons.push(reason));

      overlay.close();

      expect(reasons).toEqual([]);
    });

    it('tears the overlay down when the providing component is destroyed', () => {
      const { fixture, host, content } = createHost(
        andesOverlayPreset('dialog'),
      );
      host.open();
      fixture.detectChanges();
      expect(content()).toBeTruthy();

      fixture.destroy();

      expect(document.querySelector('.andes-overlay-pane')).toBeNull();
    });

    it('exposes the pane, backdrop and content elements while open', () => {
      const { fixture, host, overlay } = createHost(
        andesOverlayPreset('dialog'),
      );
      expect(overlay.panelElement()).toBeNull();
      expect(overlay.backdropElement()).toBeNull();
      expect(overlay.contentElement()).toBeNull();

      host.open();
      fixture.detectChanges();

      expect(overlay.panelElement()?.classList).toContain('andes-overlay-pane');
      expect(overlay.backdropElement()?.classList).toContain(
        'andes-overlay-backdrop',
      );
      expect(overlay.contentElement()?.getAttribute('aria-label')).toBe(
        'Panel',
      );

      overlay.close();
      fixture.detectChanges();

      expect(overlay.panelElement()).toBeNull();
      expect(overlay.backdropElement()).toBeNull();
    });

    it('gives each instance its own content id', () => {
      const a = createHost();
      const b = createHost();

      expect(a.overlay.contentId).not.toBe(b.overlay.contentId);
    });
  });
});
