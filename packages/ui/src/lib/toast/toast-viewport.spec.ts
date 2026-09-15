import { LiveAnnouncer } from '@angular/cdk/a11y';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesToastService } from './toast.service';
import type { AndesToastPosition } from './toast.types';
import { AndesToastViewport } from './toast-viewport';

@Component({
  imports: [AndesToastViewport],
  template: `<andes-toast-viewport [position]="position()" />`,
})
class HostComponent {
  readonly position = signal<AndesToastPosition>('bottom-right');
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

    const first = service.show({ message: 'first' });
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
    });
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

    const id = service.show({ message: 'Hoverable', duration: 2000 });
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
    });
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
});
