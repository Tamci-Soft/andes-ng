import type {
  AndesCaptionColor,
  AndesCaptionEdge,
  AndesCaptionFont,
  AndesCaptionOpacity,
  AndesCaptionSize,
  AndesCaptionStyle,
} from './player-types';

/** No viewer choice: every field keeps the theme's value. */
export const ANDES_CAPTION_STYLE_DEFAULT: AndesCaptionStyle = {
  size: null,
  color: null,
  background: null,
  backgroundOpacity: null,
  edge: null,
  font: null,
};

export const ANDES_CAPTION_SIZES: readonly AndesCaptionSize[] = [
  50, 75, 100, 150, 200,
];
export const ANDES_CAPTION_COLORS: readonly AndesCaptionColor[] = [
  'white',
  'yellow',
  'green',
  'cyan',
  'blue',
  'magenta',
  'red',
  'black',
];
export const ANDES_CAPTION_EDGES: readonly AndesCaptionEdge[] = [
  'none',
  'shadow',
  'raised',
  'depressed',
  'outline',
];
export const ANDES_CAPTION_FONTS: readonly AndesCaptionFont[] = [
  'default',
  'sans-serif',
  'serif',
  'monospace',
];
export const ANDES_CAPTION_OPACITIES: readonly AndesCaptionOpacity[] = [
  0, 25, 50, 75, 100,
];

/**
 * Fixed values for the named colours. Captions sit on any picture, so these are the saturated
 * broadcast colours viewers know from television caption settings, not theme tokens.
 */
const COLOR_VALUES: Readonly<Record<AndesCaptionColor, string>> = {
  white: '#ffffff',
  yellow: '#ffff00',
  green: '#00ff00',
  cyan: '#00ffff',
  blue: '#0000ff',
  magenta: '#ff00ff',
  red: '#ff0000',
  black: '#000000',
};

const EDGE_SHADOWS: Readonly<Record<AndesCaptionEdge, string>> = {
  none: 'none',
  shadow: '0.06em 0.06em 0.12em rgb(0 0 0 / 0.9)',
  raised: '-0.04em -0.04em 0 rgb(255 255 255 / 0.5), 0.05em 0.05em 0 #000',
  depressed: '0.04em 0.04em 0 rgb(255 255 255 / 0.5), -0.05em -0.05em 0 #000',
  outline:
    '0 0 0.06em #000, 0.05em 0 0 #000, -0.05em 0 0 #000, 0 0.05em 0 #000, 0 -0.05em 0 #000',
};

const FONT_STACKS: Readonly<Record<AndesCaptionFont, string | null>> = {
  default: null,
  'sans-serif': 'system-ui, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  monospace: 'ui-monospace, Menlo, Consolas, monospace',
};

/** The CSS colour of a named caption colour. */
export function captionColorValue(color: AndesCaptionColor): string {
  return COLOR_VALUES[color];
}

/**
 * The `--andes-video-captions-*` overrides for a style; fields left `null` produce no variable,
 * so the stylesheet (and the app's theme) decides them. Applied on the player root, they style
 * the overlay and, through `::cue`, the browser's own caption renderer.
 */
export function captionStyleVariables(
  style: AndesCaptionStyle,
): Record<string, string | null> {
  const opacity = style.backgroundOpacity;
  let background: string | null = null;
  if (style.background !== null || opacity !== null) {
    const base = COLOR_VALUES[style.background ?? 'black'];
    const percent = opacity ?? 75;
    background =
      percent === 100
        ? base
        : `color-mix(in srgb, ${base} ${percent}%, transparent)`;
  }
  return {
    '--andes-video-captions-scale':
      style.size === null ? null : String(style.size / 100),
    '--andes-video-captions-color':
      style.color === null ? null : COLOR_VALUES[style.color],
    '--andes-video-captions-background': background,
    '--andes-video-captions-text-shadow':
      style.edge === null ? null : EDGE_SHADOWS[style.edge],
    '--andes-video-captions-font-family':
      style.font === null ? null : FONT_STACKS[style.font],
  };
}

function oneOf<T>(value: unknown, allowed: readonly T[]): T | null {
  return allowed.includes(value as T) ? (value as T) : null;
}

/** Validates a stored caption style; unknown values fall back to the theme (`null`). */
export function readCaptionStyle(value: unknown): AndesCaptionStyle | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const raw = value as Record<string, unknown>;
  return {
    size: oneOf(raw['size'], ANDES_CAPTION_SIZES),
    color: oneOf(raw['color'], ANDES_CAPTION_COLORS),
    background: oneOf(raw['background'], ANDES_CAPTION_COLORS),
    backgroundOpacity: oneOf(raw['backgroundOpacity'], ANDES_CAPTION_OPACITIES),
    edge: oneOf(raw['edge'], ANDES_CAPTION_EDGES),
    font: oneOf(raw['font'], ANDES_CAPTION_FONTS),
  };
}

/** Whether the viewer changed anything. */
export function isCustomCaptionStyle(style: AndesCaptionStyle): boolean {
  return Object.values(style).some((value) => value !== null);
}
