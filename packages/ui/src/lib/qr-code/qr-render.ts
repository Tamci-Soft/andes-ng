/**
 * Pure rendering helpers for a `QrMatrix`: the SVG path and layout shared by the component's
 * template, a standalone SVG serialiser, and a canvas painter. Nothing here touches the DOM
 * except `drawQrToCanvas`, which only calls the 2D context it is given.
 */
import {
  encodeQr,
  QrEncodeOptions,
  QrErrorLevel,
  QrMatrix,
  raiseQrErrorLevel,
} from './qr-encoder';

/** A rectangle in module units (one unit = one QR module), origin top-left of the symbol. */
export interface QrRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A logo drawn over the centre of the symbol. */
export interface QrIconSpec {
  readonly src: string;
  /** Drawn size in CSS pixels. */
  readonly width: number;
  readonly height: number;
  /**
   * `true` leaves a clear margin of one module around the logo (a knockout halo); `false`
   * clears only the modules the logo itself sits on.
   */
  readonly bordered: boolean;
}

export interface QrLayoutOptions {
  /** Side of the whole graphic, quiet zone included, in CSS pixels. */
  readonly size: number;
  /** Empty modules around the symbol. */
  readonly quietZone: number;
  readonly icon?: QrIconSpec | null;
}

export interface QrLayout {
  /** Modules per side of the whole graphic: symbol plus both quiet zones. */
  readonly modules: number;
  /** CSS pixels per module. */
  readonly moduleSize: number;
  /** SVG path data (module units, quiet zone offset applied) of every dark module. */
  readonly path: string;
  /** The module-aligned clear area behind the logo, or `null` without one. */
  readonly knockout: QrRect | null;
  /** Where the logo is drawn, in module units, or `null` without one. */
  readonly icon: QrRect | null;
  /** Fraction (0-1) of the symbol's area cleared for the logo. */
  readonly coverage: number;
}

export interface QrColors {
  readonly color: string;
  readonly bgColor: string;
}

/** Logo-area cap: past this the symbol cannot be recovered even at level H. */
export const QR_MAX_ICON_COVERAGE = 0.15;

/**
 * Centres a module-aligned knockout over the symbol. The count of cleared modules per axis
 * gets the same parity as the symbol so the cleared block is exactly centred on the grid.
 */
function knockoutFor(
  symbolSize: number,
  quietZone: number,
  icon: QrIconSpec,
  moduleSize: number,
): { knockout: QrRect; drawn: QrRect } {
  const halo = icon.bordered ? 1 : 0;
  const span = (pixels: number) => {
    let count = Math.ceil(pixels / moduleSize + halo * 2 - 1e-9);
    if ((count - symbolSize) % 2 !== 0) {
      count++;
    }
    return Math.max(1, Math.min(count, symbolSize));
  };
  const columns = span(icon.width);
  const rows = span(icon.height);
  const centre = quietZone + symbolSize / 2;
  const iconWidth = icon.width / moduleSize;
  const iconHeight = icon.height / moduleSize;
  return {
    knockout: {
      x: quietZone + (symbolSize - columns) / 2,
      y: quietZone + (symbolSize - rows) / 2,
      width: columns,
      height: rows,
    },
    drawn: {
      x: centre - iconWidth / 2,
      y: centre - iconHeight / 2,
      width: iconWidth,
      height: iconHeight,
    },
  };
}

function inside(rect: QrRect | null, x: number, y: number): boolean {
  return (
    rect !== null &&
    x >= rect.x &&
    x < rect.x + rect.width &&
    y >= rect.y &&
    y < rect.y + rect.height
  );
}

/** Dark runs per row as `[x, y, length]`, skipping modules cleared by `knockout`. */
function darkRuns(
  matrix: QrMatrix,
  quietZone: number,
  knockout: QrRect | null,
): [number, number, number][] {
  const runs: [number, number, number][] = [];
  for (let y = 0; y < matrix.size; y++) {
    let start = -1;
    for (let x = 0; x <= matrix.size; x++) {
      const dark =
        x < matrix.size &&
        matrix.modules[y][x] &&
        !inside(knockout, x + quietZone, y + quietZone);
      if (dark && start < 0) {
        start = x;
      } else if (!dark && start >= 0) {
        runs.push([start + quietZone, y + quietZone, x - start]);
        start = -1;
      }
    }
  }
  return runs;
}

/** Everything needed to paint `matrix` at `options.size`. */
export function buildQrLayout(
  matrix: QrMatrix,
  options: QrLayoutOptions,
): QrLayout {
  const quietZone = Math.max(0, Math.floor(options.quietZone));
  const modules = matrix.size + quietZone * 2;
  const moduleSize = options.size / modules;
  let knockout: QrRect | null = null;
  let icon: QrRect | null = null;
  if (options.icon) {
    const placed = knockoutFor(
      matrix.size,
      quietZone,
      options.icon,
      moduleSize,
    );
    knockout = placed.knockout;
    icon = placed.drawn;
  }
  const path = darkRuns(matrix, quietZone, knockout)
    .map(([x, y, length]) => `M${x} ${y}h${length}v1h-${length}z`)
    .join('');
  const coverage = knockout
    ? (knockout.width * knockout.height) / (matrix.size * matrix.size)
    : 0;
  return { modules, moduleSize, path, knockout, icon, coverage };
}

export interface QrIconEncodeOptions extends QrEncodeOptions {
  readonly size: number;
  readonly quietZone: number;
  readonly icon?: QrIconSpec | null;
}

/**
 * Encodes `text`, raising the error correction level as far as the logo needs (see
 * `raiseQrErrorLevel`). The level and the symbol size depend on each other - a higher level
 * can grow the symbol, which shrinks the logo's share - so this settles by re-encoding until
 * the level stops rising (at most the three steps from L to H).
 */
export function encodeQrForLayout(
  text: string,
  options: QrIconEncodeOptions,
): { matrix: QrMatrix; layout: QrLayout } {
  let level: QrErrorLevel = options.errorLevel ?? 'M';
  const layoutOptions: QrLayoutOptions = {
    size: options.size,
    quietZone: options.quietZone,
    icon: options.icon,
  };
  // Levels only ever rise, so this runs at most once per level.
  for (;;) {
    const matrix = encodeQr(text, { ...options, errorLevel: level });
    const layout = buildQrLayout(matrix, layoutOptions);
    const needed = raiseQrErrorLevel(matrix.errorLevel, layout.coverage);
    if (needed === matrix.errorLevel) {
      return { matrix, layout };
    }
    level = needed;
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** A self-contained SVG document: concrete colours only, no CSS or custom properties. */
export function qrSvgMarkup(
  layout: QrLayout,
  options: QrLayoutOptions & QrColors & { readonly title?: string },
): string {
  const side = layout.modules;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" width="${options.size}" height="${options.size}" shape-rendering="crispEdges" role="img"${
      options.title ? ` aria-label="${escapeXml(options.title)}"` : ''
    }>`,
  ];
  if (options.title) {
    parts.push(`<title>${escapeXml(options.title)}</title>`);
  }
  parts.push(
    `<rect width="${side}" height="${side}" fill="${escapeXml(options.bgColor)}"/>`,
    `<path d="${layout.path}" fill="${escapeXml(options.color)}"/>`,
  );
  if (layout.icon && options.icon) {
    const { x, y, width, height } = layout.icon;
    parts.push(
      `<image href="${escapeXml(options.icon.src)}" x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"/>`,
    );
  }
  parts.push('</svg>');
  return parts.join('');
}

/** The subset of the 2D context the painter uses; lets tests pass a recording stub. */
export type QrCanvasContext = Pick<
  CanvasRenderingContext2D,
  'fillStyle' | 'fillRect' | 'drawImage'
>;

/**
 * Paints the symbol onto a canvas context whose backing store is `pixels` wide and tall.
 * Module edges are snapped to whole pixels so neighbouring modules never leave hairline gaps.
 *
 * @param image A loaded logo, drawn contained inside `layout.icon`.
 */
export function drawQrToCanvas(
  context: QrCanvasContext,
  matrix: QrMatrix,
  layout: QrLayout,
  options: QrColors & {
    readonly pixels: number;
    readonly quietZone: number;
    readonly image?: CanvasImageSource | null;
    readonly imageSize?: { width: number; height: number } | null;
  },
): void {
  const scale = options.pixels / layout.modules;
  const snap = (value: number) => Math.round(value * scale);
  context.fillStyle = options.bgColor;
  context.fillRect(0, 0, options.pixels, options.pixels);
  context.fillStyle = options.color;
  for (let y = 0; y < matrix.size; y++) {
    let start = -1;
    for (let x = 0; x <= matrix.size; x++) {
      const dark =
        x < matrix.size &&
        matrix.modules[y][x] &&
        !inside(layout.knockout, x + options.quietZone, y + options.quietZone);
      if (dark && start < 0) {
        start = x;
      } else if (!dark && start >= 0) {
        const left = snap(start + options.quietZone);
        const top = snap(y + options.quietZone);
        context.fillRect(
          left,
          top,
          snap(x + options.quietZone) - left,
          snap(y + options.quietZone + 1) - top,
        );
        start = -1;
      }
    }
  }
  if (options.image && layout.icon) {
    const target = layout.icon;
    const natural = options.imageSize;
    let { x, y, width, height } = target;
    if (natural && natural.width > 0 && natural.height > 0) {
      const ratio = Math.min(width / natural.width, height / natural.height);
      const fitted = {
        width: natural.width * ratio,
        height: natural.height * ratio,
      };
      x += (width - fitted.width) / 2;
      y += (height - fitted.height) / 2;
      width = fitted.width;
      height = fitted.height;
    }
    context.drawImage(
      options.image,
      x * scale,
      y * scale,
      width * scale,
      height * scale,
    );
  }
}
