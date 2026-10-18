import { Component, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AndesWatermark } from './watermark';
import {
  andesWatermarkDataUrl,
  andesWatermarkLines,
  andesWatermarkTile,
  type AndesWatermarkFont,
} from './watermark-canvas';
import { AndesWatermarkInherit } from './watermark-inherit';
import { andesWatermarkOverlayStyle } from './watermark-overlay';
import { AndesWatermarkService } from './watermark.service';

interface FakeContext {
  font: string;
  fillStyle: string;
  globalAlpha: number;
  textAlign: string;
  textBaseline: string;
  scale: ReturnType<typeof vi.fn>;
  translate: ReturnType<typeof vi.fn>;
  rotate: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  fillText: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  measureText: (text: string) => { width: number };
}

let context: FakeContext;
let canvases: HTMLCanvasElement[] = [];

function createContext(): FakeContext {
  return {
    font: '',
    fillStyle: '',
    globalAlpha: 1,
    textAlign: '',
    textBaseline: '',
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
    measureText: (text: string) => ({ width: text.length * 8 }),
  };
}

/** The full-page overlay: a direct child of the body. */
function bodyOverlay(): HTMLElement | undefined {
  return (Array.from(document.body.children) as HTMLElement[]).find((el) =>
    el.matches('[data-slot="watermark-overlay"]'),
  );
}

async function flush() {
  for (let i = 0; i < 4; i++) {
    await Promise.resolve();
  }
  await new Promise((resolve) => setTimeout(resolve, 0));
}

@Component({
  imports: [AndesWatermark, AndesWatermarkInherit],
  template: `
    <andes-watermark
      [content]="content()"
      [image]="image()"
      [font]="font()"
      [rotate]="rotate()"
      [gap]="gap()"
      [offset]="offset()"
      [width]="width()"
      [height]="height()"
      [zIndex]="zIndex()"
      [inherit]="inherit()"
      [fullPage]="fullPage()"
    >
      <button type="button" id="action" (click)="clicks = clicks + 1">
        Action
      </button>
    </andes-watermark>
    <div id="portal" andesWatermarkInherit>Dialog</div>
  `,
})
class HostComponent {
  readonly content = signal<string | readonly string[] | undefined>(
    'Confidential',
  );
  readonly image = signal<string | undefined>(undefined);
  readonly font = signal<AndesWatermarkFont | undefined>(undefined);
  readonly rotate = signal(-22);
  readonly gap = signal<readonly [number, number]>([100, 100]);
  readonly offset = signal<readonly [number, number]>([0, 0]);
  readonly width = signal<number | undefined>(undefined);
  readonly height = signal<number | undefined>(undefined);
  readonly zIndex = signal(9);
  readonly inherit = signal(true);
  readonly fullPage = signal(false);
  clicks = 0;
}

async function setup(configure?: (host: HostComponent) => void) {
  const fixture = TestBed.createComponent(HostComponent);
  configure?.(fixture.componentInstance);
  fixture.detectChanges();
  await flush();
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const host = root.querySelector('andes-watermark') as HTMLElement;
  const overlay = () =>
    host.querySelector<HTMLElement>('[data-slot="watermark-overlay"]');
  const update = async (change: (h: HostComponent) => void) => {
    change(fixture.componentInstance);
    fixture.detectChanges();
    await flush();
  };
  return {
    fixture,
    component: fixture.componentInstance,
    root,
    host,
    overlay,
    update,
  };
}

describe('AndesWatermark', () => {
  beforeEach(() => {
    context = createContext();
    canvases = [];
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
      function (this: HTMLCanvasElement) {
        canvases.push(this);
        return context as unknown as CanvasRenderingContext2D;
      },
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(
      function (this: HTMLCanvasElement) {
        return `data:image/png;base64,${this.width}x${this.height}`;
      },
    );
    Object.defineProperty(window, 'devicePixelRatio', {
      configurable: true,
      value: 1,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Reflect.deleteProperty(window, 'devicePixelRatio');
    Reflect.deleteProperty(window, 'Image');
    document.body
      .querySelectorAll('[data-slot="watermark-overlay"]')
      .forEach((e) => e.remove());
    document.documentElement.removeAttribute('data-andes-theme');
  });

  describe('overlay', () => {
    it('paints a repeating tiled background that ignores the pointer', async () => {
      const { overlay } = await setup();

      const style = overlay()?.getAttribute('style') ?? '';
      expect(style).toContain('pointer-events: none !important');
      expect(style).toContain('background-repeat: repeat');
      expect(style).toContain('background-image: url("data:image/png;base64,');
      expect(style).toContain('position: absolute');
      expect(style).toContain('z-index: 9');
      expect(overlay()?.getAttribute('aria-hidden')).toBe('true');
    });

    it('leaves the content interactive', async () => {
      const { root, component } = await setup();

      (root.querySelector('#action') as HTMLButtonElement).click();

      expect(component.clicks).toBe(1);
      expect(root.querySelector('#action')?.parentElement?.localName).toBe(
        'andes-watermark',
      );
    });

    it('sizes the background to the pattern in CSS pixels', async () => {
      // "Confidential" is 12 characters = 96px wide, one 22px line; gaps of 100px each way.
      const { overlay } = await setup();

      expect(overlay()?.getAttribute('style')).toContain(
        'background-size: 392px 244px',
      );
    });

    it('applies the offset and z-index', async () => {
      const { overlay } = await setup((h) => {
        h.offset.set([12, 20]);
        h.zIndex.set(50);
      });

      const style = overlay()?.getAttribute('style') ?? '';
      expect(style).toContain('background-position: 12px 20px');
      expect(style).toContain('z-index: 50');
    });

    it('repaints when an input changes', async () => {
      const { overlay, update } = await setup();
      const before = overlay()?.getAttribute('style');

      await update((h) => h.gap.set([40, 40]));

      expect(overlay()?.getAttribute('style')).not.toBe(before);
      expect(overlay()?.getAttribute('style')).toContain(
        'background-size: 272px 124px',
      );
    });

    it('draws nothing when there is nothing to show, and removes a previous overlay', async () => {
      const { overlay, update } = await setup();
      expect(overlay()).not.toBeNull();

      await update((h) => h.content.set(undefined));

      expect(overlay()).toBeNull();
    });

    it('is not drawn on the server', async () => {
      TestBed.overrideProvider(PLATFORM_ID, { useValue: 'server' });

      const { overlay, root } = await setup();

      expect(overlay()).toBeNull();
      expect(root.querySelector('#action')).not.toBeNull();
      expect(canvases).toHaveLength(0);
    });

    it('removes the overlay when destroyed', async () => {
      const { fixture } = await setup();

      fixture.destroy();

      expect(
        document.querySelector('[data-slot="watermark-overlay"]'),
      ).toBeNull();
    });
  });

  describe('full page', () => {
    it('covers the viewport from the document body', async () => {
      const { overlay } = await setup((h) => h.fullPage.set(true));

      const node = bodyOverlay();
      expect(node).not.toBeNull();
      expect(node?.getAttribute('style')).toContain('position: fixed');
      expect(overlay()).toBeNull();
    });

    it('moves back into the host when full page is switched off', async () => {
      const { overlay, update } = await setup((h) => h.fullPage.set(true));

      await update((h) => h.fullPage.set(false));

      expect(overlay()).not.toBeNull();
      expect(bodyOverlay()).toBeUndefined();
    });
  });

  describe('tamper protection', () => {
    it('puts back an overlay that was removed', async () => {
      const { overlay } = await setup();
      const node = overlay() as HTMLElement;

      node.remove();
      await flush();

      expect(overlay()).toBe(node);
    });

    it('puts back an overlay that was moved elsewhere', async () => {
      const { overlay, host } = await setup();
      const node = overlay() as HTMLElement;

      document.body.appendChild(node);
      await flush();

      expect(node.parentElement).toBe(host);
    });

    it('restores an edited style', async () => {
      const { overlay } = await setup();
      const node = overlay() as HTMLElement;
      const original = node.getAttribute('style');

      node.style.display = 'none';
      node.style.setProperty('opacity', '0');
      await flush();

      expect(node.getAttribute('style')).toBe(original);
    });

    it('restores a replaced style attribute', async () => {
      const { overlay } = await setup();
      const node = overlay() as HTMLElement;
      const original = node.getAttribute('style');

      node.setAttribute('style', 'display: none');
      await flush();

      expect(node.getAttribute('style')).toBe(original);
    });

    it('removes attributes that were added to hide it', async () => {
      const { overlay } = await setup();
      const node = overlay() as HTMLElement;

      node.setAttribute('hidden', '');
      node.setAttribute('class', 'gone');
      await flush();

      expect(node.hasAttribute('hidden')).toBe(false);
      expect(node.hasAttribute('class')).toBe(false);
    });

    it('restores an aria-hidden that was changed and empties added children', async () => {
      const { overlay } = await setup();
      const node = overlay() as HTMLElement;

      node.setAttribute('aria-hidden', 'false');
      node.appendChild(document.createElement('span'));
      await flush();

      expect(node.getAttribute('aria-hidden')).toBe('true');
      expect(node.childNodes).toHaveLength(0);
    });

    it('keeps restoring after repeated attacks', async () => {
      const { overlay } = await setup();
      const node = overlay() as HTMLElement;

      for (let i = 0; i < 3; i++) {
        node.remove();
        await flush();
        node.style.visibility = 'hidden';
        await flush();
      }

      expect(node.isConnected).toBe(true);
      expect(node.getAttribute('style')).toContain(
        'visibility: visible !important',
      );
    });

    it('does not fight a deliberate removal when the component is destroyed', async () => {
      const { fixture, overlay } = await setup();
      const node = overlay() as HTMLElement;

      fixture.destroy();
      await flush();

      expect(node.isConnected).toBe(false);
    });

    it('guards the full-page overlay too', async () => {
      await setup((h) => h.fullPage.set(true));
      const node = bodyOverlay() as HTMLElement;

      node.remove();
      await flush();

      expect(node.isConnected).toBe(true);
    });
  });

  describe('theme', () => {
    it('redraws when the theme switches', async () => {
      await setup();
      const draws = canvases.length;

      document.documentElement.setAttribute('data-andes-theme', 'dark');
      await flush();

      expect(canvases.length).toBeGreaterThan(draws);
    });

    it('uses the foreground colour at low opacity unless a colour is given', async () => {
      // jsdom does not resolve custom properties, so the computed style is supplied.
      vi.spyOn(window, 'getComputedStyle').mockReturnValue({
        getPropertyValue: (name: string) =>
          name === '--andes-color-foreground' ? ' #112233 ' : '',
        color: 'rgb(0, 0, 0)',
        fontFamily: 'Inter',
        position: 'static',
        direction: 'ltr',
      } as unknown as CSSStyleDeclaration);

      await setup();

      expect(context.fillStyle).toBe('#112233');
      expect(context.globalAlpha).toBeCloseTo(0.15);
      expect(context.font).toContain('Inter');
    });

    it('uses an explicit colour as is', async () => {
      await setup((h) => h.font.set({ color: 'rgba(200, 0, 0, 0.3)' }));

      expect(context.fillStyle).toBe('rgba(200, 0, 0, 0.3)');
      expect(context.globalAlpha).toBe(1);
    });
  });

  describe('inheriting content', () => {
    it('paints the watermark on content that renders outside the host', async () => {
      const { root } = await setup();

      const portal = root.querySelector('#portal') as HTMLElement;
      expect(
        portal.querySelector('[data-slot="watermark-overlay"]'),
      ).not.toBeNull();
      expect(portal.style.position).toBe('relative');
    });

    it('does not inherit when turned off', async () => {
      const { root } = await setup((h) => h.inherit.set(false));

      expect(
        root.querySelector('#portal [data-slot="watermark-overlay"]'),
      ).toBeNull();
    });

    it('stops painting once the watermark goes away', async () => {
      const { root, update } = await setup();

      await update((h) => h.content.set(undefined));

      expect(
        root.querySelector('#portal [data-slot="watermark-overlay"]'),
      ).toBeNull();
    });

    it('is restored if tampered with, like the main overlay', async () => {
      const { root } = await setup();
      const node = root.querySelector(
        '#portal [data-slot="watermark-overlay"]',
      ) as HTMLElement;

      node.remove();
      await flush();

      expect(node.isConnected).toBe(true);
    });
  });

  describe('tile drawing', () => {
    const environment = () => ({ document, pixelRatio: 1, foreground: '#000' });

    it('draws two staggered marks, rotated by default -22 degrees', async () => {
      const tile = await andesWatermarkTile(
        { content: 'Draft' },
        environment(),
      );

      // 5 characters = 40px wide, one 22px line, 100px gaps: cell 140 x 122, tile 280 x 244.
      expect(tile).toEqual({
        url: 'data:image/png;base64,280x244',
        width: 280,
        height: 244,
      });
      expect(context.translate).toHaveBeenNthCalledWith(1, 70, 61);
      expect(context.translate).toHaveBeenNthCalledWith(2, 210, 183);
      expect(context.rotate).toHaveBeenCalledWith((-22 * Math.PI) / 180);
      expect(context.fillText).toHaveBeenCalledTimes(2);
    });

    it('draws each line of a multi-line mark, centred on the mark', async () => {
      await andesWatermarkTile(
        { content: ['Internal', 'Do not copy'] },
        environment(),
      );

      const calls = context.fillText.mock.calls.slice(0, 2);
      expect(calls).toEqual([
        ['Internal', 0, -11],
        ['Do not copy', 0, 11],
      ]);
      expect(context.textAlign).toBe('center');
    });

    it('scales the canvas for high-density screens but keeps CSS size', async () => {
      const tile = await andesWatermarkTile(
        { content: 'Draft' },
        { ...environment(), pixelRatio: 2 },
      );

      expect(canvases.at(-1)?.width).toBe(560);
      expect(canvases.at(-1)?.height).toBe(488);
      expect(context.scale).toHaveBeenCalledWith(2, 2);
      expect(tile?.width).toBe(280);
    });

    it('reads the device pixel ratio from the window by default', async () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        configurable: true,
        value: 3,
      });

      await andesWatermarkTile({ content: 'Draft' }, { document });

      expect(canvases.at(-1)?.width).toBe(840);
    });

    it('honours gap, width, height and rotate', async () => {
      const tile = await andesWatermarkTile(
        { content: 'Draft', gap: [10, 20], width: 100, height: 50, rotate: 45 },
        environment(),
      );

      expect(tile).toMatchObject({ width: 220, height: 140 });
      expect(context.rotate).toHaveBeenCalledWith((45 * Math.PI) / 180);
    });

    it('builds the canvas font from the font options', async () => {
      await andesWatermarkTile(
        {
          content: 'Draft',
          font: { size: 20, weight: 700, family: 'Georgia', style: 'italic' },
        },
        environment(),
      );

      expect(context.font).toBe('italic 700 20px Georgia');
    });

    it('falls back to the environment font family', async () => {
      await andesWatermarkTile(
        { content: 'Draft' },
        { ...environment(), fontFamily: 'Inter' },
      );

      expect(context.font).toBe('normal normal 16px Inter');
    });

    it('returns null without content or image', async () => {
      expect(await andesWatermarkTile({}, environment())).toBeNull();
      expect(
        await andesWatermarkTile({ content: [''] }, environment()),
      ).toBeNull();
    });

    it('returns null when no canvas context is available', async () => {
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

      expect(
        await andesWatermarkTile({ content: 'Draft' }, environment()),
      ).toBeNull();
    });

    it('drops empty lines', () => {
      expect(andesWatermarkLines(['a', '', 'b'])).toEqual(['a', 'b']);
      expect(andesWatermarkLines('x')).toEqual(['x']);
      expect(andesWatermarkLines(undefined)).toEqual([]);
    });
  });

  describe('image marks', () => {
    class FakeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      crossOrigin = '';
      naturalWidth = 240;
      naturalHeight = 120;
      set src(value: string) {
        queueMicrotask(() =>
          value.includes('broken') ? this.onerror?.() : this.onload?.(),
        );
      }
    }

    beforeEach(() => {
      Object.defineProperty(window, 'Image', {
        configurable: true,
        value: FakeImage,
      });
    });

    it('repeats an image at 120px wide by default, keeping its aspect ratio', async () => {
      const tile = await andesWatermarkTile(
        { image: '/logo.png' },
        { document, pixelRatio: 1 },
      );

      expect(context.drawImage).toHaveBeenCalledTimes(2);
      expect(context.drawImage.mock.calls[0].slice(1)).toEqual([
        -60, -30, 120, 60,
      ]);
      expect(tile).toMatchObject({ width: 440, height: 320 });
    });

    it('derives the width from a given height', async () => {
      await andesWatermarkTile(
        { image: '/logo.png', height: 40 },
        { document, pixelRatio: 1 },
      );

      expect(context.drawImage.mock.calls[0].slice(3)).toEqual([80, 40]);
    });

    it('prefers the image over text', async () => {
      await andesWatermarkTile(
        { image: '/logo.png', content: 'Draft' },
        { document, pixelRatio: 1 },
      );

      expect(context.fillText).not.toHaveBeenCalled();
    });

    it('returns null when the image fails to load', async () => {
      expect(
        await andesWatermarkTile(
          { image: '/broken.png' },
          { document, pixelRatio: 1 },
        ),
      ).toBeNull();
    });

    it('paints an image watermark through the component', async () => {
      const { overlay } = await setup((h) => {
        h.content.set(undefined);
        h.image.set('/logo.png');
      });

      expect(overlay()?.getAttribute('style')).toContain(
        'background-image: url(',
      );
    });
  });

  describe('reuse', () => {
    it('exposes the tile as a data URL function', async () => {
      expect(
        await andesWatermarkDataUrl(
          { content: 'Draft' },
          { document, pixelRatio: 1 },
        ),
      ).toBe('data:image/png;base64,280x244');
      expect(await andesWatermarkDataUrl({}, { document })).toBeNull();
    });

    it('exposes the same through the service', async () => {
      const service = TestBed.inject(AndesWatermarkService);

      expect(
        await service.dataUrl(
          { content: 'Draft' },
          { document, pixelRatio: 1 },
        ),
      ).toContain('data:image/png');
      expect(
        (await service.tile({ content: 'Draft' }, { document, pixelRatio: 1 }))
          ?.width,
      ).toBe(280);
    });

    it('lets the latest published watermark win and falls back when it is revoked', () => {
      const service = TestBed.inject(AndesWatermarkService);
      const first = {};
      const second = {};
      const paint = (url: string) => ({
        url,
        width: 1,
        height: 1,
        offset: [0, 0] as const,
        zIndex: 1,
      });

      service.publish(first, paint('one'));
      service.publish(second, paint('two'));
      expect(service.active()?.url).toBe('two');

      service.revoke(second);
      expect(service.active()?.url).toBe('one');

      service.revoke(first);
      expect(service.active()).toBeNull();
    });
  });

  describe('overlay style', () => {
    it('marks every declaration important so a stylesheet cannot override it', () => {
      const style = andesWatermarkOverlayStyle(
        { url: 'data:x', width: 10, height: 10, offset: [0, 0], zIndex: 3 },
        false,
      );

      expect(
        style
          .split('; ')
          .every((declaration) => declaration.endsWith('!important')),
      ).toBe(true);
    });
  });

  it('exposes the component on the debug element', async () => {
    const { fixture } = await setup();

    expect(
      fixture.debugElement.query(By.directive(AndesWatermark)),
    ).not.toBeNull();
  });
});
