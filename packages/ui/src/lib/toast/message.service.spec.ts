import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';

import { AndesMessageService } from './message.service';
import { provideAndesMessageConfig } from './toast.config';
import { AndesToastService } from './toast.service';

describe('AndesMessageService', () => {
  let announceSpy: ReturnType<typeof vi.fn>;

  function createService(
    extraProviders: Parameters<
      typeof TestBed.configureTestingModule
    >[0]['providers'] = [],
  ): AndesMessageService {
    announceSpy = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: LiveAnnouncer, useValue: { announce: announceSpy } },
        ...(extraProviders ?? []),
      ],
    });
    return TestBed.inject(AndesMessageService);
  }

  afterEach(() => {
    vi.useRealTimers();
  });

  it('open() enqueues a compact top-center message with message defaults', () => {
    const service = createService();

    const ref = service.open({ content: 'Copied' });

    expect(ref.id).toMatch(/^andes-message-/);
    expect(service.toasts()).toEqual([
      expect.objectContaining({
        id: ref.id,
        flavor: 'message',
        message: 'Copied',
        severity: 'info',
        duration: 3000,
        dismissible: false,
        placement: 'top-center',
        actions: [],
      }),
    ]);
  });

  it.each(['success', 'error', 'warning', 'info', 'loading'] as const)(
    '%s() sets the type',
    (type) => {
      const service = createService();

      service[type]('Hello');

      expect(service.toasts()[0].severity).toBe(type);
    },
  );

  it('auto-dismisses after 3s by default, and never with duration 0', () => {
    vi.useFakeTimers();
    const service = createService();

    service.info('short');
    service.info('sticky', { duration: 0 });

    vi.advanceTimersByTime(2999);
    expect(service.toasts()).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(service.toasts().map((t) => t.message)).toEqual(['sticky']);
  });

  it('updates a message in place by key (loading -> success)', () => {
    const service = createService();

    const loading = service.loading('Uploading...', {
      key: 'upload',
      duration: false,
    });
    const done = service.success('Uploaded.', { key: 'upload' });

    expect(done).toBe(loading);
    expect(service.toasts()).toEqual([
      expect.objectContaining({
        id: loading.id,
        message: 'Uploaded.',
        severity: 'success',
      }),
    ]);
    expect(announceSpy).toHaveBeenLastCalledWith('Uploaded.', 'polite');
  });

  it('ref.update() speaks the message vocabulary (content/type)', () => {
    const service = createService();

    const ref = service.loading('Working...', { duration: false });
    ref.update({ content: 'Done', type: 'success' });

    expect(service.toasts()[0]).toEqual(
      expect.objectContaining({ message: 'Done', severity: 'success' }),
    );
  });

  it('afterClosed resolves once the message closes', async () => {
    vi.useFakeTimers();
    const service = createService();
    const onClose = vi.fn();

    const ref = service.success('Saved', { duration: 500, onClose });
    vi.advanceTimersByTime(500);

    await expect(ref.afterClosed).resolves.toBe('timeout');
    expect(onClose).toHaveBeenCalledWith('timeout');
  });

  it('errors are announced assertively, everything else politely', () => {
    const service = createService();

    service.error('Failed');
    expect(announceSpy).toHaveBeenLastCalledWith('Failed', 'assertive');

    service.success('Saved');
    expect(announceSpy).toHaveBeenLastCalledWith('Saved', 'polite');
  });

  it('destroy(key) / destroy() close one or all messages', () => {
    const service = createService();
    service.info('a', { key: 'a' });
    service.info('b');
    service.info('c');

    service.destroy('a');
    expect(service.toasts().map((t) => t.message)).toEqual(['b', 'c']);

    service.destroy();
    expect(service.toasts()).toEqual([]);
  });

  it('provideAndesMessageConfig() sets defaults, including a dismiss-oldest maxCount', () => {
    const service = createService([
      provideAndesMessageConfig({
        duration: 1000,
        maxCount: 2,
        overflow: 'dismiss-oldest',
      }),
    ]);

    service.info('a');
    service.info('b');
    service.info('c');

    expect(service.toasts().map((t) => t.message)).toEqual(['b', 'c']);
    expect(service.toasts()[0].duration).toBe(1000);
  });

  it('config() cannot move messages off top-center', () => {
    const service = createService();

    service.config({ placement: 'bottom-left', duration: 100 });

    expect(service.defaults().placement).toBe('top-center');
    expect(service.defaults().duration).toBe(100);
  });

  it('keeps its own queue, independent of AndesToastService', () => {
    const service = createService();
    const toasts = TestBed.inject(AndesToastService);

    service.info('message');
    toasts.info('notification');
    service.destroy();

    expect(service.toasts()).toEqual([]);
    expect(toasts.toasts().map((t) => t.message)).toEqual(['notification']);
  });
});
