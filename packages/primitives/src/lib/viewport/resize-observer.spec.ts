import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesResizeObserver } from './resize-observer';
import { MockAnimationFrames, MockResizeObserver } from './viewport-mocks';

describe('AndesResizeObserver', () => {
  const restores: (() => void)[] = [];
  let frames: MockAnimationFrames;

  function setup(platform = 'browser'): AndesResizeObserver {
    TestBed.configureTestingModule({
      providers: [{ provide: PLATFORM_ID, useValue: platform }],
    });
    return TestBed.inject(AndesResizeObserver);
  }

  function element(): HTMLElement {
    return document.createElement('div');
  }

  function latest(): MockResizeObserver {
    const observer = MockResizeObserver.live.at(-1);
    if (!observer) {
      throw new Error('no live ResizeObserver');
    }
    return observer;
  }

  beforeEach(() => {
    frames = new MockAnimationFrames();
    restores.push(MockResizeObserver.install(), frames.install());
  });

  afterEach(() => {
    restores.splice(0).forEach((restore) => restore());
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('creates no native observer until something is observed', () => {
    setup();

    expect(MockResizeObserver.instances).toHaveLength(0);
  });

  it('delivers the first measurement immediately, without waiting for a frame', () => {
    const service = setup();
    const el = element();
    const callback = vi.fn();

    service.observe(el, callback);
    latest().notify(el, { width: 120, height: 40 });

    expect(callback).toHaveBeenCalledExactlyOnceWith({
      width: 120,
      height: 40,
    });
    expect(frames.pending).toBe(0);
  });

  it('observes the content box by default and the border box on request', () => {
    const service = setup();
    const a = element();
    const b = element();

    service.observe(a, vi.fn());
    service.observe(b, vi.fn(), { box: 'border-box' });

    const [content, border] = MockResizeObserver.live;
    expect(content.observed.get(a)).toEqual({ box: 'content-box' });
    expect(border.observed.get(b)).toEqual({ box: 'border-box' });
  });

  it('shares one native observer between elements of the same box', () => {
    const service = setup();

    service.observe(element(), vi.fn());
    service.observe(element(), vi.fn());
    service.observe(element(), vi.fn());

    expect(MockResizeObserver.instances).toHaveLength(1);
    expect(MockResizeObserver.observedCount).toBe(3);
  });

  it('reports the border box from borderBoxSize', () => {
    const service = setup();
    const el = element();
    const callback = vi.fn();

    service.observe(el, callback, { box: 'border-box' });
    latest().notify(el, { width: 100, height: 20, border: [112, 28] });

    expect(callback).toHaveBeenCalledWith({ width: 112, height: 28 });
  });

  it('swaps logical border-box sizes back in a vertical writing mode', () => {
    vi.stubGlobal('getComputedStyle', () => ({ writingMode: 'vertical-rl' }));
    const service = setup();
    const el = element();
    const callback = vi.fn();

    service.observe(el, callback, { box: 'border-box' });
    latest().notify(el, { width: 100, height: 20, border: [112, 28] });

    expect(callback).toHaveBeenCalledWith({ width: 28, height: 112 });
  });

  it('falls back to offset sizes when borderBoxSize is missing', () => {
    const service = setup();
    const el = element();
    Object.defineProperty(el, 'offsetWidth', { value: 77 });
    Object.defineProperty(el, 'offsetHeight', { value: 33 });
    const callback = vi.fn();

    service.observe(el, callback, { box: 'border-box' });
    const entry = {
      target: el,
      contentRect: { width: 1, height: 2 },
    } as unknown as ResizeObserverEntry;
    (
      latest() as unknown as {
        callback: ResizeObserverCallback;
      }
    ).callback([entry], latest() as unknown as ResizeObserver);

    expect(callback).toHaveBeenCalledWith({ width: 77, height: 33 });
  });

  describe('coalescing', () => {
    it('merges a burst of later changes into one delivery with the latest size', () => {
      const service = setup();
      const el = element();
      const callback = vi.fn();
      service.observe(el, callback);
      const observer = latest();
      observer.notify(el, { width: 100, height: 10 });
      callback.mockClear();

      for (let width = 101; width <= 150; width++) {
        observer.notify(el, { width, height: 10 });
      }

      expect(callback).not.toHaveBeenCalled();
      expect(frames.pending).toBe(1);

      frames.flush();

      expect(callback).toHaveBeenCalledExactlyOnceWith({
        width: 150,
        height: 10,
      });
    });

    it('requests a single frame for changes to several elements', () => {
      const service = setup();
      const a = element();
      const b = element();
      const onA = vi.fn();
      const onB = vi.fn();
      service.observe(a, onA);
      service.observe(b, onB);
      const observer = latest();
      observer.notify(a, { width: 1, height: 1 });
      observer.notify(b, { width: 1, height: 1 });

      observer.notify(a, { width: 2, height: 2 });
      observer.notify(b, { width: 3, height: 3 });

      expect(frames.pending).toBe(1);
      frames.flush();
      expect(onA).toHaveBeenLastCalledWith({ width: 2, height: 2 });
      expect(onB).toHaveBeenLastCalledWith({ width: 3, height: 3 });
    });

    it('drops a burst that ends back at the delivered size', () => {
      const service = setup();
      const el = element();
      const callback = vi.fn();
      service.observe(el, callback);
      const observer = latest();
      observer.notify(el, { width: 100, height: 10 });
      callback.mockClear();

      observer.notify(el, { width: 120, height: 10 });
      observer.notify(el, { width: 100, height: 10 });
      frames.flush();

      expect(callback).not.toHaveBeenCalled();
    });

    it('ignores a repeat of the delivered size', () => {
      const service = setup();
      const el = element();
      const callback = vi.fn();
      service.observe(el, callback);
      latest().notify(el, { width: 10, height: 10 });
      latest().notify(el, { width: 10, height: 10 });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(frames.pending).toBe(0);
    });

    it('delivers at once when requestAnimationFrame does not exist', () => {
      vi.stubGlobal('requestAnimationFrame', undefined);
      const service = setup();
      const el = element();
      const callback = vi.fn();
      service.observe(el, callback);
      latest().notify(el, { width: 1, height: 1 });

      latest().notify(el, { width: 2, height: 2 });

      expect(callback).toHaveBeenLastCalledWith({ width: 2, height: 2 });
    });
  });

  describe('teardown', () => {
    it('unobserves and disconnects with the last subscription', () => {
      const service = setup();
      const a = element();
      const b = element();
      const stopA = service.observe(a, vi.fn());
      const stopB = service.observe(b, vi.fn());
      const observer = latest();

      stopA();
      expect(observer.observed.has(a)).toBe(false);
      expect(observer.disconnected).toBe(false);

      stopB();
      expect(observer.disconnected).toBe(true);
      expect(MockResizeObserver.live).toHaveLength(0);
    });

    it('creates a fresh native observer when observing again after going idle', () => {
      const service = setup();
      service.observe(element(), vi.fn())();

      service.observe(element(), vi.fn());

      expect(MockResizeObserver.instances).toHaveLength(2);
      expect(MockResizeObserver.live).toHaveLength(1);
    });

    it('does not deliver a pending update after unsubscribing, and frees the frame', () => {
      const service = setup();
      const el = element();
      const callback = vi.fn();
      const stop = service.observe(el, callback);
      latest().notify(el, { width: 1, height: 1 });
      callback.mockClear();
      latest().notify(el, { width: 2, height: 2 });
      expect(frames.pending).toBe(1);

      stop();

      expect(frames.pending).toBe(0);
      frames.flush();
      expect(callback).not.toHaveBeenCalled();
    });

    it('treats a second stop as a no-op', () => {
      const service = setup();
      const stop = service.observe(element(), vi.fn());

      stop();

      expect(() => stop()).not.toThrow();
    });

    it('keeps watching an element while another subscriber still needs it', () => {
      const service = setup();
      const el = element();
      const stopFirst = service.observe(el, vi.fn());
      const second = vi.fn();
      service.observe(el, second);
      const observer = latest();

      stopFirst();

      expect(observer.observed.has(el)).toBe(true);
      observer.notify(el, { width: 5, height: 5 });
      expect(second).toHaveBeenCalledWith({ width: 5, height: 5 });
    });

    it('disconnects everything and cancels the frame when the injector is destroyed', () => {
      const service = setup();
      const el = element();
      const callback = vi.fn();
      service.observe(el, callback);
      service.observe(element(), vi.fn(), { box: 'border-box' });
      const observer = latest();
      MockResizeObserver.live[0].notify(el, { width: 1, height: 1 });
      MockResizeObserver.live[0].notify(el, { width: 2, height: 2 });
      callback.mockClear();

      TestBed.resetTestingModule();

      expect(MockResizeObserver.live).toHaveLength(0);
      expect(observer.disconnected).toBe(true);
      expect(frames.pending).toBe(0);
      frames.flush();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('late subscribers', () => {
    it('restarts observation so a second subscriber still gets a first measurement', () => {
      const service = setup();
      const el = element();
      service.observe(el, vi.fn());
      const observer = latest();
      const unobserve = vi.spyOn(observer, 'unobserve');

      service.observe(el, vi.fn());

      expect(unobserve).toHaveBeenCalledWith(el);
      expect(observer.observed.has(el)).toBe(true);
    });

    it('delivers the same measurement to every subscriber of an element', () => {
      const service = setup();
      const el = element();
      const first = vi.fn();
      const second = vi.fn();
      service.observe(el, first);
      service.observe(el, second);

      latest().notify(el, { width: 9, height: 9 });

      expect(first).toHaveBeenCalledWith({ width: 9, height: 9 });
      expect(second).toHaveBeenCalledWith({ width: 9, height: 9 });
    });

    it('ignores entries for elements nobody watches any more', () => {
      const service = setup();
      const el = element();
      const other = element();
      const callback = vi.fn();
      service.observe(el, callback);

      latest().notify(other, { width: 1, height: 1 });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('where observing is impossible', () => {
    it('does nothing on the server', () => {
      const service = setup('server');
      const stop = service.observe(element(), vi.fn());

      expect(MockResizeObserver.instances).toHaveLength(0);
      expect(() => stop()).not.toThrow();
    });

    it('does nothing where ResizeObserver does not exist', () => {
      vi.stubGlobal('ResizeObserver', undefined);
      const service = setup();
      const callback = vi.fn();

      const stop = service.observe(element(), callback);

      expect(() => stop()).not.toThrow();
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
