import { PLATFORM_ID, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { readFileSync } from 'node:fs';

import {
  AndesAffix,
  type AndesAffixMode,
  type AndesAffixTarget,
} from './affix';
import {
  andesAffixPosition,
  andesAffixStuckPosition,
  andesAffixViewport,
  type AndesAffixRect,
} from './affix-geometry';

@Component({
  imports: [AndesAffix],
  template: `
    <div id="scroller">
      <andes-affix
        [offsetTop]="top()"
        [offsetBottom]="bottom()"
        [target]="target()"
        [mode]="mode()"
        [zIndex]="zIndex()"
        [disabled]="disabled()"
        (changed)="events.push($event)"
      >
        <button type="button" id="inner">Pinned</button>
      </andes-affix>
    </div>
  `,
})
class HostComponent {
  readonly top = signal<number | undefined>(undefined);
  readonly bottom = signal<number | undefined>(undefined);
  readonly target = signal<AndesAffixTarget>(undefined);
  readonly mode = signal<AndesAffixMode>('auto');
  readonly zIndex = signal<number | undefined>(undefined);
  readonly disabled = signal(false);
  readonly events: boolean[] = [];
}

function rect(
  top: number,
  height: number,
  left = 0,
  width = 200,
): AndesAffixRect {
  return { top, bottom: top + height, left, width, height };
}

/** Rects by element key (`id`, else `data-slot`); jsdom does no layout. */
let rects: Record<string, AndesAffixRect> = {};
let frames: FrameRequestCallback[] = [];

function key(el: Element): string {
  return el.id || el.getAttribute('data-slot') || el.localName;
}

function flushFrames() {
  const pending = frames;
  frames = [];
  pending.forEach((cb) => cb(0));
}

function setup(configure?: (host: HostComponent) => void) {
  const fixture = TestBed.createComponent(HostComponent);
  configure?.(fixture.componentInstance);
  fixture.detectChanges();
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const affixHost = root.querySelector('andes-affix') as HTMLElement;
  const affix = fixture.debugElement.query(By.directive(AndesAffix))
    .componentInstance as AndesAffix;
  const box = () => root.querySelector('.andes-affix__box') as HTMLElement;
  const refresh = () => {
    affix.update();
    fixture.detectChanges();
    fixture.detectChanges();
  };
  return {
    fixture,
    component: fixture.componentInstance,
    root,
    affixHost,
    affix,
    box,
    refresh,
  };
}

describe('AndesAffix', () => {
  beforeEach(() => {
    rects = {};
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      frames.push(cb);
      return frames.length;
    });
    vi.stubGlobal('cancelAnimationFrame', () => undefined);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        const r = rects[key(this)] ?? rect(0, 0);
        return {
          ...r,
          x: r.left,
          y: r.top,
          right: r.left + r.width,
          toJSON: () => r,
        } as DOMRect;
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.getElementById('other')?.remove();
  });

  describe('sticky strategy', () => {
    it('uses native sticky positioning by default and pins to the top edge', () => {
      const { affixHost, box } = setup();

      expect(affixHost.getAttribute('data-mode')).toBe('sticky');
      expect(box().style.top).toBe('0px');
      expect(box().style.bottom).toBe('');
    });

    it('applies the offsets', () => {
      const { box } = setup((h) => {
        h.top.set(16);
        h.bottom.set(24);
      });

      expect(box().style.top).toBe('16px');
      expect(box().style.bottom).toBe('24px');
    });

    it('pins to the bottom edge when only offsetBottom is set', () => {
      const { box } = setup((h) => h.bottom.set(20));

      expect(box().style.top).toBe('');
      expect(box().style.bottom).toBe('20px');
    });

    it('reports pinned while the box rests on the offset line', () => {
      const { component, affix, affixHost, refresh } = setup((h) =>
        h.top.set(16),
      );

      rects['affix-box'] = rect(300, 40);
      refresh();
      expect(affix.affixed()).toBe(false);
      expect(affixHost.getAttribute('data-state')).toBe('idle');

      rects['affix-box'] = rect(16, 40);
      refresh();
      expect(affix.affixed()).toBe(true);
      expect(affix.position()).toBe('top');
      expect(affixHost.getAttribute('data-state')).toBe('top');

      rects['affix-box'] = rect(120, 40);
      refresh();
      expect(affix.affixed()).toBe(false);
      expect(component.events).toEqual([true, false]);
    });

    it('detects the bottom edge', () => {
      const { affix, refresh } = setup((h) => h.bottom.set(10));

      rects['affix-box'] = rect(768 - 10 - 40, 40);
      refresh();

      expect(affix.position()).toBe('bottom');
    });

    it('does not shift layout: the host adds no height of its own', () => {
      const { affixHost, refresh } = setup((h) => h.top.set(0));

      rects['affix-box'] = rect(0, 40);
      refresh();

      expect(affixHost.style.height).toBe('');
    });

    it('stays sticky for a target that contains it', () => {
      const { affixHost } = setup((h) =>
        h.target.set(() => document.getElementById('scroller')),
      );

      expect(affixHost.getAttribute('data-mode')).toBe('sticky');
    });
  });

  describe('fixed strategy', () => {
    const pinTop = (h: HostComponent) => {
      h.mode.set('fixed');
      h.top.set(10);
    };

    it('keeps a placeholder as tall as the content while it is pinned', () => {
      rects['affix'] = rect(200, 30, 40, 300);
      rects['affix-box'] = rect(200, 30, 40, 300);
      const { affixHost, box, refresh, component } = setup(pinTop);
      expect(affixHost.style.height).toBe('');
      expect(component.events).toEqual([]);

      rects['affix'] = rect(-50, 30, 40, 300);
      rects['affix-box'] = rect(10, 30, 40, 300);
      refresh();

      expect(affixHost.getAttribute('data-mode')).toBe('fixed');
      expect(affixHost.style.height).toBe('30px');
      expect(box().style.position).toBe('fixed');
      expect(box().style.top).toBe('10px');
      expect(box().style.left).toBe('40px');
      expect(box().style.width).toBe('300px');
      expect(component.events).toEqual([true]);
    });

    it('releases the content and the placeholder when scrolled back', () => {
      const { affixHost, box, refresh, component } = setup(pinTop);
      rects['affix'] = rect(-50, 30, 40, 300);
      rects['affix-box'] = rect(10, 30, 40, 300);
      refresh();

      rects['affix'] = rect(120, 30, 40, 300);
      refresh();

      expect(affixHost.style.height).toBe('');
      expect(box().style.position).toBe('');
      expect(component.events).toEqual([true, false]);
    });

    it('pins to the bottom with the bottom offset', () => {
      const { box, refresh, affix } = setup((h) => {
        h.mode.set('fixed');
        h.bottom.set(20);
      });
      rects['affix'] = rect(900, 40, 0, 200);
      rects['affix-box'] = rect(900, 40, 0, 200);

      refresh();

      expect(affix.position()).toBe('bottom');
      expect(box().style.bottom).toBe('20px');
      expect(box().style.top).toBe('');
    });

    it('measures against a target that is not an ancestor', () => {
      const other = document.createElement('div');
      other.id = 'other';
      document.body.appendChild(other);
      const { affixHost, box, refresh, affix } = setup((h) => {
        h.target.set(other);
        h.top.set(10);
      });
      rects['other'] = rect(100, 400);
      rects['affix'] = rect(60, 30, 20, 150);
      rects['affix-box'] = rect(60, 30, 20, 150);

      refresh();

      expect(affixHost.getAttribute('data-mode')).toBe('fixed');
      expect(affix.position()).toBe('top');
      expect(box().style.top).toBe('110px');
    });

    it('resolves a selector target', () => {
      const other = document.createElement('div');
      other.id = 'other';
      document.body.appendChild(other);
      const { affixHost } = setup((h) => h.target.set('#other'));

      expect(affixHost.getAttribute('data-mode')).toBe('fixed');
    });

    it('gives the pinned box a default stacking order and honours zIndex', () => {
      const { box, refresh, component, fixture } = setup(pinTop);
      rects['affix'] = rect(-50, 30);
      rects['affix-box'] = rect(10, 30);
      refresh();
      expect(box().style.zIndex).toBe('var(--andes-affix-z-index, 10)');

      component.zIndex.set(99);
      fixture.detectChanges();
      expect(box().style.zIndex).toBe('99');
    });
  });

  describe('lifecycle', () => {
    it('listens to the window and to a target element, and cleans up', () => {
      const other = document.createElement('div');
      other.id = 'other';
      document.body.appendChild(other);
      const add = vi.spyOn(other, 'addEventListener');
      const remove = vi.spyOn(other, 'removeEventListener');
      const windowAdd = vi.spyOn(window, 'addEventListener');
      const { fixture } = setup((h) => h.target.set(other));

      expect(add).toHaveBeenCalledWith('scroll', expect.any(Function), {
        passive: true,
      });
      expect(windowAdd).toHaveBeenCalledWith('scroll', expect.any(Function), {
        passive: true,
      });
      expect(windowAdd).toHaveBeenCalledWith('resize', expect.any(Function));

      fixture.destroy();
      expect(remove).toHaveBeenCalledWith('scroll', expect.any(Function));
    });

    it('recomputes on scroll, batched into one frame', () => {
      const { affix, refresh } = setup((h) => h.top.set(8));
      refresh();
      frames = [];
      const update = vi.spyOn(affix, 'update');

      window.dispatchEvent(new Event('scroll'));
      window.dispatchEvent(new Event('scroll'));
      expect(update).not.toHaveBeenCalled();
      expect(frames).toHaveLength(1);

      flushFrames();
      expect(update).toHaveBeenCalledTimes(1);
    });

    it('re-reads the target when it changes', () => {
      const { component, affixHost, fixture } = setup();
      expect(affixHost.getAttribute('data-mode')).toBe('sticky');

      component.mode.set('fixed');
      fixture.detectChanges();
      fixture.detectChanges();

      expect(affixHost.getAttribute('data-mode')).toBe('fixed');
    });

    it('never pins while disabled', () => {
      const { affix, affixHost, refresh } = setup((h) => {
        h.disabled.set(true);
        h.top.set(10);
      });
      rects['affix-box'] = rect(10, 30);

      refresh();

      expect(affix.affixed()).toBe(false);
      expect(affixHost.hasAttribute('data-disabled')).toBe(true);
    });

    it('does not touch the browser when rendered on the server', () => {
      TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });
      const windowAdd = vi.spyOn(window, 'addEventListener');

      const { affix, root } = setup();
      affix.update();

      expect(root.querySelector('#inner')).not.toBeNull();
      expect(windowAdd).not.toHaveBeenCalledWith(
        'scroll',
        expect.anything(),
        expect.anything(),
      );
    });
  });

  describe('geometry', () => {
    const viewport = { top: 0, bottom: 800 };

    it('pins to the top once the natural top passes the offset', () => {
      expect(andesAffixPosition(rect(5, 40), viewport, 10, undefined)).toBe(
        'top',
      );
      expect(
        andesAffixPosition(rect(10, 40), viewport, 10, undefined),
      ).toBeNull();
    });

    it('pins to the bottom once the natural bottom passes the offset line', () => {
      expect(andesAffixPosition(rect(790, 40), viewport, undefined, 10)).toBe(
        'bottom',
      );
      expect(
        andesAffixPosition(rect(700, 40), viewport, undefined, 10),
      ).toBeNull();
    });

    it('treats a box resting on a line as stuck', () => {
      expect(
        andesAffixStuckPosition(rect(10, 40), viewport, 10, undefined),
      ).toBe('top');
      expect(
        andesAffixStuckPosition(rect(11.5, 40), viewport, 10, undefined),
      ).toBeNull();
      expect(
        andesAffixStuckPosition(rect(750, 40), viewport, undefined, 10),
      ).toBe('bottom');
    });

    it('limits a target to the part that is on screen', () => {
      expect(andesAffixViewport({ top: -100, bottom: 900 }, 800)).toEqual({
        top: 0,
        bottom: 800,
      });
      expect(andesAffixViewport(null, 800)).toEqual({ top: 0, bottom: 800 });
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync('packages/ui/src/lib/affix/affix.css', 'utf8');

    it('steps the host out of layout for sticky and sticks the box', () => {
      expect(css).toContain('display: contents;');
      expect(css).toContain('position: sticky;');
    });

    it('keeps selectors on a single line', () => {
      expect(css).not.toMatch(/^\s*[>+~]/m);
    });
  });
});
