import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesSheet, type AndesSheetSide } from './sheet';
import { AndesSheetClose } from './sheet-close';
import {
  AndesSheetDescription,
  AndesSheetFooter,
  AndesSheetHeader,
  AndesSheetTitle,
} from './sheet-parts';
import { AndesSheetTrigger } from './sheet-trigger';

/**
 * jsdom reports zero geometry for every element, which makes CDK's
 * `InteractivityChecker` treat them all as invisible and therefore untabbable.
 * Giving elements a nominal size is the only way to exercise real focus-trap
 * behavior here; it says nothing about the component itself. Mirrors the same
 * helper in `overlay-primitive.spec.ts`.
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
    AndesSheet,
    AndesSheetTrigger,
    AndesSheetHeader,
    AndesSheetTitle,
    AndesSheetDescription,
    AndesSheetFooter,
    AndesSheetClose,
  ],
  template: `
    <button type="button" id="outside">Outside</button>
    <andes-sheet
      [side]="side()"
      [(open)]="open"
      [closeOnEscape]="closeOnEscape()"
      [closeOnOutsideClick]="closeOnOutsideClick()"
    >
      <button type="button" andesSheetTrigger id="trigger">Open</button>

      <andes-sheet-header>
        <andes-sheet-title id="title">Edit profile</andes-sheet-title>
        <andes-sheet-description id="description"
          >Make changes here.</andes-sheet-description
        >
      </andes-sheet-header>

      <input id="middle" />

      <andes-sheet-footer>
        <button type="button" andesSheetClose id="cancel">Cancel</button>
      </andes-sheet-footer>
    </andes-sheet>
  `,
})
class HostComponent {
  readonly side = signal<AndesSheetSide>('right');
  readonly open = signal(false);
  readonly closeOnEscape = signal(true);
  readonly closeOnOutsideClick = signal(true);
}

/**
 * Stands in for a wrapper button component such as `AndesButton`: a
 * non-focusable custom-element host whose real `<button>` lives in its template.
 * Deliberately a local stub rather than the real `AndesButton`, so this spec
 * tests the trigger's contract with *any* such wrapper, not one component.
 */
@Component({
  selector: 'andes-test-wrapper-button',
  template: '<button type="button"><ng-content /></button>',
})
class WrapperButtonComponent {}

@Component({
  imports: [
    AndesSheet,
    AndesSheetTrigger,
    AndesSheetHeader,
    AndesSheetTitle,
    WrapperButtonComponent,
  ],
  template: `
    <andes-sheet>
      <andes-test-wrapper-button andesSheetTrigger
        >Open</andes-test-wrapper-button
      >

      <andes-sheet-header>
        <andes-sheet-title>Edit profile</andes-sheet-title>
      </andes-sheet-header>
    </andes-sheet>
  `,
})
class WrapperTriggerHostComponent {}

describe('AndesSheet', () => {
  withElementGeometry();
  withScrollableDocument();

  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const sheetDebugElement = fixture.debugElement.query(
      (node) => node.componentInstance instanceof AndesSheet,
    );
    const sheet = sheetDebugElement.componentInstance as AndesSheet;

    const byId = (id: string) =>
      (fixture.nativeElement.querySelector(`#${id}`) ??
        document.querySelector(`#${id}`)) as HTMLElement;

    return {
      fixture,
      host: fixture.componentInstance,
      sheet,
      trigger: () => byId('trigger'),
      outside: () => byId('outside'),
      panel: () => document.querySelector('.andes-sheet__panel'),
      cancel: () => byId('cancel'),
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

  it('is closed until the trigger is clicked', () => {
    const { panel } = createHost();

    expect(panel()).toBeNull();
  });

  it('opens on trigger click and updates the bound `open` model', () => {
    const { fixture, trigger, panel, host } = createHost();

    clickOn(trigger());
    fixture.detectChanges();

    expect(panel()).toBeTruthy();
    expect(host.open()).toBe(true);
  });

  it('toggles closed on a second trigger click', () => {
    const { fixture, trigger, panel } = createHost();

    clickOn(trigger());
    fixture.detectChanges();
    clickOn(trigger());
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  it('closes on Escape and syncs the model back to false', () => {
    const { fixture, trigger, panel, host } = createHost();
    clickOn(trigger());
    fixture.detectChanges();

    pressEscape();
    fixture.detectChanges();

    expect(panel()).toBeNull();
    expect(host.open()).toBe(false);
  });

  it('does not close on Escape when closeOnEscape is false', () => {
    const { fixture, host, trigger, panel } = createHost();
    host.closeOnEscape.set(false);
    fixture.detectChanges();
    clickOn(trigger());
    fixture.detectChanges();

    pressEscape();
    fixture.detectChanges();

    expect(panel()).toBeTruthy();
  });

  it('closes on an outside click', () => {
    const { fixture, trigger, outside, panel } = createHost();
    clickOn(trigger());
    fixture.detectChanges();

    clickOn(outside());
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  it('does not close on outside click when closeOnOutsideClick is false', () => {
    const { fixture, host, trigger, outside, panel } = createHost();
    host.closeOnOutsideClick.set(false);
    fixture.detectChanges();
    clickOn(trigger());
    fixture.detectChanges();

    clickOn(outside());
    fixture.detectChanges();

    expect(panel()).toBeTruthy();
  });

  it('closes on a backdrop click', () => {
    const { fixture, trigger, panel } = createHost();
    clickOn(trigger());
    fixture.detectChanges();

    const backdrop = document.querySelector('.andes-overlay-backdrop');
    expect(backdrop).toBeTruthy();
    clickOn(backdrop as HTMLElement);
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  it('closes via a consumer-authored andesSheetClose button', () => {
    const { fixture, trigger, cancel, panel } = createHost();
    clickOn(trigger());
    fixture.detectChanges();

    cancel().click();
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  it('closes via the built-in close-icon button', () => {
    const { fixture, trigger, panel } = createHost();
    clickOn(trigger());
    fixture.detectChanges();

    const closeIcon = document.querySelector<HTMLButtonElement>(
      '.andes-sheet__close',
    );
    expect(closeIcon).toBeTruthy();
    closeIcon?.click();
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });

  it('opens programmatically when the `open` model is set to true', () => {
    const { fixture, host, panel } = createHost();

    host.open.set(true);
    fixture.detectChanges();

    expect(panel()).toBeTruthy();
  });

  describe('side positioning', () => {
    it.each(['top', 'right', 'bottom', 'left'] as const)(
      'reflects data-side="%s" on the panel',
      (side) => {
        const { fixture, host, trigger, panel } = createHost();
        host.side.set(side);
        fixture.detectChanges();
        clickOn(trigger());
        fixture.detectChanges();

        expect(panel()?.getAttribute('data-side')).toBe(side);
      },
    );

    it('defaults to the right edge', () => {
      const { fixture, trigger, panel } = createHost();
      clickOn(trigger());
      fixture.detectChanges();

      expect(panel()?.getAttribute('data-side')).toBe('right');
    });
  });

  describe('accessibility', () => {
    it('renders role="dialog" and aria-modal="true"', () => {
      const { fixture, trigger, panel } = createHost();
      clickOn(trigger());
      fixture.detectChanges();

      expect(panel()?.getAttribute('role')).toBe('dialog');
      expect(panel()?.getAttribute('aria-modal')).toBe('true');
    });

    it('links the panel to its title and description', () => {
      const { fixture, trigger, panel } = createHost();
      clickOn(trigger());
      fixture.detectChanges();

      const titleId = document.querySelector('#title h2')?.id;
      const descriptionId = document.querySelector('#description p')?.id;

      expect(panel()?.getAttribute('aria-labelledby')).toBe(titleId);
      expect(panel()?.getAttribute('aria-describedby')).toBe(descriptionId);
    });

    it('exposes aria-expanded and aria-controls on the trigger', () => {
      const { fixture, trigger, panel } = createHost();
      expect(trigger().getAttribute('aria-expanded')).toBe('false');

      clickOn(trigger());
      fixture.detectChanges();

      expect(trigger().getAttribute('aria-expanded')).toBe('true');
      expect(trigger().getAttribute('aria-controls')).toBe(panel()?.id);
    });
  });

  describe('focus management', () => {
    it('traps focus inside the panel while open', async () => {
      const { fixture, trigger, outside, panel } = createHost();
      clickOn(trigger());
      fixture.detectChanges();
      await fixture.whenStable();

      outside().focus();
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(panel()?.contains(document.activeElement)).toBe(true);
    });

    it('returns focus to the trigger on close', async () => {
      const { fixture, trigger } = createHost();
      trigger().focus();
      clickOn(trigger());
      fixture.detectChanges();
      await fixture.whenStable();
      expect(document.activeElement).not.toBe(trigger());

      pressEscape();
      fixture.detectChanges();

      expect(document.activeElement).toBe(trigger());
    });

    // Regression: the trigger registers itself as the element focus returns to,
    // but a wrapper-component host (`<andes-button andesSheetTrigger>`) is not
    // focusable - focus() on it no-ops and focus would be stranded on <body>.
    it('returns focus to the inner control when the trigger is a wrapper component', async () => {
      const fixture = TestBed.createComponent(WrapperTriggerHostComponent);
      fixture.detectChanges();
      await fixture.whenStable();

      const innerButton = fixture.nativeElement.querySelector(
        'andes-test-wrapper-button button',
      ) as HTMLElement;
      innerButton.focus();

      clickOn(innerButton);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(document.activeElement).not.toBe(innerButton);

      pressEscape();
      fixture.detectChanges();

      expect(document.activeElement).toBe(innerButton);
    });
  });

  describe('scroll lock', () => {
    it('blocks document scroll while open and releases it on close', () => {
      const { fixture, trigger } = createHost();
      clickOn(trigger());
      fixture.detectChanges();

      expect(
        document.documentElement.classList.contains('cdk-global-scrollblock'),
      ).toBe(true);

      pressEscape();
      fixture.detectChanges();

      expect(
        document.documentElement.classList.contains('cdk-global-scrollblock'),
      ).toBe(false);
    });
  });
});
