import {
  ApplicationRef,
  Component,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { AndesDialogFooterContext } from './dialog-base';
import {
  AndesDialogService,
  type AndesDialogMethodRef,
} from './dialog.service';

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

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A promise with its settle functions exposed, to drive async OK/Cancel by hand. */
function deferred() {
  let resolve!: () => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

@Component({
  template: `
    <button type="button" id="launcher">Launch</button>
    <ng-template #rich let-ref>
      <strong id="rich-content">Rich {{ ref.kind }}</strong>
    </ng-template>
    <ng-template #footer let-ok="ok" let-cancel="cancel">
      <button type="button" id="footer-ok" (click)="ok()">Yes</button>
      <button type="button" id="footer-cancel" (click)="cancel()">No</button>
    </ng-template>
    <ng-template #icon>
      <svg id="custom-icon"></svg>
    </ng-template>
  `,
})
class LauncherHost {
  readonly rich =
    viewChild.required<TemplateRef<{ $implicit: AndesDialogMethodRef }>>(
      'rich',
    );
  readonly footer =
    viewChild.required<TemplateRef<AndesDialogFooterContext>>('footer');
  readonly icon = viewChild.required<TemplateRef<unknown>>('icon');
}

describe('AndesDialogService', () => {
  withElementGeometry();

  let service: AndesDialogService;
  let appRef: ApplicationRef;

  beforeEach(() => {
    service = TestBed.inject(AndesDialogService);
    appRef = TestBed.inject(ApplicationRef);
  });

  afterEach(async () => {
    service.destroyAll();
    await settle();
    await nextTask();
  });

  async function settle() {
    await appRef.whenStable();
  }

  const surface = () =>
    document.querySelector(
      '[data-slot="alert-dialog-content"]',
    ) as HTMLElement | null;
  const surfaces = () =>
    document.querySelectorAll('[data-slot="alert-dialog-content"]');
  const action = (which: 'ok' | 'cancel') =>
    surface()?.querySelector(
      `[data-slot="dialog-${which}"] button`,
    ) as HTMLButtonElement | null;

  it('opens a confirm as an alertdialog with title, content, Cancel and OK', async () => {
    service.confirm({ title: 'Delete project?', content: 'Cannot be undone.' });
    await settle();

    const el = surface() as HTMLElement;
    expect(el.getAttribute('role')).toBe('alertdialog');
    expect(el.getAttribute('aria-modal')).toBe('true');

    const title = el.querySelector('[data-slot="alert-dialog-title"]');
    const description = el.querySelector(
      '[data-slot="alert-dialog-description"]',
    );
    expect(title?.textContent?.trim()).toBe('Delete project?');
    expect(description?.textContent?.trim()).toBe('Cannot be undone.');
    expect(el.getAttribute('aria-labelledby')).toBe(title?.id);
    expect(el.getAttribute('aria-describedby')).toBe(description?.id);
    expect(action('cancel')?.textContent?.trim()).toBe('Cancel');
    expect(action('ok')?.textContent?.trim()).toBe('OK');
    expect(el.classList).toContain('andes-dialog--method-confirm');
  });

  it.each(['info', 'success', 'error', 'warning'] as const)(
    'opens %s as an OK-only acknowledgement with its status icon',
    async (kind) => {
      service[kind]({ title: 'Heads up' });
      await settle();

      const el = surface() as HTMLElement;
      expect(el.classList).toContain(`andes-dialog--method-${kind}`);
      expect(action('cancel')).toBeNull();
      expect(action('ok')).toBeTruthy();
      expect(
        el
          .querySelector('[data-slot="dialog-method-icon"]')
          ?.getAttribute('aria-hidden'),
      ).toBe('true');
    },
  );

  it('focuses Cancel first on a confirm, and OK on an acknowledgement', async () => {
    service.confirm({ title: 'Sure?' });
    await settle();
    await nextTask();
    expect(document.activeElement).toBe(action('cancel'));

    service.destroyAll();
    await settle();
    await nextTask();

    service.info({ title: 'Saved' });
    await settle();
    await nextTask();
    expect(document.activeElement).toBe(action('ok'));
  });

  it('honours an explicit autoFocusButton', async () => {
    service.confirm({ title: 'Sure?', autoFocusButton: 'ok' });
    await settle();
    await nextTask();

    expect(document.activeElement).toBe(action('ok'));
  });

  it('resolves result true and runs onOk when OK is activated', async () => {
    const onOk = vi.fn();
    const afterClose = vi.fn();
    const ref = service.confirm({ title: 'Sure?', onOk, afterClose });
    await settle();

    action('ok')?.click();

    await expect(ref.result).resolves.toBe(true);
    expect(onOk).toHaveBeenCalledTimes(1);
    await settle();
    expect(surface()).toBeNull();
    await nextTask();
    expect(afterClose).toHaveBeenCalledTimes(1);
  });

  it('holds OK in its loading state while an async onOk is pending, then closes', async () => {
    const work = deferred();
    const ref = service.confirm({ title: 'Sure?', onOk: () => work.promise });
    await settle();

    action('ok')?.click();
    await settle();

    expect(action('ok')?.disabled).toBe(true);
    expect(action('ok')?.getAttribute('aria-busy')).toBe('true');
    expect(surface()).toBeTruthy();

    work.resolve();
    await expect(ref.result).resolves.toBe(true);
    await settle();
    expect(surface()).toBeNull();
  });

  it('stays open, OK usable again, when an async onOk rejects', async () => {
    const error = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const work = deferred();
    const ref = service.confirm({ title: 'Sure?', onOk: () => work.promise });
    await settle();

    action('ok')?.click();
    await settle();
    work.reject(new Error('network'));
    await nextTask();
    await settle();

    expect(surface()).toBeTruthy();
    expect(action('ok')?.disabled).toBe(false);
    expect(ref.closed()).toBe(false);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  it('resolves result false and runs onCancel from the Cancel button', async () => {
    const onCancel = vi.fn();
    const ref = service.confirm({ title: 'Sure?', onCancel });
    await settle();

    action('cancel')?.click();

    await expect(ref.result).resolves.toBe(false);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('waits on an async onCancel from the Cancel button', async () => {
    const work = deferred();
    const ref = service.confirm({
      title: 'Sure?',
      onCancel: () => work.promise,
    });
    await settle();

    action('cancel')?.click();
    await settle();
    expect(action('cancel')?.getAttribute('aria-busy')).toBe('true');
    expect(surface()).toBeTruthy();

    work.resolve();
    await expect(ref.result).resolves.toBe(false);
  });

  it('treats Escape as a cancel', async () => {
    const onCancel = vi.fn();
    const ref = service.confirm({ title: 'Sure?', onCancel });
    await settle();

    pressEscape();

    await expect(ref.result).resolves.toBe(false);
    await nextTask();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('ignores Escape when keyboard is off', async () => {
    const ref = service.confirm({ title: 'Sure?', keyboard: false });
    await settle();

    pressEscape();
    await settle();

    expect(surface()).toBeTruthy();
    expect(ref.closed()).toBe(false);
  });

  it('renders an "x" when closable, which cancels', async () => {
    const onCancel = vi.fn();
    const ref = service.confirm({ title: 'Sure?', closable: true, onCancel });
    await settle();

    const close = surface()?.querySelector(
      '[data-slot="dialog-close-button"]',
    ) as HTMLElement;
    expect(close.getAttribute('aria-label')).toBe('Close');
    close.click();

    await expect(ref.result).resolves.toBe(false);
    await nextTask();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('renders no "x" by default', async () => {
    service.confirm({ title: 'Sure?' });
    await settle();

    expect(
      surface()?.querySelector('[data-slot="dialog-close-button"]'),
    ).toBeNull();
  });

  it('updates the open dialog in place', async () => {
    const ref = service.confirm({ title: 'Deleting', okText: 'Delete' });
    await settle();

    ref.update({ title: 'Deleted', okDisabled: true });
    await settle();
    expect(
      surface()
        ?.querySelector('[data-slot="alert-dialog-title"]')
        ?.textContent?.trim(),
    ).toBe('Deleted');
    expect(action('ok')?.disabled).toBe(true);

    ref.update((previous) => ({ okText: `${previous.okText} now` }));
    await settle();
    expect(action('ok')?.textContent?.trim()).toBe('Delete now');
  });

  it('destroys without running either handler', async () => {
    const onOk = vi.fn();
    const onCancel = vi.fn();
    const ref = service.confirm({ title: 'Sure?', onOk, onCancel });
    await settle();

    ref.destroy();

    await expect(ref.result).resolves.toBe(false);
    await settle();
    await nextTask();
    expect(surface()).toBeNull();
    expect(onOk).not.toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('can be destroyed before it has rendered', async () => {
    const ref = service.confirm({ title: 'Sure?' });
    ref.destroy();

    await expect(ref.result).resolves.toBe(false);
    await settle();
    expect(surface()).toBeNull();
  });

  it('destroyAll closes every open dialog', async () => {
    const first = service.info({ title: 'One' });
    const second = service.warning({ title: 'Two' });
    await settle();
    expect(surfaces().length).toBe(2);

    service.destroyAll();

    await expect(Promise.all([first.result, second.result])).resolves.toEqual([
      false,
      false,
    ]);
    await settle();
    expect(surfaces().length).toBe(0);
  });

  it('returns focus to what was focused when it opened', async () => {
    const fixture = TestBed.createComponent(LauncherHost);
    fixture.detectChanges();
    const launcher = (fixture.nativeElement as HTMLElement).querySelector(
      '#launcher',
    ) as HTMLElement;
    launcher.focus();

    const ref = service.info({ title: 'Saved' });
    await settle();
    await nextTask();
    expect(document.activeElement).not.toBe(launcher);

    action('ok')?.click();
    await ref.result;

    expect(document.activeElement).toBe(launcher);
  });

  it('renders template title/content with the ref as context, a custom icon, and a custom footer', async () => {
    const fixture = TestBed.createComponent(LauncherHost);
    fixture.detectChanges();
    const host = fixture.componentInstance;

    const ref = service.success({
      title: 'Done',
      content: host.rich(),
      icon: host.icon(),
      footer: host.footer(),
    });
    await settle();

    const el = surface() as HTMLElement;
    expect(el.querySelector('#rich-content')?.textContent).toBe('Rich success');
    expect(el.querySelector('#custom-icon')).toBeTruthy();
    expect(el.querySelector('[data-slot="dialog-ok"]')).toBeNull();

    (el.querySelector('#footer-ok') as HTMLElement).click();
    await expect(ref.result).resolves.toBe(true);
  });

  it('can hide the icon and the footer', async () => {
    service.info({ title: 'Plain', icon: null, footer: null, closable: true });
    await settle();

    const el = surface() as HTMLElement;
    expect(el.querySelector('[data-slot="dialog-method-icon"]')).toBeNull();
    expect(el.querySelector('andes-dialog-actions')).toBeNull();
  });

  it('names an untitled dialog after its kind', async () => {
    service.warning({ content: 'Low disk space.' });
    await settle();

    expect(surface()?.getAttribute('aria-label')).toBe('Warning');
  });

  it('forwards presentation options to the dialog', async () => {
    service.confirm({
      title: 'Sure?',
      okType: 'danger',
      okText: 'Delete',
      cancelText: 'Keep',
      centered: false,
      width: 480,
      zIndex: 3000,
      mask: false,
      className: 'my-confirm',
    });
    await settle();

    const el = surface() as HTMLElement;
    expect(action('ok')?.dataset['variant']).toBe('danger');
    expect(action('ok')?.textContent?.trim()).toBe('Delete');
    expect(action('cancel')?.textContent?.trim()).toBe('Keep');
    expect(el.classList).toContain('andes-dialog--top');
    expect(el.classList).toContain('my-confirm');
    expect(el.style.getPropertyValue('--andes-dialog-width-md')).toBe('480px');
    expect(
      (
        document.querySelector('.andes-overlay-pane') as HTMLElement
      ).parentElement?.style.getPropertyValue('z-index'),
    ).toBe('3000');
    expect(document.querySelector('.andes-overlay-backdrop')).toBeNull();
  });
});
