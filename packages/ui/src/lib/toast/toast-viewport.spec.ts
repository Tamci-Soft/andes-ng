import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

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
  `,
})
class TemplateHostComponent {
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

    it('showProgress renders a bar that drains over the duration, only for timed toasts', () => {
      const { fixture, service } = createHost();

      service.show({ message: 'timed', duration: 4000, showProgress: true });
      service.show({ message: 'sticky', duration: false, showProgress: true });
      service.show({ message: 'off', duration: 4000 });
      fixture.detectChanges();

      const [timed, sticky, off] = items(fixture);
      const bar = timed.querySelector<HTMLElement>('.andes-toast__progress');
      expect(bar?.style.animationDuration).toBe('4000ms');
      expect(bar?.getAttribute('aria-hidden')).toBe('true');
      expect(sticky.querySelector('.andes-toast__progress')).toBeNull();
      expect(off.querySelector('.andes-toast__progress')).toBeNull();
    });

    it('a key-based update restarts the progress bar', () => {
      const { fixture, service } = createHost();

      service.show({ message: 'a', key: 'k', showProgress: true });
      fixture.detectChanges();
      const before = items(fixture)[0].querySelector('.andes-toast__progress');

      service.show({ message: 'b', key: 'k', showProgress: true });
      fixture.detectChanges();
      const after = items(fixture)[0].querySelector('.andes-toast__progress');

      expect(after).not.toBeNull();
      expect(after).not.toBe(before);
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
      expect(rendered[0].hasAttribute('data-stack-enabled')).toBe(false);
    });

    it('falls back to the global placement when the viewport has no position input', () => {
      const { fixture, toasts } = createTemplateHost([
        provideAndesToastConfig({ placement: 'top-right', top: 64 }),
      ]);

      toasts.info('hello');
      fixture.detectChanges();

      const [region] = regions(fixture.nativeElement);
      expect(region.getAttribute('data-placement')).toBe('top-right');
      expect(region.style.paddingTop).toBe('64px');
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
      expect(stackItems[4].style.getPropertyValue('--_toast-stack-depth')).toBe(
        '0',
      );

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

    it('applies className to the toast root', () => {
      const { fixture, service } = createHost();

      service.show({ message: 'x', className: 'my-toast' });
      fixture.detectChanges();

      expect(items(fixture)[0].classList).toContain('my-toast');
      expect(items(fixture)[0].classList).toContain('andes-toast');
    });
  });
});
