/**
 * Pure colour math for the colour picker: conversions between RGB, HSB (also called HSV) and
 * HSL, a tolerant string parser and the matching formatters. Nothing here touches the DOM or
 * Angular, so it is tested on its own.
 *
 * Conventions used by every function in this module:
 * - `r`, `g`, `b` are 0-255, `a` is 0-1;
 * - `h` is degrees, 0-360 (360 is folded back to 0 by the parsers);
 * - `s`, `b` (HSB) and `s`, `l` (HSL) are percentages, 0-100.
 */

/** An RGB colour with alpha: channels 0-255, alpha 0-1. */
export interface AndesRgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

/** An HSB (HSV) colour with alpha: hue 0-360, saturation and brightness 0-100, alpha 0-1. */
export interface AndesHsba {
  h: number;
  s: number;
  b: number;
  a: number;
}

/** An HSL colour with alpha: hue 0-360, saturation and lightness 0-100, alpha 0-1. */
export interface AndesHsla {
  h: number;
  s: number;
  l: number;
  a: number;
}

/** The text formats a colour can be shown and edited in. */
export type AndesColorFormat = 'hex' | 'rgb' | 'hsb';

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Rounds to `digits` decimals (`0` by default). */
export function roundTo(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Folds any angle into `[0, 360)`. */
export function wrapHue(hue: number): number {
  const wrapped = hue % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/** Converts RGB (0-255) to HSB: hue in degrees, saturation and brightness in percent. */
export function rgbToHsb(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; b: number } {
  const red = clamp(r, 0, 255) / 255;
  const green = clamp(g, 0, 255) / 255;
  const blue = clamp(b, 0, 255) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === red) {
      h = ((green - blue) / delta) % 6;
    } else if (max === green) {
      h = (blue - red) / delta + 2;
    } else {
      h = (red - green) / delta + 4;
    }
    h = wrapHue(h * 60);
  }

  return {
    h,
    s: max === 0 ? 0 : (delta / max) * 100,
    b: max * 100,
  };
}

/** Converts HSB to RGB; the channels are returned as floats, round them at the edge. */
export function hsbToRgb(
  h: number,
  s: number,
  b: number,
): { r: number; g: number; b: number } {
  const hue = wrapHue(h) / 60;
  const saturation = clamp(s, 0, 100) / 100;
  const value = clamp(b, 0, 100) / 100;

  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const m = value - chroma;

  let red = 0;
  let green = 0;
  let blue = 0;
  if (hue < 1) {
    [red, green, blue] = [chroma, x, 0];
  } else if (hue < 2) {
    [red, green, blue] = [x, chroma, 0];
  } else if (hue < 3) {
    [red, green, blue] = [0, chroma, x];
  } else if (hue < 4) {
    [red, green, blue] = [0, x, chroma];
  } else if (hue < 5) {
    [red, green, blue] = [x, 0, chroma];
  } else {
    [red, green, blue] = [chroma, 0, x];
  }

  return {
    r: (red + m) * 255,
    g: (green + m) * 255,
    b: (blue + m) * 255,
  };
}

/** Converts HSB to HSL (same hue). */
export function hsbToHsl(
  h: number,
  s: number,
  b: number,
): { h: number; s: number; l: number } {
  const saturation = clamp(s, 0, 100) / 100;
  const value = clamp(b, 0, 100) / 100;
  const lightness = value * (1 - saturation / 2);
  const hslSaturation =
    lightness === 0 || lightness === 1
      ? 0
      : (value - lightness) / Math.min(lightness, 1 - lightness);
  return {
    h: wrapHue(h),
    s: hslSaturation * 100,
    l: lightness * 100,
  };
}

/** Converts HSL to HSB (same hue). */
export function hslToHsb(
  h: number,
  s: number,
  l: number,
): { h: number; s: number; b: number } {
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const value = lightness + saturation * Math.min(lightness, 1 - lightness);
  return {
    h: wrapHue(h),
    s: value === 0 ? 0 : 2 * (1 - lightness / value) * 100,
    b: value * 100,
  };
}

/** Converts RGB (0-255) to HSL. */
export function rgbToHsl(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; l: number } {
  const hsb = rgbToHsb(r, g, b);
  return hsbToHsl(hsb.h, hsb.s, hsb.b);
}

/** Converts HSL to RGB; the channels are returned as floats. */
export function hslToRgb(
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } {
  const hsb = hslToHsb(h, s, l);
  return hsbToRgb(hsb.h, hsb.s, hsb.b);
}

/**
 * A subset of the CSS named colours, enough for hand-written values and presets. Keys are
 * lower case, values are 6-digit hex.
 */
export const ANDES_NAMED_COLORS: Readonly<Record<string, string>> = {
  aqua: '#00ffff',
  beige: '#f5f5dc',
  black: '#000000',
  blue: '#0000ff',
  brown: '#a52a2a',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  crimson: '#dc143c',
  cyan: '#00ffff',
  fuchsia: '#ff00ff',
  gold: '#ffd700',
  gray: '#808080',
  green: '#008000',
  grey: '#808080',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lime: '#00ff00',
  magenta: '#ff00ff',
  maroon: '#800000',
  navy: '#000080',
  olive: '#808000',
  orange: '#ffa500',
  orchid: '#da70d6',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  purple: '#800080',
  red: '#ff0000',
  salmon: '#fa8072',
  silver: '#c0c0c0',
  tan: '#d2b48c',
  teal: '#008080',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  white: '#ffffff',
  yellow: '#ffff00',
};

/** What {@link parseColor} returns: the RGBA reading, plus the HSB reading when the text was
 *  written in a hue-based model (so a hue survives for greys and black). */
export interface AndesParsedColor extends AndesRgba {
  hsb?: { h: number; s: number; b: number };
}

const NUMBER = String.raw`[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?`;
const COMPONENT = new RegExp(`^(${NUMBER})(%|deg)?$`, 'i');
const HEX_DIGITS = /^[\da-f]+$/i;

interface ParsedComponent {
  value: number;
  unit: '%' | 'deg' | '';
}

function parseComponent(text: string): ParsedComponent | null {
  const match = COMPONENT.exec(text);
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  if (!Number.isFinite(value)) {
    return null;
  }
  return {
    value,
    unit: (match[2]?.toLowerCase() ?? '') as ParsedComponent['unit'],
  };
}

function parseAlpha(component: ParsedComponent | undefined): number | null {
  if (!component) {
    return 1;
  }
  if (component.unit === 'deg') {
    return null;
  }
  const alpha =
    component.unit === '%' ? component.value / 100 : component.value;
  return clamp(alpha, 0, 1);
}

function parseHex(digits: string): AndesParsedColor | null {
  if (!HEX_DIGITS.test(digits)) {
    return null;
  }
  let expanded = digits;
  if (digits.length === 3 || digits.length === 4) {
    expanded = [...digits].map((digit) => digit + digit).join('');
  }
  if (expanded.length !== 6 && expanded.length !== 8) {
    return null;
  }
  const channel = (index: number) =>
    parseInt(expanded.slice(index * 2, index * 2 + 2), 16);
  return {
    r: channel(0),
    g: channel(1),
    b: channel(2),
    a: expanded.length === 8 ? channel(3) / 255 : 1,
  };
}

function parseFunctional(
  name: string,
  args: readonly string[],
): AndesParsedColor | null {
  if (args.length < 3 || args.length > 4) {
    return null;
  }
  const parts = args.map(parseComponent);
  if (parts.some((part) => part === null)) {
    return null;
  }
  const [first, second, third, fourth] = parts as ParsedComponent[];
  const a = parseAlpha(fourth);
  if (a === null) {
    return null;
  }

  if (name === 'rgb' || name === 'rgba') {
    if ([first, second, third].some((part) => part.unit === 'deg')) {
      return null;
    }
    const channel = (part: ParsedComponent) =>
      clamp(part.unit === '%' ? (part.value / 100) * 255 : part.value, 0, 255);
    return {
      r: Math.round(channel(first)),
      g: Math.round(channel(second)),
      b: Math.round(channel(third)),
      a,
    };
  }

  // Hue-based models: the hue is an angle (a bare number or `deg`), the other two are
  // percentages whose `%` sign is optional.
  if (first.unit === '%' || second.unit === 'deg' || third.unit === 'deg') {
    return null;
  }
  const h = wrapHue(first.value);
  const s = clamp(second.value, 0, 100);
  const third100 = clamp(third.value, 0, 100);
  const hsb =
    name === 'hsl' || name === 'hsla'
      ? hslToHsb(h, s, third100)
      : { h, s, b: third100 };
  const rgb = hsbToRgb(hsb.h, hsb.s, hsb.b);
  return {
    r: Math.round(rgb.r),
    g: Math.round(rgb.g),
    b: Math.round(rgb.b),
    a,
    hsb,
  };
}

export interface AndesParseColorOptions {
  /** Also accept hex digits without the leading `#` (`1677ff`). Default `false`. */
  bareHex?: boolean;
}

/**
 * Reads a colour from text: `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa`, `rgb()`/`rgba()`,
 * `hsl()`/`hsla()`, `hsb()`/`hsba()`/`hsv()`/`hsva()` (comma or space separated, alpha after a
 * comma or a slash, percentages allowed), a subset of the named colours and `transparent`.
 * Returns `null` for anything else.
 */
export function parseColor(
  input: string,
  options: AndesParseColorOptions = {},
): AndesParsedColor | null {
  const text = input.trim().toLowerCase();
  if (!text) {
    return null;
  }

  if (text.startsWith('#')) {
    return parseHex(text.slice(1));
  }

  if (text === 'transparent') {
    return { r: 0, g: 0, b: 0, a: 0 };
  }

  const named = ANDES_NAMED_COLORS[text];
  if (named) {
    return parseHex(named.slice(1));
  }

  const functional = /^(rgba?|hsla?|hsba?|hsva?)\(\s*([^)]*?)\s*\)$/.exec(text);
  if (functional) {
    const name = functional[1].replace(/^hsv/, 'hsb');
    const args = functional[2].split(/[\s,/]+/).filter(Boolean);
    return parseFunctional(name, args);
  }

  if (options.bareHex) {
    return parseHex(text);
  }
  return null;
}

function hexByte(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
}

/** `#rrggbb`, or `#rrggbbaa` when `alpha` is below 1 and `allowAlpha` is not turned off. */
export function formatHex(rgba: AndesRgba, allowAlpha = true): string {
  const base = `#${hexByte(rgba.r)}${hexByte(rgba.g)}${hexByte(rgba.b)}`;
  return allowAlpha && rgba.a < 1 ? base + hexByte(rgba.a * 255) : base;
}

function alphaText(alpha: number): string {
  return String(roundTo(clamp(alpha, 0, 1), 2));
}

/** `rgb(r, g, b)`, or `rgba(r, g, b, a)` when the colour is not opaque. */
export function formatRgb(rgba: AndesRgba): string {
  const channels = [rgba.r, rgba.g, rgba.b]
    .map((channel) => clamp(Math.round(channel), 0, 255))
    .join(', ');
  return rgba.a < 1
    ? `rgba(${channels}, ${alphaText(rgba.a)})`
    : `rgb(${channels})`;
}

/** `hsl(h, s%, l%)`, or `hsla(h, s%, l%, a)` when the colour is not opaque. */
export function formatHsl(hsla: AndesHsla): string {
  const body = `${Math.round(wrapHue(hsla.h))}, ${Math.round(hsla.s)}%, ${Math.round(hsla.l)}%`;
  return hsla.a < 1 ? `hsla(${body}, ${alphaText(hsla.a)})` : `hsl(${body})`;
}

/** `hsb(h, s%, b%)`, or `hsba(h, s%, b%, a)` when the colour is not opaque. */
export function formatHsb(hsba: AndesHsba): string {
  const body = `${Math.round(wrapHue(hsba.h))}, ${Math.round(hsba.s)}%, ${Math.round(hsba.b)}%`;
  return hsba.a < 1 ? `hsba(${body}, ${alphaText(hsba.a)})` : `hsb(${body})`;
}
