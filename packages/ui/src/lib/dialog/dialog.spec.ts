import type { AndesOverlayCloseReason } from '@andes-ng/primitives';
import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ANDES_ALERT_DIALOG_IMPORTS, AndesAlertDialog } from './alert-dialog';
import { ANDES_DIALOG_IMPORTS, AndesDialog } from './dialog';
import type { AndesDialogSize } from './dialog-base';

/**
 * jsdom reports zero geometry for every element, which makes CDK's
 * `InteractivityChecker` treat them all as invisible and therefore untabbable.
 * Giving elements a nominal size is the only way to exercise real focus-trap
 * behavior here; it says nothing about the components themselves.
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

const SCROLL_BLOCK_CLASS = 'cdk-global-scrollblock';

@Component({
  imports: [ANDES_DIALOG_IMPORTS],
  template: `
    <button type="button" id="outside">Outside</button>

    <andes-dialog
      [(open)]="open"
      [size]="size()"
      [closeOnEscape]="closeOnEscape()"
      [closeOnOutsideClick]="closeOnOutsideClick()"
      [lockScroll]="lockScroll()"
      (closed)="reasons.push($event)"
      (opened)="openedCount = openedCount + 1"
    >
      @if (showTrigger()) {
        <button type="button" id="trigger" andesDialogTrigger>Open</button>
      }

      <andes-dialog-content
        *andesDialogContent
        [showCloseButton]="showCloseButton()"
      >
        <div andesDialogHeader>
          <h2 andesDialogTitle id="title">Edit profile</h2>
          <p andesDialogDescription id="description">Change your name.</p>
        </div>

        <input id="name" />

        <div andesDialogFooter>
          <button type="button" id="cancel" andesDialogClose>Cancel</button>
          <button type="button" id="save">Save</button>
        </div>
      </andes-dialog-content>
    </andes-dialog>

    <button type="button" id="after">After</button>
  `,
})
class DialogHost {
  readonly dialog = viewChild.required(AndesDialog);
  readonly open = signal(false);
  readonly size = signal<AndesDialogSize>('md');
  readonly closeOnEscape = signal(true);
  readonly closeOnOutsideClick = signal(true);
  readonly lockScroll = signal(true);
  readonly showCloseButton = signal(true);
  readonly showTrigger = signal(true);
  readonly reasons: AndesOverlayCloseReason[] = [];
  openedCount = 0;
}

@Component({
  imports: [ANDES_ALERT_DIALOG_IMPORTS],
  template: `
    <button type="button" id="outside">Outside</button>

    <andes-alert-dialog
      [(open)]="open"
      [closeOnEscape]="closeOnEscape()"
      (closed)="reasons.push($event)"
    >
      <button type="button" id="trigger" andesAlertDialogTrigger>Delete</button>

      <andes-alert-dialog-content *andesAlertDialogContent>
        <div andesAlertDialogHeader>
          <h2 andesAlertDialogTitle id="title">Delete this project?</h2>
          <p andesAlertDialogDescription id="description">
            This cannot be undone.
          </p>
        </div>

        <div andesAlertDialogFooter>
          <button type="button" id="cancel" andesAlertDialogCancel>
            Cancel
          </button>
          <button
            type="button"
            id="action"
            andesAlertDialogAction
            (click)="confirmed = true"
          >
            Delete
          </button>
        </div>
      </andes-alert-dialog-content>
    </andes-alert-dialog>
  `,
})
class AlertDialogHost {
  readonly dialog = viewChild.required(AndesAlertDialog);
  readonly open = signal(false);
  readonly closeOnEscape = signal(true);
  readonly reasons: AndesOverlayCloseReason[] = [];
  confirmed = false;
}

describe('AndesDialog', () => {
  withElementGeometry();

  function createHost() {
    const fixture = TestBed.createComponent(DialogHost);
    fixture.detectChanges();
    const host = fixture.componentInstance;

    const inPage = (id: string) =>
      (fixture.nativeElement as HTMLElement).querySelector(
        `#${id}`,
      ) as HTMLElement;
    const surface = () =>
      document.querySelector('[data-slot="dialog-content"]') as HTMLElement;
    const inDialog = (id: string) =>
      surface()?.querySelector(`#${id}`) as HTMLElement;

    return {
      fixture,
      host,
      inPage,
      inDialog,
      surface,
      trigger: () => inPage('trigger'),
      outside: () => inPage('outside'),
      pane: () => document.querySelector('.andes-overlay-pane') as HTMLElement,
      backdrop: () =>
        document.querySelector('.andes-overlay-backdrop') as HTMLElement,
      closeButton: () =>
        surface()?.querySelector(
          '[data-slot="dialog-close-button"]',
        ) as HTMLElement,
      async openViaTrigger() {
        clickOn(inPage('trigger'));
        fixture.detectChanges();
        await fixture.whenStable();
      },
    };
  }

  describe('open and close', () => {
    it('renders nothing until it is opened', () => {
      const { surface } = createHost();

      expect(surface()).toBeNull();
    });

    it('opens when the trigger is clicked', async () => {
      const { host, surface, openViaTrigger } = createHost();
      await openViaTrigger();

      expect(surface()).toBeTruthy();
      expect(host.dialog().isOpen()).toBe(true);
      expect(host.open()).toBe(true);
      expect(host.openedCount).toBe(1);
    });

    it('closes again when the trigger is clicked while open', async () => {
      const { fixture, host, surface, openViaTrigger, inPage } = createHost();
      await openViaTrigger();

      clickOn(inPage('trigger'));
      fixture.detectChanges();

      expect(surface()).toBeNull();
      expect(host.reasons).toContain('trigger');
    });

    it('portals the surface out of the host, into the CDK overlay container', async () => {
      const { fixture, surface, openViaTrigger } = createHost();
      await openViaTrigger();

      expect(fixture.nativeElement.contains(surface())).toBe(false);
      expect(surface().closest('.cdk-overlay-container')).toBeTruthy();
    });

    it('opens from the two-way open input', async () => {
      const { fixture, host, surface } = createHost();
      host.open.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(surface()).toBeTruthy();
    });

    it('opens from the imperative show()/hide() pair', async () => {
      const { fixture, host, surface } = createHost();
      host.dialog().show();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(surface()).toBeTruthy();

      host.dialog().hide();
      fixture.detectChanges();

      expect(surface()).toBeNull();
      expect(host.reasons).toContain('imperative');
    });

    it('closes on Escape', async () => {
      const { fixture, host, surface, openViaTrigger } = createHost();
      await openViaTrigger();

      pressEscape();
      fixture.detectChanges();

      expect(surface()).toBeNull();
      expect(host.reasons).toEqual(['escape-key']);
    });

    it('ignores Escape when closeOnEscape is off', async () => {
      const { fixture, host, surface, openViaTrigger } = createHost();
      host.closeOnEscape.set(false);
      fixture.detectChanges();
      await openViaTrigger();

      pressEscape();
      fixture.detectChanges();

      expect(surface()).toBeTruthy();
    });

    it('closes on a backdrop click', async () => {
      const { fixture, host, surface, backdrop, openViaTrigger } = createHost();
      await openViaTrigger();

      clickOn(backdrop());
      fixture.detectChanges();

      expect(surface()).toBeNull();
      expect(host.reasons).toEqual(['backdrop-click']);
    });

    it('ignores a backdrop click when closeOnOutsideClick is off', async () => {
      const { fixture, host, surface, backdrop, openViaTrigger } = createHost();
      host.closeOnOutsideClick.set(false);
      fixture.detectChanges();
      await openViaTrigger();

      clickOn(backdrop());
      fixture.detectChanges();

      expect(surface()).toBeTruthy();
    });

    it('closes from the built-in close button', async () => {
      const { fixture, host, surface, closeButton, openViaTrigger } =
        createHost();
      await openViaTrigger();

      clickOn(closeButton());
      fixture.detectChanges();

      expect(surface()).toBeNull();
      expect(host.reasons).toEqual(['close-button']);
    });

    it('closes from a consumer [andesDialogClose] control', async () => {
      const { fixture, host, surface, inDialog, openViaTrigger } = createHost();
      await openViaTrigger();

      clickOn(inDialog('cancel'));
      fixture.detectChanges();

      expect(surface()).toBeNull();
      expect(host.reasons).toEqual(['close-button']);
    });

    it('omits the built-in close button when asked to', async () => {
      const { fixture, host, closeButton, openViaTrigger } = createHost();
      host.showCloseButton.set(false);
      fixture.detectChanges();
      await openViaTrigger();

      expect(closeButton()).toBeNull();
    });

    it('syncs the two-way open input back to false on every close path', async () => {
      const { fixture, host, openViaTrigger } = createHost();
      await openViaTrigger();
      expect(host.open()).toBe(true);

      pressEscape();
      fixture.detectChanges();

      expect(host.open()).toBe(false);
    });
  });

  describe('focus management', () => {
    it('moves focus into the dialog on open', async () => {
      const { inDialog, openViaTrigger } = createHost();
      await openViaTrigger();

      expect(document.activeElement).toBe(inDialog('name'));
    });

    it('traps focus inside while open', async () => {
      const { pane, outside, inDialog, openViaTrigger } = createHost();
      await openViaTrigger();

      outside().focus();
      // CDK's focus-trap strategy re-traps on a macrotask.
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(pane().contains(document.activeElement)).toBe(true);
      expect(document.activeElement).toBe(inDialog('name'));
    });

    it('pulls focus back from either side of the surface, which is where Tab and Shift+Tab would land', async () => {
      const { pane, inPage, openViaTrigger } = createHost();
      await openViaTrigger();

      for (const id of ['outside', 'after']) {
        inPage(id).focus();
        // CDK's focus-trap strategy re-traps on a macrotask.
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(document.activeElement).not.toBe(inPage(id));
        expect(pane().contains(document.activeElement)).toBe(true);
      }
    });

    it('lets focus move freely between the controls inside the surface', async () => {
      const { pane, inDialog, openViaTrigger } = createHost();
      await openViaTrigger();

      for (const id of ['cancel', 'save', 'name']) {
        inDialog(id).focus();
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(document.activeElement).toBe(inDialog(id));
        expect(pane().contains(document.activeElement)).toBe(true);
      }
    });

    it('returns focus to the trigger on close', async () => {
      const { fixture, trigger, openViaTrigger } = createHost();
      trigger().focus();
      await openViaTrigger();
      expect(document.activeElement).not.toBe(trigger());

      pressEscape();
      fixture.detectChanges();

      expect(document.activeElement).toBe(trigger());
    });

    it('returns focus to the trigger even when something else had focus at open time', async () => {
      const { fixture, host, trigger, outside } = createHost();
      outside().focus();
      host.dialog().show();
      fixture.detectChanges();
      await fixture.whenStable();

      host.dialog().hide();
      fixture.detectChanges();

      expect(document.activeElement).toBe(trigger());
    });

    it('does not throw when the trigger was removed while open', async () => {
      const { fixture, host, trigger, openViaTrigger } = createHost();
      trigger().focus();
      await openViaTrigger();

      host.showTrigger.set(false);
      fixture.detectChanges();

      expect(() => {
        pressEscape();
        fixture.detectChanges();
      }).not.toThrow();
    });
  });

  describe('accessibility wiring', () => {
    it('renders role="dialog" with aria-modal="true"', async () => {
      const { surface, openViaTrigger } = createHost();
      await openViaTrigger();

      expect(surface().getAttribute('role')).toBe('dialog');
      expect(surface().getAttribute('aria-modal')).toBe('true');
    });

    it('labels and describes the surface from its title and description parts', async () => {
      const { surface, inDialog, openViaTrigger } = createHost();
      await openViaTrigger();

      expect(surface().getAttribute('aria-labelledby')).toBe(
        inDialog('title').id,
      );
      expect(surface().getAttribute('aria-describedby')).toBe(
        inDialog('description').id,
      );
    });

    it('relates the trigger to the surface while open', async () => {
      const { fixture, trigger, surface, openViaTrigger } = createHost();
      expect(trigger().getAttribute('aria-expanded')).toBe('false');

      await openViaTrigger();

      expect(trigger().getAttribute('aria-expanded')).toBe('true');
      expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
      expect(trigger().getAttribute('aria-controls')).toBe(surface().id);

      pressEscape();
      fixture.detectChanges();

      expect(trigger().getAttribute('aria-expanded')).toBe('false');
    });

    it('labels the built-in close button', async () => {
      const { closeButton, openViaTrigger } = createHost();
      await openViaTrigger();

      expect(closeButton().getAttribute('aria-label')).toBe('Close');
    });

    it('reflects open state as data-state on the trigger and surface', async () => {
      const { trigger, surface, openViaTrigger } = createHost();
      await openViaTrigger();

      expect(trigger().getAttribute('data-state')).toBe('open');
      expect(surface().getAttribute('data-state')).toBe('open');
    });
  });

  describe('surface styling', () => {
    it('applies the size class', async () => {
      const { fixture, host, surface, openViaTrigger } = createHost();
      host.size.set('lg');
      fixture.detectChanges();
      await openViaTrigger();

      expect(surface().classList).toContain('andes-dialog');
      expect(surface().classList).toContain('andes-dialog--lg');
    });

    it('renders the backdrop scrim from --andes-color-overlay', async () => {
      const { backdrop, openViaTrigger } = createHost();
      await openViaTrigger();

      expect(backdrop().style.getPropertyValue('background')).toBe(
        'var(--andes-color-overlay, rgb(15 23 42 / 45%))',
      );
    });

    it('stacks on the modal z-index layer', async () => {
      const { pane, openViaTrigger } = createHost();
      await openViaTrigger();

      expect(pane().parentElement?.style.getPropertyValue('z-index')).toBe(
        'var(--andes-z-index-modal, 1050)',
      );
    });
  });

  describe('background scroll', () => {
    withScrollableDocument();

    it('locks document scroll while open and releases it on close', async () => {
      const { fixture, openViaTrigger } = createHost();
      await openViaTrigger();

      expect(document.documentElement.classList).toContain(SCROLL_BLOCK_CLASS);

      pressEscape();
      fixture.detectChanges();

      expect(document.documentElement.classList).not.toContain(
        SCROLL_BLOCK_CLASS,
      );
    });

    it('leaves scroll alone when lockScroll is off', async () => {
      const { fixture, host, openViaTrigger } = createHost();
      host.lockScroll.set(false);
      fixture.detectChanges();
      await openViaTrigger();

      expect(document.documentElement.classList).not.toContain(
        SCROLL_BLOCK_CLASS,
      );
    });

    it('releases the lock when the host is destroyed while open', async () => {
      const { fixture, openViaTrigger } = createHost();
      await openViaTrigger();
      expect(document.documentElement.classList).toContain(SCROLL_BLOCK_CLASS);

      fixture.destroy();

      expect(document.documentElement.classList).not.toContain(
        SCROLL_BLOCK_CLASS,
      );
    });
  });
});

describe('AndesAlertDialog', () => {
  withElementGeometry();

  function createHost() {
    const fixture = TestBed.createComponent(AlertDialogHost);
    fixture.detectChanges();
    const host = fixture.componentInstance;

    const inPage = (id: string) =>
      (fixture.nativeElement as HTMLElement).querySelector(
        `#${id}`,
      ) as HTMLElement;
    const surface = () =>
      document.querySelector(
        '[data-slot="alert-dialog-content"]',
      ) as HTMLElement;
    const inDialog = (id: string) =>
      surface()?.querySelector(`#${id}`) as HTMLElement;

    return {
      fixture,
      host,
      surface,
      inDialog,
      trigger: () => inPage('trigger'),
      outside: () => inPage('outside'),
      pane: () => document.querySelector('.andes-overlay-pane') as HTMLElement,
      backdrop: () =>
        document.querySelector('.andes-overlay-backdrop') as HTMLElement,
      async openViaTrigger() {
        clickOn(inPage('trigger'));
        fixture.detectChanges();
        await fixture.whenStable();
      },
    };
  }

  it('opens when the trigger is clicked', async () => {
    const { surface, openViaTrigger } = createHost();
    await openViaTrigger();

    expect(surface()).toBeTruthy();
  });

  it('renders role="alertdialog" with aria-modal="true"', async () => {
    const { surface, openViaTrigger } = createHost();
    await openViaTrigger();

    expect(surface().getAttribute('role')).toBe('alertdialog');
    expect(surface().getAttribute('aria-modal')).toBe('true');
  });

  it('advertises a dialog popup on the trigger, since alertdialog is not a valid aria-haspopup token', async () => {
    const { trigger, openViaTrigger } = createHost();
    await openViaTrigger();

    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');
  });

  it('labels and describes the surface from its title and description parts', async () => {
    const { surface, inDialog, openViaTrigger } = createHost();
    await openViaTrigger();

    expect(surface().getAttribute('aria-labelledby')).toBe(
      inDialog('title').id,
    );
    expect(surface().getAttribute('aria-describedby')).toBe(
      inDialog('description').id,
    );
  });

  it('does NOT close on a backdrop click', async () => {
    const { fixture, host, surface, backdrop, openViaTrigger } = createHost();
    await openViaTrigger();

    clickOn(backdrop());
    fixture.detectChanges();

    expect(surface()).toBeTruthy();
    expect(host.open()).toBe(true);
    expect(host.reasons).toEqual([]);
  });

  it('does NOT close on a pointer event elsewhere outside the surface', async () => {
    const { fixture, surface, outside, openViaTrigger } = createHost();
    await openViaTrigger();

    clickOn(outside());
    fixture.detectChanges();

    expect(surface()).toBeTruthy();
  });

  it('renders no built-in close button - the dismiss path is the labelled Cancel action', async () => {
    const { surface, openViaTrigger } = createHost();
    await openViaTrigger();

    expect(surface().querySelector('[data-slot="dialog-close-button"]')).toBe(
      null,
    );
  });

  it('closes on Escape', async () => {
    const { fixture, host, surface, openViaTrigger } = createHost();
    await openViaTrigger();

    pressEscape();
    fixture.detectChanges();

    expect(surface()).toBeNull();
    expect(host.reasons).toEqual(['escape-key']);
  });

  it('can refuse Escape too, for a confirmation that must be answered', async () => {
    const { fixture, host, surface, openViaTrigger } = createHost();
    host.closeOnEscape.set(false);
    fixture.detectChanges();
    await openViaTrigger();

    pressEscape();
    fixture.detectChanges();

    expect(surface()).toBeTruthy();
  });

  it('closes from the Cancel action', async () => {
    const { fixture, host, surface, inDialog, openViaTrigger } = createHost();
    await openViaTrigger();

    clickOn(inDialog('cancel'));
    fixture.detectChanges();

    expect(surface()).toBeNull();
    expect(host.reasons).toEqual(['close-button']);
    expect(host.confirmed).toBe(false);
  });

  it('closes from the affirmative action, after running the consumer handler', async () => {
    const { fixture, host, surface, inDialog, openViaTrigger } = createHost();
    await openViaTrigger();

    clickOn(inDialog('action'));
    fixture.detectChanges();

    expect(host.confirmed).toBe(true);
    expect(surface()).toBeNull();
    expect(host.reasons).toEqual(['close-button']);
  });

  it('puts initial focus on Cancel, the safe choice, from DOM order alone', async () => {
    const { inDialog, openViaTrigger } = createHost();
    await openViaTrigger();

    expect(document.activeElement).toBe(inDialog('cancel'));
  });

  it('traps focus inside while open', async () => {
    const { pane, outside, openViaTrigger } = createHost();
    await openViaTrigger();

    outside().focus();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(pane().contains(document.activeElement)).toBe(true);
  });

  it('returns focus to the trigger on close', async () => {
    const { fixture, trigger, inDialog, openViaTrigger } = createHost();
    trigger().focus();
    await openViaTrigger();

    clickOn(inDialog('cancel'));
    fixture.detectChanges();

    expect(document.activeElement).toBe(trigger());
  });

  it('stacks on the modal z-index layer, above a drawer', async () => {
    const { pane, openViaTrigger } = createHost();
    await openViaTrigger();

    expect(pane().parentElement?.style.getPropertyValue('z-index')).toBe(
      'var(--andes-z-index-modal, 1050)',
    );
  });

  it('marks the surface as the alert variant', async () => {
    const { surface, openViaTrigger } = createHost();
    await openViaTrigger();

    expect(surface().classList).toContain('andes-dialog--alert');
  });

  describe('background scroll', () => {
    withScrollableDocument();

    it('locks document scroll while open and releases it on close', async () => {
      const { fixture, openViaTrigger } = createHost();
      await openViaTrigger();

      expect(document.documentElement.classList).toContain(SCROLL_BLOCK_CLASS);

      pressEscape();
      fixture.detectChanges();

      expect(document.documentElement.classList).not.toContain(
        SCROLL_BLOCK_CLASS,
      );
    });
  });
});
