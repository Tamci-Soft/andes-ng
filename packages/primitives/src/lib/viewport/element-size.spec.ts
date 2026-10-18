import {
  Component,
  effect,
  ElementRef,
  inject,
  Injector,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { andesElementSize } from './element-size';
import { MockAnimationFrames, MockResizeObserver } from './viewport-mocks';

/** A panel that shows its own size, the way a chart or marquee will consume the primitive. */
@Component({
  selector: 'andes-test-panel',
  template: `
    @if (shown()) {
      <div #box class="box">content</div>
    }
    <output>{{ size.width() }}x{{ size.height() }}</output>
  `,
})
class PanelHost {
  readonly shown = signal(true);
  readonly box = viewChild<ElementRef<HTMLElement>>('box');
  readonly size = andesElementSize(this.box);
}

@Component({
  selector: 'andes-test-host-ref',
  template: `<p>text</p>`,
})
class HostRefHost {
  readonly size = andesElementSize(inject(ElementRef), {
    box: 'border-box',
    initial: { width: 300, height: 150 },
  });
}

describe('andesElementSize', () => {
  const restores: (() => void)[] = [];
  let frames: MockAnimationFrames;

  beforeEach(() => {
    frames = new MockAnimationFrames();
    restores.push(MockResizeObserver.install(), frames.install());
  });

  afterEach(() => {
    restores.splice(0).forEach((restore) => restore());
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  function observer(): MockResizeObserver {
    const live = MockResizeObserver.live.at(-1);
    if (!live) {
      throw new Error('no live ResizeObserver');
    }
    return live;
  }

  function createPanel() {
    const fixture = TestBed.createComponent(PanelHost);
    fixture.detectChanges();
    const output = () =>
      fixture.nativeElement.querySelector('output').textContent as string;
    const box = () =>
      fixture.nativeElement.querySelector('.box') as HTMLElement | null;
    return { fixture, output, box };
  }

  it('starts at the initial size and reports it as unmeasured', () => {
    const { fixture, output } = createPanel();

    expect(output()).toBe('0x0');
    expect(fixture.componentInstance.size.measured()).toBe(false);
  });

  it('follows the element once the browser measures it', () => {
    const { fixture, output, box } = createPanel();

    observer().notify(box()!, { width: 320, height: 180 });
    fixture.detectChanges();

    expect(output()).toBe('320x180');
    expect(fixture.componentInstance.size.measured()).toBe(true);
    expect(fixture.componentInstance.size.size()).toEqual({
      width: 320,
      height: 180,
    });
  });

  it('writes once per frame while the element is resized rapidly', () => {
    const { fixture, box } = createPanel();
    const el = box()!;
    observer().notify(el, { width: 100, height: 100 });
    const widths: number[] = [];
    TestBed.runInInjectionContext(() =>
      effect(() => widths.push(fixture.componentInstance.size.width())),
    );
    TestBed.tick();
    widths.length = 0;

    for (let width = 101; width <= 140; width++) {
      observer().notify(el, { width, height: 100 });
    }
    TestBed.tick();
    expect(widths).toEqual([]);

    frames.flush();
    TestBed.tick();
    expect(widths).toEqual([140]);
  });

  it('does not notify dependents when the size is unchanged', () => {
    const { fixture, box } = createPanel();
    const el = box()!;
    observer().notify(el, { width: 50, height: 60 });
    const before = fixture.componentInstance.size.size();

    observer().notify(el, { width: 50, height: 60 });
    frames.flush();

    expect(fixture.componentInstance.size.size()).toBe(before);
  });

  it('resets to unmeasured when the element is removed, and stops observing it', () => {
    const { fixture, output, box } = createPanel();
    observer().notify(box()!, { width: 200, height: 100 });
    fixture.detectChanges();

    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();

    expect(output()).toBe('0x0');
    expect(fixture.componentInstance.size.measured()).toBe(false);
    expect(MockResizeObserver.observedCount).toBe(0);
    expect(MockResizeObserver.live).toHaveLength(0);
  });

  it('observes a new element when it appears and swaps cleanly', () => {
    const { fixture, output, box } = createPanel();
    const first = box()!;
    observer().notify(first, { width: 200, height: 100 });

    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();
    fixture.componentInstance.shown.set(true);
    fixture.detectChanges();

    const second = box()!;
    expect(second).not.toBe(first);
    expect(output()).toBe('0x0');
    expect(MockResizeObserver.observedCount).toBe(1);
    expect(observer().observed.has(first)).toBe(false);
    expect(observer().observed.has(second)).toBe(true);

    observer().notify(second, { width: 64, height: 32 });
    fixture.detectChanges();
    expect(output()).toBe('64x32');
  });

  it('ignores late notifications for an element that was swapped out', () => {
    const { fixture, box } = createPanel();
    const first = box()!;
    observer().notify(first, { width: 10, height: 10 });
    observer().notify(first, { width: 11, height: 11 });

    fixture.componentInstance.shown.set(false);
    fixture.detectChanges();
    frames.flush();

    expect(fixture.componentInstance.size.size()).toEqual({
      width: 0,
      height: 0,
    });
  });

  it('accepts an ElementRef directly, honouring box and initial', () => {
    const fixture = TestBed.createComponent(HostRefHost);
    fixture.detectChanges();
    const { size } = fixture.componentInstance;

    expect(size.width()).toBe(300);
    expect(size.height()).toBe(150);
    expect(observer().observed.get(fixture.nativeElement)).toEqual({
      box: 'border-box',
    });

    observer().notify(fixture.nativeElement, {
      width: 90,
      height: 40,
      border: [100, 50],
    });
    expect(size.size()).toEqual({ width: 100, height: 50 });
  });

  it('accepts a plain element with an explicit injector', () => {
    const el = document.createElement('div');
    const size = andesElementSize(el, { injector: TestBed.inject(Injector) });
    TestBed.tick();

    observer().notify(el, { width: 8, height: 9 });

    expect(size.width()).toBe(8);
    expect(size.height()).toBe(9);
  });

  it('ignores a signal that holds a non-element node', () => {
    const target = signal<unknown>(document.createComment('anchor'));
    const size = TestBed.runInInjectionContext(() =>
      andesElementSize(target as never),
    );
    TestBed.tick();

    expect(MockResizeObserver.instances).toHaveLength(0);
    expect(size.measured()).toBe(false);
  });

  it('requires an injection context unless an injector is given', () => {
    expect(() => andesElementSize(document.createElement('div'))).toThrow();
  });

  describe('teardown', () => {
    it('disconnects the native observer when the component is destroyed', () => {
      const { fixture, box } = createPanel();
      observer().notify(box()!, { width: 5, height: 5 });
      const native = observer();

      fixture.destroy();

      expect(native.disconnected).toBe(true);
      expect(MockResizeObserver.live).toHaveLength(0);
    });

    it('cancels its pending frame', () => {
      const { fixture, box } = createPanel();
      observer().notify(box()!, { width: 5, height: 5 });
      // The framework schedules frames of its own, so count only what this adds.
      const before = frames.pending;
      observer().notify(box()!, { width: 6, height: 6 });
      expect(frames.pending).toBe(before + 1);

      fixture.destroy();

      expect(frames.pending).toBe(before);
    });

    it('shares one native observer between many components', () => {
      const a = TestBed.createComponent(PanelHost);
      const b = TestBed.createComponent(PanelHost);
      a.detectChanges();
      b.detectChanges();

      expect(MockResizeObserver.instances).toHaveLength(1);
      expect(MockResizeObserver.observedCount).toBe(2);

      a.destroy();
      expect(MockResizeObserver.live).toHaveLength(1);
      b.destroy();
      expect(MockResizeObserver.live).toHaveLength(0);
    });
  });

  describe('server and unsupported environments', () => {
    it('never creates an observer on the server and keeps the initial size', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });

      const fixture = TestBed.createComponent(HostRefHost);
      fixture.detectChanges();

      expect(MockResizeObserver.instances).toHaveLength(0);
      expect(fixture.componentInstance.size.width()).toBe(300);
      expect(fixture.componentInstance.size.measured()).toBe(false);
    });

    it('stays at the initial size where ResizeObserver does not exist', () => {
      vi.stubGlobal('ResizeObserver', undefined);

      const { fixture, output } = createPanel();

      expect(output()).toBe('0x0');
      expect(fixture.componentInstance.size.measured()).toBe(false);
    });
  });
});
