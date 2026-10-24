import { AndesColor } from './color';
import {
  clamp,
  formatHex,
  formatHsb,
  formatHsl,
  formatRgb,
  hsbToHsl,
  hsbToRgb,
  hslToHsb,
  hslToRgb,
  parseColor,
  rgbToHsb,
  rgbToHsl,
  roundTo,
  wrapHue,
} from './color-math';

describe('color math', () => {
  describe('helpers', () => {
    it('clamps and rounds', () => {
      expect(clamp(5, 0, 3)).toBe(3);
      expect(clamp(-1, 0, 3)).toBe(0);
      expect(clamp(2, 0, 3)).toBe(2);
      expect(roundTo(1.2345, 2)).toBe(1.23);
      expect(roundTo(1.5)).toBe(2);
    });

    it('folds hues into [0, 360)', () => {
      expect(wrapHue(360)).toBe(0);
      expect(wrapHue(-30)).toBe(330);
      expect(wrapHue(725)).toBe(5);
    });
  });

  describe('conversions', () => {
    it.each([
      [[255, 0, 0], { h: 0, s: 100, b: 100 }],
      [[0, 255, 0], { h: 120, s: 100, b: 100 }],
      [[0, 0, 255], { h: 240, s: 100, b: 100 }],
      [[255, 255, 255], { h: 0, s: 0, b: 100 }],
      [[0, 0, 0], { h: 0, s: 0, b: 0 }],
      [[128, 128, 128], { h: 0, s: 0, b: 50.2 }],
    ])('turns rgb %j into hsb', ([r, g, b], expected) => {
      const hsb = rgbToHsb(r, g, b);
      expect(hsb.h).toBeCloseTo(expected.h, 5);
      expect(hsb.s).toBeCloseTo(expected.s, 5);
      expect(hsb.b).toBeCloseTo(expected.b, 1);
    });

    it('turns hsb back into rgb', () => {
      const rgb = hsbToRgb(215, 91, 100);
      expect(Math.round(rgb.r)).toBe(23);
      expect(Math.round(rgb.g)).toBe(120);
      expect(Math.round(rgb.b)).toBe(255);
    });

    it('converts between hsb and hsl', () => {
      const hsl = hsbToHsl(210, 50, 80);
      expect(hsl.l).toBeCloseTo(60, 5);
      expect(hsl.s).toBeCloseTo(50, 5);
      const hsb = hslToHsb(hsl.h, hsl.s, hsl.l);
      expect(hsb.s).toBeCloseTo(50, 5);
      expect(hsb.b).toBeCloseTo(80, 5);
    });

    it('has no hsl saturation at black and white', () => {
      expect(hsbToHsl(0, 0, 0).s).toBe(0);
      expect(hsbToHsl(0, 0, 100).s).toBe(0);
    });

    it('converts rgb to hsl and back', () => {
      const hsl = rgbToHsl(255, 0, 0);
      expect(hsl).toEqual({ h: 0, s: 100, l: 50 });
      const rgb = hslToRgb(120, 100, 25);
      expect(Math.round(rgb.r)).toBe(0);
      expect(Math.round(rgb.g)).toBe(128);
      expect(Math.round(rgb.b)).toBe(0);
    });

    it('round-trips every 8-bit rgb triple on a coarse grid through hsb and hsl', () => {
      for (let r = 0; r <= 255; r += 17) {
        for (let g = 0; g <= 255; g += 17) {
          for (let b = 0; b <= 255; b += 17) {
            const hsb = rgbToHsb(r, g, b);
            const back = hsbToRgb(hsb.h, hsb.s, hsb.b);
            expect([
              Math.round(back.r),
              Math.round(back.g),
              Math.round(back.b),
            ]).toEqual([r, g, b]);

            const hsl = rgbToHsl(r, g, b);
            const viaHsl = hslToRgb(hsl.h, hsl.s, hsl.l);
            expect([
              Math.round(viaHsl.r),
              Math.round(viaHsl.g),
              Math.round(viaHsl.b),
            ]).toEqual([r, g, b]);
          }
        }
      }
    });
  });

  describe('parseColor', () => {
    it('reads 3, 4, 6 and 8 digit hex', () => {
      expect(parseColor('#f80')).toEqual({ r: 255, g: 136, b: 0, a: 1 });
      expect(parseColor('#f808')).toMatchObject({ r: 255, g: 136, b: 0 });
      expect(parseColor('#f808')?.a).toBeCloseTo(0.533, 3);
      expect(parseColor('#1677ff')).toEqual({ r: 22, g: 119, b: 255, a: 1 });
      expect(parseColor('#1677FF80')).toMatchObject({ r: 22, g: 119, b: 255 });
      expect(parseColor('#1677FF80')?.a).toBeCloseTo(0.502, 3);
    });

    it('rejects malformed hex', () => {
      expect(parseColor('#12')).toBeNull();
      expect(parseColor('#12345')).toBeNull();
      expect(parseColor('#1234567')).toBeNull();
      expect(parseColor('#ggg')).toBeNull();
      expect(parseColor('#')).toBeNull();
    });

    it('reads bare hex only on request', () => {
      expect(parseColor('1677ff')).toBeNull();
      expect(parseColor('1677ff', { bareHex: true })).toEqual({
        r: 22,
        g: 119,
        b: 255,
        a: 1,
      });
    });

    it('reads rgb() and rgba() in comma, space and slash syntax', () => {
      const expected = { r: 22, g: 119, b: 255, a: 1 };
      expect(parseColor('rgb(22, 119, 255)')).toEqual(expected);
      expect(parseColor('rgb(22 119 255)')).toEqual(expected);
      expect(parseColor('RGB( 22,119 , 255 )')).toEqual(expected);
      expect(parseColor('rgba(22, 119, 255, 0.5)')).toEqual({
        ...expected,
        a: 0.5,
      });
      expect(parseColor('rgb(22 119 255 / 50%)')).toEqual({
        ...expected,
        a: 0.5,
      });
    });

    it('reads percentages and clamps out-of-range channels', () => {
      expect(parseColor('rgb(100%, 0%, 50%)')).toEqual({
        r: 255,
        g: 0,
        b: 128,
        a: 1,
      });
      expect(parseColor('rgb(300, -5, 10)')).toEqual({
        r: 255,
        g: 0,
        b: 10,
        a: 1,
      });
      expect(parseColor('rgba(0, 0, 0, 4)')?.a).toBe(1);
    });

    it('reads hsl() and hsla()', () => {
      expect(parseColor('hsl(0, 100%, 50%)')).toMatchObject({
        r: 255,
        g: 0,
        b: 0,
        a: 1,
      });
      expect(parseColor('hsla(120deg 100% 25% / 0.4)')).toMatchObject({
        r: 0,
        g: 128,
        b: 0,
        a: 0.4,
      });
    });

    it('reads hsb(), hsba(), hsv() and keeps the hue of greys', () => {
      expect(parseColor('hsb(215, 91%, 100%)')).toMatchObject({
        r: 23,
        g: 120,
        b: 255,
      });
      expect(parseColor('hsba(215, 91%, 100%, 0.5)')?.a).toBe(0.5);
      expect(parseColor('hsv(120, 0%, 50%)')?.hsb).toEqual({
        h: 120,
        s: 0,
        b: 50,
      });
    });

    it('reads named colours and transparent', () => {
      expect(parseColor('Red')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
      expect(parseColor('teal')).toEqual({ r: 0, g: 128, b: 128, a: 1 });
      expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    });

    it('rejects everything else', () => {
      for (const text of [
        '',
        '   ',
        'not a colour',
        'rgb(1, 2)',
        'rgb(1, 2, 3, 4, 5)',
        'rgb(a, b, c)',
        'rgb(1deg, 2, 3)',
        'hsl(10%, 20%, 30%)',
        'rgba(1, 2, 3, 4deg)',
        'rgb(1, 2, 3',
      ]) {
        expect(parseColor(text)).toBeNull();
      }
    });
  });

  describe('formatters', () => {
    it('formats hex, with alpha only when needed', () => {
      expect(formatHex({ r: 22, g: 119, b: 255, a: 1 })).toBe('#1677ff');
      expect(formatHex({ r: 22, g: 119, b: 255, a: 0.5 })).toBe('#1677ff80');
      expect(formatHex({ r: 22, g: 119, b: 255, a: 0.5 }, false)).toBe(
        '#1677ff',
      );
      expect(formatHex({ r: 0, g: 0, b: 0, a: 1 })).toBe('#000000');
    });

    it('formats rgb, hsl and hsb', () => {
      expect(formatRgb({ r: 22, g: 119, b: 255, a: 1 })).toBe(
        'rgb(22, 119, 255)',
      );
      expect(formatRgb({ r: 22, g: 119, b: 255, a: 0.456 })).toBe(
        'rgba(22, 119, 255, 0.46)',
      );
      expect(formatHsl({ h: 215, s: 100, l: 54, a: 1 })).toBe(
        'hsl(215, 100%, 54%)',
      );
      expect(formatHsl({ h: 215, s: 100, l: 54, a: 0.5 })).toBe(
        'hsla(215, 100%, 54%, 0.5)',
      );
      expect(formatHsb({ h: 215, s: 91, b: 100, a: 1 })).toBe(
        'hsb(215, 91%, 100%)',
      );
      expect(formatHsb({ h: 215, s: 91, b: 100, a: 0.25 })).toBe(
        'hsba(215, 91%, 100%, 0.25)',
      );
    });

    it('round-trips text through parse and format', () => {
      for (const hex of [
        '#000000',
        '#ffffff',
        '#1677ff',
        '#ff4d4f80',
        '#00ff0087',
      ]) {
        const parsed = parseColor(hex);
        expect(parsed && formatHex(parsed)).toBe(hex);
      }
      for (const rgb of [
        'rgb(0, 0, 0)',
        'rgb(22, 119, 255)',
        'rgba(1, 2, 3, 0.5)',
      ]) {
        const parsed = parseColor(rgb);
        expect(parsed && formatRgb(parsed)).toBe(rgb);
      }
    });
  });
});

describe('AndesColor', () => {
  it('parses and exposes the formats', () => {
    const color = AndesColor.parse('#1677ff');
    expect(color?.toHex()).toBe('#1677ff');
    expect(color?.toRgbString()).toBe('rgb(22, 119, 255)');
    expect(color?.toHsbString()).toBe('hsb(215, 91%, 100%)');
    expect(color?.toHslString()).toBe('hsl(215, 100%, 54%)');
    expect(color?.toFormat('hex')).toBe('#1677ff');
    expect(color?.toFormat('rgb')).toBe('rgb(22, 119, 255)');
    expect(color?.toFormat('hsb')).toBe('hsb(215, 91%, 100%)');
  });

  it('returns null for text that is not a colour', () => {
    expect(AndesColor.parse('nope')).toBeNull();
    expect(AndesColor.from(42)).toBeNull();
    expect(AndesColor.from(null)).toBeNull();
    expect(AndesColor.from('nope')).toBeNull();
  });

  it('is permissive about what from() takes', () => {
    const color = AndesColor.fromHsb(10, 20, 30);
    expect(AndesColor.from(color)).toBe(color);
    expect(AndesColor.from('red')?.toHex()).toBe('#ff0000');
  });

  it('keeps alpha out of formats on request', () => {
    const color = AndesColor.parse('#1677ff80');
    expect(color?.alpha).toBeCloseTo(0.5, 2);
    expect(color?.toHex()).toBe('#1677ff80');
    expect(color?.toRgb().a).toBe(0.5);
    expect(color?.toHex(false)).toBe('#1677ff');
    expect(color?.toFormat('rgb', false)).toBe('rgb(22, 119, 255)');
    expect(color?.toRgbString()).toBe('rgba(22, 119, 255, 0.5)');
  });

  it('keeps the hue of a grey when the hint says so', () => {
    const grey = AndesColor.fromRgb(120, 120, 120, 1, 200);
    expect(grey.hue).toBe(200);
    expect(grey.saturation).toBe(0);
    expect(AndesColor.fromRgb(120, 120, 120).hue).toBe(0);
    // A hint never overrides a colour that has a hue of its own.
    expect(AndesColor.fromRgb(255, 0, 0, 1, 200).hue).toBe(0);
  });

  it('preserves the hue through black, which RGB cannot', () => {
    const color = AndesColor.fromHsb(200, 80, 0);
    expect(color.toHex()).toBe('#000000');
    expect(color.hue).toBe(200);
    expect(color.withHsb({ b: 100 }).hue).toBe(200);
  });

  it('clamps out-of-range components', () => {
    const color = AndesColor.fromHsb(725, 140, -10, 3);
    expect(color.hue).toBe(5);
    expect(color.saturation).toBe(100);
    expect(color.brightness).toBe(0);
    expect(color.alpha).toBe(1);
  });

  it('compares by what is visible', () => {
    const a = AndesColor.fromHsb(200, 80, 0);
    const b = AndesColor.fromHsb(10, 0, 0);
    expect(a.equals(b)).toBe(true);
    expect(a.equals(a.withAlpha(0.5))).toBe(false);
    expect(a.equals(null)).toBe(false);
  });

  it('round-trips through every format', () => {
    for (const hex of ['#000000', '#ffffff', '#1677ff', '#52c41a', '#ff4d4f']) {
      const color = AndesColor.parse(hex);
      expect(AndesColor.parse(color?.toRgbString() ?? '')?.toHex()).toBe(hex);
      expect(AndesColor.parse(color?.toHex() ?? '')?.toHex()).toBe(hex);
    }
  });

  it('tells light colours from dark ones', () => {
    expect(AndesColor.parse('#ffffff')?.isLight()).toBe(true);
    expect(AndesColor.parse('#000000')?.isLight()).toBe(false);
    expect(AndesColor.parse('#1677ff')?.isLight()).toBe(false);
    expect(AndesColor.parse('#fadb14')?.isLight()).toBe(true);
    expect(AndesColor.parse('#00000000')?.isLight()).toBe(true);
    expect(AndesColor.parse('transparent')?.isTransparent()).toBe(true);
  });

  it('serialises as hex', () => {
    const color = AndesColor.parse('#1677ff');
    expect(String(color)).toBe('#1677ff');
    expect(JSON.stringify({ color })).toBe('{"color":"#1677ff"}');
  });
});
