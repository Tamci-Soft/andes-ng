import {
  isDecimal,
  normalizeDecimal,
  roundDecimal,
  shiftDecimal,
} from './decimal';

/** How the built-in formatter writes a value. `none` is plain digits with a `.` (or `decimalSeparator`). */
export type AndesInputNumberFormat =
  'none' | 'decimal' | 'currency' | 'percent';

export type AndesInputNumberCurrencyDisplay =
  'symbol' | 'narrowSymbol' | 'code' | 'name';

/** Everything the built-in formatter and parser depend on. */
export interface AndesNumberFormatOptions {
  readonly locale: string;
  readonly format: AndesInputNumberFormat;
  readonly currency: string;
  readonly currencyDisplay: AndesInputNumberCurrencyDisplay;
  readonly useGrouping: boolean;
  /** Fixed number of fraction digits of the stored value, or `undefined` to keep what is written. */
  readonly precision: number | undefined;
  /** Decimal separator used by the plain (`none`) format. */
  readonly decimalSeparator: string;
}

/** Formats and parses one configuration of the options above. */
export interface AndesNumberCodec {
  /** Text for a canonical decimal string; the empty string for `null`. */
  format(value: string | null): string;
  /**
   * Reads what the user typed. `empty` for blank text, `invalid` when nothing numeric can be
   * made of it (a lone `-`, two decimal points), otherwise the canonical decimal string.
   */
  parse(text: string): AndesParsedNumber;
  /** Characters that may appear in text this codec formats - used to filter typing. */
  readonly allowedCharacters: string;
}

export type AndesParsedNumber =
  | { readonly kind: 'empty' }
  | { readonly kind: 'invalid' }
  | { readonly kind: 'ok'; readonly value: string };

const MINUS_SIGNS = /[-−‒-―]/;
const MAX_FRACTION_DIGITS = 20;

function safeNumberFormat(
  locale: string,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, options);
  } catch {
    // An unknown locale or currency code must not break the field - fall back to the runtime default.
    return new Intl.NumberFormat(undefined, {
      ...options,
      currency: options.style === 'currency' ? 'USD' : undefined,
    });
  }
}

function escapeForClass(chars: string): string {
  return chars.replace(/[\\\]^-]/g, '\\$&');
}

function plainCodec(options: AndesNumberFormatOptions): AndesNumberCodec {
  const decimalSeparator = options.decimalSeparator || '.';
  return {
    allowedCharacters: `0123456789+-−.,${decimalSeparator} `,
    format(value) {
      if (value === null) {
        return '';
      }
      const rounded =
        options.precision === undefined
          ? normalizeDecimal(value)
          : roundDecimal(value, options.precision);
      return decimalSeparator === '.'
        ? rounded
        : rounded.replace('.', decimalSeparator);
    },
    parse(text) {
      const trimmed = text.trim();
      if (trimmed === '') {
        return { kind: 'empty' };
      }
      let working = trimmed.replace(/\s/g, '');
      if (decimalSeparator !== '.') {
        // The configured separator wins; a stray `.` then reads as a typo for it.
        working = working.split(decimalSeparator).join('.');
      }
      working = working.replace(MINUS_SIGNS, '-').replace(/^\+/, '');
      return isDecimal(working) && /\d/.test(working)
        ? { kind: 'ok', value: normalizeDecimal(working) }
        : { kind: 'invalid' };
    },
  };
}

function intlCodec(options: AndesNumberFormatOptions): AndesNumberCodec {
  const style = options.format === 'none' ? 'decimal' : options.format;
  const isPercent = style === 'percent';
  const base: Intl.NumberFormatOptions = {
    style,
    useGrouping: options.useGrouping,
    ...(style === 'currency'
      ? { currency: options.currency, currencyDisplay: options.currencyDisplay }
      : {}),
  };

  // A percent value 0.255 is shown as 25.5%, so two of the stored value's digits go into the integer part.
  let fractionDigits: { min: number; max: number };
  if (options.precision !== undefined) {
    const shown = Math.max(0, options.precision - (isPercent ? 2 : 0));
    fractionDigits = { min: shown, max: shown };
  } else {
    const defaults = safeNumberFormat(options.locale, base).resolvedOptions();
    fractionDigits = {
      min: defaults.minimumFractionDigits ?? 0,
      max: Math.max(MAX_FRACTION_DIGITS, defaults.minimumFractionDigits ?? 0),
    };
  }
  const formatter = safeNumberFormat(options.locale, {
    ...base,
    minimumFractionDigits: fractionDigits.min,
    maximumFractionDigits: fractionDigits.max,
  });

  const sample = safeNumberFormat(options.locale, {
    useGrouping: true,
    minimumFractionDigits: 1,
  });
  const parts = sample.formatToParts(-1234567.5);
  const decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
  const group = parts.find((p) => p.type === 'group')?.value ?? ',';
  const digitFormat = safeNumberFormat(options.locale, {
    useGrouping: false,
    maximumFractionDigits: 0,
  });
  const digitMap = new Map<string, string>();
  for (let digit = 0; digit < 10; digit++) {
    digitMap.set(digitFormat.format(digit), String(digit));
  }
  const symbols = formatter
    .formatToParts(-1234.5)
    .filter((p) => p.type !== 'integer' && p.type !== 'fraction')
    .map((p) => p.value)
    .join('');
  const allowedCharacters = `${[...digitMap.keys()].join('')}0123456789+-−.,${decimal}${group}${symbols} \u00a0\u202f`;
  const stripPattern = new RegExp(`[^0-9\\-${escapeForClass(decimal)}]`, 'g');
  const groupPattern =
    group.trim() === ''
      ? /[\s\u00a0\u202f]/g
      : new RegExp(`[${escapeForClass(group)}]`, 'g');

  return {
    allowedCharacters,
    format(value) {
      if (value === null) {
        return '';
      }
      // The percent style multiplies by 100 itself, so the stored fraction goes in as it is.
      const rounded =
        options.precision === undefined
          ? value
          : roundDecimal(value, options.precision);
      // Decimal strings keep full precision through `format` where the engine supports them.
      return formatter.format(rounded as unknown as number);
    },
    parse(text) {
      const trimmed = text.trim();
      if (trimmed === '') {
        return { kind: 'empty' };
      }
      let working = trimmed;
      for (const [local, ascii] of digitMap) {
        if (local !== ascii) {
          working = working.split(local).join(ascii);
        }
      }
      const negative = MINUS_SIGNS.test(working) || /^\(.*\)$/.test(working);
      working = working
        .replace(groupPattern, '')
        .replace(stripPattern, '')
        .replace(/-/g, '');
      if (decimal !== '.') {
        working = working.split(decimal).join('.');
      }
      if (!/\d/.test(working) || !isDecimal(working)) {
        return { kind: 'invalid' };
      }
      const magnitude = negative ? `-${working}` : working;
      return {
        kind: 'ok',
        value: normalizeDecimal(
          isPercent ? shiftDecimal(magnitude, -2) : magnitude,
        ),
      };
    },
  };
}

/** Builds the formatter/parser pair for one configuration. */
export function createNumberCodec(
  options: AndesNumberFormatOptions,
): AndesNumberCodec {
  return options.format === 'none' ? plainCodec(options) : intlCodec(options);
}
