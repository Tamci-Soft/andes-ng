import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';

import { AndesSplitter, type AndesSplitterOrientation } from './splitter';
import { AndesSplitterPanel } from './splitter-panel';
import type { AndesSplitterSize } from './splitter-layout';

@Component({
  imports: [AndesSplitter, AndesSplitterPanel],
  template: `
    <div [attr.dir]="dir()">
      <andes-splitter
        [orientation]="orientation()"
        [lazy]="lazy()"
        [storageKey]="storageKey()"
        [(sizes)]="sizes"
        (resizeStart)="log.push('start')"
        (resized)="log.push('resize')"
        (resizeEnd)="log.push('end')"
        (collapse)="collapseEvents.push($event.index + ':' + $event.collapsed)"
      >
        <andes-splitter-panel
          [size]="firstSize()"
          [min]="firstMin()"
          [max]="firstMax()"
          [collapsible]="firstCollapsible()"
          [collapsedSize]="firstCollapsedSize()"
          [resizable]="firstResizable()"
          [(collapsed)]="firstCollapsed"
          >First</andes-splitter-panel
        >
        <andes-splitter-panel min="100">Second</andes-splitter-panel>
      </andes-splitter>
    </div>
  `,
})
class HostComponent {
  readonly orientation = signal<AndesSplitterOrientation>('horizontal');
  readonly lazy = signal(false);
  readonly storageKey = signal<string | undefined>(undefined);
  readonly dir = signal<string | null>(null);
  readonly sizes = signal<number[] | undefined>(undefined);
  readonly firstSize = signal<AndesSplitterSize>('30%');
  readonly firstMin = signal<AndesSplitterSize>(undefined);
  readonly firstMax = signal<AndesSplitterSize>(undefined);
  readonly firstCollapsible = signal(false);
  readonly firstCollapsedSize = signal(0);
  readonly firstResizable = signal(true);
  readonly firstCollapsed = signal(false);
  readonly log: string[] = [];
  readonly collapseEvents: string[] = [];
}

/** Length of the container along the active axis; jsdom does no layout. */
let axisLength = 1001;
let resizeCallbacks: ResizeObserverCallback[] = [];

function createHost(setup?: (host: HostComponent) => void) {
  const fixture = TestBed.createComponent(HostComponent);
  setup?.(fixture.componentInstance);
  fixture.detectChanges();
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const host = root.querySelector('andes-splitter') as HTMLElement;
  const handle = () => root.querySelector('[role="separator"]') as HTMLElement;
  const panels = () =>
    Array.from(root.querySelectorAll<HTMLElement>('.andes-splitter__panel'));
  const sizes = () => panels().map((el) => parseFloat(el.style.flexBasis));
  const refresh = () => {
    fixture.detectChanges();
    fixture.detectChanges();
  };
  return {
    fixture,
    component: fixture.componentInstance,
    root,
    host,
    handle,
    panels,
    sizes,
    refresh,
  };
}

function pointer(
  target: HTMLElement,
  type: string,
  position: { x?: number; y?: number } = {},
) {
  const init = {
    bubbles: true,
    cancelable: true,
    clientX: position.x ?? 0,
    clientY: position.y ?? 0,
    button: 0,
    pointerId: 1,
  };
  const event =
    typeof PointerEvent === 'function'
      ? new PointerEvent(type, init)
      : new MouseEvent(type, init);
  target.dispatchEvent(event);
  return event;
}

function key(target: HTMLElement, name: string, shift = false) {
  const event = new KeyboardEvent('keydown', {
    key: name,
    shiftKey: shift,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

describe('AndesSplitter', () => {
  beforeEach(() => {
    axisLength = 1001;
    resizeCallbacks = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resizeCallbacks.push(callback);
        }
        observe() {
          /* the test drives the callbacks itself */
        }
        unobserve() {
          /* nothing to release */
        }
        disconnect() {
          /* nothing to release */
        }
      },
    );
    for (const property of ['clientWidth', 'clientHeight']) {
      Object.defineProperty(HTMLElement.prototype, property, {
        configurable: true,
        get(this: HTMLElement) {
          return this.localName === 'andes-splitter' ? axisLength : 0;
        },
      });
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(HTMLElement.prototype, 'clientWidth');
    Reflect.deleteProperty(HTMLElement.prototype, 'clientHeight');
    localStorage.clear();
  });

  describe('layout', () => {
    it('resolves a percentage pane and gives the rest to the auto pane', () => {
      const { sizes } = createHost();

      expect(sizes()).toEqual([300, 700]);
    });

    it('supports pixel sizes', () => {
      const { sizes } = createHost((h) => h.firstSize.set(250));

      expect(sizes()).toEqual([250, 750]);
    });

    it('mirrors the pixel sizes into the sizes model', () => {
      const { component } = createHost();

      expect(component.sizes()).toEqual([300, 700]);
    });

    it('takes initial pixel sizes from the bound sizes', () => {
      const { sizes } = createHost((h) => h.sizes.set([400, 600]));

      expect(sizes()).toEqual([400, 600]);
    });

    it('follows a size pushed through the two-way binding', () => {
      const { component, sizes, refresh } = createHost();

      component.sizes.set([500, 500]);
      refresh();

      expect(sizes()).toEqual([500, 500]);
    });

    it('re-applies the limits when they change', () => {
      const { component, sizes, refresh } = createHost();

      component.firstMax.set(200);
      refresh();

      expect(sizes()).toEqual([200, 800]);
    });

    it('scales panes proportionally when the container resizes', () => {
      const { sizes, refresh } = createHost();

      axisLength = 2001;
      resizeCallbacks.forEach((cb) => cb([], {} as ResizeObserver));
      refresh();

      expect(sizes()).toEqual([600, 1400]);
    });

    it('stacks panes vertically', () => {
      const { host, sizes } = createHost((h) => h.orientation.set('vertical'));

      expect(host.getAttribute('data-orientation')).toBe('vertical');
      expect(sizes()).toEqual([300, 700]);
    });

    it('falls back to the declared size before it can be measured', () => {
      axisLength = 0;
      const { panels } = createHost();

      expect(panels()[0].style.flexBasis).toBe('30%');
      expect(panels()[1].style.flexGrow).toBe('1');
    });
  });

  describe('separator semantics', () => {
    it('is a focusable separator whose orientation is opposite to the layout', () => {
      const { handle } = createHost();

      expect(handle().getAttribute('role')).toBe('separator');
      expect(handle().getAttribute('aria-orientation')).toBe('vertical');
      expect(handle().getAttribute('tabindex')).toBe('0');
      expect(handle().getAttribute('aria-label')).toBe('Resize panels');
    });

    it('is a horizontal separator for stacked panes', () => {
      const { handle } = createHost((h) => h.orientation.set('vertical'));

      expect(handle().getAttribute('aria-orientation')).toBe('horizontal');
    });

    it('controls the first pane and reports its share', () => {
      const { handle, panels } = createHost((h) => h.firstMin.set('10%'));

      expect(handle().getAttribute('aria-controls')).toBe(panels()[0].id);
      expect(handle().getAttribute('aria-valuenow')).toBe('30');
      expect(handle().getAttribute('aria-valuemin')).toBe('10');
      // The second pane keeps at least 100px, so the first can reach 900/1000.
      expect(handle().getAttribute('aria-valuemax')).toBe('90');
    });

    it('updates aria-valuenow as the pane is resized', () => {
      const { handle, refresh } = createHost();

      key(handle(), 'ArrowRight', true);
      refresh();

      expect(handle().getAttribute('aria-valuenow')).toBe('35');
    });

    it('is not focusable when nothing can happen', () => {
      const { handle } = createHost((h) => h.firstResizable.set(false));

      expect(handle().hasAttribute('tabindex')).toBe(false);
      expect(handle().hasAttribute('aria-valuenow')).toBe(false);
    });
  });

  describe('keyboard', () => {
    it('moves by 10px with the arrows and 50px with shift', () => {
      const { handle, sizes, refresh } = createHost();

      key(handle(), 'ArrowRight');
      refresh();
      expect(sizes()).toEqual([310, 690]);

      key(handle(), 'ArrowRight', true);
      refresh();
      expect(sizes()).toEqual([360, 640]);

      key(handle(), 'ArrowLeft');
      refresh();
      expect(sizes()).toEqual([350, 650]);
    });

    it('goes to the limits with Home and End', () => {
      const { handle, sizes, refresh } = createHost((h) => h.firstMin.set(120));

      key(handle(), 'Home');
      refresh();
      expect(sizes()).toEqual([120, 880]);

      key(handle(), 'End');
      refresh();
      // The second pane's 100px minimum stops the first one.
      expect(sizes()).toEqual([900, 100]);
    });

    it('uses the up and down arrows for stacked panes and ignores left/right', () => {
      const { handle, sizes, refresh } = createHost((h) =>
        h.orientation.set('vertical'),
      );

      key(handle(), 'ArrowDown');
      refresh();
      expect(sizes()).toEqual([310, 690]);

      key(handle(), 'ArrowLeft');
      refresh();
      expect(sizes()).toEqual([310, 690]);

      key(handle(), 'ArrowUp', true);
      refresh();
      expect(sizes()).toEqual([260, 740]);
    });

    it('mirrors the arrows in right-to-left layouts', () => {
      const { handle, sizes, refresh } = createHost((h) => h.dir.set('rtl'));

      key(handle(), 'ArrowRight');
      refresh();
      // The first pane sits on the right, so moving the handle right shrinks it.
      expect(sizes()).toEqual([290, 710]);

      key(handle(), 'ArrowLeft', true);
      refresh();
      expect(sizes()).toEqual([340, 660]);
    });

    it('does nothing for a pane that is not resizable', () => {
      const { handle, sizes, refresh } = createHost((h) =>
        h.firstResizable.set(false),
      );

      key(handle(), 'ArrowRight');
      refresh();

      expect(sizes()).toEqual([300, 700]);
    });

    it('emits start, resize and end for a key press', () => {
      const { handle, component } = createHost();

      key(handle(), 'ArrowRight');

      expect(component.log).toEqual(['start', 'resize', 'end']);
    });
  });

  describe('pointer', () => {
    it('resizes live while the handle is dragged', () => {
      const { handle, sizes, refresh, component } = createHost();

      pointer(handle(), 'pointerdown', { x: 300 });
      pointer(handle(), 'pointermove', { x: 380 });
      refresh();
      expect(sizes()).toEqual([380, 620]);
      expect(handle().getAttribute('data-state')).toBe('dragging');

      pointer(handle(), 'pointerup', { x: 380 });
      refresh();
      expect(handle().getAttribute('data-state')).toBe('idle');
      expect(component.sizes()).toEqual([380, 620]);
      expect(component.log).toEqual(['start', 'resize', 'end']);
    });

    it('marks the splitter as dragging so text cannot be selected', () => {
      const { host, handle, refresh } = createHost();

      pointer(handle(), 'pointerdown', { x: 300 });
      refresh();
      expect(host.hasAttribute('data-dragging')).toBe(true);

      pointer(handle(), 'pointerup', { x: 300 });
      refresh();
      expect(host.hasAttribute('data-dragging')).toBe(false);
    });

    it('prevents the default action of the press (no text selection)', () => {
      const { handle } = createHost();

      expect(
        pointer(handle(), 'pointerdown', { x: 300 }).defaultPrevented,
      ).toBe(true);
    });

    it('clamps the drag to the limits of both panes', () => {
      const { handle, sizes, refresh } = createHost((h) => h.firstMin.set(200));

      pointer(handle(), 'pointerdown', { x: 300 });
      pointer(handle(), 'pointermove', { x: -500 });
      refresh();
      expect(sizes()).toEqual([200, 800]);

      pointer(handle(), 'pointermove', { x: 5000 });
      refresh();
      expect(sizes()).toEqual([900, 100]);
    });

    it('drags the other way in right-to-left layouts', () => {
      const { handle, sizes, refresh } = createHost((h) => h.dir.set('rtl'));

      pointer(handle(), 'pointerdown', { x: 700 });
      pointer(handle(), 'pointermove', { x: 650 });
      refresh();

      expect(sizes()).toEqual([350, 650]);
    });

    it('follows the vertical axis for stacked panes', () => {
      const { handle, sizes, refresh } = createHost((h) =>
        h.orientation.set('vertical'),
      );

      pointer(handle(), 'pointerdown', { y: 300 });
      pointer(handle(), 'pointermove', { x: 900, y: 340 });
      refresh();

      expect(sizes()).toEqual([340, 660]);
    });

    it('ignores secondary mouse buttons', () => {
      const { handle, host } = createHost();
      const event = new MouseEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        button: 2,
      });

      handle().dispatchEvent(event);

      expect(host.hasAttribute('data-dragging')).toBe(false);
    });

    it('does not start a drag for a locked handle', () => {
      const { handle, host } = createHost((h) => h.firstResizable.set(false));

      pointer(handle(), 'pointerdown', { x: 300 });

      expect(host.hasAttribute('data-dragging')).toBe(false);
    });

    describe('lazy mode', () => {
      it('shows a preview line and applies the size on release', () => {
        const { handle, root, sizes, refresh, component } = createHost((h) =>
          h.lazy.set(true),
        );

        pointer(handle(), 'pointerdown', { x: 300 });
        pointer(handle(), 'pointermove', { x: 420 });
        refresh();

        expect(sizes()).toEqual([300, 700]);
        const preview = root.querySelector<HTMLElement>(
          '.andes-splitter__preview',
        );
        expect(preview).not.toBeNull();
        expect(preview?.style.insetInlineStart).toBe('420px');
        expect(component.log).toEqual(['start']);

        pointer(handle(), 'pointerup', { x: 420 });
        refresh();

        expect(sizes()).toEqual([420, 580]);
        expect(root.querySelector('.andes-splitter__preview')).toBeNull();
        expect(component.log).toEqual(['start', 'resize', 'end']);
      });

      it('throws the preview away when the gesture is cancelled', () => {
        const { handle, root, sizes, refresh } = createHost((h) =>
          h.lazy.set(true),
        );

        pointer(handle(), 'pointerdown', { x: 300 });
        pointer(handle(), 'pointermove', { x: 420 });
        pointer(handle(), 'pointercancel');
        refresh();

        expect(sizes()).toEqual([300, 700]);
        expect(root.querySelector('.andes-splitter__preview')).toBeNull();
      });
    });
  });

  describe('collapsing', () => {
    const collapsible = (h: HostComponent) => {
      h.firstCollapsible.set(true);
      h.firstMin.set(150);
    };

    it('offers a collapse button on the handle', () => {
      const { root } = createHost(collapsible);

      const buttons = root.querySelectorAll('.andes-splitter__collapse');
      expect(buttons).toHaveLength(1);
      expect(buttons[0].getAttribute('data-side')).toBe('start');
      expect(buttons[0].getAttribute('title')).toBe('Collapse panel');
    });

    it('collapses and restores with Enter', () => {
      const { handle, sizes, refresh, component, panels } =
        createHost(collapsible);

      key(handle(), 'Enter');
      refresh();
      expect(sizes()).toEqual([0, 1000]);
      expect(component.firstCollapsed()).toBe(true);
      expect(panels()[0].getAttribute('data-state')).toBe('collapsed');
      expect(component.collapseEvents).toEqual(['0:true']);

      key(handle(), 'Enter');
      refresh();
      expect(sizes()).toEqual([300, 700]);
      expect(component.firstCollapsed()).toBe(false);
      expect(component.collapseEvents).toEqual(['0:true', '0:false']);
    });

    it('points the chevron towards where the pane goes', () => {
      const { root, handle, refresh } = createHost(collapsible);
      const svg = () =>
        root.querySelector<SVGElement>('.andes-splitter__collapse svg');

      expect(svg()?.style.rotate).toBe('0deg');

      key(handle(), 'Enter');
      refresh();
      expect(svg()?.style.rotate).toBe('180deg');
    });

    it('collapses with the handle button', () => {
      const { root, sizes, refresh } = createHost(collapsible);

      root
        .querySelector<HTMLElement>('.andes-splitter__collapse')
        ?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      refresh();

      expect(sizes()).toEqual([0, 1000]);
    });

    it('keeps the collapsed size and hides the content from assistive tech', () => {
      const { panels, sizes } = createHost((h) => {
        collapsible(h);
        h.firstCollapsedSize.set(40);
        h.firstCollapsed.set(true);
      });

      expect(sizes()).toEqual([40, 960]);
      expect(panels()[0].hasAttribute('inert')).toBe(false);
    });

    it('marks a fully collapsed pane inert', () => {
      const { panels } = createHost((h) => {
        collapsible(h);
        h.firstCollapsed.set(true);
      });

      expect(panels()[0].hasAttribute('inert')).toBe(true);
    });

    it('reacts to the collapsed model changing from outside', () => {
      const { component, sizes, refresh } = createHost(collapsible);

      component.firstCollapsed.set(true);
      refresh();
      expect(sizes()).toEqual([0, 1000]);

      component.firstCollapsed.set(false);
      refresh();
      expect(sizes()).toEqual([300, 700]);
    });

    it('locks dragging while a neighbour is collapsed but still lets Enter expand it', () => {
      const { handle, host, sizes, refresh } = createHost((h) => {
        collapsible(h);
        h.firstCollapsed.set(true);
      });

      pointer(handle(), 'pointerdown', { x: 0 });
      expect(host.hasAttribute('data-dragging')).toBe(false);

      key(handle(), 'ArrowRight');
      refresh();
      expect(sizes()).toEqual([0, 1000]);

      key(handle(), 'Enter');
      refresh();
      expect(sizes()[0]).toBeGreaterThan(0);
    });

    it('ignores Enter when no neighbour is collapsible', () => {
      const { handle, sizes, refresh } = createHost();

      key(handle(), 'Enter');
      refresh();

      expect(sizes()).toEqual([300, 700]);
    });

    it('exposes the imperative API', () => {
      const { fixture, sizes, refresh } = createHost(collapsible);
      const splitter = fixture.debugElement.children[0].children[0]
        .componentInstance as AndesSplitter;

      splitter.collapsePanel(0);
      refresh();
      expect(sizes()).toEqual([0, 1000]);
      expect(splitter.getSizes()).toEqual([0, 1000]);

      splitter.togglePanel(0);
      refresh();
      expect(sizes()).toEqual([300, 700]);
    });
  });

  describe('persistence', () => {
    it('saves the layout under the storage key and restores it', () => {
      const first = createHost((h) => h.storageKey.set('layout'));
      key(first.handle(), 'ArrowRight', true);
      first.refresh();
      expect(first.sizes()).toEqual([350, 650]);
      first.fixture.destroy();

      const second = createHost((h) => h.storageKey.set('layout'));

      expect(second.sizes()).toEqual([350, 650]);
    });

    it('scales the saved shares to a different container size', () => {
      const first = createHost((h) => h.storageKey.set('layout'));
      key(first.handle(), 'ArrowRight', true);
      first.fixture.destroy();

      axisLength = 2001;
      const second = createHost((h) => h.storageKey.set('layout'));

      expect(second.sizes()).toEqual([700, 1300]);
    });

    it('goes back to the declared sizes on reset', () => {
      const { fixture, handle, sizes, refresh } = createHost((h) =>
        h.storageKey.set('layout'),
      );
      const splitter = fixture.debugElement.children[0].children[0]
        .componentInstance as AndesSplitter;
      key(handle(), 'ArrowRight', true);
      refresh();

      splitter.reset();
      refresh();

      expect(sizes()).toEqual([300, 700]);
      expect(localStorage.getItem('andes-splitter:layout')).toBeNull();
    });
  });

  describe('nesting', () => {
    @Component({
      imports: [AndesSplitter, AndesSplitterPanel],
      template: `
        <andes-splitter id="outer">
          <andes-splitter-panel size="40%">Left</andes-splitter-panel>
          <andes-splitter-panel>
            <andes-splitter id="inner" orientation="vertical">
              <andes-splitter-panel size="25%">Top</andes-splitter-panel>
              <andes-splitter-panel>Bottom</andes-splitter-panel>
            </andes-splitter>
          </andes-splitter-panel>
        </andes-splitter>
      `,
    })
    class NestedHost {}

    it('renders independent splitters inside a pane', () => {
      const fixture = TestBed.createComponent(NestedHost);
      fixture.detectChanges();
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;

      const outer = root.querySelector('#outer') as HTMLElement;
      const inner = root.querySelector('#inner') as HTMLElement;
      expect(
        outer.querySelectorAll(':scope > [role="separator"]'),
      ).toHaveLength(1);
      expect(
        inner.querySelectorAll(':scope > [role="separator"]'),
      ).toHaveLength(1);
      expect(inner.getAttribute('data-orientation')).toBe('vertical');
      expect(
        outer.querySelectorAll('[data-slot="splitter-panel"]'),
      ).toHaveLength(4);
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(
      'packages/ui/src/lib/splitter/splitter.css',
      'utf8',
    );

    it('has a 9px grab area around a 1px line', () => {
      expect(css).toContain('--andes-splitter-hit-area, 9px');
      expect(css).toMatch(/width: 1px;/);
    });

    it('disables text selection while dragging', () => {
      expect(css).toMatch(
        /:host\(\[data-dragging\]\)\s*\{[^}]*user-select: none/,
      );
    });

    it('shows the focus ring on keyboard focus only', () => {
      expect(css).toContain('.andes-splitter__handle:focus-visible');
      expect(css).toContain('outline: 2px solid var(--andes-color-focus-ring)');
    });

    it('uses logical properties for the grab area', () => {
      expect(css).toContain('inset-inline: calc(');
      expect(css).not.toMatch(/\b(left|right):/);
    });

    it('never lets a selector continue on a line that starts with a combinator', () => {
      expect(css).not.toMatch(/^\s*[>+~]/m);
    });

    it('turns transitions off for reduced motion', () => {
      const block =
        /@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*)\}/.exec(
          css,
        )?.[1];
      expect(block).toContain('transition: none');
    });
  });
});
