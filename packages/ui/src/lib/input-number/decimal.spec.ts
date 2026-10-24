import {
  addDecimals,
  clampDecimal,
  compareDecimals,
  decimalPrecision,
  decimalToNumber,
  isDecimal,
  normalizeDecimal,
  roundDecimal,
  shiftDecimal,
  subtractDecimals,
  trimDecimal,
} from './decimal';

describe('decimal helpers', () => {
  describe('isDecimal', () => {
    it.each([1, -1.5, '2', '-0.5', '.5', '5.', '1e-7', '+3', ' 4 '])(
      'accepts %s',
      (input) => {
        expect(isDecimal(input)).toBe(true);
      },
    );

    it.each([
      NaN,
      Infinity,
      '',
      '-',
      '.',
      'abc',
      '1.2.3',
      '1e',
      null,
      undefined,
      {},
    ])('rejects %s', (input) => {
      expect(isDecimal(input)).toBe(false);
    });
  });

  describe('normalizeDecimal', () => {
    it('strips signs of positives and leading zeros but keeps fraction zeros', () => {
      expect(normalizeDecimal('+007.500')).toBe('7.500');
      expect(normalizeDecimal('.5')).toBe('0.5');
      expect(normalizeDecimal('5.')).toBe('5');
    });

    it('expands exponent notation', () => {
      expect(normalizeDecimal(1e-7)).toBe('0.0000001');
      expect(normalizeDecimal('1.5e3')).toBe('1500');
      expect(normalizeDecimal(1e21)).toBe('1000000000000000000000');
      expect(normalizeDecimal('12345e-2')).toBe('123.45');
    });

    it('never produces a negative zero', () => {
      expect(normalizeDecimal('-0')).toBe('0');
      expect(normalizeDecimal(-0)).toBe('0');
      expect(normalizeDecimal('-0.00')).toBe('0.00');
    });

    it('throws on text that is not a decimal', () => {
      expect(() => normalizeDecimal('abc')).toThrow(RangeError);
      expect(() => normalizeDecimal(NaN)).toThrow(RangeError);
    });
  });

  it('trimDecimal drops trailing fraction zeros', () => {
    expect(trimDecimal('1.500')).toBe('1.5');
    expect(trimDecimal('2.00')).toBe('2');
    expect(trimDecimal('-0.10')).toBe('-0.1');
  });

  it('decimalPrecision counts the fraction digits as written', () => {
    expect(decimalPrecision(1)).toBe(0);
    expect(decimalPrecision('1.50')).toBe(2);
    expect(decimalPrecision(1e-7)).toBe(7);
  });

  describe('addDecimals', () => {
    it('is exact where doubles are not', () => {
      expect(0.1 + 0.2).not.toBe(0.3);
      expect(addDecimals(0.1, 0.2)).toBe('0.3');
      expect(addDecimals('1.1', '2.2')).toBe('3.3');
    });

    it('carries across the decimal point and grows the integer part', () => {
      expect(addDecimals('9.99', '0.01')).toBe('10.00');
      expect(addDecimals('999', '1')).toBe('1000');
    });

    it('handles mixed signs', () => {
      expect(addDecimals('5', '-3.5')).toBe('1.5');
      expect(addDecimals('-5', '3.5')).toBe('-1.5');
      expect(addDecimals('-5', '-3.5')).toBe('-8.5');
      expect(addDecimals('2.5', '-2.5')).toBe('0.0');
    });

    it('keeps more digits than a double can', () => {
      expect(addDecimals('9007199254740993.123456789', '0.000000001')).toBe(
        '9007199254740993.123456790',
      );
    });
  });

  describe('subtractDecimals', () => {
    it('subtracts exactly', () => {
      expect(subtractDecimals(0.3, 0.1)).toBe('0.2');
      expect(subtractDecimals('1', '1.25')).toBe('-0.25');
      expect(subtractDecimals('-1', '-1')).toBe('0');
      expect(subtractDecimals('10', '0.001')).toBe('9.999');
    });
  });

  describe('compareDecimals', () => {
    it('orders by value, ignoring trailing zeros', () => {
      expect(compareDecimals('1.10', '1.1')).toBe(0);
      expect(compareDecimals('1.2', '1.10')).toBe(1);
      expect(compareDecimals('-1', '1')).toBe(-1);
      expect(compareDecimals('-2', '-1')).toBe(-1);
      expect(compareDecimals('-1', '-2')).toBe(1);
      expect(compareDecimals('10', '9.99')).toBe(1);
      expect(compareDecimals('0', '-0')).toBe(0);
    });
  });

  describe('clampDecimal', () => {
    it('pulls a value into range and leaves bounds open when absent', () => {
      expect(clampDecimal('15', 0, 10)).toBe('10');
      expect(clampDecimal('-5', 0, 10)).toBe('0');
      expect(clampDecimal('5', 0, 10)).toBe('5');
      expect(clampDecimal('5', undefined, null)).toBe('5');
      expect(clampDecimal('99999999999999999999', undefined, '1e20')).toBe(
        '99999999999999999999',
      );
    });
  });

  describe('shiftDecimal', () => {
    it('moves the decimal point', () => {
      expect(shiftDecimal('1.5', 1)).toBe('15');
      expect(shiftDecimal('0.1', 1)).toBe('1');
      expect(shiftDecimal('1', -1)).toBe('0.1');
      expect(shiftDecimal('25', -2)).toBe('0.25');
      expect(shiftDecimal('-0.005', 2)).toBe('-0.5');
      expect(shiftDecimal('7', 3)).toBe('7000');
      expect(shiftDecimal('7', 0)).toBe('7');
    });
  });

  describe('roundDecimal', () => {
    it('rounds half away from zero and pads with zeros', () => {
      expect(roundDecimal('1.005', 2)).toBe('1.01');
      expect(roundDecimal('1.004', 2)).toBe('1.00');
      expect(roundDecimal('-1.005', 2)).toBe('-1.01');
      expect(roundDecimal('2', 2)).toBe('2.00');
      expect(roundDecimal('2.5', 0)).toBe('3');
      expect(roundDecimal('-2.5', 0)).toBe('-3');
      expect(roundDecimal('0.4', 0)).toBe('0');
    });

    it('carries into the integer part', () => {
      expect(roundDecimal('9.995', 2)).toBe('10.00');
      expect(roundDecimal('99.5', 0)).toBe('100');
    });

    it('does not leave a negative zero', () => {
      expect(roundDecimal('-0.004', 2)).toBe('0.00');
    });
  });

  it('decimalToNumber converts a canonical string', () => {
    expect(decimalToNumber('12.50')).toBe(12.5);
    expect(decimalToNumber(3)).toBe(3);
  });
});
