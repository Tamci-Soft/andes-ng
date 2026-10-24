/** What a statistic accepts as its figure. Numeric strings are formatted as numbers. */
export type AndesStatisticValue = number | string | bigint | null | undefined;

export interface AndesStatisticFormatOptions {
  /** BCP 47 locale tag; the runtime default when omitted. */
  locale?: string;
  /** Fixed number of fraction digits. Overrides the min/max fraction digits in `format`. */
  precision?: number;
  /** Extra `Intl.NumberFormat` options: currency, percent, compact notation... */
  format?: Intl.NumberFormatOptions;
  /** Turn thousands separators off. */
  grouping?: boolean;
  /** Replaces the locale's thousands separator. */
  groupSeparator?: string;
  /** Replaces the locale's decimal separator. */
  decimalSeparator?: string;
  /** Shown for null, undefined and empty values. */
  placeholder?: string;
}

/**
 * A formatted figure split into parts so the fraction can be styled separately:
 * `1,234` + `.56` + ` K`. `numeric` is false when the value was shown as given.
 */
export interface AndesStatisticParts {
  integer: string;
  decimal: string;
  tail: string;
  numeric: boolean;
}

const NUMERIC_PART_TYPES = new Set([
  'integer',
  'group',
  'decimal',
  'fraction',
  'minusSign',
  'plusSign',
]);

/** Turns the value into a number-like input for `Intl`, or `null` when it isn't numeric. */
function toNumeric(value: number | string | bigint): number | bigint | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'bigint') {
    return value;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Formats `value` into integer / decimal / tail parts. Never throws. */
export function formatStatisticValue(
  value: AndesStatisticValue,
  options: AndesStatisticFormatOptions = {},
): AndesStatisticParts {
  const placeholder = options.placeholder ?? '—';
  if (value === null || value === undefined || value === '') {
    return { integer: placeholder, decimal: '', tail: '', numeric: false };
  }
  const numeric = toNumeric(value);
  if (numeric === null) {
    return { integer: String(value), decimal: '', tail: '', numeric: false };
  }

  const formatOptions: Intl.NumberFormatOptions = {
    ...options.format,
    useGrouping: options.grouping ?? options.format?.useGrouping ?? true,
  };
  if (options.precision !== undefined && options.precision >= 0) {
    const digits = Math.min(100, Math.floor(options.precision));
    formatOptions.minimumFractionDigits = digits;
    formatOptions.maximumFractionDigits = digits;
  }

  let parts: Intl.NumberFormatPart[];
  try {
    parts = new Intl.NumberFormat(options.locale, formatOptions).formatToParts(
      numeric,
    );
  } catch {
    // An invalid locale tag or option combination: fall back to the plain string.
    return { integer: String(value), decimal: '', tail: '', numeric: false };
  }

  let lastNumeric = -1;
  parts.forEach((part, index) => {
    if (NUMERIC_PART_TYPES.has(part.type)) {
      lastNumeric = index;
    }
  });

  let integer = '';
  let decimal = '';
  let tail = '';
  parts.forEach((part, index) => {
    let text = part.value;
    if (part.type === 'group' && options.groupSeparator !== undefined) {
      text = options.groupSeparator;
    } else if (
      part.type === 'decimal' &&
      options.decimalSeparator !== undefined
    ) {
      text = options.decimalSeparator;
    }
    if (part.type === 'decimal' || part.type === 'fraction') {
      decimal += text;
    } else if (index > lastNumeric) {
      tail += text;
    } else {
      integer += text;
    }
  });

  return { integer, decimal, tail, numeric: true };
}
