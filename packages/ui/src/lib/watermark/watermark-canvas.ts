/**
 * Draws one repeating watermark tile on a canvas and returns it as a data URL. Shared by the
 * component, the inheriting directive and anyone who needs the picture itself (printing,
 * exports, a custom overlay).
 */

export interface AndesWatermarkFont {
  /** Size in pixels. Default 16. */
  size?: number;
  weight?: number | string;
  /** Any canvas colour. Defaults to the theme foreground at low opacity. */
  color?: string;
  /** Defaults to the surrounding font. */
  family?: string;
  style?: 'normal' | 'italic' | 'oblique';
}

export interface AndesWatermarkOptions {
  /** One line, or several lines drawn on top of each other. */
  content?: string | readonly string[];
  /** URL of an image to repeat instead of text. */
  image?: string;
  font?: AndesWatermarkFont;
  /** Rotation in degrees. Default -22. */
  rotate?: number;
  /** Space between marks, `[horizontal, vertical]` in pixels. Default `[100, 100]`. */
  gap?: readonly [number, number];
  /** Shifts the pattern from the top-start corner, `[x, y]` in pixels. */
  offset?: readonly [number, number];
  /** Mark width in pixels; measured from the text when omitted. */
  width?: number;
  /** Mark height in pixels; derived from the number of lines when omitted. */
  height?: number;
}

export interface AndesWatermarkEnvironment {
  document?: Document;
  /** Device pixel ratio the canvas is drawn at. Defaults to `window.devicePixelRatio`. */
  pixelRatio?: number;
  /** Colour used when `font.color` is not set (the theme foreground). */
  foreground?: string;
  /** Font family used when `font.family` is not set. */
  fontFamily?: string;
}

export interface AndesWatermarkTile {
  url: string;
  /** Width of the repeating pattern, in CSS pixels. */
  width: number;
  /** Height of the repeating pattern, in CSS pixels. */
  height: number;
}

export const ANDES_WATERMARK_DEFAULT_ROTATE = -22;
export const ANDES_WATERMARK_DEFAULT_GAP: readonly [number, number] = [
  100, 100,
];
/** Opacity of the default (theme) colour: visible, never in the way. */
export const ANDES_WATERMARK_DEFAULT_ALPHA = 0.15;
const DEFAULT_FONT_SIZE = 16;
const LINE_HEIGHT_RATIO = 1.4;
const DEFAULT_IMAGE_WIDTH = 120;

export function andesWatermarkLines(
  content: string | readonly string[] | undefined,
): string[] {
  if (content === undefined) {
    return [];
  }
  return (typeof content === 'string' ? [content] : [...content]).filter(
    (line) => line.length > 0,
  );
}

/**
 * Renders the tile. Resolves to `null` when there is nothing to draw or no canvas is
 * available (server rendering). The pattern holds two staggered marks, so rows interleave.
 */
export async function andesWatermarkTile(
  options: AndesWatermarkOptions,
  environment: AndesWatermarkEnvironment = {},
): Promise<AndesWatermarkTile | null> {
  const doc =
    environment.document ??
    (typeof document === 'undefined' ? undefined : document);
  if (!doc) {
    return null;
  }
  const lines = andesWatermarkLines(options.content);
  if (!options.image && lines.length === 0) {
    return null;
  }
  const canvas = doc.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  const ratio =
    environment.pixelRatio ?? doc.defaultView?.devicePixelRatio ?? 1;
  const [gapX, gapY] = options.gap ?? ANDES_WATERMARK_DEFAULT_GAP;
  const font = options.font ?? {};
  const size = font.size ?? DEFAULT_FONT_SIZE;
  const lineHeight = Math.round(size * LINE_HEIGHT_RATIO);

  let image: HTMLImageElement | null = null;
  let markWidth: number;
  let markHeight: number;

  if (options.image) {
    image = await loadImage(doc, options.image);
    if (!image) {
      return null;
    }
    const naturalRatio =
      image.naturalWidth && image.naturalHeight
        ? image.naturalWidth / image.naturalHeight
        : 120 / 64;
    markWidth =
      options.width ??
      (options.height ? options.height * naturalRatio : DEFAULT_IMAGE_WIDTH);
    markHeight = options.height ?? markWidth / naturalRatio;
  } else {
    context.font = fontShorthand(font, size, environment.fontFamily);
    const measured = Math.max(
      ...lines.map((line) => context.measureText(line).width),
    );
    markWidth = options.width ?? Math.ceil(measured);
    markHeight = options.height ?? lines.length * lineHeight;
  }

  const cellWidth = markWidth + gapX;
  const cellHeight = markHeight + gapY;
  const tileWidth = cellWidth * 2;
  const tileHeight = cellHeight * 2;
  canvas.width = Math.ceil(tileWidth * ratio);
  canvas.height = Math.ceil(tileHeight * ratio);

  // Resizing a canvas resets its state, so the context is configured after sizing.
  context.scale(ratio, ratio);
  const rotation =
    ((options.rotate ?? ANDES_WATERMARK_DEFAULT_ROTATE) * Math.PI) / 180;
  const centres: [number, number][] = [
    [cellWidth / 2, cellHeight / 2],
    [cellWidth + cellWidth / 2, cellHeight + cellHeight / 2],
  ];

  for (const [x, y] of centres) {
    context.save();
    context.translate(x, y);
    context.rotate(rotation);
    if (image) {
      context.globalAlpha = 1;
      context.drawImage(
        image,
        -markWidth / 2,
        -markHeight / 2,
        markWidth,
        markHeight,
      );
    } else {
      context.font = fontShorthand(font, size, environment.fontFamily);
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      if (font.color) {
        context.fillStyle = font.color;
        context.globalAlpha = 1;
      } else {
        context.fillStyle = environment.foreground || '#000000';
        context.globalAlpha = ANDES_WATERMARK_DEFAULT_ALPHA;
      }
      lines.forEach((line, i) => {
        context.fillText(line, 0, (i - (lines.length - 1) / 2) * lineHeight);
      });
    }
    context.restore();
  }

  return { url: canvas.toDataURL(), width: tileWidth, height: tileHeight };
}

/** The tile as a data URL, for reuse outside the component. */
export async function andesWatermarkDataUrl(
  options: AndesWatermarkOptions,
  environment?: AndesWatermarkEnvironment,
): Promise<string | null> {
  return (await andesWatermarkTile(options, environment))?.url ?? null;
}

function fontShorthand(
  font: AndesWatermarkFont,
  size: number,
  fallbackFamily?: string,
): string {
  const family = font.family || fallbackFamily || 'sans-serif';
  return `${font.style ?? 'normal'} ${font.weight ?? 'normal'} ${size}px ${family}`;
}

function loadImage(
  doc: Document,
  src: string,
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const view = doc.defaultView;
    const ImageCtor =
      view?.Image ?? (typeof Image === 'undefined' ? undefined : Image);
    if (!ImageCtor) {
      resolve(null);
      return;
    }
    const image = new ImageCtor();
    // Canvases drawn from a cross-origin image without this cannot be exported.
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}
