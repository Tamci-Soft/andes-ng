import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import { AndesBackTop, AndesBackTopTarget } from './back-top';

function fakeScroller(initial = 0) {
  const element = document.createElement('div');
  let top = initial;
  Object.defineProperty(element, 'scrollTop', {
    get: () => top,
    set: (value: number) => {
      top = value;
    },
    configurable: true,
  });
  return {
    element,
    get top() {
      return top;
    },
    scrollTo(value: number) {
      top = value;
      element.dispatchEvent(new Event('scroll'));
    },
  };
}

@Component({
  imports: [AndesBackTop],
  template: `<andes-back-top
    [target]="target()"
    [visibilityHeight]="visibilityHeight()"
    [duration]="duration()"
    [right]="right()"
    (clicked)="clicks.push($event)"
    (visibleChange)="visibility.push($event)"
  />`,
})
class HostComponent {
  readonly target = signal<AndesBackTopTarget | undefined>(undefined);
  readonly visibilityHeight = signal(100);
  readonly duration = signal(0);
  readonly right = signal<string | undefined>(undefined);
  readonly clicks: MouseEvent[] = [];
  readonly visibility: boolean[] = [];
}

describe('AndesBackTop', () => {
  let frames: ((time: number) => void)[];
  let clock: number;

  beforeEach(() => {
    frames = [];
    clock = 0;
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(
      () => undefined,
    );
    vi.spyOn(performance, 'now').mockImplementation(() => clock);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  /** Runs the animation frames queued so far at the given clock time. */
  function flush(time: number) {
    clock = time;
    const queued = frames.splice(0);
    queued.forEach((callback) => callback(time));
  }

  async function setup(initialTop = 0) {
    const scroller = fakeScroller(initialTop);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.target.set(scroller.element);
    fixture.detectChanges();
    await fixture.whenStable();
    flush(0);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      scroller,
      host: fixture.componentInstance,
      backTop: root.querySelector('andes-back-top') as HTMLElement,
      button: () => root.querySelector('button') as HTMLButtonElement,
      control: () => root.querySelector('andes-float-button') as HTMLElement,
    };
  }

  it('is hidden until the target is scrolled past the threshold', async () => {
    const { fixture, scroller, backTop, control } = await setup();
    expect(backTop.getAttribute('data-state')).toBe('hidden');
    expect(control().hasAttribute('inert')).toBe(true);
    expect(control().getAttribute('aria-hidden')).toBe('true');

    scroller.scrollTo(99);
    flush(16);
    fixture.detectChanges();
    expect(backTop.getAttribute('data-state')).toBe('hidden');

    scroller.scrollTo(100);
    flush(32);
    fixture.detectChanges();
    expect(backTop.getAttribute('data-state')).toBe('visible');
    expect(control().hasAttribute('inert')).toBe(false);
    expect(control().hasAttribute('aria-hidden')).toBe(false);
  });

  it('is visible straight away when the target is already scrolled', async () => {
    const { backTop } = await setup(500);
    expect(backTop.getAttribute('data-state')).toBe('visible');
  });

  it('reports visibility changes', async () => {
    const { fixture, scroller, host } = await setup();
    scroller.scrollTo(300);
    flush(16);
    fixture.detectChanges();
    await fixture.whenStable();
    scroller.scrollTo(0);
    flush(32);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(host.visibility).toEqual([true, false]);
  });

  it('has a default label and a fixed, safe-area aware position', async () => {
    const { button, control, host, fixture } = await setup();
    expect(button().getAttribute('aria-label')).toBe('Back to top');
    expect(control().hasAttribute('data-fixed')).toBe(true);
    expect(control().style.bottom).toContain('safe-area-inset-bottom');
    host.right.set('2rem');
    fixture.detectChanges();
    expect(control().style.insetInlineEnd).toContain('2rem');
  });

  it('jumps to the top when the duration is 0 and emits clicked', async () => {
    const { button, scroller, host } = await setup(800);
    button().click();
    expect(scroller.top).toBe(0);
    expect(host.clicks).toHaveLength(1);
  });

  it('eases to the top over the duration', async () => {
    const { fixture, button, scroller, host } = await setup(800);
    host.duration.set(400);
    fixture.detectChanges();
    clock = 1000;
    button().click();

    flush(1000);
    expect(scroller.top).toBe(800);

    flush(1100);
    const quarter = scroller.top;
    expect(quarter).toBeLessThan(800);
    expect(quarter).toBeGreaterThan(600);

    flush(1200);
    const half = scroller.top;
    expect(half).toBeCloseTo(400, 0);

    flush(1300);
    expect(scroller.top).toBeLessThan(half);
    expect(scroller.top).toBeGreaterThan(0);

    flush(1400);
    expect(scroller.top).toBe(0);
    expect(frames).toHaveLength(0);
  });

  it('lets the user take over: a wheel event stops the animation', async () => {
    const { fixture, button, scroller, host } = await setup(800);
    host.duration.set(400);
    fixture.detectChanges();
    clock = 0;
    button().click();
    flush(100);
    const stoppedAt = scroller.top;

    scroller.element.dispatchEvent(new Event('wheel'));
    expect(window.cancelAnimationFrame).toHaveBeenCalled();
    expect(scroller.top).toBe(stoppedAt);
  });

  it('jumps under reduced motion even with a duration', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const { fixture, button, scroller, host } = await setup(800);
    host.duration.set(400);
    fixture.detectChanges();
    button().click();
    expect(scroller.top).toBe(0);
  });

  it('scrolls with the public method too', async () => {
    const { fixture, scroller } = await setup(800);
    const backTop = fixture.debugElement.children[0]
      .componentInstance as AndesBackTop;
    backTop.scrollToTop();
    expect(scroller.top).toBe(0);
  });

  it('listens to a new target when it changes', async () => {
    const { fixture, host, backTop } = await setup();
    const other = fakeScroller(300);
    host.target.set(other.element);
    fixture.detectChanges();
    flush(16);
    fixture.detectChanges();
    expect(backTop.getAttribute('data-state')).toBe('visible');
  });
});

describe('back-to-top stylesheet contract', () => {
  const css = readFileSync(
    'packages/ui/src/lib/float-button/back-top.css',
    'utf8',
  );

  it('fades, rises and grows in over 200ms and leaves over 140ms with no bounce', () => {
    expect(css).toContain('opacity 200ms');
    expect(css).toContain('opacity 140ms ease-in');
    expect(css).toContain('scale(0.8)');
    expect(css).not.toMatch(/cubic-bezier\([^)]*(1\.\d|-\d)/);
  });

  it('blocks the pointer while hidden', () => {
    expect(css).toMatch(/pointer-events: none/);
  });

  it('is instant under reduced motion', () => {
    expect(css.slice(css.indexOf('prefers-reduced-motion'))).toContain(
      'transition: none',
    );
  });
});
