import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';

import { AndesToastService } from './toast.service';

describe('AndesToastService', () => {
  let announceSpy: ReturnType<typeof vi.fn>;

  function createService(): AndesToastService {
    announceSpy = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: LiveAnnouncer, useValue: { announce: announceSpy } },
      ],
    });
    return TestBed.inject(AndesToastService);
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('enqueues a toast with defaults and returns its id', () => {
    const service = createService();

    const id = service.show({ message: 'Saved' });

    expect(id).toMatch(/^andes-toast-/);
    expect(service.toasts()).toEqual([
      expect.objectContaining({
        id,
        message: 'Saved',
        severity: 'neutral',
        duration: 5000,
        dismissible: true,
      }),
    ]);
  });

  it.each([
    ['success', 'success'],
    ['error', 'error'],
    ['warning', 'warning'],
    ['info', 'info'],
  ] as const)('%s() sets severity to %s', (method, severity) => {
    const service = createService();

    service[method]('Hello');

    expect(service.toasts()[0].severity).toBe(severity);
  });

  it('stacks multiple toasts in call order', () => {
    const service = createService();

    service.show({ message: 'first' });
    service.show({ message: 'second' });
    service.show({ message: 'third' });

    expect(service.toasts().map((toast) => toast.message)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  it('auto-dismisses a toast after its duration', () => {
    vi.useFakeTimers();
    const service = createService();

    const id = service.show({ message: 'Saved', duration: 3000 });
    expect(service.toasts().map((t) => t.id)).toContain(id);

    vi.advanceTimersByTime(2999);
    expect(service.toasts().map((t) => t.id)).toContain(id);

    vi.advanceTimersByTime(1);
    expect(service.toasts().map((t) => t.id)).not.toContain(id);
  });

  it('does not auto-dismiss when duration is false', () => {
    vi.useFakeTimers();
    const service = createService();

    const id = service.show({ message: 'Stays', duration: false });

    vi.advanceTimersByTime(1_000_000);

    expect(service.toasts().map((t) => t.id)).toContain(id);
  });

  it('treats duration 0 the same as false', () => {
    vi.useFakeTimers();
    const service = createService();

    const id = service.show({ message: 'Stays', duration: 0 });

    vi.advanceTimersByTime(1_000_000);

    expect(service.toasts().map((t) => t.id)).toContain(id);
  });

  it('pause() halts the countdown and resume() continues with the remaining time', () => {
    vi.useFakeTimers();
    const service = createService();

    const id = service.show({ message: 'Hoverable', duration: 3000 });

    vi.advanceTimersByTime(2000);
    service.pause(id);

    // Fully past the original duration while paused - must not have dismissed.
    vi.advanceTimersByTime(5000);
    expect(service.toasts().map((t) => t.id)).toContain(id);

    service.resume(id);

    // Only ~1000ms should have been remaining (3000 - 2000).
    vi.advanceTimersByTime(999);
    expect(service.toasts().map((t) => t.id)).toContain(id);

    vi.advanceTimersByTime(1);
    expect(service.toasts().map((t) => t.id)).not.toContain(id);
  });

  it('pause()/resume() are reference-counted so overlapping pause sources (hover + focus) do not desync', () => {
    vi.useFakeTimers();
    const service = createService();

    const id = service.show({
      message: 'Hoverable and focusable',
      duration: 2000,
    });

    // Two independent sources both pause it (e.g. pointer hover, then keyboard focus).
    service.pause(id);
    service.pause(id);

    // One source clears (e.g. mouse leaves) while the other (focus) is still active - must
    // stay paused, well past the original duration.
    service.resume(id);
    vi.advanceTimersByTime(10_000);
    expect(service.toasts().map((t) => t.id)).toContain(id);

    // The second source now clears too - only now does the countdown actually resume.
    service.resume(id);
    vi.advanceTimersByTime(1999);
    expect(service.toasts().map((t) => t.id)).toContain(id);
    vi.advanceTimersByTime(1);
    expect(service.toasts().map((t) => t.id)).not.toContain(id);
  });

  it('resume() without a prior pause() is a no-op', () => {
    vi.useFakeTimers();
    const service = createService();

    const id = service.show({ message: 'Untouched', duration: 3000 });
    service.resume(id);

    vi.advanceTimersByTime(3000);
    expect(service.toasts().map((t) => t.id)).not.toContain(id);
  });

  it('dismiss(id) removes only the targeted toast', () => {
    const service = createService();

    const first = service.show({ message: 'first' });
    const second = service.show({ message: 'second' });

    service.dismiss(first);

    expect(service.toasts().map((t) => t.id)).toEqual([second]);
  });

  it('dismiss() with an unknown id is a no-op', () => {
    const service = createService();
    service.show({ message: 'first' });

    expect(() => service.dismiss('does-not-exist')).not.toThrow();
    expect(service.toasts()).toHaveLength(1);
  });

  it('dismissAll() clears the entire queue, including pending timers', () => {
    vi.useFakeTimers();
    const service = createService();

    service.show({ message: 'first' });
    service.show({ message: 'second', duration: false });

    service.dismissAll();

    expect(service.toasts()).toEqual([]);

    // No stray timer should fire and throw/resurrect anything after dismissAll().
    vi.advanceTimersByTime(10_000);
    expect(service.toasts()).toEqual([]);
  });

  it('queues toasts beyond maxVisible and promotes the next one on dismiss', () => {
    vi.useFakeTimers();
    const service = createService();
    service.configureMaxVisible(2);

    const a = service.show({ message: 'a', duration: 1000 });
    const b = service.show({ message: 'b', duration: 1000 });
    const c = service.show({ message: 'c', duration: 1000 });

    expect(service.visibleToasts().map((t) => t.id)).toEqual([a, b]);
    expect(service.queuedCount()).toBe(1);

    // The queued toast's timer must not be running yet.
    vi.advanceTimersByTime(1000);
    expect(service.toasts().map((t) => t.id)).toEqual([c]);
    expect(service.visibleToasts().map((t) => t.id)).toEqual([c]);
    expect(service.queuedCount()).toBe(0);

    // Now that it's visible, its full duration starts counting down.
    vi.advanceTimersByTime(999);
    expect(service.toasts()).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(service.toasts()).toHaveLength(0);
  });

  it('routes the announcement through LiveAnnouncer with polite politeness by default', () => {
    const service = createService();

    service.show({ title: 'Saved', message: 'Your changes were saved.' });

    expect(announceSpy).toHaveBeenCalledWith(
      'Saved. Your changes were saved.',
      'polite',
    );
  });

  it('routes error toasts through LiveAnnouncer with assertive politeness', () => {
    const service = createService();

    service.error('Could not save.');

    expect(announceSpy).toHaveBeenCalledWith('Could not save.', 'assertive');
  });
});
