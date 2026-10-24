import { DOCUMENT, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  numberAttribute,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import clsx from 'clsx';

import type { QrErrorLevel, QrMatrix } from './qr-encoder';
import {
  drawQrToCanvas,
  encodeQrForLayout,
  QR_MAX_ICON_COVERAGE,
  QrIconSpec,
  QrLayout,
  qrSvgMarkup,
} from './qr-render';

export type AndesQrCodeType = 'svg' | 'canvas';
export type AndesQrCodeStatus = 'active' | 'loading' | 'expired' | 'scanned';

/** `{ width, height }` in pixels, for a logo that is not square. */
export interface AndesQrCodeIconSize {
  readonly width: number;
  readonly height: number;
}

/** What a `statusRender` template receives. */
export interface AndesQrCodeStatusContext {
  readonly $implicit: AndesQrCodeStatus;
  readonly status: AndesQrCodeStatus;
  /** Emits the component's `refresh` output. */
  readonly refresh: () => void;
}

/** Texts the component writes itself; override any of them to localise. */
export interface AndesQrCodeLabels {
  /** Accessible name prefix, and the whole name when there is no value. */
  readonly qrCode: string;
  readonly loading: string;
  readonly expired: string;
  readonly refresh: string;
  readonly scanned: string;
}

export interface AndesQrCodeExportOptions {
  /** Default `png`. */
  readonly format?: 'png' | 'svg';
  /** Pixel-density multiplier of the exported image. Default 2. Ignored for `svg`. */
  readonly scale?: number;
  /** Any CSS colour; defaults to the colours currently displayed. */
  readonly color?: string;
  readonly bgColor?: string;
}

const DEFAULT_LABELS: AndesQrCodeLabels = {
  qrCode: 'QR code',
  loading: 'Loading',
  expired: 'QR code expired',
  refresh: 'Refresh',
  scanned: 'Scanned',
};

const DEFAULT_COLOR = 'var(--andes-color-foreground, #0f172a)';
const DEFAULT_BG_COLOR = 'var(--andes-color-background, #ffffff)';

/** The accessible name carries at most this much of the encoded value. */
const NAME_VALUE_LIMIT = 100;

/**
 * Resolves any CSS colour (including `var()` and `color-mix()`) to the browser's computed
 * `rgb(...)` string, by letting a throw-away element inherit from `host`.
 */
function resolveColor(doc: Document, host: Element, value: string): string {
  const probe = doc.createElement('span');
  probe.style.color = value;
  probe.style.display = 'none';
  host.appendChild(probe);
  const computed = doc.defaultView?.getComputedStyle(probe).color ?? '';
  probe.remove();
  return computed || value;
}

function loadImage(doc: Document, src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = doc.createElement('img');
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('The QR code icon could not be loaded.'));
    image.src = src;
  });
}

/**
 * A QR code drawn from `value` with no runtime dependency: the encoder lives in
 * `qr-encoder.ts`. Renders crisp, path-based inline SVG or a canvas, follows the theme through
 * the foreground / background tokens, can carry a centre logo (raising the error correction
 * level as the logo needs), and shows an overlay for the `loading`, `expired` and `scanned`
 * states of a login or payment flow.
 *
 * Accessibility: the symbol is `role="img"` with a name built from `aria-label` (or the
 * default `QR code: <value>`) and the current status; the refresh control is a real button
 * outside the image, and status changes are announced through a polite live region.
 */
@Component({
  selector: 'andes-qr-code',
  exportAs: 'andesQrCode',
  imports: [NgTemplateOutlet],
  templateUrl: './qr-code.html',
  styleUrl: './qr-code.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-slot]': '"qr-code"',
    '[attr.data-state]': 'status()',
    '[attr.data-type]': 'type()',
    '[attr.aria-busy]': 'status() === "loading" ? "true" : null',
    '[attr.data-icon-oversized]': 'iconOversized() ? "" : null',
    // The name lives on the inner image so the refresh button is not swallowed by it.
    '[attr.aria-label]': 'null',
    '[style.--andes-qr-code-color]': 'color() ?? null',
    '[style.--andes-qr-code-bg]': 'bgColor() ?? null',
  },
})
export class AndesQrCode {
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly canvas = viewChild<ElementRef<HTMLCanvasElement>>('canvas');

  /** The text to encode (a URL, a payment payload...). Empty draws nothing. */
  readonly value = input('');
  readonly type = input<AndesQrCodeType>('svg');
  /** Side of the graphic in CSS pixels, quiet zone included. */
  readonly size = input(160, { transform: numberAttribute });
  /** Module colour: any CSS colour, `var(--token)` included. Default: the foreground token. */
  readonly color = input<string | undefined>(undefined);
  /** Background colour. Default: the background token. */
  readonly bgColor = input<string | undefined>(undefined);
  /** Draws a border and padding around the symbol. */
  readonly bordered = input(true, { transform: booleanAttribute });
  /** Requested error correction level; a logo or `boostLevel` may raise it. */
  readonly errorLevel = input<QrErrorLevel>('M');
  /** Raise the level when it does not make the symbol bigger. */
  readonly boostLevel = input(true, { transform: booleanAttribute });
  /** Empty modules around the symbol, in modules. The specification asks for 4. */
  readonly quietZone = input(2, { transform: numberAttribute });
  /** URL or data URI of a logo drawn over the centre. */
  readonly icon = input<string | undefined>(undefined);
  /** Logo size in pixels (a number, or `{ width, height }`). Default: 20 % of `size`. */
  readonly iconSize = input<number | AndesQrCodeIconSize | undefined>(
    undefined,
  );
  /** Leave a clear margin of one module around the logo. */
  readonly iconBordered = input(true, { transform: booleanAttribute });
  readonly status = input<AndesQrCodeStatus>('active');
  /** Replaces the default content of the status overlay. */
  readonly statusRender = input<
    TemplateRef<AndesQrCodeStatusContext> | undefined
  >(undefined);
  readonly labels = input<Partial<AndesQrCodeLabels> | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });

  /** Emits when the user activates the refresh control of the `expired` overlay. */
  readonly refresh = output<void>();

  private readonly themeVersion = signal(0);
  /** Bumped per canvas paint so a slow logo load cannot overwrite a newer paint. */
  private paintToken = 0;

  protected readonly resolvedLabels = computed<AndesQrCodeLabels>(() => ({
    ...DEFAULT_LABELS,
    ...this.labels(),
  }));

  protected readonly pixelSize = computed(() => Math.max(1, this.size()));

  private readonly iconSpec = computed<QrIconSpec | null>(() => {
    const src = this.icon();
    if (!src) {
      return null;
    }
    const requested = this.iconSize();
    const fallback = Math.max(1, Math.round(this.pixelSize() * 0.2));
    const width =
      typeof requested === 'object' ? requested.width : (requested ?? fallback);
    const height =
      typeof requested === 'object'
        ? requested.height
        : (requested ?? fallback);
    return { src, width, height, bordered: this.iconBordered() };
  });

  private readonly encoded = computed<{
    matrix: QrMatrix;
    layout: QrLayout;
  } | null>(() => {
    const value = this.value();
    if (!value) {
      return null;
    }
    try {
      return encodeQrForLayout(value, {
        errorLevel: this.errorLevel(),
        boostErrorLevel: this.boostLevel(),
        size: this.pixelSize(),
        quietZone: this.quietZone(),
        icon: this.iconSpec(),
      });
    } catch {
      return null;
    }
  });

  /** The encoded matrix, or `null` when there is no value or it is too long to encode. */
  readonly matrix = computed(() => this.encoded()?.matrix ?? null);

  /** The error correction level actually used (after logo and boost adjustments). */
  readonly effectiveErrorLevel = computed(
    () => this.encoded()?.matrix.errorLevel ?? null,
  );

  /** `true` when `value` is set but cannot be encoded (too long for version 40). */
  readonly overflow = computed(
    () => this.value() !== '' && this.encoded() === null,
  );

  protected readonly layout = computed(() => this.encoded()?.layout ?? null);

  /**
   * `true` when the logo covers more of the symbol than even level H can recover. Such a
   * code may not scan; shrink `iconSize` or drop `iconBordered`.
   */
  readonly iconOversized = computed(
    () => (this.layout()?.coverage ?? 0) > QR_MAX_ICON_COVERAGE,
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-qr-code',
      this.bordered() ? 'andes-qr-code--bordered' : 'andes-qr-code--borderless',
    ),
  );

  private readonly statusText = computed(() => {
    const labels = this.resolvedLabels();
    switch (this.status()) {
      case 'loading':
        return labels.loading;
      case 'expired':
        return labels.expired;
      case 'scanned':
        return labels.scanned;
      default:
        return '';
    }
  });

  protected readonly accessibleName = computed(() => {
    const labels = this.resolvedLabels();
    const value = this.value();
    const shown =
      value.length > NAME_VALUE_LIMIT
        ? `${value.slice(0, NAME_VALUE_LIMIT)}...`
        : value;
    const base =
      this.ariaLabel() ??
      (shown ? `${labels.qrCode}: ${shown}` : labels.qrCode);
    const status = this.statusText();
    return status ? `${base} (${status})` : base;
  });

  /** Text for the polite live region; empty while the code is active. */
  protected readonly liveMessage = this.statusText;

  protected readonly statusContext = computed<AndesQrCodeStatusContext>(() => ({
    $implicit: this.status(),
    status: this.status(),
    refresh: () => this.refresh.emit(),
  }));

  constructor() {
    afterRenderEffect({
      write: () => {
        this.themeVersion();
        this.color();
        this.bgColor();
        const canvas = this.canvas()?.nativeElement;
        const encoded = this.encoded();
        if (this.type() !== 'canvas' || !canvas || !encoded) {
          return;
        }
        void this.paintCanvas(canvas, encoded);
      },
    });

    // The canvas holds resolved colours, so it has to repaint when the theme flips; the SVG
    // follows the custom properties by itself.
    afterNextRender(() => {
      const view = this.document.defaultView;
      const root = this.document.documentElement;
      if (!view || typeof view.MutationObserver !== 'function') {
        return;
      }
      const observer = new view.MutationObserver(() =>
        this.themeVersion.update((version) => version + 1),
      );
      observer.observe(root, {
        attributes: true,
        attributeFilter: ['class', 'style', 'data-andes-theme'],
      });
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected onRefresh(): void {
    this.refresh.emit();
  }

  /** Repaints the canvas, e.g. after a theme change this component cannot observe. */
  redraw(): void {
    this.themeVersion.update((version) => version + 1);
  }

  /** A self-contained SVG document (concrete colours) of the current code. */
  toSvg(
    options: Pick<AndesQrCodeExportOptions, 'color' | 'bgColor'> = {},
  ): string {
    const encoded = this.requireEncoded();
    const colors = this.exportColors(options);
    return qrSvgMarkup(encoded.layout, {
      size: this.pixelSize(),
      quietZone: this.quietZone(),
      icon: this.iconSpec(),
      title: this.accessibleName(),
      ...colors,
    });
  }

  /** The code as a `data:` URL (PNG by default). */
  async toDataUrl(options: AndesQrCodeExportOptions = {}): Promise<string> {
    if (options.format === 'svg') {
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(this.toSvg(options))}`;
    }
    return (await this.renderCanvas(options)).toDataURL('image/png');
  }

  /** The code as an image `Blob` (PNG by default). */
  async toBlob(options: AndesQrCodeExportOptions = {}): Promise<Blob> {
    if (options.format === 'svg') {
      return new Blob([this.toSvg(options)], { type: 'image/svg+xml' });
    }
    const canvas = await this.renderCanvas(options);
    return new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob
            ? resolve(blob)
            : reject(new Error('The PNG could not be created.')),
        'image/png',
      ),
    );
  }

  /** Saves the code as `<filename>.png` (or `.svg`) through the browser's download flow. */
  async download(
    filename = 'qr-code',
    options: AndesQrCodeExportOptions = {},
  ): Promise<void> {
    const blob = await this.toBlob(options);
    const view = this.document.defaultView;
    const url = view?.URL.createObjectURL(blob);
    if (!view || !url) {
      throw new Error('Downloads are not available in this environment.');
    }
    const link = this.document.createElement('a');
    link.href = url;
    link.download = `${filename}.${options.format === 'svg' ? 'svg' : 'png'}`;
    link.rel = 'noopener';
    this.document.body.appendChild(link);
    link.click();
    link.remove();
    view.URL.revokeObjectURL(url);
  }

  private requireEncoded(): { matrix: QrMatrix; layout: QrLayout } {
    const encoded = this.encoded();
    if (!encoded) {
      throw new Error(
        this.overflow()
          ? 'The value is too long to encode as a QR code.'
          : 'There is no value to export.',
      );
    }
    return encoded;
  }

  private displayedColors(): { color: string; bgColor: string } {
    const host = this.host.nativeElement;
    const frame = host.firstElementChild ?? host;
    const style = this.document.defaultView?.getComputedStyle(frame);
    const color = style?.getPropertyValue('--_andes-qr-code-color').trim();
    const bgColor = style?.getPropertyValue('--_andes-qr-code-bg').trim();
    return {
      color: resolveColor(this.document, frame, color || DEFAULT_COLOR),
      bgColor: resolveColor(this.document, frame, bgColor || DEFAULT_BG_COLOR),
    };
  }

  private exportColors(
    options: Pick<AndesQrCodeExportOptions, 'color' | 'bgColor'>,
  ): { color: string; bgColor: string } {
    const displayed = this.displayedColors();
    const frame = this.host.nativeElement;
    return {
      color: options.color
        ? resolveColor(this.document, frame, options.color)
        : displayed.color,
      bgColor: options.bgColor
        ? resolveColor(this.document, frame, options.bgColor)
        : displayed.bgColor,
    };
  }

  private async renderCanvas(
    options: AndesQrCodeExportOptions,
  ): Promise<HTMLCanvasElement> {
    const encoded = this.requireEncoded();
    const canvas = this.document.createElement('canvas');
    await this.draw(canvas, encoded, Math.max(1, options.scale ?? 2), options);
    return canvas;
  }

  private async paintCanvas(
    canvas: HTMLCanvasElement,
    encoded: { matrix: QrMatrix; layout: QrLayout },
  ): Promise<void> {
    const ratio = this.document.defaultView?.devicePixelRatio || 1;
    const token = ++this.paintToken;
    try {
      await this.draw(
        canvas,
        encoded,
        ratio,
        {},
        () => token === this.paintToken,
      );
    } catch {
      // A logo that fails to load must not blank the code; draw() already painted the
      // modules before awaiting the image.
    }
  }

  /**
   * Paints the modules synchronously, then (when there is a logo) waits for it and paints
   * again with the logo on top. The first paint means the code is never blank while a logo
   * loads; `isCurrent` lets a newer paint cancel the second step of an older one.
   */
  private async draw(
    canvas: HTMLCanvasElement,
    encoded: { matrix: QrMatrix; layout: QrLayout },
    scale: number,
    colorOptions: Pick<AndesQrCodeExportOptions, 'color' | 'bgColor'>,
    isCurrent: () => boolean = () => true,
  ): Promise<void> {
    const pixels = Math.max(1, Math.round(this.pixelSize() * scale));
    canvas.width = pixels;
    canvas.height = pixels;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('A 2D canvas context is not available.');
    }
    const colors = this.exportColors(colorOptions);
    const base = {
      ...colors,
      pixels,
      quietZone: Math.max(0, Math.floor(this.quietZone())),
    };
    drawQrToCanvas(context, encoded.matrix, encoded.layout, base);
    const src = this.iconSpec()?.src;
    if (!src) {
      return;
    }
    const image = await loadImage(this.document, src);
    if (!isCurrent()) {
      return;
    }
    drawQrToCanvas(context, encoded.matrix, encoded.layout, {
      ...base,
      image,
      imageSize: { width: image.naturalWidth, height: image.naturalHeight },
    });
  }
}
