import { readFileSync } from 'node:fs';
import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AndesMessageService } from './message.service';
import { provideAndesToastConfig } from './toast.config';
import { AndesToastService } from './toast.service';
import type {
  AndesToastPosition,
  AndesToastTemplateContext,
} from './toast.types';
import { AndesToastViewport } from './toast-viewport';

@Component({
  imports: [AndesToastViewport],
  template: `<andes-toast-viewport [position]="position()" />`,
})
class HostComponent {
  readonly position = signal<AndesToastPosition>('bottom-right');
}

@Component({
  imports: [AndesToastViewport],
  template: `
    <andes-toast-viewport />
    <ng-template #customIcon let-toast
      ><b class="custom-icon">{{ toast.severity }}</b></ng-template
    >
    <ng-template #customClose><i class="custom-close">x</i></ng-template>
    <ng-template #richTitle let-toast
      ><em class="rich-title">{{ toast.title }}!</em></ng-template
    >
    <ng-template #richBody let-toast
      ><a class="rich-body" href="#">{{ toast.message }} (link)</a></ng-template
    >
  `,
})
class TemplateHostComponent {
  readonly richTitle =
    viewChild.required<TemplateRef<AndesToastTemplateContext>>('richTitle');
  readonly richBody =
    viewChild.required<TemplateRef<AndesToastTemplateContext>>('richBody');
  readonly customIcon =
    viewChild.required<TemplateRef<AndesToastTemplateContext>>('customIcon');
  readonly customClose =
    viewChild.required<TemplateRef<AndesToastTemplateContext>>('customClose');
}

describe('AndesToastViewport', () => {
  function createHost() {
    const fixture = TestBed.createComponent(HostComponent);
    const service = TestBed.inject(AndesToastService);
    fixture.detectChanges();
    return { fixture, service };
  }

  function items(
    fixture: ReturnType<typeof createHost>['fixture'],
  ): HTMLElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('andes-toast-item'),
    );
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders one andes-toast-item per visible toast', () => {
    const { fixture, service } = createHost();

    service.show({ message: 'first' });
    service.show({ message: 'second' });
    fixture.detectChanges();

    expect(items(fixture)).toHaveLength(2);
  });

  it('stacks toasts in the DOM in the order they were created', () => {
    const { fixture, service } = createHost();

    service.show({ message: 'first' });
    service.show({ message: 'second' });
    service.show({ message: 'third' });
    fixture.detectChanges();

    const texts = items(fixture).map((item) =>
      item.querySelector('.andes-toast__message')?.textContent?.trim(),
    );
    expect(texts).toEqual(['first', 'second', 'third']);
  });

  it.each(['neutral', 'success', 'warning', 'info', 'error'] as const)(
    'renders no role/aria-live/aria-atomic on the visible toast for %s severity (announcement is LiveAnnouncer-only, see AndesToastService)',
    (severity) => {
      const { fixture, service } = createHost();

      service.show({ message: 'msg', severity });
      fixture.detectChanges();

      const item = items(fixture)[0];
      expect(item.getAttribute('role')).toBeNull();
      expect(item.getAttribute('aria-live')).toBeNull();
      expect(item.getAttribute('aria-atomic')).toBeNull();
    },
  );

  it('announces each toast exactly once via LiveAnnouncer - the visible node has no live-region attributes of its own, so nothing double-announces (regression)', () => {
    const announceSpy = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: LiveAnnouncer, useValue: { announce: announceSpy } },
      ],
    });

    const { fixture, service } = createHost();
    service.show({ title: 'Saved', message: 'Your changes were saved.' });
    fixture.detectChanges();

    // The one and only announcement mechanism: LiveAnnouncer, fired exactly once.
    expect(announceSpy).toHaveBeenCalledTimes(1);

    // The visible toast itself must carry no role/aria-live/aria-atomic - if it did, a
    // screen reader would pick up both that and the LiveAnnouncer announcement above,
    // reading the toast's text twice.
    const item = items(fixture)[0];
    expect(item.getAttribute('role')).toBeNull();
    expect(item.getAttribute('aria-live')).toBeNull();
    expect(item.getAttribute('aria-atomic')).toBeNull();
  });

  it('the close button dismisses that toast only', () => {
    const { fixture, service } = createHost();

    const first = service.show({ message: 'first' }).id;
    service.show({ message: 'second' });
    fixture.detectChanges();

    const closeButton = items(fixture)[0].querySelector<HTMLButtonElement>(
      '.andes-toast__close',
    );
    closeButton?.click();
    fixture.detectChanges();

    expect(service.toasts().map((t) => t.id)).not.toContain(first);
    expect(items(fixture)).toHaveLength(1);
  });

  it('the action button invokes onClick and then dismisses the toast', () => {
    const { fixture, service } = createHost();
    const onClick = vi.fn();

    const id = service.show({
      message: 'Item deleted',
      action: { label: 'Undo', onClick },
    }).id;
    fixture.detectChanges();

    const actionButton = items(fixture)[0].querySelector<HTMLButtonElement>(
      '.andes-toast__action',
    );
    expect(actionButton?.textContent?.trim()).toBe('Undo');
    actionButton?.click();
    fixture.detectChanges();

    expect(onClick).toHaveBeenCalledTimes(1);
    expect(service.toasts().map((t) => t.id)).not.toContain(id);
  });

  it('does not render a close button when dismissible is false', () => {
    const { fixture, service } = createHost();

    service.show({ message: 'Persistent', dismissible: false });
    fixture.detectChanges();

    expect(items(fixture)[0].querySelector('.andes-toast__close')).toBeNull();
  });

  it('draws the default close icon as an SVG, not a text glyph', () => {
    const { fixture, service } = createHost();

    service.show({ message: 'Closable' });
    fixture.detectChanges();

    const close = items(fixture)[0].querySelector('.andes-toast__close');
    expect(close?.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
    expect(close?.textContent?.trim()).toBe('');
  });

  it('loads the visually-hidden rule the live announcer node relies on', () => {
    const { fixture, service } = createHost();

    service.show({ message: 'Announced' });
    fixture.detectChanges();

    const styles = [...document.querySelectorAll('style')].map(
      (style) => style.textContent ?? '',
    );
    expect(styles.some((css) => css.includes('.cdk-visually-hidden'))).toBe(
      true,
    );
  });

  it('hovering a toast pauses its auto-dismiss and mouseleave resumes it', () => {
    vi.useFakeTimers();
    const { fixture, service } = createHost();

    const id = service.show({ message: 'Hoverable', duration: 2000 }).id;
    fixture.detectChanges();

    const item = items(fixture)[0];
    item.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    fixture.detectChanges();

    vi.advanceTimersByTime(10_000);
    fixture.detectChanges();
    expect(service.toasts().map((t) => t.id)).toContain(id);

    item.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
    fixture.detectChanges();

    vi.advanceTimersByTime(2000);
    fixture.detectChanges();
    expect(service.toasts().map((t) => t.id)).not.toContain(id);
  });

  it('focusing an actionable toast (e.g. Tab-ing to its action button) pauses auto-dismiss, and focusout resumes it (regression: keyboard users were unreachable once the timer fired)', () => {
    vi.useFakeTimers();
    const onClick = vi.fn();
    const { fixture, service } = createHost();

    const id = service.show({
      message: 'Item deleted',
      duration: 2000,
      action: { label: 'Undo', onClick },
    }).id;
    fixture.detectChanges();

    const item = items(fixture)[0];
    const actionButton = item.querySelector<HTMLButtonElement>(
      '.andes-toast__action',
    );
    expect(actionButton).not.toBeNull();

    // A keyboard user tabs onto the action button - focusin bubbles up to the toast root,
    // same as mouseenter does for a pointer user.
    actionButton?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    fixture.detectChanges();

    // Well past the normal 2000ms duration - must NOT have auto-dismissed while the action
    // button holds focus, or a keyboard user mid-decision loses the control out from under
    // them.
    vi.advanceTimersByTime(10_000);
    fixture.detectChanges();
    expect(service.toasts().map((t) => t.id)).toContain(id);

    // Focus moves elsewhere - focusout bubbles up and resumes the countdown with whatever
    // time remained (the full 2000ms, since it never started counting down while paused).
    actionButton?.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    fixture.detectChanges();

    vi.advanceTimersByTime(1999);
    fixture.detectChanges();
    expect(service.toasts().map((t) => t.id)).toContain(id);

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(service.toasts().map((t) => t.id)).not.toContain(id);
  });

  it('reflects the position input as a data attribute for CSS placement', () => {
    const { fixture } = createHost();
    fixture.componentInstance.position.set('top-left');
    fixture.detectChanges();

    const viewport = fixture.nativeElement.querySelector(
      'andes-toast-viewport',
    );
    expect(viewport.getAttribute('data-position')).toBe('top-left');
  });

  describe('extended features', () => {
    function createTemplateHost(
      providers: Parameters<
        typeof TestBed.configureTestingModule
      >[0]['providers'] = [],
    ) {
      TestBed.configureTestingModule({ providers });
      const fixture = TestBed.createComponent(TemplateHostComponent);
      fixture.detectChanges();
      return {
        fixture,
        host: fixture.componentInstance,
        toasts: TestBed.inject(AndesToastService),
        messages: TestBed.inject(AndesMessageService),
      };
    }

    describe('close button placement', () => {
      const css = readFileSync(
        'packages/ui/src/lib/toast/toast-item.css',
        'utf8',
      );

      it('sits at the end of the row, centred with the text, not floating on a corner', () => {
        const { fixture, toasts } = createTemplateHost();
        toasts.show({ message: 'Saved', title: 'Done' });
        fixture.detectChanges();
        const row = fixture.nativeElement.querySelector('.andes-toast__row');
        const close = row?.querySelector(':scope > .andes-toast__close');
        expect(close).toBeTruthy();
        expect(row?.lastElementChild).toBe(close);
        expect(css).toMatch(/\.andes-toast__row \{[^}]*align-items: center/);
        const rule = /\.andes-toast__close \{([^}]*)\}/.exec(css)?.[1] ?? '';
        expect(rule).not.toContain('position: absolute');
        expect(rule).not.toMatch(/translate/);
        expect(rule).toContain('width: 1.75rem');
        expect(rule).toContain('height: 1.75rem');
      });
    });

    function regions(root: HTMLElement): HTMLElement[] {
      return Array.from(root.querySelectorAll('andes-toast-region'));
    }

    it('renders a built-in status icon per severity, none for neutral, and none with icon: null', () => {
      const { fixture, service } = createHost();

      service.success('ok');
      service.loading('wait');
      service.show({ message: 'plain' });
      service.error('no icon', { icon: null });
      fixture.detectChanges();

      const [success, loading, neutral, hidden] = items(fixture);
      expect(success.querySelector('.andes-toast__icon svg')).not.toBeNull();
      expect(
        success
          .querySelector('.andes-toast__icon')
          ?.getAttribute('aria-hidden'),
      ).toBe('true');
      expect(loading.querySelector('.andes-toast__spinner')).not.toBeNull();
      expect(neutral.querySelector('.andes-toast__icon')).toBeNull();
      expect(hidden.querySelector('.andes-toast__icon')).toBeNull();
    });

    it('renders a custom icon template with the toast as context', () => {
      const { fixture, host, toasts } = createTemplateHost();

      toasts.warning('custom', { icon: host.customIcon() });
      fixture.detectChanges();

      const icon = fixture.nativeElement.querySelector(
        '.andes-toast__icon .custom-icon',
      );
      expect(icon?.textContent).toBe('warning');
    });

    it('renders a custom closeIcon while keeping the accessible name', () => {
      const { fixture, host, toasts } = createTemplateHost();

      toasts.info('custom close', { closeIcon: host.customClose() });
      fixture.detectChanges();

      const close = fixture.nativeElement.querySelector(
        '.andes-toast__close',
      ) as HTMLButtonElement;
      expect(close.querySelector('.custom-close')).not.toBeNull();
      expect(close.getAttribute('aria-label')).toBe('Dismiss notification');
    });

    it('the close button closes with reason close-button', async () => {
      const { fixture, service } = createHost();

      const ref = service.show({ message: 'x' });
      fixture.detectChanges();
      items(fixture)[0]
        .querySelector<HTMLButtonElement>('.andes-toast__close')
        ?.click();

      await expect(ref.afterClosed).resolves.toBe('close-button');
    });

    it('renders an actions group; clicking one runs it and closes (unless dismissOnClick: false)', async () => {
      const { fixture, service } = createHost();
      const confirm = vi.fn();
      const later = vi.fn();

      const ref = service.show({
        title: 'Update available',
        message: 'Restart now?',
        actions: [
          { label: 'Later', onClick: later, dismissOnClick: false },
          { label: 'Restart', onClick: confirm, variant: 'primary' },
        ],
      });
      fixture.detectChanges();

      const buttons = Array.from(
        items(fixture)[0].querySelectorAll<HTMLButtonElement>(
          '.andes-toast__actions button',
        ),
      );
      expect(buttons.map((b) => b.textContent?.trim())).toEqual([
        'Later',
        'Restart',
      ]);

      buttons[0].click();
      expect(later).toHaveBeenCalledTimes(1);
      expect(service.toasts()).toHaveLength(1);

      buttons[1].click();
      expect(confirm).toHaveBeenCalledTimes(1);
      await expect(ref.afterClosed).resolves.toBe('action');
    });

    it('onClick fires with the ref on a body click, but not on its buttons', () => {
      const { fixture, service } = createHost();
      const onClick = vi.fn();

      const ref = service.show({ message: 'Open details', onClick });
      fixture.detectChanges();

      const item = items(fixture)[0];
      expect(item.hasAttribute('data-clickable')).toBe(true);
      item.querySelector<HTMLElement>('.andes-toast__message')?.click();
      expect(onClick).toHaveBeenCalledWith(ref);

      item.querySelector<HTMLButtonElement>('.andes-toast__close')?.click();
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('pauseOnHover: false keeps counting down while hovered (focus still pauses)', () => {
      vi.useFakeTimers();
      const { fixture, service } = createHost();

      service.show({
        message: 'no hover pause',
        duration: 1000,
        pauseOnHover: false,
      });
      fixture.detectChanges();
      const item = items(fixture)[0];
      expect(item.hasAttribute('data-pause-on-hover')).toBe(false);

      item.dispatchEvent(new MouseEvent('mouseenter'));
      vi.advanceTimersByTime(1000);
      expect(service.toasts()).toHaveLength(0);

      const id = service.show({
        message: 'focus pause',
        duration: 1000,
        pauseOnHover: false,
      }).id;
      fixture.detectChanges();
      items(fixture)[0].dispatchEvent(new FocusEvent('focusin'));
      vi.advanceTimersByTime(5000);
      expect(service.toasts().map((t) => t.id)).toContain(id);
    });

    it('renders one fixed region per placement in use; toasts without placement use the position input', () => {
      const { fixture, service } = createHost();

      service.show({ message: 'default' });
      service.show({ message: 'tl', placement: 'top-left' });
      service.show({ message: 'tl2', placement: 'top-left' });
      fixture.detectChanges();

      const rendered = regions(fixture.nativeElement);
      expect(rendered.map((r) => r.getAttribute('data-placement'))).toEqual([
        'top-left',
        'bottom-right',
      ]);
      expect(rendered[0].querySelectorAll('andes-toast-item')).toHaveLength(2);
      // Notifications collapse into a deck by default.
      expect(rendered[0].hasAttribute('data-stack-enabled')).toBe(true);
      expect(rendered[0].hasAttribute('data-stacked')).toBe(true);
    });

    it('keeps a used region mounted (empty) after its last toast closes, so that toast can animate out', () => {
      const { fixture, toasts, messages } = createTemplateHost();

      toasts.info('only one');
      messages.info('msg');
      fixture.detectChanges();
      toasts.destroy();
      messages.destroy();
      fixture.detectChanges();

      const rendered = regions(fixture.nativeElement);
      expect(rendered.map((r) => r.getAttribute('data-flavor'))).toEqual([
        'notification',
        'message',
      ]);
      expect(
        fixture.nativeElement.querySelectorAll('andes-toast-item'),
      ).toHaveLength(0);
    });

    it('falls back to the global placement when the viewport has no position input', () => {
      const { fixture, toasts } = createTemplateHost([
        provideAndesToastConfig({ placement: 'top-right', top: 64 }),
      ]);

      toasts.info('hello');
      fixture.detectChanges();

      const [region] = regions(fixture.nativeElement);
      expect(region.getAttribute('data-placement')).toBe('top-right');
      expect(region.style.top).toBe('64px');
      expect(
        fixture.nativeElement
          .querySelector('andes-toast-viewport')
          .getAttribute('data-position'),
      ).toBe('top-right');
    });

    it('renders messages in their own top-center region, compact and without a close button', () => {
      const { fixture, messages, toasts } = createTemplateHost();

      messages.success('Copied');
      toasts.info('A notification');
      fixture.detectChanges();

      const messageRegion = fixture.nativeElement.querySelector(
        'andes-toast-region[data-flavor="message"]',
      ) as HTMLElement;
      expect(messageRegion.getAttribute('data-placement')).toBe('top-center');
      const item = messageRegion.querySelector(
        'andes-toast-item',
      ) as HTMLElement;
      expect(item.getAttribute('data-flavor')).toBe('message');
      expect(item.classList).toContain('andes-toast--message');
      expect(item.querySelector('.andes-toast__close')).toBeNull();
      expect(item.getAttribute('role')).toBeNull();
      expect(regions(fixture.nativeElement)).toHaveLength(2);
    });

    it('a dismissible message gets a "Dismiss message" close button', () => {
      const { fixture, messages } = createTemplateHost();

      messages.info('Closable', { dismissible: true });
      fixture.detectChanges();

      expect(
        fixture.nativeElement
          .querySelector('.andes-toast__close')
          ?.getAttribute('aria-label'),
      ).toBe('Dismiss message');
    });

    it('stack: collapses beyond the threshold and expands while hovered or focused', () => {
      const { fixture, toasts } = createTemplateHost();
      toasts.config({ stack: { threshold: 2 } });

      toasts.info('1');
      toasts.info('2');
      fixture.detectChanges();
      const [region] = regions(fixture.nativeElement);
      expect(region.hasAttribute('data-stacked')).toBe(false);
      // Stacking on => newest-against-the-edge ordering even while expanded.
      expect(region.hasAttribute('data-stack-enabled')).toBe(true);

      toasts.info('3');
      toasts.info('4');
      toasts.info('5');
      fixture.detectChanges();
      expect(region.hasAttribute('data-stacked')).toBe(true);

      const stackItems = Array.from(
        region.querySelectorAll<HTMLElement>('andes-toast-item'),
      );
      // Newest (last) is in front; the others only peek out behind it.
      expect(
        stackItems.map((i) => i.hasAttribute('data-stack-behind')),
      ).toEqual([true, true, true, true, false]);
      expect(
        stackItems.map((i) => i.hasAttribute('data-stack-overflow')),
      ).toEqual([true, true, false, false, false]);
      expect(stackItems[4].style.getPropertyValue('--_toast-depth')).toBe('0');
      expect(stackItems[4].hasAttribute('data-front')).toBe(true);

      region.dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();
      expect(region.hasAttribute('data-stacked')).toBe(false);

      region.dispatchEvent(new MouseEvent('mouseleave'));
      fixture.detectChanges();
      expect(region.hasAttribute('data-stacked')).toBe(true);

      region.dispatchEvent(new FocusEvent('focusin'));
      fixture.detectChanges();
      expect(region.hasAttribute('data-stacked')).toBe(false);
    });

    it('titleTemplate/messageTemplate render rich content, while the plain text stays the announcement', () => {
      const announceSpy = vi.fn().mockResolvedValue(undefined);
      const { fixture, host, toasts } = createTemplateHost([
        { provide: LiveAnnouncer, useValue: { announce: announceSpy } },
      ]);

      toasts.show({
        title: 'Export ready',
        titleTemplate: host.richTitle(),
        message: 'report.xlsx',
        messageTemplate: host.richBody(),
      });
      fixture.detectChanges();

      const item = fixture.nativeElement.querySelector(
        'andes-toast-item',
      ) as HTMLElement;
      expect(
        item.querySelector('.andes-toast__title .rich-title')?.textContent,
      ).toBe('Export ready!');
      expect(
        item.querySelector('.andes-toast__message .rich-body')?.textContent,
      ).toBe('report.xlsx (link)');
      expect(announceSpy).toHaveBeenCalledWith(
        'Export ready. report.xlsx',
        'polite',
      );
    });

    it('a message renders its contentTemplate in place of the content text', () => {
      const { fixture, host, messages } = createTemplateHost();

      messages.open({ content: 'Copied', contentTemplate: host.richBody() });
      fixture.detectChanges();

      const message = fixture.nativeElement.querySelector(
        'andes-toast-item[data-flavor="message"]',
      ) as HTMLElement;
      expect(message.querySelector('.rich-body')?.textContent).toBe(
        'Copied (link)',
      );
    });

    it('applies style and attributes to the toast root, dropping stale attributes on update', () => {
      const { fixture, toasts } = createTemplateHost();

      const ref = toasts.show({
        message: 'x',
        style: { width: '30rem' },
        attributes: {
          'data-testid': 'save-toast',
          'aria-describedby': 'help',
          class: 'ignored',
        },
      });
      fixture.detectChanges();

      const item = fixture.nativeElement.querySelector(
        'andes-toast-item',
      ) as HTMLElement;
      expect(item.style.width).toBe('30rem');
      expect(item.getAttribute('data-testid')).toBe('save-toast');
      expect(item.getAttribute('aria-describedby')).toBe('help');
      expect(item.classList).not.toContain('ignored');
      expect(item.classList).toContain('andes-toast');

      ref.update({ attributes: { 'data-testid': 'saved-toast' } });
      fixture.detectChanges();
      expect(item.getAttribute('data-testid')).toBe('saved-toast');
      expect(item.hasAttribute('aria-describedby')).toBe(false);
    });

    it('closeIcon: null hides the close button', () => {
      const { fixture, toasts } = createTemplateHost();

      toasts.show({ message: 'no close', closeIcon: null });
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.andes-toast__close')).toBe(
        null,
      );
    });

    it('rtl lays each toast out right-to-left, per flavor', () => {
      const { fixture, toasts, messages } = createTemplateHost([
        provideAndesToastConfig({ rtl: true }),
      ]);

      toasts.info('notification');
      messages.info('message');
      fixture.detectChanges();

      const notification = fixture.nativeElement.querySelector(
        'andes-toast-item[data-flavor="notification"]',
      ) as HTMLElement;
      const message = fixture.nativeElement.querySelector(
        'andes-toast-item[data-flavor="message"]',
      ) as HTMLElement;
      expect(notification.getAttribute('dir')).toBe('rtl');
      expect(message.hasAttribute('dir')).toBe(false);

      messages.config({ rtl: true });
      fixture.detectChanges();
      expect(message.getAttribute('dir')).toBe('rtl');
    });

    function pointer(
      type: string,
      clientX: number,
      clientY: number,
    ): MouseEvent {
      const event = new MouseEvent(type, {
        bubbles: true,
        button: 0,
        clientX,
        clientY,
      });
      Object.defineProperty(event, 'pointerId', { value: 1 });
      return event;
    }

    function drag(item: HTMLElement, dx: number, dy: number): void {
      item.dispatchEvent(pointer('pointerdown', 100, 100));
      item.dispatchEvent(pointer('pointermove', 100 + dx / 2, 100 + dy / 2));
      item.dispatchEvent(pointer('pointermove', 100 + dx, 100 + dy));
      item.dispatchEvent(pointer('pointerup', 100 + dx, 100 + dy));
    }

    it('collapses notifications into a deck from two on by default; messages stay a list', () => {
      const { fixture, toasts, messages } = createTemplateHost();

      toasts.info('1');
      messages.info('a');
      messages.info('b');
      fixture.detectChanges();
      const [notificationRegion, messageRegion] = regions(
        fixture.nativeElement,
      );
      expect(notificationRegion.hasAttribute('data-stacked')).toBe(false);

      toasts.info('2');
      fixture.detectChanges();
      expect(notificationRegion.hasAttribute('data-stacked')).toBe(true);
      expect(messageRegion.hasAttribute('data-stack-enabled')).toBe(false);
    });

    it('visibleToasts sets how many cards of a collapsed deck stay visible', () => {
      const { fixture, toasts } = createTemplateHost([
        provideAndesToastConfig({ visibleToasts: 2 }),
      ]);

      toasts.info('1');
      toasts.info('2');
      toasts.info('3');
      fixture.detectChanges();

      const stackItems = Array.from(
        regions(fixture.nativeElement)[0].querySelectorAll<HTMLElement>(
          'andes-toast-item',
        ),
      );
      expect(
        stackItems.map((i) => i.hasAttribute('data-stack-overflow')),
      ).toEqual([true, false, false]);
    });

    it('lays expanded toasts out from their measured heights, from the anchoring edge', () => {
      const { fixture, toasts } = createTemplateHost([
        provideAndesToastConfig({ stack: false, gap: 10 }),
      ]);

      toasts.info('oldest');
      toasts.info('middle');
      toasts.info('newest');
      fixture.detectChanges();

      const debugItems = fixture.debugElement.queryAll(
        By.css('andes-toast-item'),
      );
      debugItems[0].triggerEventHandler('heightChange', 80);
      debugItems[1].triggerEventHandler('heightChange', 60);
      debugItems[2].triggerEventHandler('heightChange', 54);
      fixture.detectChanges();

      const offsets = debugItems.map((d) =>
        (d.nativeElement as HTMLElement).style.getPropertyValue(
          '--_toast-offset',
        ),
      );
      // Without stacking the oldest sits against the edge, newer ones after it:
      // oldest: 0; middle: 80 + 10; newest: 80 + 10 + 60 + 10.
      expect(offsets).toEqual(['0px', '90px', '160px']);
      expect(
        (debugItems[0].nativeElement as HTMLElement).style.getPropertyValue(
          '--_toast-height',
        ),
      ).toBe('80px');
      expect(
        regions(fixture.nativeElement)[0].style.getPropertyValue(
          '--_toast-front-height',
        ),
      ).toBe('54px');
    });

    it('numbers slots from the anchoring edge: newest first with stacking, oldest first without', () => {
      const { fixture, toasts } = createTemplateHost();

      toasts.info('1');
      toasts.info('2');
      toasts.info('3');
      fixture.detectChanges();
      const depths = () =>
        Array.from(
          fixture.nativeElement.querySelectorAll('andes-toast-item'),
        ).map((i) =>
          (i as HTMLElement).style.getPropertyValue('--_toast-depth'),
        );
      const fronts = () =>
        Array.from(
          fixture.nativeElement.querySelectorAll('andes-toast-item'),
        ).map((i) => (i as HTMLElement).hasAttribute('data-front'));
      expect(depths()).toEqual(['2', '1', '0']);
      expect(fronts()).toEqual([false, false, true]);

      toasts.config({ stack: false });
      fixture.detectChanges();
      expect(depths()).toEqual(['0', '1', '2']);
      expect(fronts()).toEqual([true, false, false]);
    });

    it('turns measured heights into slot offsets and pins cards behind the front to its height', async () => {
      // jsdom has no layout: give each toast row a height its item can report.
      const offsetHeight = vi
        .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
        .mockImplementation(function (this: HTMLElement) {
          return this.classList.contains('andes-toast__row') ? 40 : 0;
        });
      try {
        const { fixture, toasts } = createTemplateHost();
        toasts.info('older');
        toasts.info('newer');
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        const [region] = regions(fixture.nativeElement);
        const [older, newer] = Array.from(
          region.querySelectorAll<HTMLElement>('andes-toast-item'),
        );
        const height = parseFloat(
          newer.style.getPropertyValue('--_toast-height'),
        );
        expect(height).toBeGreaterThanOrEqual(40);
        expect(newer.style.getPropertyValue('--_toast-offset')).toBe('0px');
        expect(older.style.getPropertyValue('--_toast-offset')).toBe(
          `${height + 14}px`,
        );
        expect(region.style.getPropertyValue('--_toast-front-height')).toBe(
          `${height}px`,
        );
      } finally {
        offsetHeight.mockRestore();
      }
    });

    it('hovering the stack pauses every toast in it, including ones that arrive meanwhile', () => {
      vi.useFakeTimers();
      const { fixture, toasts } = createTemplateHost();

      toasts.info('first', { duration: 1000 });
      fixture.detectChanges();
      const [region] = regions(fixture.nativeElement);
      region.dispatchEvent(new MouseEvent('mouseenter'));
      fixture.detectChanges();

      toasts.info('second', { duration: 1000 });
      toasts.info('keeps counting', { duration: 1000, pauseOnHover: false });
      fixture.detectChanges();

      vi.advanceTimersByTime(5000);
      expect(toasts.toasts().map((t) => t.message)).toEqual([
        'first',
        'second',
      ]);

      region.dispatchEvent(new MouseEvent('mouseleave'));
      fixture.detectChanges();
      vi.advanceTimersByTime(1000);
      expect(toasts.toasts()).toHaveLength(0);
    });

    it('without stacking, hovering one toast pauses only that toast', () => {
      vi.useFakeTimers();
      const { fixture, toasts } = createTemplateHost();
      toasts.config({ stack: false });

      toasts.info('hovered', { duration: 1000 });
      toasts.info('other', { duration: 1000 });
      fixture.detectChanges();
      const [first] = Array.from<HTMLElement>(
        fixture.nativeElement.querySelectorAll('andes-toast-item'),
      );
      first.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
      fixture.detectChanges();

      vi.advanceTimersByTime(1000);
      expect(toasts.toasts().map((t) => t.message)).toEqual(['hovered']);

      first.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
      vi.advanceTimersByTime(1000);
      expect(toasts.toasts()).toHaveLength(0);
    });

    it('renders cancel before action; each runs its callback and closes with reason action', async () => {
      const { fixture, toasts } = createTemplateHost();
      const onCancel = vi.fn();
      const onConfirm = vi.fn();

      const ref = toasts.show({
        message: 'Discard draft?',
        cancel: { label: 'Cancel', onClick: onCancel },
        action: { label: 'Discard', onClick: onConfirm },
      });
      fixture.detectChanges();

      const buttons = Array.from(
        fixture.nativeElement.querySelectorAll(
          '.andes-toast__row > button',
        ) as NodeListOf<HTMLButtonElement>,
      );
      // The close button closes the row, after the cancel and action buttons.
      expect(buttons.map((b) => b.className)).toEqual([
        'andes-toast__cancel',
        'andes-toast__action',
        'andes-toast__close',
      ]);
      buttons[0].click();
      expect(onCancel).toHaveBeenCalledTimes(1);
      expect(onConfirm).not.toHaveBeenCalled();
      await expect(ref.afterClosed).resolves.toBe('action');
    });

    it('richColors marks the toast for the tinted style, globally or per toast', () => {
      const { fixture, toasts, messages } = createTemplateHost();

      toasts.success('plain');
      toasts.success('rich', { richColors: true });
      messages.config({ richColors: true });
      messages.error('rich message');
      fixture.detectChanges();

      const rendered = Array.from(
        fixture.nativeElement.querySelectorAll('andes-toast-item'),
      ) as HTMLElement[];
      expect(rendered.map((i) => i.hasAttribute('data-rich-colors'))).toEqual([
        false,
        true,
        true,
      ]);
    });

    it('offset moves the stack off the edges; top/bottom still win for their edge', () => {
      const { fixture, toasts } = createTemplateHost([
        provideAndesToastConfig({ offset: 40, bottom: '5rem' }),
      ]);

      toasts.info('bottom right');
      toasts.info('top left', { placement: 'top-left' });
      fixture.detectChanges();

      const [topLeft, bottomRight] = regions(fixture.nativeElement);
      expect(topLeft.style.top).toBe('40px');
      expect(topLeft.style.getPropertyValue('--_toast-offset-x')).toBe('40px');
      expect(bottomRight.style.bottom).toBe('5rem');
    });

    it('dragging a toast past the threshold towards its edge dismisses it with reason swipe', async () => {
      const { fixture, toasts } = createTemplateHost();

      const ref = toasts.info('swipe me');
      fixture.detectChanges();
      const item = fixture.nativeElement.querySelector(
        'andes-toast-item',
      ) as HTMLElement;
      expect(item.hasAttribute('data-swipeable')).toBe(true);

      // bottom-right: dragging up (away from the edge) only stretches, then snaps back.
      drag(item, 0, -80);
      fixture.detectChanges();
      expect(toasts.toasts()).toHaveLength(1);
      expect(item.style.getPropertyValue('--_toast-swipe-y')).toBe('');

      drag(item, 60, 0);
      fixture.detectChanges();
      expect(item.getAttribute('data-swipe-out')).toBe('right');
      await expect(ref.afterClosed).resolves.toBe('swipe');
    });

    it('a short, slow drag snaps back; a drag away from the edge is dampened and never dismisses', () => {
      vi.useFakeTimers();
      const { fixture, toasts } = createTemplateHost();
      toasts.info('swipe me');
      fixture.detectChanges();
      const item = fixture.nativeElement.querySelector(
        'andes-toast-item',
      ) as HTMLElement;

      item.dispatchEvent(pointer('pointerdown', 100, 100));
      item.dispatchEvent(pointer('pointermove', 110, 100));
      vi.advanceTimersByTime(500);
      item.dispatchEvent(pointer('pointerup', 110, 100));
      expect(toasts.toasts()).toHaveLength(1);
      expect(item.hasAttribute('data-swiping')).toBe(false);
      expect(item.style.getPropertyValue('--_toast-swipe-x')).toBe('');

      // bottom-right: dragging left is away from the edge.
      item.dispatchEvent(pointer('pointerdown', 100, 100));
      item.dispatchEvent(pointer('pointermove', 0, 100));
      const dampened = parseFloat(
        item.style.getPropertyValue('--_toast-swipe-x'),
      );
      expect(dampened).toBeLessThan(0);
      expect(dampened).toBeGreaterThan(-45);
      item.dispatchEvent(pointer('pointerup', 0, 100));
      expect(toasts.toasts()).toHaveLength(1);
    });

    it('swipeToDismiss: false turns swiping off, even for a dismissible toast', () => {
      const { fixture, toasts } = createTemplateHost();
      toasts.info('stays put', { swipeToDismiss: false });
      fixture.detectChanges();
      const item = fixture.nativeElement.querySelector(
        'andes-toast-item',
      ) as HTMLElement;

      expect(item.hasAttribute('data-swipeable')).toBe(false);
      drag(item, 120, 0);
      expect(toasts.toasts()).toHaveLength(1);
    });

    it('a drag is not a body click, and buttons never start a drag', () => {
      const { fixture, toasts } = createTemplateHost();
      const onClick = vi.fn();

      toasts.show({
        message: 'drag but not click',
        onClick,
        swipeDirections: ['left'],
      });
      fixture.detectChanges();
      const item = fixture.nativeElement.querySelector(
        'andes-toast-item',
      ) as HTMLElement;

      drag(item, 20, 0);
      item.click();
      expect(onClick).not.toHaveBeenCalled();

      const close = item.querySelector('.andes-toast__close') as HTMLElement;
      close.dispatchEvent(pointer('pointerdown', 0, 0));
      close.dispatchEvent(pointer('pointermove', -90, 0));
      close.dispatchEvent(pointer('pointerup', -90, 0));
      expect(item.hasAttribute('data-swipe-out')).toBe(false);
    });

    it('toasts that cannot be dismissed are not swipeable unless they opt in', () => {
      const { fixture, toasts, messages } = createTemplateHost();

      toasts.loading('Saving', { dismissible: false });
      messages.info('plain message');
      messages.info('swipeable message', { swipeDirections: ['top'] });
      fixture.detectChanges();

      const rendered = Array.from(
        fixture.nativeElement.querySelectorAll('andes-toast-item'),
      ) as HTMLElement[];
      expect(rendered.map((i) => i.hasAttribute('data-swipeable'))).toEqual([
        false,
        false,
        true,
      ]);
    });

    it('applies className to the toast root', () => {
      const { fixture, service } = createHost();

      service.show({ message: 'x', className: 'my-toast' });
      fixture.detectChanges();

      expect(items(fixture)[0].classList).toContain('my-toast');
      expect(items(fixture)[0].classList).toContain('andes-toast');
    });
  });
});
