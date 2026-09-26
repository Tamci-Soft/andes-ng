import type { AndesOverlayCloseReason } from '@andes-ng/primitives';
import { Component, Directive, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { AndesButtonVariant } from '../button/button';
import { ANDES_ALERT_DIALOG_IMPORTS } from './alert-dialog';
import { ANDES_DIALOG_IMPORTS, AndesDialog } from './dialog';
import type {
  AndesDialogAutoFocusButton,
  AndesDialogFooterOption,
  AndesDialogWidth,
} from './dialog-base';

/**
 * Ant Design `Modal` parity: the built-in footer, placement and sizing, mask and
 * z-index, loading, lazy/kept-alive content and the lifecycle outputs.
 */

/** See dialog.spec.ts: jsdom geometry is zero, which CDK reads as "not tabbable". */
function withElementGeometry() {
  const props = ['offsetWidth', 'offsetHeight'] as const;
  const descriptors = props.map(
    (prop) =>
      [
        prop,
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop),
      ] as const,
  );

  beforeAll(() => {
    for (const prop of props) {
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

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

/** Counts how often the surface's content has been constructed. */
let probeConstructions = 0;

@Directive({ selector: '[andesTestProbe]' })
class TestProbe {
  constructor() {
    probeConstructions++;
  }
}

@Component({
  imports: [ANDES_DIALOG_IMPORTS, TestProbe],
  template: `
    <andes-dialog
      [(open)]="open"
      [footer]="useCustomFooter() ? customFooter : footer()"
      [okText]="okText()"
      [cancelText]="cancelText()"
      [okType]="okType()"
      [okDisabled]="okDisabled()"
      [cancelDisabled]="cancelDisabled()"
      [confirmLoading]="confirmLoading()"
      [cancelLoading]="cancelLoading()"
      [showCancel]="showCancel()"
      [autoFocusButton]="autoFocusButton()"
      [centered]="centered()"
      [width]="width()"
      [mask]="mask()"
      [zIndex]="zIndex()"
      [loading]="loading()"
      [destroyOnClose]="destroyOnClose()"
      [forceRender]="forceRender()"
      (ok)="okCount = okCount + 1"
      (cancelled)="cancelReasons.push($event)"
      (closed)="closeReasons.push($event)"
      (afterOpenChange)="openChanges.push($event)"
    >
      <button type="button" id="trigger" andesDialogTrigger>Open</button>

      <andes-dialog-content
        *andesDialogContent
        [closeIcon]="useCloseIcon() ? closeIcon : null"
      >
        <div andesDialogHeader>
          <h2 andesDialogTitle id="title">Edit profile</h2>
        </div>

        <input id="name" andesTestProbe />

        @if (ownFooter()) {
          <div andesDialogFooter>
            <button type="button" id="own-save" andesDialogClose>Save</button>
          </div>
        }
      </andes-dialog-content>
    </andes-dialog>

    <ng-template #customFooter let-ok="ok" let-cancel="cancel">
      <button type="button" id="custom-cancel" (click)="cancel()">Back</button>
      <button type="button" id="custom-ok" (click)="ok()">Go</button>
    </ng-template>

    <ng-template #closeIcon>
      <svg id="custom-close-icon" aria-hidden="true"></svg>
    </ng-template>
  `,
})
class ParityHost {
  readonly dialog = viewChild.required(AndesDialog);
  readonly open = signal(false);
  readonly footer = signal<AndesDialogFooterOption>('default');
  readonly useCustomFooter = signal(false);
  readonly okText = signal('OK');
  readonly cancelText = signal('Cancel');
  readonly okType = signal<AndesButtonVariant>('primary');
  readonly okDisabled = signal(false);
  readonly cancelDisabled = signal(false);
  readonly confirmLoading = signal(false);
  readonly cancelLoading = signal(false);
  readonly showCancel = signal(true);
  readonly autoFocusButton = signal<AndesDialogAutoFocusButton>(null);
  readonly centered = signal(true);
  readonly width = signal<AndesDialogWidth | null>(null);
  readonly mask = signal(true);
  readonly zIndex = signal<number | null>(null);
  readonly loading = signal(false);
  readonly destroyOnClose = signal(true);
  readonly forceRender = signal(false);
  readonly useCloseIcon = signal(false);
  readonly ownFooter = signal(false);

  okCount = 0;
  readonly cancelReasons: AndesOverlayCloseReason[] = [];
  readonly closeReasons: AndesOverlayCloseReason[] = [];
  readonly openChanges: boolean[] = [];
}

describe('AndesDialog - Ant Modal parity', () => {
  withElementGeometry();

  beforeEach(() => {
    probeConstructions = 0;
  });

  function createHost(setup?: (host: ParityHost) => void) {
    const fixture = TestBed.createComponent(ParityHost);
    setup?.(fixture.componentInstance);
    fixture.detectChanges();
    const host = fixture.componentInstance;

    const surface = () =>
      document.querySelector('[data-slot="dialog-content"]') as HTMLElement;
    const inDialog = (selector: string) =>
      surface()?.querySelector(selector) as HTMLElement | null;
    /** The real <button> inside an AndesButton footer action. */
    const action = (which: 'ok' | 'cancel') =>
      inDialog(`[data-slot="dialog-${which}"] button`) as HTMLButtonElement;

    return {
      fixture,
      host,
      surface,
      inDialog,
      action,
      pane: () => document.querySelector('.andes-overlay-pane') as HTMLElement,
      backdrop: () =>
        document.querySelector('.andes-overlay-backdrop') as HTMLElement | null,
      async open() {
        host.open.set(true);
        fixture.detectChanges();
        await fixture.whenStable();
      },
      async settle() {
        fixture.detectChanges();
        await fixture.whenStable();
      },
    };
  }

  describe('built-in footer', () => {
    it('renders Cancel then OK, in that DOM order, with the given labels', async () => {
      const { host, action, inDialog, open } = createHost((h) => {
        h.okText.set('Save');
        h.cancelText.set('Discard');
      });
      await open();

      const footer = inDialog('[data-slot="dialog-footer"]');
      expect(footer?.classList).toContain('andes-dialog__footer');
      const buttons = [...(footer?.querySelectorAll('button') ?? [])];
      expect(buttons.map((b) => b.textContent?.trim())).toEqual([
        'Discard',
        'Save',
      ]);
      expect(action('ok').textContent?.trim()).toBe('Save');
      expect(host.okCount).toBe(0);
    });

    it('sits directly in the scroll viewport, so it is pinned like a consumer footer', async () => {
      const { inDialog, open } = createHost();
      await open();

      expect(
        inDialog('[data-slot="dialog-footer"]')?.parentElement?.classList,
      ).toContain('andes-dialog__viewport');
    });

    it('renders no footer when footer is null, the default', async () => {
      const { inDialog, open } = createHost((h) => h.footer.set(null));
      await open();

      expect(inDialog('andes-dialog-actions')).toBeNull();
    });

    it('emits ok on OK and stays open, like Ant', async () => {
      const { fixture, host, action, surface, open } = createHost();
      await open();

      action('ok').click();
      fixture.detectChanges();

      expect(host.okCount).toBe(1);
      expect(surface()).toBeTruthy();
      expect(host.cancelReasons).toEqual([]);
    });

    it('closes on Cancel, reporting it as a cancel', async () => {
      const { fixture, host, action, surface, open } = createHost();
      await open();

      action('cancel').click();
      fixture.detectChanges();

      expect(surface()).toBeNull();
      expect(host.open()).toBe(false);
      expect(host.cancelReasons).toEqual(['close-button']);
      expect(host.closeReasons).toEqual(['close-button']);
    });

    it('applies okType to the OK button', async () => {
      const { action, open } = createHost((h) => h.okType.set('danger'));
      await open();

      expect(action('ok').dataset['variant']).toBe('danger');
      expect(action('cancel').dataset['variant']).toBe('secondary');
    });

    it('puts OK in its loading state under confirmLoading, and ignores it while loading', async () => {
      const { fixture, host, action, open } = createHost((h) =>
        h.confirmLoading.set(true),
      );
      await open();
      await fixture.whenStable();

      expect(action('ok').disabled).toBe(true);
      expect(action('ok').getAttribute('aria-busy')).toBe('true');
      expect(action('cancel').disabled).toBe(false);

      clickOn(action('ok').parentElement as HTMLElement);
      expect(host.okCount).toBe(0);
    });

    it('supports cancelLoading', async () => {
      const { fixture, action, open } = createHost((h) =>
        h.cancelLoading.set(true),
      );
      await open();
      await fixture.whenStable();

      expect(action('cancel').disabled).toBe(true);
      expect(action('cancel').getAttribute('aria-busy')).toBe('true');
    });

    it('disables either button independently', async () => {
      const { fixture, host, action, open } = createHost((h) =>
        h.okDisabled.set(true),
      );
      await open();

      expect(action('ok').disabled).toBe(true);
      expect(action('cancel').disabled).toBe(false);

      host.okDisabled.set(false);
      host.cancelDisabled.set(true);
      fixture.detectChanges();

      expect(action('ok').disabled).toBe(false);
      expect(action('cancel').disabled).toBe(true);
    });

    it('can drop Cancel for an OK-only acknowledgement', async () => {
      const { action, open } = createHost((h) => h.showCancel.set(false));
      await open();

      expect(action('cancel')).toBeNull();
      expect(action('ok')).toBeTruthy();
    });

    it('focuses the button named by autoFocusButton instead of the first control', async () => {
      const { action, open } = createHost((h) => h.autoFocusButton.set('ok'));
      await open();
      await nextTask();

      expect(document.activeElement).toBe(action('ok'));
    });

    it('otherwise leaves initial focus on the first control in the body', async () => {
      const { inDialog, open } = createHost();
      await open();
      await nextTask();

      expect(document.activeElement).toBe(inDialog('#name'));
    });
  });

  describe('custom footer template', () => {
    it('renders the template in the footer box and hands it ok()/cancel()', async () => {
      const { fixture, host, inDialog, surface, open } = createHost((h) =>
        h.useCustomFooter.set(true),
      );
      await open();

      const footer = inDialog('[data-slot="dialog-footer"]');
      expect(footer?.querySelector('#custom-ok')).toBeTruthy();
      expect(footer?.querySelector('[data-slot="dialog-ok"]')).toBeNull();

      (inDialog('#custom-ok') as HTMLElement).click();
      fixture.detectChanges();
      expect(host.okCount).toBe(1);

      (inDialog('#custom-cancel') as HTMLElement).click();
      fixture.detectChanges();
      expect(surface()).toBeNull();
      expect(host.cancelReasons).toEqual(['close-button']);
    });
  });

  describe('cancelled output', () => {
    it('fires for Escape', async () => {
      const { fixture, host, open } = createHost();
      await open();

      pressEscape();
      fixture.detectChanges();

      expect(host.cancelReasons).toEqual(['escape-key']);
    });

    it('fires for a backdrop click', async () => {
      const { fixture, host, backdrop, open } = createHost();
      await open();

      clickOn(backdrop() as HTMLElement);
      fixture.detectChanges();

      expect(host.cancelReasons).toEqual(['backdrop-click']);
    });

    it('fires for the built-in "x", which still reports close-button', async () => {
      const { fixture, host, inDialog, open } = createHost();
      await open();

      clickOn(inDialog('[data-slot="dialog-close-button"]') as HTMLElement);
      fixture.detectChanges();

      expect(host.cancelReasons).toEqual(['close-button']);
      expect(host.closeReasons).toEqual(['close-button']);
    });

    it('does not fire for a consumer andesDialogClose control, which may well be a Save', async () => {
      const { fixture, host, inDialog, surface, open } = createHost((h) => {
        h.footer.set(null);
        h.ownFooter.set(true);
      });
      await open();

      clickOn(inDialog('#own-save') as HTMLElement);
      fixture.detectChanges();

      expect(surface()).toBeNull();
      expect(host.closeReasons).toEqual(['close-button']);
      expect(host.cancelReasons).toEqual([]);
    });

    it('does not fire for a programmatic close', async () => {
      const { fixture, host, open } = createHost();
      await open();

      host.open.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(host.closeReasons).toEqual(['imperative']);
      expect(host.cancelReasons).toEqual([]);
    });
  });

  describe('closeIcon', () => {
    it('replaces the built-in glyph but keeps the labelled button', async () => {
      const { inDialog, open } = createHost((h) => h.useCloseIcon.set(true));
      await open();

      const button = inDialog('[data-slot="dialog-close-button"]');
      expect(button?.querySelector('#custom-close-icon')).toBeTruthy();
      expect(button?.querySelector('.andes-dialog__close-icon')).toBeNull();
      expect(button?.getAttribute('aria-label')).toBe('Close');
    });
  });

  describe('placement and size', () => {
    it('is centred by default and parks near the top when centered is off', async () => {
      const { fixture, host, surface, open } = createHost();
      await open();
      expect(surface().classList).not.toContain('andes-dialog--top');

      host.centered.set(false);
      fixture.detectChanges();

      expect(surface().classList).toContain('andes-dialog--top');
    });

    it('turns a numeric width into px on every breakpoint', async () => {
      const { surface, open } = createHost((h) => h.width.set(640));
      await open();

      expect(surface().classList).toContain('andes-dialog--custom-width');
      for (const bp of ['xs', 'md', 'xxxl']) {
        expect(
          surface().style.getPropertyValue(`--andes-dialog-width-${bp}`),
        ).toBe('640px');
      }
    });

    it('passes a CSS length through unchanged', async () => {
      const { surface, open } = createHost((h) => h.width.set('80%'));
      await open();

      expect(surface().style.getPropertyValue('--andes-dialog-width-lg')).toBe(
        '80%',
      );
    });

    it('resolves a responsive width, each breakpoint inheriting the nearest smaller one', async () => {
      const { surface, open } = createHost((h) =>
        h.width.set({ sm: '90%', lg: 720 }),
      );
      await open();

      const width = (bp: string) =>
        surface().style.getPropertyValue(`--andes-dialog-width-${bp}`);
      expect(width('xs')).toBe('90%');
      expect(width('sm')).toBe('90%');
      expect(width('md')).toBe('90%');
      expect(width('lg')).toBe('720px');
      expect(width('xxxl')).toBe('720px');
    });

    it('keeps the size step when no width is given', async () => {
      const { surface, open } = createHost();
      await open();

      expect(surface().classList).toContain('andes-dialog--md');
      expect(surface().classList).not.toContain('andes-dialog--custom-width');
      expect(surface().getAttribute('style') ?? '').not.toContain(
        '--andes-dialog-width',
      );
    });
  });

  describe('mask and z-index', () => {
    it('renders no backdrop when mask is off', async () => {
      const { backdrop, surface, open } = createHost((h) => h.mask.set(false));
      await open();

      expect(surface()).toBeTruthy();
      expect(backdrop()).toBeNull();
    });

    it('applies an explicit zIndex to the overlay and its backdrop', async () => {
      const { pane, backdrop, open } = createHost((h) => h.zIndex.set(2400));
      await open();

      expect(pane().parentElement?.style.getPropertyValue('z-index')).toBe(
        '2400',
      );
      expect(backdrop()?.style.getPropertyValue('z-index')).toBe('2400');
    });

    it('keeps the modal layer token when no zIndex is given', async () => {
      const { pane, open } = createHost();
      await open();

      expect(pane().parentElement?.style.getPropertyValue('z-index')).toBe(
        'var(--andes-z-index-modal, 1050)',
      );
    });
  });

  describe('loading', () => {
    it('shows a skeleton, marks the surface busy and drops the footer', async () => {
      const { fixture, host, surface, inDialog, open } = createHost((h) =>
        h.loading.set(true),
      );
      await open();

      expect(surface().classList).toContain('andes-dialog--loading');
      expect(surface().getAttribute('aria-busy')).toBe('true');
      expect(inDialog('[data-slot="dialog-skeleton"]')).toBeTruthy();
      expect(inDialog('[data-slot="dialog-footer"]')).toBeNull();
      // The header stays: it is what labels the dialog.
      expect(surface().getAttribute('aria-labelledby')).toBe('title');

      host.loading.set(false);
      fixture.detectChanges();

      expect(surface().getAttribute('aria-busy')).toBeNull();
      expect(inDialog('[data-slot="dialog-skeleton"]')).toBeNull();
      expect(inDialog('[data-slot="dialog-footer"]')).toBeTruthy();
    });
  });

  describe('content lifetime', () => {
    it('creates the content lazily and destroys it on close by default', async () => {
      const { fixture, host, inDialog, open } = createHost();
      expect(probeConstructions).toBe(0);

      await open();
      const first = inDialog('#name');
      host.open.set(false);
      fixture.detectChanges();
      await open();

      expect(probeConstructions).toBe(2);
      expect(inDialog('#name')).not.toBe(first);
    });

    it('keeps the content, and its state, across a close when destroyOnClose is off', async () => {
      const { fixture, host, inDialog, surface, open } = createHost((h) =>
        h.destroyOnClose.set(false),
      );
      await open();
      const input = inDialog('#name') as HTMLInputElement;
      input.value = 'Ada';

      host.open.set(false);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(surface()).toBeNull();

      await open();

      expect(inDialog('#name')).toBe(input);
      expect(input.value).toBe('Ada');
      expect(probeConstructions).toBe(1);
      expect(surface().getAttribute('role')).toBe('dialog');
      expect(surface().dataset['state']).toBe('open');
    });

    it('keeps a kept-alive surface a direct flex item of the pane', async () => {
      const { pane, surface, open } = createHost((h) =>
        h.destroyOnClose.set(false),
      );
      await open();

      const adopter = surface().parentElement as HTMLElement;
      expect(adopter.classList).toContain('andes-dialog-keep-alive');
      expect(adopter.parentElement).toBe(pane());
    });

    it('still traps and restores focus for a kept-alive surface', async () => {
      const { fixture, host, inDialog, open } = createHost((h) =>
        h.destroyOnClose.set(false),
      );
      const trigger = (fixture.nativeElement as HTMLElement).querySelector(
        '#trigger',
      ) as HTMLElement;

      for (let round = 0; round < 2; round++) {
        trigger.focus();
        await open();
        await nextTask();
        expect(document.activeElement).toBe(inDialog('#name'));

        pressEscape();
        fixture.detectChanges();
        expect(document.activeElement).toBe(trigger);
      }
      expect(host.cancelReasons).toEqual(['escape-key', 'escape-key']);
    });

    it('builds the content before the first open under forceRender', async () => {
      const { inDialog, open, settle, surface } = createHost((h) =>
        h.forceRender.set(true),
      );
      await settle();
      expect(surface()).toBeNull();

      expect(probeConstructions).toBe(1);

      await open();
      expect(inDialog('#name')).toBeTruthy();
      expect(probeConstructions).toBe(1);
    });

    it('drops the kept content once destroyOnClose is turned back on', async () => {
      const { fixture, host, open } = createHost((h) =>
        h.destroyOnClose.set(false),
      );
      await open();
      host.open.set(false);
      fixture.detectChanges();

      host.destroyOnClose.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      await open();

      expect(probeConstructions).toBe(2);
    });
  });

  describe('afterOpenChange', () => {
    it('emits true once opened and false once closed', async () => {
      const { fixture, host, open } = createHost();
      await open();
      await nextTask();

      expect(host.openChanges).toEqual([true]);

      pressEscape();
      fixture.detectChanges();

      expect(host.openChanges).toEqual([true, false]);
    });

    it('does not report an open that was closed before it settled', async () => {
      const { fixture, host } = createHost();
      host.open.set(true);
      fixture.detectChanges();
      // Opened synchronously; the wait for the entry transition is still pending.
      expect(host.dialog().isOpen()).toBe(true);
      host.dialog().hide();
      await nextTask();

      expect(host.openChanges).toEqual([false]);
    });
  });
});

@Component({
  imports: [ANDES_ALERT_DIALOG_IMPORTS],
  template: `
    <andes-alert-dialog
      [(open)]="open"
      footer="default"
      okText="Delete"
      okType="danger"
      autoFocusButton="cancel"
      [confirmLoading]="deleting()"
      [loading]="loading()"
      (ok)="deleting.set(true)"
      (cancelled)="cancelled = cancelled + 1"
    >
      <andes-alert-dialog-content *andesAlertDialogContent>
        <div andesAlertDialogHeader>
          <h2 andesAlertDialogTitle>Delete this project?</h2>
        </div>
      </andes-alert-dialog-content>
    </andes-alert-dialog>
  `,
})
class AlertParityHost {
  readonly open = signal(true);
  readonly deleting = signal(false);
  readonly loading = signal(false);
  cancelled = 0;
}

describe('AndesAlertDialog - Ant Modal parity', () => {
  withElementGeometry();

  async function createHost() {
    const fixture = TestBed.createComponent(AlertParityHost);
    fixture.detectChanges();
    await fixture.whenStable();
    const surface = () =>
      document.querySelector(
        '[data-slot="alert-dialog-content"]',
      ) as HTMLElement;
    const action = (which: 'ok' | 'cancel') =>
      surface()?.querySelector(
        `[data-slot="dialog-${which}"] button`,
      ) as HTMLButtonElement;
    return { fixture, host: fixture.componentInstance, surface, action };
  }

  it('renders the built-in footer with its own slot name', async () => {
    const { surface, action } = await createHost();

    expect(
      surface().querySelector('[data-slot="alert-dialog-footer"]'),
    ).toBeTruthy();
    expect(action('ok').textContent?.trim()).toBe('Delete');
    expect(action('ok').dataset['variant']).toBe('danger');
  });

  it('focuses Cancel first when asked to', async () => {
    const { action } = await createHost();
    await nextTask();

    expect(document.activeElement).toBe(action('cancel'));
  });

  it('holds OK in its loading state while the consumer works, then closes on their say-so', async () => {
    const { fixture, host, surface, action } = await createHost();

    action('ok').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(host.deleting()).toBe(true);
    expect(action('ok').disabled).toBe(true);
    expect(surface()).toBeTruthy();

    host.open.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(surface()).toBeNull();
    expect(host.cancelled).toBe(0);
  });

  it('closes from the built-in Cancel as a cancel', async () => {
    const { fixture, host, surface, action } = await createHost();

    action('cancel').click();
    fixture.detectChanges();

    expect(surface()).toBeNull();
    expect(host.cancelled).toBe(1);
  });

  it('supports the loading skeleton', async () => {
    const { fixture, host, surface } = await createHost();
    host.loading.set(true);
    fixture.detectChanges();

    expect(
      surface().querySelector('[data-slot="alert-dialog-skeleton"]'),
    ).toBeTruthy();
    expect(surface().querySelector('andes-dialog-actions')).toBeNull();
  });
});
