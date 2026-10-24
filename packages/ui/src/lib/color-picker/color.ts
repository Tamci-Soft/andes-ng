import {
  clamp,
  formatHex,
  formatHsb,
  formatHsl,
  formatRgb,
  hsbToHsl,
  hsbToRgb,
  hslToHsb,
  parseColor,
  rgbToHsb,
  roundTo,
  wrapHue,
  type AndesColorFormat,
  type AndesHsba,
  type AndesHsla,
  type AndesRgba,
} from './color-math';

/** Anything the colour picker accepts as a colour: CSS-style text or an {@link AndesColor}. */
export type AndesColorInput = string | AndesColor;

/**
 * An immutable colour. It is stored as hue / saturation / brightness / alpha, floats, which
 * is what the picker's area and sliders edit; RGB, HSL and the string forms are derived and
 * rounded on the way out. Keeping HSB as the source of truth is what lets the hue survive
 * while the colour passes through black, white or a grey, where RGB cannot represent it.
 *
 * ```ts
 * const brand = AndesColor.parse('#1677ff');
 * brand?.toRgbString();           // 'rgb(22, 119, 255)'
 * brand?.withAlpha(0.5).toHex();  // '#1677ff80'
 * ```
 */
export class AndesColor {
  /** Hue in degrees, `[0, 360)`. */
  readonly hue: number;
  /** HSB saturation in percent, 0-100. */
  readonly saturation: number;
  /** HSB brightness in percent, 0-100. */
  readonly brightness: number;
  /** Opacity, 0-1. */
  readonly alpha: number;

  private constructor(
    hue: number,
    saturation: number,
    brightness: number,
    alpha: number,
  ) {
    this.hue = wrapHue(hue);
    this.saturation = clamp(saturation, 0, 100);
    this.brightness = clamp(brightness, 0, 100);
    this.alpha = clamp(alpha, 0, 1);
  }

  /** From HSB: hue in degrees, saturation and brightness in percent, alpha 0-1. */
  static fromHsb(h: number, s: number, b: number, a = 1): AndesColor {
    return new AndesColor(h, s, b, a);
  }

  /**
   * From RGB (0-255). `hueHint` is the hue to keep when the channels are grey or black and so
   * carry none of their own.
   */
  static fromRgb(
    r: number,
    g: number,
    b: number,
    a = 1,
    hueHint?: number,
  ): AndesColor {
    const hsb = rgbToHsb(r, g, b);
    const keepHue = hueHint !== undefined && (hsb.s === 0 || hsb.b === 0);
    return new AndesColor(keepHue ? hueHint : hsb.h, hsb.s, hsb.b, a);
  }

  /** From HSL: hue in degrees, saturation and lightness in percent, alpha 0-1. */
  static fromHsl(h: number, s: number, l: number, a = 1): AndesColor {
    const hsb = hslToHsb(h, s, l);
    return new AndesColor(hsb.h, hsb.s, hsb.b, a);
  }

  /** Reads CSS-style text (see {@link parseColor}); `null` when it is not a colour. */
  static parse(
    input: string,
    options: { bareHex?: boolean } = {},
  ): AndesColor | null {
    const parsed = parseColor(input, options);
    if (!parsed) {
      return null;
    }
    return parsed.hsb
      ? new AndesColor(parsed.hsb.h, parsed.hsb.s, parsed.hsb.b, parsed.a)
      : AndesColor.fromRgb(parsed.r, parsed.g, parsed.b, parsed.a);
  }

  /** The colour itself, or the parsed text; `null` for anything else. */
  static from(input: unknown): AndesColor | null {
    if (input instanceof AndesColor) {
      return input;
    }
    return typeof input === 'string' ? AndesColor.parse(input) : null;
  }

  /** RGB with whole-number channels and alpha rounded to two decimals. */
  toRgb(): AndesRgba {
    const rgb = hsbToRgb(this.hue, this.saturation, this.brightness);
    // The epsilon keeps a channel that is exactly on a half (25.499999999999996 for 25.5)
    // rounding the way the exact arithmetic would.
    const channel = (value: number) => Math.round(value + 1e-9);
    return {
      r: channel(rgb.r),
      g: channel(rgb.g),
      b: channel(rgb.b),
      a: roundTo(this.alpha, 2),
    };
  }

  /** HSB rounded to whole degrees / percent, alpha to two decimals. */
  toHsb(): AndesHsba {
    return {
      h: Math.round(this.hue) % 360,
      s: Math.round(this.saturation),
      b: Math.round(this.brightness),
      a: roundTo(this.alpha, 2),
    };
  }

  /** HSL rounded to whole degrees / percent, alpha to two decimals. */
  toHsl(): AndesHsla {
    const hsl = hsbToHsl(this.hue, this.saturation, this.brightness);
    return {
      h: Math.round(hsl.h) % 360,
      s: Math.round(hsl.s),
      l: Math.round(hsl.l),
      a: roundTo(this.alpha, 2),
    };
  }

  /** `#rrggbb`, or `#rrggbbaa` when not opaque (unless `allowAlpha` is `false`). */
  toHex(allowAlpha = true): string {
    // The exact alpha, not the two-decimal one: a hex byte keeps more than that, so text
    // read from `#rrggbbaa` writes back the same byte.
    return formatHex({ ...this.toRgb(), a: this.alpha }, allowAlpha);
  }

  /** `rgb(r, g, b)` / `rgba(r, g, b, a)`. */
  toRgbString(): string {
    return formatRgb(this.toRgb());
  }

  /** `hsl(h, s%, l%)` / `hsla(h, s%, l%, a)`. */
  toHslString(): string {
    return formatHsl(this.toHsl());
  }

  /** `hsb(h, s%, b%)` / `hsba(h, s%, b%, a)`. */
  toHsbString(): string {
    return formatHsb(this.toHsb());
  }

  /** The colour as text in one of the picker's formats. */
  toFormat(format: AndesColorFormat, allowAlpha = true): string {
    const color = allowAlpha ? this : this.withAlpha(1);
    switch (format) {
      case 'rgb':
        return color.toRgbString();
      case 'hsb':
        return color.toHsbString();
      default:
        return color.toHex();
    }
  }

  /** A copy with another opacity. */
  withAlpha(alpha: number): AndesColor {
    return new AndesColor(this.hue, this.saturation, this.brightness, alpha);
  }

  /** A copy with some of the HSB components replaced. */
  withHsb(patch: {
    h?: number;
    s?: number;
    b?: number;
    a?: number;
  }): AndesColor {
    return new AndesColor(
      patch.h ?? this.hue,
      patch.s ?? this.saturation,
      patch.b ?? this.brightness,
      patch.a ?? this.alpha,
    );
  }

  /** Whether both colours read identically in RGBA - the comparison users can see. */
  equals(other: AndesColor | null | undefined): boolean {
    if (!other) {
      return false;
    }
    const a = this.toRgb();
    const b = other.toRgb();
    return a.r === b.r && a.g === b.g && a.b === b.b && a.a === b.a;
  }

  /** Fully transparent. */
  isTransparent(): boolean {
    return this.alpha === 0;
  }

  /**
   * Whether the colour is light enough that dark text reads on it (relative luminance of the
   * colour composited onto white above one half).
   */
  isLight(): boolean {
    const { r, g, b, a } = this.toRgb();
    const channel = (value: number) => {
      const composited = (value * a + 255 * (1 - a)) / 255;
      return composited <= 0.03928
        ? composited / 12.92
        : ((composited + 0.055) / 1.055) ** 2.4;
    };
    return (
      0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b) > 0.5
    );
  }

  toString(): string {
    return this.toHex();
  }

  toJSON(): string {
    return this.toHex();
  }
}
