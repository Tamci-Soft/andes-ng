import {
  Component,
  ErrorHandler,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { AndesButtonVariant } from '../button/button';
import { AndesPopconfirmTrigger } from '../popover/popover-trigger';
import type { AndesPopoverRenderable } from '../popover/popover-types';
import { AndesPopconfirm, type AndesPopconfirmHandler } from './popconfirm';

/** See popover.spec.ts: jsdom geometry makes CDK treat everything as untabbable. */
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
  imports: [AndesPopconfirm, AndesPopconfirmTrigger],
  template: `
    <button type="button" id="outside">Outside</button>
    <andes-popconfirm
      [title]="title()"
      [description]="description()"
      [icon]="icon()"
      [okText]="okText()"
      [cancelText]="cancelText()"
      [okType]="okType()"
      [okDisabled]="okDisabled()"
      [okLoading]="okLoading()"
      [showCancel]="showCancel()"
      [disabled]="disabled()"
      [onConfirm]="onConfirm()"
      [(open)]="open"
      (confirm)="events.push('confirm')"
      (cancelled)="events.push('cancel')"
    >
      <button type="button" id="trigger" andesPopconfirmTrigger>Delete</button>
    </andes-popconfirm>
    <ng-template #customIcon><span id="custom-icon">!</span></ng-template>
  `,
})
class HostComponent {
  readonly title = signal<AndesPopoverRenderable | undefined>(
    'Delete the task',
  );
  readonly description = signal<AndesPopoverRenderable | undefined>(
    'Are you sure?',
  );
  readonly icon = signal<TemplateRef<unknown> | null | undefined>(undefined);
  readonly okText = signal('OK');
  readonly cancelText = signal('Cancel');
  readonly okType = signal<AndesButtonVariant>('primary');
  readonly okDisabled = signal(false);
  readonly okLoading = signal(false);
  readonly showCancel = signal(true);
  readonly disabled = signal(false);
  readonly onConfirm = signal<AndesPopconfirmHandler | undefined>(undefined);
  readonly open = signal(false);
  readonly events: string[] = [];
  readonly customIcon = viewChild.required<TemplateRef<unknown>>('customIcon');
}

describe('AndesPopconfirm', () => {
  withElementGeometry();

  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const host = fixture.componentInstance;
    const panel = () =>
      document.querySelector('.andes-popover-content') as HTMLElement | null;
    const okButton = () =>
      panel()?.querySelector(
        '.andes-popconfirm-ok button',
      ) as HTMLButtonElement;
    const cancelButton = () =>
      panel()?.querySelector(
        '.andes-popconfirm-cancel button',
      ) as HTMLButtonElement | null;
    const trigger = () => document.getElementById('trigger') as HTMLElement;
    const update = () => fixture.detectChanges();
    const openIt = async () => {
      trigger().focus();
      trigger().click();
      update();
      await fixture.whenStable();
    };
    return {
      fixture,
      host,
      panel,
      okButton,
      cancelButton,
      trigger,
      update,
      openIt,
    };
  }

  afterEach(() => vi.restoreAllMocks());

  function pressEscape() {
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        keyCode: 27,
        bubbles: true,
      }),
    );
  }

  it('opens on trigger click as a labelled, described alertdialog', async () => {
    const { panel, openIt, trigger } = setup();
    expect(panel()).toBeNull();
    expect(trigger().getAttribute('aria-haspopup')).toBe('dialog');

    await openIt();

    const title = panel()?.querySelector('.andes-popconfirm-title');
    const description = panel()?.querySelector('.andes-popconfirm-description');
    expect(panel()?.getAttribute('role')).toBe('alertdialog');
    expect(panel()?.hasAttribute('aria-modal')).toBe(false);
    expect(title?.textContent?.trim()).toBe('Delete the task');
    expect(description?.textContent?.trim()).toBe('Are you sure?');
    expect(panel()?.getAttribute('aria-labelledby')).toBe(title?.id);
    expect(panel()?.getAttribute('aria-describedby')).toBe(description?.id);
  });

  it('defaults to Ant placement (top) with an arrow', async () => {
    const { panel, openIt } = setup();
    await openIt();

    expect(panel()?.getAttribute('data-side')).toBe('top');
    expect(panel()?.querySelector('.andes-popover-arrow')).toBeTruthy();
  });

  it('renders the default warning icon, a custom icon, or none', async () => {
    const { host, panel, openIt, update, trigger } = setup();
    await openIt();
    expect(
      panel()?.querySelector('.andes-popconfirm-icon-default'),
    ).toBeTruthy();

    trigger().click();
    update();
    host.icon.set(host.customIcon());
    update();
    await openIt();
    expect(panel()?.querySelector('.andes-popconfirm-icon-default')).toBeNull();
    expect(panel()?.querySelector('#custom-icon')).toBeTruthy();

    trigger().click();
    update();
    host.icon.set(null);
    update();
    await openIt();
    expect(panel()?.querySelector('.andes-popconfirm-icon')).toBeNull();
  });

  it('puts initial focus on Cancel', async () => {
    const { cancelButton, openIt } = setup();
    await openIt();

    expect(document.activeElement).toBe(cancelButton());
  });

  it('focuses OK when showCancel is off', async () => {
    const { host, update, cancelButton, okButton, openIt } = setup();
    host.showCancel.set(false);
    update();
    await openIt();

    expect(cancelButton()).toBeNull();
    expect(document.activeElement).toBe(okButton());
  });

  it('uses okText/cancelText and okType', async () => {
    const { host, update, okButton, cancelButton, openIt } = setup();
    host.okText.set('Delete');
    host.cancelText.set('Keep');
    host.okType.set('danger');
    update();
    await openIt();

    expect(okButton().textContent?.trim()).toBe('Delete');
    expect(okButton().getAttribute('data-variant')).toBe('danger');
    expect(cancelButton()?.textContent?.trim()).toBe('Keep');
  });

  it('OK emits confirm, closes and returns focus to the trigger', async () => {
    const { host, okButton, panel, openIt, update, trigger } = setup();
    await openIt();

    okButton().click();
    update();
    await Promise.resolve();
    update();

    expect(host.events).toEqual(['confirm']);
    expect(panel()).toBeNull();
    expect(host.open()).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it('Cancel emits cancel and closes', async () => {
    const { host, cancelButton, panel, openIt, update } = setup();
    await openIt();

    cancelButton()?.click();
    update();

    expect(host.events).toEqual(['cancel']);
    expect(panel()).toBeNull();
  });

  it('Escape counts as cancel', async () => {
    const { host, panel, openIt, update } = setup();
    await openIt();

    pressEscape();
    update();

    expect(host.events).toEqual(['cancel']);
    expect(panel()).toBeNull();
  });

  it('an outside click dismisses without emitting cancel', async () => {
    const { host, panel, openIt, update } = setup();
    await openIt();

    const outside = document.getElementById('outside') as HTMLElement;
    outside.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    update();

    expect(panel()).toBeNull();
    expect(host.events).toEqual([]);
  });

  it('async onConfirm keeps OK loading until it resolves, then closes', async () => {
    const { host, update, okButton, panel, openIt } = setup();
    let resolve!: () => void;
    host.onConfirm.set(() => new Promise<void>((done) => (resolve = done)));
    update();
    await openIt();

    okButton().click();
    update();
    expect(okButton().disabled).toBe(true);
    expect(okButton().getAttribute('aria-busy')).toBe('true');
    expect(panel()).toBeTruthy();

    // A second press while pending is ignored.
    okButton().click();
    expect(host.events).toEqual(['confirm']);

    resolve();
    await Promise.resolve();
    await Promise.resolve();
    update();
    expect(panel()).toBeNull();
  });

  it('a rejected onConfirm stays open and re-enables OK', async () => {
    const { fixture, host, update, okButton, panel, openIt } = setup();
    const errorHandler = vi
      .spyOn(TestBed.inject(ErrorHandler), 'handleError')
      .mockImplementation(() => undefined);
    let reject!: (error: Error) => void;
    host.onConfirm.set(() => new Promise<void>((_, fail) => (reject = fail)));
    update();
    await openIt();

    okButton().click();
    update();
    reject(new Error('nope'));
    await Promise.resolve();
    await Promise.resolve();
    update();

    expect(panel()).toBeTruthy();
    expect(okButton().disabled).toBe(false);
    expect(errorHandler).toHaveBeenCalled();
    await fixture.whenStable();
    expect(document.activeElement).toBe(okButton());
  });

  it('okDisabled and okLoading disable OK', async () => {
    const { host, update, okButton, openIt } = setup();
    host.okDisabled.set(true);
    update();
    await openIt();
    expect(okButton().disabled).toBe(true);

    host.okDisabled.set(false);
    host.okLoading.set(true);
    update();
    expect(okButton().disabled).toBe(true);
    expect(okButton().getAttribute('aria-busy')).toBe('true');
  });

  it('never opens while disabled', () => {
    const { host, update, trigger, panel } = setup();
    host.disabled.set(true);
    update();

    trigger().click();
    update();
    expect(panel()).toBeNull();
  });

  it('supports template title and description', async () => {
    const { host, update, panel, openIt } = setup();
    host.title.set(host.customIcon());
    host.description.set(undefined);
    update();
    await openIt();

    expect(
      panel()?.querySelector('.andes-popconfirm-title #custom-icon'),
    ).toBeTruthy();
    expect(panel()?.querySelector('.andes-popconfirm-description')).toBeNull();
    expect(panel()?.hasAttribute('aria-describedby')).toBe(false);
  });
});
