import {
  type AndesNumberFormatOptions,
  createNumberCodec,
} from './number-format';

const base: AndesNumberFormatOptions = {
  locale: 'en-US',
  format: 'decimal',
  currency: 'USD',
  currencyDisplay: 'symbol',
  useGrouping: true,
  precision: undefined,
  decimalSeparator: '.',
};

function codec(options: Partial<AndesNumberFormatOptions>) {
  return createNumberCodec({ ...base, ...options });
}

describe('number codec', () => {
  describe('plain format', () => {
    it('writes canonical text, padded to the precision', () => {
      const plain = codec({ format: 'none', precision: 2 });

      expect(plain.format('1234.5')).toBe('1234.50');
      expect(plain.format(null)).toBe('');
      expect(codec({ format: 'none' }).format('1.500')).toBe('1.500');
    });

    it('uses the configured decimal separator both ways', () => {
      const plain = codec({ format: 'none', decimalSeparator: ',' });

      expect(plain.format('1.5')).toBe('1,5');
      expect(plain.parse('2,25')).toEqual({ kind: 'ok', value: '2.25' });
    });

    it('classifies text as empty, invalid or a number', () => {
      const plain = codec({ format: 'none' });

      expect(plain.parse('  ')).toEqual({ kind: 'empty' });
      expect(plain.parse('-')).toEqual({ kind: 'invalid' });
      expect(plain.parse('1.2.3')).toEqual({ kind: 'invalid' });
      expect(plain.parse('abc')).toEqual({ kind: 'invalid' });
      expect(plain.parse('-12.5')).toEqual({ kind: 'ok', value: '-12.5' });
      expect(plain.parse('−3')).toEqual({ kind: 'ok', value: '-3' });
      expect(plain.parse('+4')).toEqual({ kind: 'ok', value: '4' });
    });
  });

  describe('decimal format', () => {
    it('groups thousands', () => {
      expect(codec({}).format('1234567.891')).toBe('1,234,567.891');
      expect(codec({ useGrouping: false }).format('1234567')).toBe('1234567');
    });

    it('fixes the fraction digits to the precision', () => {
      expect(codec({ precision: 2 }).format('1234.5')).toBe('1,234.50');
      expect(codec({ precision: 0 }).format('1234.5')).toBe('1,235');
    });

    it('keeps digits a double would lose when given a string', () => {
      expect(codec({}).format('12345678901234567.5')).toBe(
        '12,345,678,901,234,567.5',
      );
    });

    it('parses grouped text back', () => {
      expect(codec({}).parse('1,234,567.89')).toEqual({
        kind: 'ok',
        value: '1234567.89',
      });
      expect(codec({}).parse('-1,000')).toEqual({ kind: 'ok', value: '-1000' });
    });

    it('follows the locale separators', () => {
      const german = codec({ locale: 'de-DE' });

      expect(german.format('1234567.5')).toBe('1.234.567,5');
      expect(german.parse('1.234.567,5')).toEqual({
        kind: 'ok',
        value: '1234567.5',
      });
    });

    it('reads locale digits', () => {
      const arabic = codec({ locale: 'ar-EG-u-nu-arab' });
      const text = arabic.format('123');

      expect(text).not.toBe('123');
      expect(arabic.parse(text)).toEqual({ kind: 'ok', value: '123' });
    });
  });

  describe('currency format', () => {
    it('shows the symbol and at least the currency fraction digits', () => {
      const usd = codec({ format: 'currency' });

      expect(usd.format('1234.5')).toBe('$1,234.50');
      expect(usd.format('-3')).toBe('-$3.00');
      expect(usd.format('1.2345')).toBe('$1.2345');
    });

    it('parses the symbol away', () => {
      const usd = codec({ format: 'currency' });

      expect(usd.parse('$1,234.50')).toEqual({ kind: 'ok', value: '1234.50' });
      expect(usd.parse('-$3')).toEqual({ kind: 'ok', value: '-3' });
    });

    it('supports other currencies and displays', () => {
      expect(
        codec({ format: 'currency', currency: 'EUR', locale: 'de-DE' }).format(
          '1234.5',
        ),
      ).toMatch(/^1\.234,50\s€$/);
      expect(
        codec({ format: 'currency', currency: 'PEN', currencyDisplay: 'code' })
          .format('10')
          .replace(/\s/g, ' '),
      ).toBe('PEN 10.00');
    });
  });

  describe('percent format', () => {
    it('shows the stored fraction as a percentage', () => {
      const percent = codec({ format: 'percent' });

      expect(percent.format('0.25')).toBe('25%');
      expect(percent.format('0.255')).toBe('25.5%');
    });

    it('takes the precision of the stored value', () => {
      expect(codec({ format: 'percent', precision: 2 }).format('0.25')).toBe(
        '25%',
      );
      expect(codec({ format: 'percent', precision: 4 }).format('0.25')).toBe(
        '25.00%',
      );
    });

    it('parses back to the fraction without float error', () => {
      const percent = codec({ format: 'percent' });

      expect(percent.parse('12.5%')).toEqual({ kind: 'ok', value: '0.125' });
      expect(percent.parse('7')).toEqual({ kind: 'ok', value: '0.07' });
    });
  });

  it('falls back to a usable codec for an unknown locale', () => {
    const odd = codec({ locale: 'not a locale' });

    expect(odd.format('1000')).toMatch(/1.000/);
  });

  it('exposes the characters typing may use', () => {
    expect(codec({}).allowedCharacters).toContain('0');
    expect(codec({}).allowedCharacters).not.toContain('a');
    expect(codec({ format: 'currency' }).allowedCharacters).toContain('$');
    expect(codec({ format: 'percent' }).allowedCharacters).toContain('%');
  });
});
