import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { Component, signal, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AndesQrCode, AndesQrCodeStatus, AndesQrCodeType } from './qr-code';
import { encodeQr, QrErrorLevel } from './qr-encoder';

const LOGO =
  'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22/%3E';

@Component({
  imports: [AndesQrCode],
  template: `<andes-qr-code
      #qr
      [value]="value()"
      [type]="type()"
      [size]="size()"
      [color]="color()"
      [bgColor]="bgColor()"
      [bordered]="bordered()"
      [errorLevel]="errorLevel()"
      [boostLevel]="boostLevel()"
      [icon]="icon()"
      [iconSize]="iconSize()"
      [iconBordered]="iconBordered()"
      [status]="status()"
      [statusRender]="custom() ? statusTemplate : undefined"
      [labels]="labels()"
      [aria-label]="ariaLabel()"
      (refresh)="refreshed = refreshed + 1"
    />
    <ng-template #statusTemplate let-status let-refresh="refresh">
      <p class="custom-status">{{ status }}</p>
      <button type="button" class="custom-refresh" (click)="refresh()">
        Again
      </button>
    </ng-template>`,
})
class HostComponent {
  readonly qr = viewChild.required<AndesQrCode>('qr');
  readonly value = signal('https://andes.example/pay/42');
  readonly type = signal<AndesQrCodeType>('svg');
  readonly size = signal(160);
  readonly color = signal<string | undefined>(undefined);
  readonly bgColor = signal<string | undefined>(undefined);
  readonly bordered = signal(true);
  readonly errorLevel = signal<QrErrorLevel>('M');
  readonly boostLevel = signal(true);
  readonly icon = signal<string | undefined>(undefined);
  readonly iconSize = signal<
    number | { width: number; height: number } | undefined
  >(undefined);
  readonly iconBordered = signal(true);
  readonly status = signal<AndesQrCodeStatus>('active');
  readonly custom = signal(false);
  readonly labels = signal<Record<string, string> | undefined>(undefined);
  readonly ariaLabel = signal<string | undefined>(undefined);
  refreshed = 0;
}

interface Canvas2dStub {
  fillStyle: unknown;
  fillRect: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
}

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(blob);
  });
}

describe('AndesQrCode', () => {
  function setup() {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    return {
      fixture,
      host: fixture.componentInstance,
      root,
      el: root.querySelector('andes-qr-code') as HTMLElement,
    };
  }

  async function settle(fixture: {
    detectChanges(): void;
    whenStable(): Promise<void>;
  }) {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('SVG rendering', () => {
    it('draws the matrix as a single crisp path inside a square viewBox', () => {
      const { el } = setup();
      const svg = el.querySelector('svg') as SVGElement;
      const matrix = encodeQr('https://andes.example/pay/42', {
        errorLevel: 'M',
      });
      const side = matrix.size + 4;

      expect(svg.getAttribute('viewBox')).toBe(`0 0 ${side} ${side}`);
      expect(svg.getAttribute('width')).toBe('160');
      expect(svg.getAttribute('height')).toBe('160');
      expect(svg.getAttribute('shape-rendering')).toBe('crispEdges');
      expect(svg.getAttribute('aria-hidden')).toBe('true');
      expect(svg.querySelectorAll('path.andes-qr-code__modules')).toHaveLength(
        1,
      );
      expect(
        svg.querySelector('.andes-qr-code__modules')?.getAttribute('d'),
      ).toMatch(/^M\d+ \d+h\d+v1h-\d+z/);
    });

    it('re-encodes when the value or the level changes', () => {
      const { fixture, host, el } = setup();
      const before = el
        .querySelector('.andes-qr-code__modules')
        ?.getAttribute('d');

      host.value.set('another payload');
      fixture.detectChanges();
      const after = el
        .querySelector('.andes-qr-code__modules')
        ?.getAttribute('d');
      expect(after).not.toBe(before);

      host.errorLevel.set('H');
      host.boostLevel.set(false);
      fixture.detectChanges();
      expect(host.qr().effectiveErrorLevel()).toBe('H');
    });

    it('follows the requested size', () => {
      const { fixture, host, el } = setup();
      host.size.set(240);
      fixture.detectChanges();

      const symbol = el.querySelector('.andes-qr-code__symbol') as HTMLElement;
      expect(symbol.style.width).toBe('240px');
      expect(symbol.style.height).toBe('240px');
      expect(el.querySelector('svg')?.getAttribute('width')).toBe('240');
    });

    it('renders nothing for an empty value, and flags a value that is too long', () => {
      const { fixture, host, el } = setup();
      host.value.set('');
      fixture.detectChanges();
      expect(el.querySelector('svg')).toBeNull();
      expect(host.qr().matrix()).toBeNull();
      expect(host.qr().overflow()).toBe(false);

      host.value.set('x'.repeat(3000));
      fixture.detectChanges();
      expect(el.querySelector('svg')).toBeNull();
      expect(host.qr().overflow()).toBe(true);
    });

    it('exposes the matrix for tests and custom renderers', () => {
      const { host } = setup();
      const matrix = host.qr().matrix();
      expect(matrix?.version).toBe(3);
      expect(matrix?.size).toBe(29);
    });
  });

  describe('colours and frame', () => {
    it('leaves the colours to the tokens by default', () => {
      const { el } = setup();
      expect(el.style.getPropertyValue('--andes-qr-code-color')).toBe('');
      expect(el.style.getPropertyValue('--andes-qr-code-bg')).toBe('');
    });

    it('applies color and bgColor as custom properties on the host', () => {
      const { fixture, host, el } = setup();
      host.color.set('var(--andes-color-primary)');
      host.bgColor.set('#fffbe6');
      fixture.detectChanges();

      expect(el.style.getPropertyValue('--andes-qr-code-color')).toBe(
        'var(--andes-color-primary)',
      );
      expect(el.style.getPropertyValue('--andes-qr-code-bg')).toBe('#fffbe6');
    });

    it('toggles the border and padding with `bordered`', () => {
      const { fixture, host, el } = setup();
      const frame = el.querySelector('.andes-qr-code') as HTMLElement;
      expect(frame.classList).toContain('andes-qr-code--bordered');

      host.bordered.set(false);
      fixture.detectChanges();
      expect(frame.classList).toContain('andes-qr-code--borderless');
      expect(frame.classList).not.toContain('andes-qr-code--bordered');
    });
  });

  describe('accessibility', () => {
    it('names the symbol with role="img" and the encoded value', () => {
      const { el } = setup();
      const symbol = el.querySelector('[role="img"]') as HTMLElement;
      expect(symbol.getAttribute('aria-label')).toBe(
        'QR code: https://andes.example/pay/42',
      );
      expect(el.getAttribute('aria-label')).toBeNull();
    });

    it('uses a custom aria-label, truncates long values and adds the status', () => {
      const { fixture, host, el } = setup();
      host.ariaLabel.set('Pay with your banking app');
      fixture.detectChanges();
      const symbol = el.querySelector('[role="img"]') as HTMLElement;
      expect(symbol.getAttribute('aria-label')).toBe(
        'Pay with your banking app',
      );

      host.status.set('expired');
      fixture.detectChanges();
      expect(symbol.getAttribute('aria-label')).toBe(
        'Pay with your banking app (QR code expired)',
      );

      host.ariaLabel.set(undefined);
      host.status.set('active');
      host.value.set('a'.repeat(300));
      fixture.detectChanges();
      expect(symbol.getAttribute('aria-label')).toBe(
        `QR code: ${'a'.repeat(100)}...`,
      );
    });

    it('keeps the refresh button outside the image role', () => {
      const { fixture, host, el } = setup();
      host.status.set('expired');
      fixture.detectChanges();
      const symbol = el.querySelector('[role="img"]') as HTMLElement;
      expect(symbol.querySelector('button')).toBeNull();
      expect(el.querySelector('button')).not.toBeNull();
    });

    it('announces status changes through a polite live region', () => {
      const { fixture, host, el } = setup();
      const live = el.querySelector('[role="status"]') as HTMLElement;
      expect(live.getAttribute('aria-live')).toBe('polite');
      expect(live.textContent?.trim()).toBe('');

      host.status.set('loading');
      fixture.detectChanges();
      expect(live.textContent?.trim()).toBe('Loading');
      expect(el.getAttribute('aria-busy')).toBe('true');

      host.status.set('scanned');
      fixture.detectChanges();
      expect(live.textContent?.trim()).toBe('Scanned');
      expect(el.getAttribute('aria-busy')).toBeNull();
    });

    it('localises every text through `labels`', () => {
      const { fixture, host, el } = setup();
      host.labels.set({
        qrCode: 'Codigo QR',
        expired: 'El codigo vencio',
        refresh: 'Actualizar',
      });
      host.status.set('expired');
      fixture.detectChanges();

      expect(
        el.querySelector('.andes-qr-code__message')?.textContent?.trim(),
      ).toBe('El codigo vencio');
      expect(el.querySelector('button')?.textContent?.trim()).toBe(
        'Actualizar',
      );
      expect(el.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe(
        'Codigo QR: https://andes.example/pay/42 (El codigo vencio)',
      );
    });
  });

  describe('status overlay', () => {
    it('shows no overlay while active', () => {
      const { el } = setup();
      expect(el.querySelector('.andes-qr-code__cover')).toBeNull();
      expect(el.getAttribute('data-state')).toBe('active');
    });

    it.each(['loading', 'expired', 'scanned'] as const)(
      'covers the code while %s',
      (status) => {
        const { fixture, host, el } = setup();
        host.status.set(status);
        fixture.detectChanges();

        expect(el.getAttribute('data-state')).toBe(status);
        expect(
          el
            .querySelector('.andes-qr-code__cover')
            ?.getAttribute('data-status'),
        ).toBe(status);
      },
    );

    it('shows a spinner while loading, with no text but the live announcement', () => {
      const { fixture, host, el } = setup();
      host.status.set('loading');
      fixture.detectChanges();

      expect(el.querySelector('.andes-qr-code__spinner')).not.toBeNull();
      expect(
        el
          .querySelector('.andes-qr-code__spinner')
          ?.getAttribute('aria-hidden'),
      ).toBe('true');
      expect(el.querySelector('button')).toBeNull();
    });

    it('emits `refresh` from the expired overlay button', () => {
      const { fixture, host, el } = setup();
      host.status.set('expired');
      fixture.detectChanges();

      expect(
        el.querySelector('.andes-qr-code__message')?.textContent?.trim(),
      ).toBe('QR code expired');
      (el.querySelector('button') as HTMLButtonElement).click();
      expect(host.refreshed).toBe(1);
    });

    it('shows the scanned confirmation without a refresh button', () => {
      const { fixture, host, el } = setup();
      host.status.set('scanned');
      fixture.detectChanges();

      expect(
        el.querySelector('.andes-qr-code__message')?.textContent?.trim(),
      ).toBe('Scanned');
      expect(el.querySelector('button')).toBeNull();
    });

    it('lets statusRender replace the content and exposes refresh()', () => {
      const { fixture, host, el } = setup();
      host.custom.set(true);
      host.status.set('expired');
      fixture.detectChanges();

      expect(el.querySelector('.custom-status')?.textContent?.trim()).toBe(
        'expired',
      );
      expect(el.querySelector('.andes-qr-code__refresh')).toBeNull();
      (el.querySelector('.custom-refresh') as HTMLButtonElement).click();
      expect(host.refreshed).toBe(1);
    });
  });

  describe('centre logo', () => {
    it('draws the logo in the middle and clears the modules under it', () => {
      const { fixture, host, el } = setup();
      const plainPath = el
        .querySelector('.andes-qr-code__modules')
        ?.getAttribute('d');

      host.icon.set(LOGO);
      host.iconSize.set(32);
      fixture.detectChanges();

      const image = el.querySelector('image') as SVGImageElement;
      expect(image.getAttribute('href')).toBe(LOGO);
      const side = Number(
        el.querySelector('svg')?.getAttribute('viewBox')?.split(' ')[2],
      );
      const x = Number(image.getAttribute('x'));
      const width = Number(image.getAttribute('width'));
      expect(x + width / 2).toBeCloseTo(side / 2);
      expect(
        el.querySelector('.andes-qr-code__modules')?.getAttribute('d'),
      ).not.toBe(plainPath);
    });

    it('defaults the logo to a fifth of the size and accepts { width, height }', () => {
      const { fixture, host, el } = setup();
      host.icon.set(LOGO);
      fixture.detectChanges();
      const view = el.querySelector('svg') as SVGElement;
      const side = Number(view.getAttribute('viewBox')?.split(' ')[2]);
      const image = el.querySelector('image') as SVGImageElement;
      expect(Number(image.getAttribute('width')) * (160 / side)).toBeCloseTo(
        32,
      );

      host.iconSize.set({ width: 48, height: 24 });
      fixture.detectChanges();
      const wide = el.querySelector('image') as SVGImageElement;
      expect(Number(wide.getAttribute('width'))).toBeGreaterThan(
        Number(wide.getAttribute('height')),
      );
    });

    it('raises the error correction level automatically when a logo is used', () => {
      const { fixture, host } = setup();
      host.errorLevel.set('L');
      host.boostLevel.set(false);
      fixture.detectChanges();
      expect(host.qr().effectiveErrorLevel()).toBe('L');

      host.icon.set(LOGO);
      host.iconSize.set(40);
      fixture.detectChanges();
      expect(['Q', 'H']).toContain(host.qr().effectiveErrorLevel());
    });
  });

  describe('canvas rendering', () => {
    let context: Canvas2dStub;

    beforeEach(() => {
      context = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        (() => context) as never,
      );
    });

    it('paints the modules onto a canvas sized for the device pixel ratio', async () => {
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 2,
        configurable: true,
      });
      const { fixture, host, el } = setup();
      host.type.set('canvas');
      await settle(fixture);

      const canvas = el.querySelector('canvas') as HTMLCanvasElement;
      expect(el.querySelector('svg')).toBeNull();
      expect(canvas.width).toBe(320);
      expect(canvas.height).toBe(320);
      expect(canvas.style.width).toBe('160px');
      expect(canvas.getAttribute('aria-hidden')).toBe('true');
      expect(context.fillRect.mock.calls.length).toBeGreaterThan(30);
      expect(el.getAttribute('data-type')).toBe('canvas');
      Object.defineProperty(window, 'devicePixelRatio', {
        value: 1,
        configurable: true,
      });
    });

    it('repaints when the value changes', async () => {
      const { fixture, host } = setup();
      host.type.set('canvas');
      await settle(fixture);
      context.fillRect.mockClear();

      host.value.set('a different payload');
      await settle(fixture);
      expect(context.fillRect).toHaveBeenCalled();
    });

    it('repaints with the new colours when the theme attribute flips', async () => {
      const { fixture, host } = setup();
      host.type.set('canvas');
      await settle(fixture);
      context.fillRect.mockClear();

      document.documentElement.setAttribute('data-andes-theme', 'dark');
      await new Promise((resolve) => setTimeout(resolve));
      await settle(fixture);
      document.documentElement.removeAttribute('data-andes-theme');
      expect(context.fillRect).toHaveBeenCalled();
    });

    it('draws a loaded logo on top of the modules', async () => {
      vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(
        function (this: HTMLImageElement) {
          Object.defineProperty(this, 'naturalWidth', { value: 64 });
          Object.defineProperty(this, 'naturalHeight', { value: 64 });
          queueMicrotask(() => this.onload?.(new Event('load')));
        },
      );
      const { fixture, host } = setup();
      host.type.set('canvas');
      host.icon.set(LOGO);
      await settle(fixture);
      await new Promise((resolve) => setTimeout(resolve));

      expect(context.drawImage).toHaveBeenCalledTimes(1);
    });

    it('keeps the code drawn when the logo fails to load', async () => {
      vi.spyOn(HTMLImageElement.prototype, 'src', 'set').mockImplementation(
        function (this: HTMLImageElement) {
          queueMicrotask(() => this.onerror?.(new Event('error')));
        },
      );
      const { fixture, host } = setup();
      host.type.set('canvas');
      host.icon.set(LOGO);
      await settle(fixture);
      await new Promise((resolve) => setTimeout(resolve));

      expect(context.fillRect).toHaveBeenCalled();
      expect(context.drawImage).not.toHaveBeenCalled();
    });
  });

  describe('exporting', () => {
    it('serialises a standalone SVG with concrete colours', () => {
      const { host } = setup();
      const svg = host.qr().toSvg({ color: '#112233', bgColor: '#ffffff' });

      expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(
        true,
      );
      expect(svg).toContain('rgb(17, 34, 51)');
      expect(svg).not.toContain('var(');
      expect(svg).toContain(
        'aria-label="QR code: https://andes.example/pay/42"',
      );
    });

    it('returns an SVG data URL and Blob without touching a canvas', async () => {
      const { host } = setup();
      const url = await host.qr().toDataUrl({ format: 'svg' });
      expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
      expect(decodeURIComponent(url.split(',')[1])).toContain('<svg');

      const blob = await host.qr().toBlob({ format: 'svg' });
      expect(blob.type).toBe('image/svg+xml');
      expect(blob.size).toBeGreaterThan(100);
    });

    it('renders PNG output on an offscreen canvas at the requested scale', async () => {
      const context = { fillStyle: '', fillRect: vi.fn(), drawImage: vi.fn() };
      vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
        (() => context) as never,
      );
      vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
        'data:image/png;base64,AAAA',
      );
      const toBlob = vi
        .spyOn(HTMLCanvasElement.prototype, 'toBlob')
        .mockImplementation(function (this: HTMLCanvasElement, callback) {
          callback(
            new Blob([`${this.width}x${this.height}`], { type: 'image/png' }),
          );
        });
      const { host } = setup();

      expect(await host.qr().toDataUrl()).toBe('data:image/png;base64,AAAA');
      const blob = await host.qr().toBlob({ scale: 3 });
      expect(blob.type).toBe('image/png');
      expect(await readBlob(blob)).toBe('480x480');
      expect(toBlob).toHaveBeenCalledWith(expect.any(Function), 'image/png');
      expect(context.fillRect).toHaveBeenCalled();
    });

    it('downloads through a temporary link and releases the object URL', async () => {
      const createObjectURL = vi.fn(() => 'blob:qr');
      const revokeObjectURL = vi.fn();
      Object.assign(URL, { createObjectURL, revokeObjectURL });
      const clicked: HTMLAnchorElement[] = [];
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
        function (this: HTMLAnchorElement) {
          clicked.push(this);
        },
      );
      const { host } = setup();

      await host.qr().download('invoice-42', { format: 'svg' });

      expect(clicked).toHaveLength(1);
      expect(clicked[0].download).toBe('invoice-42.svg');
      expect(clicked[0].getAttribute('href')).toBe('blob:qr');
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:qr');
      expect(document.body.contains(clicked[0])).toBe(false);
    });

    it('refuses to export when there is nothing to export', async () => {
      const { fixture, host } = setup();
      host.value.set('');
      fixture.detectChanges();

      expect(() => host.qr().toSvg()).toThrow('no value');
      await expect(host.qr().toBlob()).rejects.toThrow('no value');
    });
  });

  describe('stylesheet contract', () => {
    const css = readFileSync(
      join(process.cwd(), 'packages/ui/src/lib/qr-code/qr-code.css'),
      'utf8',
    ).replace(/\s+/g, ' ');

    it('takes its colours from the theme tokens, overridable through two hooks', () => {
      expect(css).toContain(
        '--_andes-qr-code-color: var( --andes-qr-code-color, var(--andes-color-foreground, #0f172a) )',
      );
      expect(css).toContain(
        '--_andes-qr-code-bg: var( --andes-qr-code-bg, var(--andes-color-background, #ffffff) )',
      );
    });

    it('turns every animation off for reduced motion', () => {
      const block = css.slice(css.indexOf('prefers-reduced-motion'));
      expect(block).toContain('.andes-qr-code__cover');
      expect(block).toContain('.andes-qr-code__spinner');
      expect(block).toContain('animation: none');
    });

    it('uses logical properties and a visible keyboard focus ring on the refresh button', () => {
      expect(css).toContain(
        'padding-inline: var(--andes-control-padding-x-md, 0.75rem)',
      );
      expect(css).toContain(
        '.andes-qr-code__refresh:focus-visible { outline: 2px solid var(--andes-color-focus-ring, #2563eb)',
      );
    });
  });
});
