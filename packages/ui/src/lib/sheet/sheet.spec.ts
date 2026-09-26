import { Component, DestroyRef, inject, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesSheet, type AndesSheetSide } from './sheet';
import { AndesSheetClose } from './sheet-close';
import { AndesSheetContent } from './sheet-content';
import type { AndesEdgePanelAutoFocus, AndesEdgePanelSize } from './edge-panel';
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

@Component({
  selector: 'andes-test-counter',
  template: '<input id="lazy-input" />',
})
class LazyCounterComponent {
  static created = 0;
  static destroyed = 0;

  constructor() {
    LazyCounterComponent.created++;
    inject(DestroyRef).onDestroy(() => LazyCounterComponent.destroyed++);
  }
}

@Component({
  imports: [
    AndesSheet,
    AndesSheetTrigger,
    AndesSheetHeader,
    AndesSheetTitle,
    AndesSheetFooter,
    AndesSheetClose,
    AndesSheetContent,
    LazyCounterComponent,
  ],
  template: `
    <button type="button" id="outside">Outside</button>
    <ng-template #customIcon><span id="custom-icon">×</span></ng-template>
    <andes-sheet
      [side]="side()"
      [(open)]="open"
      [size]="size()"
      [width]="width()"
      [height]="height()"
      [mask]="mask()"
      [closable]="closable()"
      [closeIcon]="useCustomIcon() ? customIcon : null"
      [closeLabel]="closeLabel()"
      [loading]="loading()"
      [destroyOnHidden]="destroyOnHidden()"
      [zIndex]="zIndex()"
      [autoFocus]="autoFocus()"
      [panelClass]="panelClass()"
      (afterOpenChange)="afterOpenChange.push($event)"
    >
      <button type="button" andesSheetTrigger id="trigger">Open</button>

      <andes-sheet-header>
        <andes-sheet-title>Edit profile</andes-sheet-title>
        <button type="button" andesSheetExtra id="extra">Help</button>
      </andes-sheet-header>

      <p id="projected">Projected body</p>

      @if (useLazy()) {
        <ng-template andesSheetContent>
          <andes-test-counter />
        </ng-template>
      }

      <andes-sheet-footer>
        <button type="button" andesSheetClose id="cancel">Cancel</button>
      </andes-sheet-footer>
    </andes-sheet>
  `,
})
class FeatureHostComponent {
  readonly side = signal<AndesSheetSide>('right');
  readonly open = signal(false);
  readonly size = signal<AndesEdgePanelSize>('default');
  readonly width = signal<number | string | null>(null);
  readonly height = signal<number | string | null>(null);
  readonly mask = signal(true);
  readonly closable = signal(true);
  readonly useCustomIcon = signal(false);
  readonly closeLabel = signal('Close');
  readonly loading = signal(false);
  readonly destroyOnHidden = signal(false);
  readonly zIndex = signal<number | null>(null);
  readonly autoFocus = signal<AndesEdgePanelAutoFocus>(true);
  readonly panelClass = signal<string | null>(null);
  readonly useLazy = signal(false);
  readonly afterOpenChange: boolean[] = [];
}

@Component({
  imports: [AndesSheet, AndesSheetTrigger, AndesSheetClose],
  template: `
    <andes-sheet [push]="push()" [(open)]="parentOpen">
      <button type="button" andesSheetTrigger id="parent-trigger">Open</button>
      <andes-sheet [(open)]="childOpen" side="right">
        <button type="button" andesSheetTrigger id="child-trigger">
          Open child
        </button>
        <p id="child-body">Child</p>
      </andes-sheet>
    </andes-sheet>
  `,
})
class NestedHostComponent {
  readonly push = signal<boolean | number | string>(true);
  readonly parentOpen = signal(false);
  readonly childOpen = signal(false);
}

describe('AndesSheet (Ant Design Drawer parity)', () => {
  withElementGeometry();
  withScrollableDocument();

  beforeEach(() => {
    LazyCounterComponent.created = 0;
    LazyCounterComponent.destroyed = 0;
  });

  function clickOn(element: Element) {
    element.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
    );
    element.dispatchEvent(
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
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

  function setup() {
    const fixture = TestBed.createComponent(FeatureHostComponent);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const openSheet = () => {
      host.open.set(true);
      fixture.detectChanges();
    };
    const panel = () =>
      document.querySelector<HTMLElement>('.andes-sheet__panel');
    return { fixture, host, openSheet, panel };
  }

  describe('size / width / height', () => {
    it('leaves the default 378px to CSS (no inline size)', () => {
      const { openSheet, panel } = setup();
      openSheet();

      expect(panel()?.style.getPropertyValue('--andes-sheet-size')).toBe('');
    });

    it.each([
      ['large', '736px'],
      [520, '520px'],
      ['520', '520px'],
      ['40vw', '40vw'],
    ] as const)('maps size=%s to %s', (size, expected) => {
      const { fixture, host, openSheet, panel } = setup();
      host.size.set(size);
      fixture.detectChanges();
      openSheet();

      expect(panel()?.style.getPropertyValue('--andes-sheet-size')).toBe(
        expected,
      );
    });

    it('lets width win over size for left/right, and ignores height', () => {
      const { fixture, host, openSheet, panel } = setup();
      host.size.set('large');
      host.width.set(600);
      host.height.set(200);
      fixture.detectChanges();
      openSheet();

      expect(panel()?.style.getPropertyValue('--andes-sheet-size')).toBe(
        '600px',
      );
    });

    it('lets height win over size for top/bottom, and ignores width', () => {
      const { fixture, host, openSheet, panel } = setup();
      host.side.set('top');
      host.width.set(600);
      host.height.set('50vh');
      fixture.detectChanges();
      openSheet();

      expect(panel()?.style.getPropertyValue('--andes-sheet-size')).toBe(
        '50vh',
      );
    });

    it('adds panelClass next to the panel class', () => {
      const { fixture, host, openSheet, panel } = setup();
      host.panelClass.set('my-wide-sheet');
      fixture.detectChanges();
      openSheet();

      expect(panel()?.classList).toContain('andes-sheet__panel');
      expect(panel()?.classList).toContain('my-wide-sheet');
    });
  });

  describe('closable / closeIcon', () => {
    it('hides the built-in close button when closable is false', () => {
      const { fixture, host, openSheet } = setup();
      host.closable.set(false);
      fixture.detectChanges();
      openSheet();

      expect(document.querySelector('.andes-sheet__close')).toBeNull();
    });

    it('renders a custom closeIcon template and closeLabel', () => {
      const { fixture, host, openSheet } = setup();
      host.useCustomIcon.set(true);
      host.closeLabel.set('Cerrar');
      fixture.detectChanges();
      openSheet();

      const close = document.querySelector('.andes-sheet__close');
      expect(close?.querySelector('#custom-icon')).toBeTruthy();
      expect(close?.querySelector('svg')).toBeNull();
      expect(close?.getAttribute('aria-label')).toBe('Cerrar');
    });
  });

  describe('layout slots', () => {
    it('lays out header, scrolling body and footer as siblings, in order', () => {
      const { openSheet, panel } = setup();
      openSheet();

      const children = Array.from(panel()?.children ?? []);
      expect(children.map((child) => child.tagName.toLowerCase())).toEqual([
        'button',
        'andes-sheet-header',
        'div',
        'andes-sheet-footer',
      ]);
      expect(children[0].classList).toContain('andes-sheet__close');
      expect(children[2].classList).toContain('andes-sheet__body');
      expect(
        panel()?.querySelector('.andes-sheet__body #projected'),
      ).toBeTruthy();
    });

    it('projects andesSheetExtra at the trailing end of the header', () => {
      const { openSheet } = setup();
      openSheet();

      const header = document.querySelector('andes-sheet-header');
      expect(header?.lastElementChild?.id).toBe('extra');
      expect(
        header?.querySelector('.andes-sheet-header__text #extra'),
      ).toBeNull();
    });
  });

  describe('mask', () => {
    it('renders a modal panel with a backdrop by default', () => {
      const { openSheet, panel } = setup();
      openSheet();

      expect(document.querySelector('.andes-overlay-backdrop')).toBeTruthy();
      expect(panel()?.getAttribute('aria-modal')).toBe('true');
    });

    it('is non-modal without a mask: no backdrop, aria-modal or scroll lock', () => {
      const { fixture, host, openSheet, panel } = setup();
      host.mask.set(false);
      fixture.detectChanges();
      openSheet();

      expect(document.querySelector('.andes-overlay-backdrop')).toBeNull();
      expect(panel()?.getAttribute('aria-modal')).toBeNull();
      expect(
        document.documentElement.classList.contains('cdk-global-scrollblock'),
      ).toBe(false);
    });

    it('still closes on an outside click without a mask', () => {
      const { fixture, host, openSheet, panel } = setup();
      host.mask.set(false);
      fixture.detectChanges();
      openSheet();

      clickOn(document.querySelector('#outside') as HTMLElement);
      fixture.detectChanges();

      expect(panel()).toBeNull();
      expect(host.open()).toBe(false);
    });
  });

  describe('loading', () => {
    it('shows a skeleton, marks the body busy and hides the content', () => {
      const { fixture, host, openSheet } = setup();
      host.loading.set(true);
      fixture.detectChanges();
      openSheet();

      const body = document.querySelector('.andes-sheet__body');
      expect(body?.getAttribute('aria-busy')).toBe('true');
      expect(body?.querySelector('.andes-sheet__skeleton')).toBeTruthy();
      expect(
        (document.querySelector('#projected')?.parentElement as HTMLElement)
          .hidden,
      ).toBe(true);
      // The header and footer stay usable while loading.
      expect(document.querySelector('#cancel')).toBeTruthy();

      host.loading.set(false);
      fixture.detectChanges();

      expect(body?.querySelector('.andes-sheet__skeleton')).toBeNull();
      expect(body?.hasAttribute('aria-busy')).toBe(false);
    });
  });

  describe('lazy content / destroyOnHidden', () => {
    it('creates andesSheetContent only on first open', () => {
      const { fixture, host, openSheet } = setup();
      host.useLazy.set(true);
      fixture.detectChanges();

      expect(LazyCounterComponent.created).toBe(0);

      openSheet();

      expect(LazyCounterComponent.created).toBe(1);
      expect(
        document.querySelector('.andes-sheet__body andes-test-counter'),
      ).toBeTruthy();
    });

    it('keeps lazy content (and its state) alive between opens by default', () => {
      const { fixture, host, openSheet } = setup();
      host.useLazy.set(true);
      fixture.detectChanges();
      openSheet();
      (document.querySelector('#lazy-input') as HTMLInputElement).value =
        'typed';

      host.open.set(false);
      fixture.detectChanges();
      openSheet();

      expect(LazyCounterComponent.created).toBe(1);
      expect(LazyCounterComponent.destroyed).toBe(0);
      expect(
        (document.querySelector('#lazy-input') as HTMLInputElement).value,
      ).toBe('typed');
    });

    it('destroys lazy content on close with destroyOnHidden', () => {
      const { fixture, host, openSheet } = setup();
      host.useLazy.set(true);
      host.destroyOnHidden.set(true);
      fixture.detectChanges();
      openSheet();

      host.open.set(false);
      fixture.detectChanges();

      expect(LazyCounterComponent.destroyed).toBe(1);

      openSheet();

      expect(LazyCounterComponent.created).toBe(2);
    });

    it('destroys kept-alive lazy content with the sheet', () => {
      const { fixture, host, openSheet } = setup();
      host.useLazy.set(true);
      fixture.detectChanges();
      openSheet();
      host.open.set(false);
      fixture.detectChanges();

      fixture.destroy();

      expect(LazyCounterComponent.destroyed).toBe(1);
    });
  });

  describe('afterOpenChange and the slide-out', () => {
    it('emits true after opening and false after closing', () => {
      const { fixture, host, openSheet } = setup();
      openSheet();
      expect(host.afterOpenChange).toEqual([true]);

      pressEscape();
      fixture.detectChanges();

      expect(host.afterOpenChange).toEqual([true, false]);
    });

    describe('with a running CSS animation', () => {
      beforeEach(() => {
        const original = window.getComputedStyle.bind(window);
        vi.spyOn(window, 'getComputedStyle').mockImplementation(
          (element, pseudo) => {
            const style = original(element, pseudo);
            if (
              !(element as Element).classList.contains('andes-sheet__panel')
            ) {
              return style;
            }
            return {
              ...style,
              animationName: 'andes-sheet-slide',
              animationDuration: '0.2s',
              animationDelay: '0s',
            } as CSSStyleDeclaration;
          },
        );
      });

      afterEach(() => vi.restoreAllMocks());

      function endAnimation(panel: HTMLElement | null) {
        panel?.dispatchEvent(new Event('animationend'));
      }

      it('waits for the slide-in before emitting afterOpenChange(true)', () => {
        const { host, openSheet, panel } = setup();
        openSheet();
        expect(host.afterOpenChange).toEqual([]);

        endAnimation(panel());

        expect(host.afterOpenChange).toEqual([true]);
      });

      it('keeps the panel mounted with data-closing until the slide-out ends', () => {
        const { fixture, host, openSheet, panel } = setup();
        openSheet();
        endAnimation(panel());

        pressEscape();
        fixture.detectChanges();

        // The model flips immediately; the DOM waits for the animation.
        expect(host.open()).toBe(false);
        expect(panel()).toBeTruthy();
        expect(panel()?.hasAttribute('data-closing')).toBe(true);
        expect(host.afterOpenChange).toEqual([true]);

        endAnimation(panel());
        fixture.detectChanges();

        expect(panel()).toBeNull();
        expect(host.afterOpenChange).toEqual([true, false]);
      });

      it('falls back to a timer when animationend never fires', async () => {
        vi.useFakeTimers();
        try {
          const { fixture, openSheet, panel } = setup();
          openSheet();
          document.querySelector<HTMLButtonElement>('#cancel')?.click();
          fixture.detectChanges();
          expect(panel()).toBeTruthy();

          vi.advanceTimersByTime(300);

          expect(panel()).toBeNull();
        } finally {
          vi.useRealTimers();
        }
      });

      it('stays open when re-opened during the slide-out', () => {
        const { fixture, host, openSheet, panel } = setup();
        openSheet();
        endAnimation(panel());
        const openPanel = panel();

        host.open.set(false);
        fixture.detectChanges();
        expect(openPanel?.hasAttribute('data-closing')).toBe(true);

        openSheet();
        endAnimation(openPanel);
        fixture.detectChanges();

        expect(panel()).toBe(openPanel);
        expect(openPanel?.hasAttribute('data-closing')).toBe(false);
        expect(host.open()).toBe(true);
      });
    });
  });

  describe('zIndex', () => {
    it('overrides the layer z-index on the overlay host and backdrop', () => {
      const { fixture, host, openSheet, panel } = setup();
      host.zIndex.set(2345);
      fixture.detectChanges();
      openSheet();

      const pane = panel()?.closest('.cdk-overlay-pane') as HTMLElement;
      expect(pane.parentElement?.style.zIndex).toBe('2345');
      expect(
        document.querySelector<HTMLElement>('.andes-overlay-backdrop')?.style
          .zIndex,
      ).toBe('2345');
    });
  });

  describe('autoFocus', () => {
    it('moves focus into the panel by default', async () => {
      const { fixture, openSheet, panel } = setup();
      openSheet();
      await fixture.whenStable();

      expect(panel()?.contains(document.activeElement)).toBe(true);
    });

    it('leaves focus where it was when autoFocus is false', async () => {
      const { fixture, host, openSheet, panel } = setup();
      host.autoFocus.set(false);
      fixture.detectChanges();
      const outside = document.querySelector('#outside') as HTMLElement;
      outside.focus();
      openSheet();
      await fixture.whenStable();

      expect(panel()?.contains(document.activeElement)).toBe(false);
    });
  });

  describe('nested sheets and push', () => {
    function setupNested() {
      const fixture = TestBed.createComponent(NestedHostComponent);
      fixture.detectChanges();
      const host = fixture.componentInstance;
      host.parentOpen.set(true);
      fixture.detectChanges();
      const panels = () =>
        Array.from(
          document.querySelectorAll<HTMLElement>('.andes-sheet__panel'),
        );
      return { fixture, host, panels };
    }

    it('pushes the parent while a nested sheet is open', () => {
      const { fixture, host, panels } = setupNested();
      expect(panels()[0].hasAttribute('data-pushed')).toBe(false);

      host.childOpen.set(true);
      fixture.detectChanges();

      expect(panels()).toHaveLength(2);
      expect(panels()[0].hasAttribute('data-pushed')).toBe(true);
      expect(
        panels()[0].style.getPropertyValue('--andes-sheet-push-distance'),
      ).toBe('180px');
      expect(panels()[1].hasAttribute('data-pushed')).toBe(false);

      host.childOpen.set(false);
      fixture.detectChanges();

      expect(panels()[0].hasAttribute('data-pushed')).toBe(false);
    });

    it('accepts a custom push distance', () => {
      const { fixture, host, panels } = setupNested();
      host.push.set(240);
      host.childOpen.set(true);
      fixture.detectChanges();

      expect(
        panels()[0].style.getPropertyValue('--andes-sheet-push-distance'),
      ).toBe('240px');
    });

    it('does not push unless opted in', () => {
      const { fixture, host, panels } = setupNested();
      host.push.set(false);
      host.childOpen.set(true);
      fixture.detectChanges();

      expect(panels()[0].hasAttribute('data-pushed')).toBe(false);
    });

    it('closes only the nested sheet on its backdrop click or Escape', () => {
      const { fixture, host } = setupNested();
      host.childOpen.set(true);
      fixture.detectChanges();

      const backdrops = document.querySelectorAll('.andes-overlay-backdrop');
      clickOn(backdrops[backdrops.length - 1]);
      fixture.detectChanges();

      expect(host.childOpen()).toBe(false);
      expect(host.parentOpen()).toBe(true);

      host.childOpen.set(true);
      fixture.detectChanges();
      pressEscape();
      fixture.detectChanges();

      expect(host.childOpen()).toBe(false);
      expect(host.parentOpen()).toBe(true);
    });
  });
});
