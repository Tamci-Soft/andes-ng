/**
 * Exact decimal arithmetic on plain strings.
 *
 * A JavaScript `number` cannot hold `0.1 + 0.2` or a 20-digit amount exactly, which is what an
 * ERP form needs when a stepper adds `0.01` to a price or a field carries a high-precision
 * quantity. These helpers keep every value as a decimal string (`"-12.340"`) and do the sums on
 * digit arrays, so they work without `BigInt` and without any dependency. All of them accept
 * numbers or strings and return strings; `null` and invalid input are handled by the caller
 * (see {@link isDecimal}).
 */

/** A number or a decimal string (`"1.50"`, `"-0.001"`, `"1e-7"`). */
export type DecimalInput = number | string;

/** Parsed form of a decimal: `int` has no leading zeros (but is never empty), `frac` may be empty. */
interface ParsedDecimal {
  readonly negative: boolean;
  readonly int: string;
  readonly frac: string;
}

const DECIMAL_PATTERN = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i;

function stripLeadingZeros(digits: string): string {
  const stripped = digits.replace(/^0+/, '');
  return stripped === '' ? '0' : stripped;
}

function isZero(parsed: ParsedDecimal): boolean {
  return /^0*$/.test(parsed.int) && /^0*$/.test(parsed.frac);
}

function make(negative: boolean, int: string, frac: string): ParsedDecimal {
  const normalized = { negative, int: stripLeadingZeros(int), frac };
  return isZero(normalized) ? { ...normalized, negative: false } : normalized;
}

function parse(input: DecimalInput | null | undefined): ParsedDecimal | null {
  if (input == null) {
    return null;
  }
  if (typeof input === 'number' && !Number.isFinite(input)) {
    return null;
  }
  const text = String(input).trim();
  const match = DECIMAL_PATTERN.exec(text);
  if (!match) {
    return null;
  }
  const [, sign, intPart = '', fracPart = '', exponentPart] = match;
  if (intPart === '' && fracPart === '') {
    return null;
  }
  let int = intPart;
  let frac = fracPart;
  if (exponentPart !== undefined) {
    const exponent = Number(exponentPart);
    if (Math.abs(exponent) > 1000) {
      return null;
    }
    if (exponent > 0) {
      const padded = frac.padEnd(exponent, '0');
      int += padded.slice(0, exponent);
      frac = padded.slice(exponent);
    } else if (exponent < 0) {
      const padded = int.padStart(-exponent, '0');
      frac = padded.slice(padded.length + exponent) + frac;
      int = padded.slice(0, padded.length + exponent);
    }
  }
  return make(sign === '-', int, frac);
}

function stringify(parsed: ParsedDecimal): string {
  const body = parsed.frac === '' ? parsed.int : `${parsed.int}.${parsed.frac}`;
  return parsed.negative ? `-${body}` : body;
}

function must(input: DecimalInput, name: string): ParsedDecimal {
  const parsed = parse(input);
  if (!parsed) {
    throw new RangeError(
      `"${String(input)}" is not a finite decimal (${name})`,
    );
  }
  return parsed;
}

/** Adds two non-negative digit strings of equal length. */
function addDigits(a: string, b: string): string {
  let carry = 0;
  let out = '';
  for (let i = a.length - 1; i >= 0; i--) {
    const sum = a.charCodeAt(i) - 48 + (b.charCodeAt(i) - 48) + carry;
    out = String(sum % 10) + out;
    carry = sum > 9 ? 1 : 0;
  }
  return carry ? `1${out}` : out;
}

/** Subtracts digit strings of equal length, `a >= b`. */
function subtractDigits(a: string, b: string): string {
  let borrow = 0;
  let out = '';
  for (let i = a.length - 1; i >= 0; i--) {
    let diff = a.charCodeAt(i) - 48 - (b.charCodeAt(i) - 48) - borrow;
    borrow = diff < 0 ? 1 : 0;
    if (diff < 0) {
      diff += 10;
    }
    out = String(diff) + out;
  }
  return out;
}

/** Magnitude comparison of two non-negative digit strings of equal length. */
function compareDigits(a: string, b: string): -1 | 0 | 1 {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

interface Aligned {
  readonly a: string;
  readonly b: string;
  readonly scale: number;
}

/** Writes both magnitudes as digit strings of the same length with the same implied scale. */
function align(x: ParsedDecimal, y: ParsedDecimal): Aligned {
  const scale = Math.max(x.frac.length, y.frac.length);
  const length = Math.max(x.int.length, y.int.length) + scale;
  return {
    a: (x.int + x.frac.padEnd(scale, '0')).padStart(length, '0'),
    b: (y.int + y.frac.padEnd(scale, '0')).padStart(length, '0'),
    scale,
  };
}

function fromDigits(
  negative: boolean,
  digits: string,
  scale: number,
): ParsedDecimal {
  const padded = digits.padStart(scale + 1, '0');
  return make(
    negative,
    padded.slice(0, padded.length - scale),
    padded.slice(padded.length - scale),
  );
}

function addParsed(x: ParsedDecimal, y: ParsedDecimal): ParsedDecimal {
  const { a, b, scale } = align(x, y);
  if (x.negative === y.negative) {
    return fromDigits(x.negative, addDigits(a, b), scale);
  }
  const order = compareDigits(a, b);
  if (order === 0) {
    return make(false, '0', '0'.repeat(scale));
  }
  return order > 0
    ? fromDigits(x.negative, subtractDigits(a, b), scale)
    : fromDigits(y.negative, subtractDigits(b, a), scale);
}

/** Whether `input` is a finite number or a well-formed decimal string. */
export function isDecimal(input: unknown): input is DecimalInput {
  return (
    (typeof input === 'number' || typeof input === 'string') &&
    parse(input) !== null
  );
}

/**
 * The canonical text of a decimal: no sign for positives, no leading zeros, no exponent. Trailing
 * fraction zeros are kept (`"1.50"` stays `"1.50"`) because they carry the precision the author
 * wrote; use {@link trimDecimal} to drop them.
 */
export function normalizeDecimal(input: DecimalInput): string {
  return stringify(must(input, 'normalizeDecimal'));
}

/** Like {@link normalizeDecimal} but also drops trailing fraction zeros (`"1.50"` -> `"1.5"`). */
export function trimDecimal(input: DecimalInput): string {
  const parsed = must(input, 'trimDecimal');
  return stringify(
    make(parsed.negative, parsed.int, parsed.frac.replace(/0+$/, '')),
  );
}

/** The number of fraction digits as written (`1.50` -> 2; a number is measured through its shortest text). */
export function decimalPrecision(input: DecimalInput): number {
  return must(input, 'decimalPrecision').frac.length;
}

/** `a + b`, exactly. `addDecimals(0.1, 0.2)` is `"0.3"`. */
export function addDecimals(a: DecimalInput, b: DecimalInput): string {
  return stringify(addParsed(must(a, 'a'), must(b, 'b')));
}

/** `a - b`, exactly. */
export function subtractDecimals(a: DecimalInput, b: DecimalInput): string {
  const y = must(b, 'b');
  return stringify(
    addParsed(must(a, 'a'), isZero(y) ? y : { ...y, negative: !y.negative }),
  );
}

/** `-1`, `0` or `1` as `a` is less than, equal to or greater than `b`. */
export function compareDecimals(a: DecimalInput, b: DecimalInput): -1 | 0 | 1 {
  const x = must(a, 'a');
  const y = must(b, 'b');
  if (x.negative !== y.negative) {
    return x.negative ? -1 : 1;
  }
  const { a: left, b: right } = align(x, y);
  const order = compareDigits(left, right);
  return (x.negative ? -order : order) as -1 | 0 | 1;
}

/** `value` pulled into `[min, max]`; either bound may be `null`/`undefined` for "no limit". */
export function clampDecimal(
  value: DecimalInput,
  min?: DecimalInput | null,
  max?: DecimalInput | null,
): string {
  let result = normalizeDecimal(value);
  if (min != null && compareDecimals(result, min) < 0) {
    result = normalizeDecimal(min);
  }
  if (max != null && compareDecimals(result, max) > 0) {
    result = normalizeDecimal(max);
  }
  return result;
}

/** Multiplies by `10 ** places` (negative `places` divides) by moving the decimal point. */
export function shiftDecimal(input: DecimalInput, places: number): string {
  const parsed = must(input, 'shiftDecimal');
  if (places === 0) {
    return stringify(parsed);
  }
  let { int, frac } = parsed;
  if (places > 0) {
    const padded = frac.padEnd(places, '0');
    int += padded.slice(0, places);
    frac = padded.slice(places);
  } else {
    const shift = -places;
    const padded = int.padStart(shift, '0');
    frac = padded.slice(padded.length - shift) + frac;
    int = padded.slice(0, padded.length - shift);
  }
  return stringify(make(parsed.negative, int, frac));
}

/**
 * Rounds half away from zero to exactly `precision` fraction digits, padding with zeros
 * (`roundDecimal("1.005", 2)` is `"1.01"`, `roundDecimal(2, 2)` is `"2.00"`).
 */
export function roundDecimal(input: DecimalInput, precision: number): string {
  const parsed = must(input, 'roundDecimal');
  const digits = Math.max(0, Math.trunc(precision));
  if (parsed.frac.length <= digits) {
    return stringify(
      make(parsed.negative, parsed.int, parsed.frac.padEnd(digits, '0')),
    );
  }
  const kept = parsed.int + parsed.frac.slice(0, digits);
  const roundUp = parsed.frac.charCodeAt(digits) >= 53; // '5'
  const total = roundUp
    ? addDigits(kept, '0'.repeat(kept.length - 1) + '1')
    : kept;
  return stringify(fromDigits(parsed.negative, total, digits));
}

/** `Number(...)` of a decimal string; precise only within the double range. */
export function decimalToNumber(input: DecimalInput): number {
  return Number(normalizeDecimal(input));
}
