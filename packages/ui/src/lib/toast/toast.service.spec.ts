import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';

import { provideAndesToastConfig } from './toast.config';
import { AndesToastService } from './toast.service';

describe('AndesToastService', () => {
  let announceSpy: ReturnType<typeof vi.fn>;

  function createService(
    extraProviders: Parameters<
      typeof TestBed.configureTestingModule
    >[0]['providers'] = [],
  ): AndesToastService {
    announceSpy = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: LiveAnnouncer, useValue: { announce: announceSpy } },
        ...(extraProviders ?? []),
      ],
    });
    return TestBed.inject(AndesToastService);
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('enqueues a toast with defaults and returns its id', () => {
    const service = createService();

    const id = service.show({ message: 'Saved' }).id;

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

    const id = service.show({ message: 'Saved', duration: 3000 }).id;
    expect(service.toasts().map((t) => t.id)).toContain(id);

    vi.advanceTimersByTime(2999);
    expect(service.toasts().map((t) => t.id)).toContain(id);

    vi.advanceTimersByTime(1);
    expect(service.toasts().map((t) => t.id)).not.toContain(id);
  });

  it('does not auto-dismiss when duration is false', () => {
    vi.useFakeTimers();
    const service = createService();

    const id = service.show({ message: 'Stays', duration: false }).id;

    vi.advanceTimersByTime(1_000_000);

    expect(service.toasts().map((t) => t.id)).toContain(id);
  });

  it('treats duration 0 the same as false', () => {
    vi.useFakeTimers();
    const service = createService();

    const id = service.show({ message: 'Stays', duration: 0 }).id;

    vi.advanceTimersByTime(1_000_000);

    expect(service.toasts().map((t) => t.id)).toContain(id);
  });

  it('pause() halts the countdown and resume() continues with the remaining time', () => {
    vi.useFakeTimers();
    const service = createService();

    const id = service.show({ message: 'Hoverable', duration: 3000 }).id;

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
    }).id;

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

    const id = service.show({ message: 'Untouched', duration: 3000 }).id;
    service.resume(id);

    vi.advanceTimersByTime(3000);
    expect(service.toasts().map((t) => t.id)).not.toContain(id);
  });

  it('dismiss(id) removes only the targeted toast', () => {
    const service = createService();

    const first = service.show({ message: 'first' }).id;
    const second = service.show({ message: 'second' }).id;

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

    const a = service.show({ message: 'a', duration: 1000 }).id;
    const b = service.show({ message: 'b', duration: 1000 }).id;
    const c = service.show({ message: 'c', duration: 1000 }).id;

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

  describe('Ant Design parity', () => {
    it('show() returns a ref whose id identifies the toast', () => {
      const service = createService();

      const ref = service.show({ message: 'Saved' });

      expect(ref.id).toMatch(/^andes-toast-/);
      expect(service.toasts()[0].id).toBe(ref.id);
    });

    it('open() is an alias of show()', () => {
      const service = createService();

      service.open({ message: 'Opened', severity: 'info' });

      expect(service.toasts()[0]).toEqual(
        expect.objectContaining({ message: 'Opened', severity: 'info' }),
      );
    });

    it('loading() sets severity to loading', () => {
      const service = createService();

      service.loading('Saving...');

      expect(service.toasts()[0].severity).toBe('loading');
    });

    it('re-showing with the same key updates the open toast in place (loading -> success)', () => {
      vi.useFakeTimers();
      const service = createService();
      service.show({ message: 'other' });

      const first = service.loading('Saving...', {
        key: 'save',
        duration: false,
      });
      const second = service.success('Saved.', { key: 'save' });

      expect(second).toBe(first);
      expect(service.toasts()).toHaveLength(2);
      expect(service.toasts()[1]).toEqual(
        expect.objectContaining({
          id: first.id,
          key: 'save',
          message: 'Saved.',
          severity: 'success',
          duration: 5000,
          revision: 1,
        }),
      );
      // The replacement is announced, so the loading -> success change is heard.
      expect(announceSpy).toHaveBeenLastCalledWith('Saved.', 'polite');

      // Was persistent; the update gave it a fresh finite countdown.
      vi.advanceTimersByTime(4999);
      expect(service.toasts().map((t) => t.id)).toContain(first.id);
      vi.advanceTimersByTime(1);
      expect(service.toasts().map((t) => t.id)).not.toContain(first.id);
    });

    it('a key-based update while hovered restarts the countdown but stays paused until resume()', () => {
      vi.useFakeTimers();
      const service = createService();

      const ref = service.loading('Saving...', { key: 'k', duration: false });
      service.pause(ref.id);
      service.success('Saved.', { key: 'k', duration: 1000 });

      vi.advanceTimersByTime(10_000);
      expect(service.toasts()).toHaveLength(1);

      service.resume(ref.id);
      vi.advanceTimersByTime(999);
      expect(service.toasts()).toHaveLength(1);
      vi.advanceTimersByTime(1);
      expect(service.toasts()).toHaveLength(0);
    });

    it('ref.update() merges a patch onto the current config', () => {
      const service = createService();

      const ref = service.show({ title: 'Upload', message: '10%' });
      ref.update({ message: '90%' });

      expect(service.toasts()[0]).toEqual(
        expect.objectContaining({ title: 'Upload', message: '90%' }),
      );
    });

    it('update() by key is a no-op when nothing matches', () => {
      const service = createService();
      service.show({ message: 'a' });

      expect(() => service.update('missing', { message: 'b' })).not.toThrow();
      expect(service.toasts()[0].message).toBe('a');
    });

    it('dismiss() and destroy() accept a key or a ref', () => {
      const service = createService();
      service.show({ message: 'a', key: 'a' });
      const b = service.show({ message: 'b' });
      service.show({ message: 'c', key: 'c' });

      service.dismiss('a');
      service.dismiss(b);
      expect(service.toasts().map((t) => t.message)).toEqual(['c']);

      service.destroy('c');
      expect(service.toasts()).toEqual([]);
    });

    it('destroy() without an argument closes everything', () => {
      const service = createService();
      service.show({ message: 'a' });
      service.show({ message: 'b' });

      service.destroy();

      expect(service.toasts()).toEqual([]);
    });

    it('afterClosed resolves with the close reason', async () => {
      vi.useFakeTimers();
      const service = createService();

      const timedOut = service.show({ message: 'a', duration: 1000 });
      const closed = service.show({ message: 'b', duration: false });
      const cleared = service.show({ message: 'c', duration: false });

      vi.advanceTimersByTime(1000);
      closed.close();
      service.dismissAll();

      await expect(timedOut.afterClosed).resolves.toBe('timeout');
      await expect(closed.afterClosed).resolves.toBe('dismissed');
      await expect(cleared.afterClosed).resolves.toBe('dismissed');
    });

    it('onClose fires exactly once on close, and not on a key-based update', () => {
      const service = createService();
      const onClose = vi.fn();

      service.show({ message: 'a', key: 'k', onClose });
      service.show({ message: 'b', key: 'k', onClose });
      expect(onClose).not.toHaveBeenCalled();

      service.dismiss('k');
      service.dismiss('k');

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledWith('dismissed');
    });

    it("overflow: 'dismiss-oldest' closes the oldest toast beyond maxCount instead of queuing", async () => {
      const service = createService();
      service.config({ maxCount: 2, overflow: 'dismiss-oldest' });

      const a = service.show({ message: 'a' });
      service.show({ message: 'b' });
      service.show({ message: 'c' });

      expect(service.toasts().map((t) => t.message)).toEqual(['b', 'c']);
      expect(service.queuedCount()).toBe(0);
      await expect(a.afterClosed).resolves.toBe('overflow');
    });

    it('role overrides the announcement politeness', () => {
      const service = createService();

      service.info('Heads up', { role: 'alert' });
      expect(announceSpy).toHaveBeenLastCalledWith('Heads up', 'assertive');

      service.error('Soft failure', { role: 'status' });
      expect(announceSpy).toHaveBeenLastCalledWith('Soft failure', 'polite');
    });

    it('resolves pauseOnHover/showProgress/actions/placement from config and defaults', () => {
      const service = createService();

      service.show({ message: 'defaults' });
      service.show({
        message: 'custom',
        pauseOnHover: false,
        showProgress: true,
        placement: 'top-left',
        className: 'my-toast',
        actions: [{ label: 'OK', onClick: () => undefined }],
      });

      expect(service.toasts()[0]).toEqual(
        expect.objectContaining({
          pauseOnHover: true,
          showProgress: false,
          placement: undefined,
          actions: [],
          role: 'status',
          flavor: 'notification',
        }),
      );
      expect(service.toasts()[1]).toEqual(
        expect.objectContaining({
          pauseOnHover: false,
          showProgress: true,
          placement: 'top-left',
          className: 'my-toast',
        }),
      );
    });

    it('provideAndesToastConfig() sets app-wide defaults', () => {
      vi.useFakeTimers();
      const service = createService([
        provideAndesToastConfig({
          duration: 1000,
          showProgress: true,
          dismissible: false,
          maxCount: 1,
        }),
      ]);

      service.show({ message: 'a' });
      service.show({ message: 'b' });

      expect(service.toasts()[0]).toEqual(
        expect.objectContaining({
          duration: 1000,
          showProgress: true,
          dismissible: false,
        }),
      );
      expect(service.maxVisible()).toBe(1);
      expect(service.queuedCount()).toBe(1);

      vi.advanceTimersByTime(1000);
      expect(service.toasts().map((t) => t.message)).toEqual(['b']);
    });

    it('config() changes the defaults for toasts shown afterwards', () => {
      const service = createService();

      service.config({ duration: false, placement: 'top-right' });
      service.show({ message: 'a' });

      expect(service.defaults().placement).toBe('top-right');
      expect(service.toasts()[0].duration).toBe(false);
    });
  });
});
