import { Directionality } from '@angular/cdk/bidi';
import { Component, signal } from '@angular/core';
import { of } from 'rxjs';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { AndesImage } from './image';
import { AndesImageGroup } from './image-group';
import { AndesImagePreview } from './image-preview';
import type {
  AndesImageLabels,
  AndesImagePreviewConfig,
  AndesImagePreviewItem,
  AndesImageTransformEvent,
} from './image-types';

function withElementGeometry() {
  const descriptors = (['offsetWidth', 'offsetHeight'] as const).map(
    (prop) =>
      [
        prop,
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, prop),
      ] as const,
  );
  beforeAll(() => {
    for (const [prop] of descriptors) {
      Object.defineProperty(HTMLElement.prototype, prop, {
        configurable: true,
        get: () => 1,
      });
    }
  });
  afterAll(() => {
    for (const [prop, descriptor] of descriptors) {
      if (descriptor) {
        Object.defineProperty(HTMLElement.prototype, prop, descriptor);
      } else {
        delete (HTMLElement.prototype as unknown as Record<string, unknown>)[
          prop
        ];
      }
    }
  });
}

const PHOTOS: readonly AndesImagePreviewItem[] = [
  { src: '/one.jpg', alt: 'One' },
  { src: '/two.jpg', alt: 'Two' },
  { src: '/three.jpg', alt: 'Three' },
];

@Component({
  imports: [AndesImagePreview],
  template: `
    <button type="button" id="outside">Outside</button>
    <andes-image-preview
      [items]="items()"
      [config]="config()"
      [labels]="labels()"
      [(open)]="open"
      [(current)]="current"
      (transformChange)="events.push($event)"
      (closed)="reasons.push($event)"
    />
  `,
})
class PreviewHost {
  readonly items = signal<readonly AndesImagePreviewItem[]>(PHOTOS);
  readonly config = signal<AndesImagePreviewConfig | null>(null);
  readonly labels = signal<AndesImageLabels | null>(null);
  readonly open = signal(false);
  readonly current = signal(0);
  readonly events: AndesImageTransformEvent[] = [];
  readonly reasons: string[] = [];
}

const q = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector);
const all = (selector: string) =>
  Array.from(document.querySelectorAll<HTMLElement>(selector));
const action = (name: string) =>
  q<HTMLButtonElement>(`.andes-image-preview__button[data-action="${name}"]`);
const stage = () => q('.andes-image-preview__stage') as HTMLElement;
const shownImage = () => q<HTMLImageElement>('.andes-image-preview__image');
const transformText = () => shownImage()?.style.transform ?? '';
const scaleOf = () => {
  const match = /scale3d\((-?[\d.e-]+), (-?[\d.e-]+)/.exec(transformText());
  return match ? [Number(match[1]), Number(match[2])] : [NaN, NaN];
};
const translateOf = () => {
  const match = /translate3d\((-?[\d.e-]+)px, (-?[\d.e-]+)px/.exec(
    transformText(),
  );
  return match ? [Number(match[1]), Number(match[2])] : [NaN, NaN];
};
const rotationOf = () =>
  Number(/rotate\((-?[\d.e-]+)deg\)/.exec(transformText())?.[1]);
const counter = () =>
  q('.andes-image-preview__counter')?.textContent?.replace(/\s+/g, ' ').trim();

function key(
  name: string,
  init: KeyboardEventInit = {},
  target: Element = stage(),
) {
  const event = new KeyboardEvent('keydown', {
    key: name,
    keyCode: name === 'Escape' ? 27 : 0,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  return event;
}

function pointer(type: string, target: Element, x: number, y: number, id = 1) {
  target.dispatchEvent(
    new PointerEvent(type, {
      pointerId: id,
      pointerType: 'mouse',
      button: 0,
      clientX: x,
      clientY: y,
      bubbles: true,
      cancelable: true,
    }),
  );
}

function wheel(deltaY: number, x = 0, y = 0, extra: WheelEventInit = {}) {
  const event = new WheelEvent('wheel', {
    deltaY,
    clientX: x,
    clientY: y,
    bubbles: true,
    cancelable: true,
    ...extra,
  });
  stage().dispatchEvent(event);
  return event;
}

function openPreview(configure?: (host: PreviewHost) => void) {
  const fixture = TestBed.createComponent(PreviewHost);
  configure?.(fixture.componentInstance);
  fixture.detectChanges();
  fixture.componentInstance.open.set(true);
  fixture.detectChanges();
  return fixture;
}

describe('AndesImagePreview', () => {
  withElementGeometry();

  describe('dialog semantics', () => {
    it('renders nothing until opened', () => {
      const f = TestBed.createComponent(PreviewHost);
      f.detectChanges();
      expect(q('.andes-image-preview')).toBeNull();
    });

    it('is a labelled modal dialog with an inert page behind it', () => {
      const f = openPreview();
      const root = q('.andes-image-preview');
      expect(root?.getAttribute('role')).toBe('dialog');
      expect(root?.getAttribute('aria-modal')).toBe('true');
      expect(root?.getAttribute('aria-label')).toBe('Image preview: One');
      expect(f.nativeElement.hasAttribute('inert')).toBe(true);
    });

    it('does not open with nothing to show', () => {
      const f = openPreview((h) => h.items.set([]));
      expect(q('.andes-image-preview')).toBeNull();
      expect(f.componentInstance.open()).toBe(false);
    });

    it('focuses the stage on open so shortcuts work at once', () => {
      openPreview();
      expect(document.activeElement).toBe(stage());
    });

    it('traps Tab inside and restores focus to the opener', () => {
      const f = TestBed.createComponent(PreviewHost);
      f.detectChanges();
      const outside = f.nativeElement.querySelector(
        '#outside',
      ) as HTMLButtonElement;
      outside.focus();
      f.componentInstance.open.set(true);
      f.detectChanges();

      // Everything outside is inert, so it cannot take focus.
      expect(f.nativeElement.hasAttribute('inert')).toBe(true);

      key('Escape', {}, document.body);
      f.detectChanges();
      expect(document.activeElement).toBe(outside);
    });

    it('reports how it closed', () => {
      const f = openPreview();
      q<HTMLButtonElement>('.andes-image-preview__close')?.click();
      f.detectChanges();
      expect(f.componentInstance.reasons).toEqual(['close-button']);
      expect(f.componentInstance.open()).toBe(false);
    });

    it('closes on Escape unless that is turned off', () => {
      const f = openPreview();
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          keyCode: 27,
          bubbles: true,
        }),
      );
      f.detectChanges();
      expect(q('.andes-image-preview')).toBeNull();

      f.componentInstance.config.set({ closeOnEscape: false });
      f.componentInstance.open.set(true);
      f.detectChanges();
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          keyCode: 27,
          bubbles: true,
        }),
      );
      f.detectChanges();
      expect(q('.andes-image-preview')).not.toBeNull();
    });

    it('closes on a click on the empty stage, unless the scrim is not closable', () => {
      const f = openPreview();
      stage().click();
      f.detectChanges();
      expect(f.componentInstance.reasons).toEqual(['backdrop-click']);

      f.componentInstance.config.set({ scrim: { closable: false } });
      f.componentInstance.open.set(true);
      f.detectChanges();
      stage().click();
      f.detectChanges();
      expect(q('.andes-image-preview')).not.toBeNull();
    });

    it('draws a scrim, and no scrim when turned off', () => {
      const f = openPreview();
      expect(q('.andes-image-preview-backdrop')).not.toBeNull();
      f.componentInstance.open.set(false);
      f.detectChanges();

      f.componentInstance.config.set({ scrim: false });
      f.componentInstance.open.set(true);
      f.detectChanges();
      expect(q('.andes-image-preview-backdrop')).toBeNull();
    });

    it('adds the blur modifier to the scrim on request', () => {
      openPreview((h) => h.config.set({ scrim: { blur: true } }));
      expect(q('.andes-image-preview-backdrop--blur')).not.toBeNull();
    });
  });

  describe('toolbar', () => {
    it('offers every action as a named button inside a labelled group', () => {
      openPreview();
      const toolbar = q('.andes-image-preview__toolbar');
      expect(toolbar?.getAttribute('role')).toBe('group');
      expect(toolbar?.getAttribute('aria-label')).toBe('Image tools');
      const names = all('.andes-image-preview__button').map((b) =>
        b.getAttribute('aria-label'),
      );
      expect(names).toEqual([
        'Zoom out',
        'Zoom in',
        'Rotate left',
        'Rotate right',
        'Flip horizontally',
        'Flip vertically',
        'Reset',
        'Download',
      ]);
    });

    it('shows only the requested actions, in order', () => {
      openPreview((h) => h.config.set({ actions: ['download', 'zoomIn'] }));
      expect(
        all('.andes-image-preview__button').map((b) => b.dataset['action']),
      ).toEqual(['download', 'zoomIn']);
    });

    it('localises every label', () => {
      openPreview((h) =>
        h.labels.set({
          close: 'Cerrar',
          zoomIn: 'Acercar',
          dialog: 'Vista previa',
        }),
      );
      expect(q('.andes-image-preview__close')?.getAttribute('aria-label')).toBe(
        'Cerrar',
      );
      expect(action('zoomIn')?.getAttribute('aria-label')).toBe('Acercar');
      expect(q('.andes-image-preview')?.getAttribute('aria-label')).toBe(
        'Vista previa: One',
      );
    });

    it('zooms in by the step and out again, reporting each change', () => {
      const f = openPreview();
      action('zoomIn')?.click();
      f.detectChanges();
      expect(scaleOf()).toEqual([1.5, 1.5]);

      action('zoomIn')?.click();
      f.detectChanges();
      expect(scaleOf()[0]).toBeCloseTo(2.25);

      action('zoomOut')?.click();
      f.detectChanges();
      expect(scaleOf()[0]).toBeCloseTo(1.5);
      expect(f.componentInstance.events.map((e) => e.action)).toEqual([
        'zoomIn',
        'zoomIn',
        'zoomOut',
      ]);
    });

    it('honours a custom step and limits', () => {
      const f = openPreview((h) => h.config.set({ scaleStep: 1, maxScale: 3 }));
      action('zoomIn')?.click();
      f.detectChanges();
      expect(scaleOf()[0]).toBe(2);
      action('zoomIn')?.click();
      f.detectChanges();
      expect(scaleOf()[0]).toBe(3);
      expect(action('zoomIn')?.getAttribute('aria-disabled')).toBe('true');
    });

    it('disables zoom out and reset at rest with aria-disabled, keeping them focusable', () => {
      openPreview();
      expect(action('zoomOut')?.getAttribute('aria-disabled')).toBe('true');
      expect(action('reset')?.getAttribute('aria-disabled')).toBe('true');
      expect(action('zoomOut')?.hasAttribute('disabled')).toBe(false);
      expect(action('zoomIn')?.getAttribute('aria-disabled')).toBeNull();
    });

    it('rotates a quarter turn either way, cumulatively', () => {
      const f = openPreview();
      action('rotateRight')?.click();
      f.detectChanges();
      expect(rotationOf()).toBe(90);
      action('rotateRight')?.click();
      f.detectChanges();
      expect(rotationOf()).toBe(180);
      action('rotateLeft')?.click();
      action('rotateLeft')?.click();
      action('rotateLeft')?.click();
      f.detectChanges();
      expect(rotationOf()).toBe(-90);
    });

    it('flips on each screen axis', () => {
      const f = openPreview();
      action('flipX')?.click();
      f.detectChanges();
      expect(scaleOf()).toEqual([-1, 1]);
      action('flipY')?.click();
      f.detectChanges();
      expect(scaleOf()).toEqual([-1, -1]);
      action('flipX')?.click();
      f.detectChanges();
      expect(scaleOf()).toEqual([1, -1]);
    });

    it('resets everything', () => {
      const f = openPreview();
      action('zoomIn')?.click();
      action('rotateRight')?.click();
      action('flipX')?.click();
      f.detectChanges();
      expect(action('reset')?.getAttribute('aria-disabled')).toBeNull();

      action('reset')?.click();
      f.detectChanges();
      expect(transformText()).toBe(
        'translate3d(0px, 0px, 0) scale3d(1, 1, 1) rotate(0deg)',
      );
      expect(f.componentInstance.events.at(-1)?.action).toBe('reset');
    });

    it('renders extra actions after the built-ins, with a way to close', () => {
      @Component({
        imports: [AndesImagePreview],
        template: `
          <ng-template #extra let-item let-close="close">
            <button type="button" id="extra" (click)="close()">
              {{ item.alt }}
            </button>
          </ng-template>
          <andes-image-preview
            [items]="items"
            [config]="{ extraActions: extra }"
            [(open)]="open"
          />
        `,
      })
      class ExtraHost {
        items = PHOTOS;
        open = true;
      }
      const f = TestBed.createComponent(ExtraHost);
      f.detectChanges();
      const extra = q<HTMLButtonElement>('#extra');
      expect(extra?.textContent?.trim()).toBe('One');
      extra?.click();
      f.detectChanges();
      expect(q('.andes-image-preview')).toBeNull();
    });

    it('downloads through a link named after the file', async () => {
      const clicked: { href: string; download: string }[] = [];
      const click = vi
        .spyOn(HTMLAnchorElement.prototype, 'click')
        .mockImplementation(function (this: HTMLAnchorElement) {
          clicked.push({
            href: this.getAttribute('href') ?? '',
            download: this.download,
          });
        });
      const original = globalThis.fetch;
      globalThis.fetch = vi
        .fn()
        .mockRejectedValue(new Error('blocked')) as typeof fetch;
      try {
        const f = openPreview((h) =>
          h.items.set([
            { src: 'https://cdn.example.com/photos/harbour.jpg?w=1', alt: 'x' },
          ]),
        );
        action('download')?.click();
        await vi.waitFor(() => expect(clicked).toHaveLength(1));
        expect(clicked[0]).toEqual({
          href: 'https://cdn.example.com/photos/harbour.jpg?w=1',
          download: 'harbour.jpg',
        });
        expect(f.componentInstance.events.at(-1)?.action).toBe('download');
      } finally {
        globalThis.fetch = original;
        click.mockRestore();
      }
    });
  });

  describe('keyboard', () => {
    it('zooms with + and -, resets with 0', () => {
      const f = openPreview();
      expect(key('+').defaultPrevented).toBe(true);
      f.detectChanges();
      expect(scaleOf()[0]).toBe(1.5);
      key('=');
      f.detectChanges();
      expect(scaleOf()[0]).toBeCloseTo(2.25);
      key('-');
      f.detectChanges();
      expect(scaleOf()[0]).toBeCloseTo(1.5);
      key('0');
      f.detectChanges();
      expect(scaleOf()[0]).toBe(1);
    });

    it('rotates with R and Shift+R, and with the brackets', () => {
      const f = openPreview();
      key('r');
      f.detectChanges();
      expect(rotationOf()).toBe(90);
      key('R', { shiftKey: true });
      key('[');
      f.detectChanges();
      expect(rotationOf()).toBe(-90);
      key(']');
      f.detectChanges();
      expect(rotationOf()).toBe(0);
    });

    it('flips with H and V', () => {
      const f = openPreview();
      key('h');
      key('v');
      f.detectChanges();
      expect(scaleOf()).toEqual([-1, -1]);
    });

    it('ignores shortcuts with a modifier, and when keyboard is off', () => {
      const f = openPreview();
      expect(key('+', { ctrlKey: true }).defaultPrevented).toBe(false);
      f.detectChanges();
      expect(scaleOf()[0]).toBe(1);

      f.componentInstance.config.set({ keyboard: false });
      f.detectChanges();
      key('+');
      f.detectChanges();
      expect(scaleOf()[0]).toBe(1);
    });

    it('leaves keys it does not own to the browser', () => {
      openPreview();
      expect(key('a').defaultPrevented).toBe(false);
      expect(key('ArrowUp').defaultPrevented).toBe(false);
    });

    it('pans a zoomed image with the arrow keys instead of stepping', () => {
      const f = openPreview();
      key('+');
      f.detectChanges();
      key('ArrowLeft');
      f.detectChanges();
      expect(translateOf()).toEqual([48, 0]);
      key('ArrowDown');
      f.detectChanges();
      expect(translateOf()).toEqual([48, -48]);
      expect(f.componentInstance.current()).toBe(0);
    });
  });

  describe('wheel, double click and drag', () => {
    it('zooms with the wheel and stops the page from scrolling', () => {
      const f = openPreview();
      const up = wheel(-100);
      f.detectChanges();
      expect(up.defaultPrevented).toBe(true);
      expect(scaleOf()[0]).toBeGreaterThan(1);
      const after = scaleOf()[0];
      wheel(100);
      f.detectChanges();
      expect(scaleOf()[0]).toBeLessThan(after);
      expect(f.componentInstance.events[0].action).toBe('wheel');
    });

    it('zooms about the pointer, keeping the point under it still', () => {
      const f = openPreview();
      stage().getBoundingClientRect = () =>
        ({
          left: 0,
          top: 0,
          width: 400,
          height: 300,
          right: 400,
          bottom: 300,
        }) as DOMRect;
      wheel(-100, 300, 150);
      f.detectChanges();
      const [scale] = scaleOf();
      const [x] = translateOf();
      // The pointer is 100px right of the stage centre; that point must not move.
      expect(x).toBeCloseTo(100 - 100 * scale);
    });

    it('ignores the wheel when it is turned off', () => {
      const f = openPreview((h) => h.config.set({ wheel: false }));
      const event = wheel(-100);
      f.detectChanges();
      expect(event.defaultPrevented).toBe(false);
      expect(scaleOf()[0]).toBe(1);
    });

    it('never zooms out past the minimum', () => {
      const f = openPreview();
      wheel(500);
      f.detectChanges();
      expect(scaleOf()[0]).toBe(1);
    });

    it('double click zooms in, and back out', () => {
      const f = openPreview();
      shownImage()?.dispatchEvent(
        new MouseEvent('dblclick', { bubbles: true, cancelable: true }),
      );
      f.detectChanges();
      expect(scaleOf()[0]).toBe(2);
      shownImage()?.dispatchEvent(
        new MouseEvent('dblclick', { bubbles: true, cancelable: true }),
      );
      f.detectChanges();
      expect(scaleOf()[0]).toBe(1);
    });

    it('pans a zoomed image by dragging, and does not close afterwards', () => {
      const f = openPreview();
      action('zoomIn')?.click();
      action('zoomIn')?.click();
      f.detectChanges();
      expect(stage().classList).toContain(
        'andes-image-preview__stage--movable',
      );

      pointer('pointerdown', shownImage() as Element, 100, 100);
      pointer('pointermove', stage(), 130, 90);
      f.detectChanges();
      expect(stage().classList).toContain(
        'andes-image-preview__stage--dragging',
      );
      expect(translateOf()).toEqual([30, -10]);

      pointer('pointerup', stage(), 130, 90);
      stage().click();
      f.detectChanges();
      expect(stage().classList).not.toContain(
        'andes-image-preview__stage--dragging',
      );
      expect(q('.andes-image-preview')).not.toBeNull();
      expect(f.componentInstance.events.at(-1)?.action).toBe('move');
    });

    it('pulls a dragged image back into view on release', () => {
      const f = openPreview();
      action('zoomIn')?.click();
      f.detectChanges();
      // 1.5x of a 200x100 image in a 400x300 stage still fits: it must recentre.
      Object.defineProperty(stage(), 'clientWidth', {
        configurable: true,
        value: 400,
      });
      Object.defineProperty(stage(), 'clientHeight', {
        configurable: true,
        value: 300,
      });
      Object.defineProperty(shownImage(), 'offsetWidth', {
        configurable: true,
        value: 200,
      });
      Object.defineProperty(shownImage(), 'offsetHeight', {
        configurable: true,
        value: 100,
      });

      pointer('pointerdown', shownImage() as Element, 0, 0);
      pointer('pointermove', stage(), 90, 40);
      pointer('pointerup', stage(), 90, 40);
      f.detectChanges();
      expect(translateOf()).toEqual([0, 0]);
    });

    it('does not move an image that is not zoomed', () => {
      const f = openPreview();
      pointer('pointerdown', shownImage() as Element, 0, 0);
      pointer('pointermove', stage(), 20, 20);
      f.detectChanges();
      expect(translateOf()).toEqual([0, 0]);
      pointer('pointerup', stage(), 20, 20);
    });

    it('does not pan when movable is off', () => {
      const f = openPreview((h) => h.config.set({ movable: false }));
      action('zoomIn')?.click();
      f.detectChanges();
      pointer('pointerdown', shownImage() as Element, 0, 0);
      pointer('pointermove', stage(), 50, 50);
      f.detectChanges();
      expect(translateOf()).toEqual([0, 0]);
      expect(stage().classList).not.toContain(
        'andes-image-preview__stage--movable',
      );
    });
  });

  describe('browsing several images', () => {
    it('shows a counter, previous / next, and no more for one image', () => {
      const f = openPreview();
      expect(counter()).toBe('1 / 3');
      expect(
        q('.andes-image-preview__nav--previous')?.getAttribute('aria-label'),
      ).toBe('Previous image');
      expect(
        q('.andes-image-preview__nav--next')?.getAttribute('aria-label'),
      ).toBe('Next image');
      f.componentInstance.open.set(false);
      f.componentInstance.items.set([PHOTOS[0]]);
      f.detectChanges();
      f.componentInstance.open.set(true);
      f.detectChanges();
      expect(q('.andes-image-preview__counter')).toBeNull();
      expect(q('.andes-image-preview__nav')).toBeNull();
    });

    it('steps with the buttons and updates the model', () => {
      const f = openPreview();
      q<HTMLButtonElement>('.andes-image-preview__nav--next')?.click();
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(1);
      expect(counter()).toBe('2 / 3');
      expect(shownImage()?.getAttribute('src')).toBe('/two.jpg');
      q<HTMLButtonElement>('.andes-image-preview__nav--previous')?.click();
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(0);
    });

    it('marks the end buttons aria-disabled and stops there', () => {
      const f = openPreview();
      const previous = q<HTMLButtonElement>(
        '.andes-image-preview__nav--previous',
      );
      expect(previous?.getAttribute('aria-disabled')).toBe('true');
      previous?.click();
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(0);

      f.componentInstance.current.set(2);
      f.detectChanges();
      const next = q<HTMLButtonElement>('.andes-image-preview__nav--next');
      expect(next?.getAttribute('aria-disabled')).toBe('true');
      next?.click();
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(2);
    });

    it('wraps around with loop', () => {
      const f = openPreview((h) => h.config.set({ loop: true }));
      expect(
        q('.andes-image-preview__nav--previous')?.getAttribute('aria-disabled'),
      ).toBeNull();
      q<HTMLButtonElement>('.andes-image-preview__nav--previous')?.click();
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(2);
      q<HTMLButtonElement>('.andes-image-preview__nav--next')?.click();
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(0);
    });

    it('steps with the arrow keys, PageUp / PageDown, Home and End', () => {
      const f = openPreview();
      key('ArrowRight');
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(1);
      key('ArrowLeft');
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(0);
      key('End');
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(2);
      key('PageUp');
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(1);
      key('PageDown');
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(2);
      key('Home');
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(0);
    });

    it('swaps the arrow keys in right-to-left', () => {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Directionality,
            useValue: {
              value: 'rtl',
              change: of(),
              ngOnDestroy: () => undefined,
            },
          },
        ],
      });
      const f = openPreview();
      key('ArrowLeft');
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(1);
      key('ArrowRight');
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(0);
    });

    it('resets the transform when the image changes', () => {
      const f = openPreview();
      key('+');
      key('r');
      f.detectChanges();
      key('PageDown');
      f.detectChanges();
      expect(transformText()).toBe(
        'translate3d(0px, 0px, 0) scale3d(1, 1, 1) rotate(0deg)',
      );
    });

    it('announces position and description in a polite live region', () => {
      const f = openPreview();
      const live = q('.andes-image-preview__sr');
      expect(live?.getAttribute('aria-live')).toBe('polite');
      expect(live?.textContent?.trim()).toBe('Image 1 of 3: One');
      key('PageDown');
      f.detectChanges();
      expect(live?.textContent?.trim()).toBe('Image 2 of 3: Two');
    });

    it('draws a custom counter', () => {
      @Component({
        imports: [AndesImagePreview],
        template: `
          <ng-template #count let-current let-total="total"
            ><b id="n">{{ current }} of {{ total }}</b></ng-template
          >
          <andes-image-preview
            [items]="items"
            [config]="{ countTemplate: count }"
            [(open)]="open"
          />
        `,
      })
      class CountHost {
        items = PHOTOS;
        open = true;
      }
      TestBed.createComponent(CountHost).detectChanges();
      expect(q('#n')?.textContent).toBe('1 of 3');
    });

    it('swipes a fitted image to step', () => {
      const f = openPreview();
      pointer('pointerdown', stage(), 300, 100);
      pointer('pointermove', stage(), 200, 100);
      pointer('pointerup', stage(), 200, 100);
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(1);
      pointer('pointerdown', stage(), 100, 100);
      pointer('pointermove', stage(), 220, 105);
      pointer('pointerup', stage(), 220, 105);
      f.detectChanges();
      expect(f.componentInstance.current()).toBe(0);
    });
  });

  describe('loading and failure', () => {
    it('shows a spinner until the image loads', () => {
      const f = openPreview();
      expect(q('.andes-image-preview__loading')).not.toBeNull();
      shownImage()?.dispatchEvent(new Event('load'));
      f.detectChanges();
      expect(q('.andes-image-preview__loading')).toBeNull();
    });

    it('tries the fallback once, then reports the failure in an alert', () => {
      const f = openPreview((h) =>
        h.items.set([{ src: '/bad.jpg', fallback: '/good.jpg', alt: 'x' }]),
      );
      shownImage()?.dispatchEvent(new Event('error'));
      f.detectChanges();
      expect(shownImage()?.getAttribute('src')).toBe('/good.jpg');
      shownImage()?.dispatchEvent(new Event('error'));
      f.detectChanges();
      const alert = q('.andes-image-preview__error');
      expect(alert?.getAttribute('role')).toBe('alert');
      expect(alert?.textContent).toContain('The image could not be loaded');
    });
  });

  describe('motion', () => {
    it('detaches at once when no exit animation can be reported', () => {
      const f = openPreview();
      key('Escape', {}, document.body);
      f.detectChanges();
      expect(q('.andes-image-preview')).toBeNull();
      expect(q('.andes-image-preview-backdrop')).toBeNull();
    });
  });
});

@Component({
  imports: [AndesImage, AndesImageGroup],
  template: `
    <button type="button" id="before">Before</button>
    <andes-image-group
      [preview]="preview()"
      [(open)]="open"
      [(current)]="current"
      (closed)="reasons.push($event)"
    >
      <andes-image id="i1" src="/one.jpg" alt="One" />
      @if (showSecond()) {
        <andes-image
          id="i2"
          src="/two.jpg"
          alt="Two"
          [preview]="secondPreview()"
        />
      }
      <andes-image id="i3" src="/three.jpg" alt="Three" />
    </andes-image-group>
  `,
})
class GroupHost {
  readonly preview = signal<boolean | AndesImagePreviewConfig | ''>(true);
  readonly open = signal(false);
  readonly current = signal(0);
  readonly showSecond = signal(true);
  readonly secondPreview = signal<boolean>(true);
  readonly reasons: string[] = [];
}

describe('AndesImageGroup', () => {
  withElementGeometry();

  function setup() {
    const fixture = TestBed.createComponent(GroupHost);
    fixture.detectChanges();
    return fixture;
  }
  const thumb = (f: ComponentFixture<GroupHost>, id: string) =>
    f.nativeElement.querySelector(
      `#${id} .andes-image__mask`,
    ) as HTMLButtonElement;

  it('opens one shared viewer on the clicked image', () => {
    const f = setup();
    thumb(f, 'i3').click();
    f.detectChanges();
    expect(counter()).toBe('3 / 3');
    expect(shownImage()?.getAttribute('src')).toBe('/three.jpg');
    expect(f.componentInstance.open()).toBe(true);
    expect(f.componentInstance.current()).toBe(2);
    expect(all('.andes-image-preview')).toHaveLength(1);
  });

  it('browses all of them in document order', () => {
    const f = setup();
    thumb(f, 'i1').click();
    f.detectChanges();
    expect(counter()).toBe('1 / 3');
    key('PageDown');
    f.detectChanges();
    expect(shownImage()?.getAttribute('src')).toBe('/two.jpg');
  });

  it('leaves out an image that opted out of preview', () => {
    const f = setup();
    f.componentInstance.secondPreview.set(false);
    f.detectChanges();
    expect(thumb(f, 'i2')).toBeNull();
    thumb(f, 'i1').click();
    f.detectChanges();
    expect(counter()).toBe('1 / 2');
    key('PageDown');
    f.detectChanges();
    expect(shownImage()?.getAttribute('src')).toBe('/three.jpg');
  });

  it('follows images added and removed', () => {
    const f = setup();
    f.componentInstance.showSecond.set(false);
    f.detectChanges();
    thumb(f, 'i1').click();
    f.detectChanges();
    expect(counter()).toBe('1 / 2');
  });

  it('applies the group configuration to every thumbnail and the viewer', () => {
    const f = setup();
    f.componentInstance.preview.set({ loop: true, actions: ['zoomIn'] });
    f.detectChanges();
    thumb(f, 'i1').click();
    f.detectChanges();
    expect(all('.andes-image-preview__button')).toHaveLength(1);
    expect(
      q('.andes-image-preview__nav--previous')?.getAttribute('aria-disabled'),
    ).toBeNull();
  });

  it('turns every thumbnail into a plain picture with preview off', () => {
    const f = setup();
    f.componentInstance.preview.set(false);
    f.detectChanges();
    expect(thumb(f, 'i1')).toBeNull();
    expect(f.nativeElement.querySelector('andes-image-preview')).toBeNull();
  });

  it('returns focus to the thumbnail last shown', () => {
    const f = setup();
    thumb(f, 'i1').focus();
    thumb(f, 'i1').click();
    f.detectChanges();
    key('End');
    f.detectChanges();
    key('Escape', {}, document.body);
    f.detectChanges();
    expect(f.componentInstance.reasons).toEqual(['escape-key']);
    expect(document.activeElement).toBe(thumb(f, 'i3'));
  });

  it('can be opened from code', () => {
    const f = setup();
    f.componentInstance.current.set(1);
    f.componentInstance.open.set(true);
    f.detectChanges();
    expect(counter()).toBe('2 / 3');
  });
});
