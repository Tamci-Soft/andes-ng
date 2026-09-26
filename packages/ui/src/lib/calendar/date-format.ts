/**
 * Token-based date formatting and parsing for `AndesDatePicker`'s typed input.
 *
 * Built on `Intl` and plain regular expressions — no `dayjs`/`date-fns`, matching
 * `date-utils.ts`. The token vocabulary is the familiar dayjs one, so existing
 * format strings port over unchanged:
 *
 * | Token          | Meaning                                  | Example        |
 * | -------------- | ---------------------------------------- | -------------- |
 * | `YYYY` / `YY`  | Year (week-year when the pattern has `w`) | `2024` / `24`  |
 * | `Q`            | Quarter                                  | `1`            |
 * | `MMMM` / `MMM` | Localized month name, long / short       | `February`     |
 * | `MM` / `M`     | Month number, padded / not               | `02` / `2`     |
 * | `DD` / `D`     | Day of month, padded / not               | `05` / `5`     |
 * | `dddd` / `ddd` | Localized weekday name (ignored on parse) | `Monday`      |
 * | `ww` / `w`     | Week of year, padded / not               | `07` / `7`     |
 * | `HH` / `H`     | Hour 0-23                                | `09` / `9`     |
 * | `hh` / `h`     | Hour 1-12                                | `09` / `9`     |
 * | `mm` / `m`     | Minute                                   | `05`           |
 * | `ss` / `s`     | Second                                   | `07`           |
 * | `A` / `a`      | Localized day period                     | `PM`           |
 * | `[text]`       | Literal text                             | `[Q]` → `Q`    |
 *
 * Parsing is deliberately forgiving about whitespace, case, a missing comma and
 * one-digit fields, and deliberately strict about the date itself: `Feb 30` is
 * rejected rather than silently rolled into March.
 */

import {
  isValidDate,
  quarterOf,
  startOfWeekNumber,
  weekOfYear,
  type AndesWeekday,
} from './date-utils';

/**
 * What a picker's `format` input accepts: one pattern, a list of patterns (the
 * first formats, all of them parse), or a function (formats only — a function
 * cannot be inverted, so typed input then falls back to ISO).
 */
export type AndesDateFormat =
  string | readonly string[] | ((date: Date) => string);

export interface AndesFormatContext {
  readonly locale: string | undefined;
  readonly weekStartsOn: AndesWeekday;
}

const TOKEN_PATTERN =
  /\[([^\]]*)]|YYYY|YY|MMMM|MMM|MM|M|DD|D|dddd|ddd|ww|w|HH|H|hh|h|mm|m|ss|s|A|a|Q/g;

type Token =
  | { readonly kind: 'literal'; readonly text: string }
  | { readonly kind: 'field'; readonly token: string };

function tokenize(pattern: string): Token[] {
  const tokens: Token[] = [];
  let lastIndex = 0;
  for (const match of pattern.matchAll(TOKEN_PATTERN)) {
    if (match.index > lastIndex) {
      tokens.push({
        kind: 'literal',
        text: pattern.slice(lastIndex, match.index),
      });
    }
    tokens.push(
      match[1] !== undefined
        ? { kind: 'literal', text: match[1] }
        : { kind: 'field', token: match[0] },
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < pattern.length) {
    tokens.push({ kind: 'literal', text: pattern.slice(lastIndex) });
  }
  return tokens;
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0');

function monthName(
  date: Date,
  locale: string | undefined,
  width: 'long' | 'short',
): string {
  return new Intl.DateTimeFormat(locale, { month: width }).format(date);
}

function dayPeriod(date: Date, locale: string | undefined): string {
  return (
    new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true })
      .formatToParts(date)
      .find((part) => part.type === 'dayPeriod')?.value ??
    (date.getHours() < 12 ? 'AM' : 'PM')
  );
}

/** Formats `date` with a token pattern. */
export function formatWithPattern(
  date: Date,
  pattern: string,
  context: AndesFormatContext,
): string {
  const tokens = tokenize(pattern);
  const usesWeek = tokens.some(
    (token) => token.kind === 'field' && token.token.startsWith('w'),
  );
  const week = weekOfYear(date, context.weekStartsOn);
  // With a week token, the year printed must be the week-numbering year, or the
  // last days of December would render as "2024-W01" instead of "2025-W01".
  const year = usesWeek ? week.year : date.getFullYear();
  const hours12 = date.getHours() % 12 || 12;

  return tokens
    .map((token) => {
      if (token.kind === 'literal') {
        return token.text;
      }
      switch (token.token) {
        case 'YYYY':
          return pad(year, 4);
        case 'YY':
          return pad(year % 100);
        case 'Q':
          return String(quarterOf(date));
        case 'MMMM':
          return monthName(date, context.locale, 'long');
        case 'MMM':
          return monthName(date, context.locale, 'short');
        case 'MM':
          return pad(date.getMonth() + 1);
        case 'M':
          return String(date.getMonth() + 1);
        case 'DD':
          return pad(date.getDate());
        case 'D':
          return String(date.getDate());
        case 'dddd':
          return new Intl.DateTimeFormat(context.locale, {
            weekday: 'long',
          }).format(date);
        case 'ddd':
          return new Intl.DateTimeFormat(context.locale, {
            weekday: 'short',
          }).format(date);
        case 'ww':
          return pad(week.week);
        case 'w':
          return String(week.week);
        case 'HH':
          return pad(date.getHours());
        case 'H':
          return String(date.getHours());
        case 'hh':
          return pad(hours12);
        case 'h':
          return String(hours12);
        case 'mm':
          return pad(date.getMinutes());
        case 'm':
          return String(date.getMinutes());
        case 'ss':
          return pad(date.getSeconds());
        case 's':
          return String(date.getSeconds());
        case 'A':
          return dayPeriod(date, context.locale);
        case 'a':
          return dayPeriod(date, context.locale).toLowerCase();
        default:
          return token.token;
      }
    })
    .join('');
}

/** Bidi marks `Intl` sprinkles into RTL output; they never carry meaning here. */
const BIDI_MARKS = /[‎‏؜]/g;

/**
 * Maps any Unicode decimal digit to ASCII, so a date typed (or formatted by
 * `Intl`) in Arabic-Indic or Persian digits parses like a Latin one.
 */
function normalizeDigits(text: string): string {
  return text.replace(/\p{Nd}/gu, (digit) => {
    const code = digit.codePointAt(0) ?? 0x30;
    // Every Unicode `Nd` block is ten contiguous code points; find the block's
    // zero among the numbering systems `Intl` actually emits.
    const zero = DIGIT_ZEROS.find(
      (start) => code >= start && code < start + 10,
    );
    return zero === undefined ? digit : String(code - zero);
  });
}

/** ASCII, Arabic-Indic, Extended Arabic-Indic, Devanagari, Bengali, Thai, fullwidth. */
const DIGIT_ZEROS = [0x30, 0x660, 0x6f0, 0x966, 0x9e6, 0xe50, 0xff10];

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Month names for the locale, lower-cased and without trailing dots, index = month. */
function monthNameTable(locale: string | undefined): string[][] {
  return Array.from({ length: 12 }, (_, month) => {
    const date = new Date(2024, month, 15);
    return [
      monthName(date, locale, 'long'),
      monthName(date, locale, 'short'),
      // English names are always accepted as well, so `2024-Feb-05` parses in
      // any locale, as it does in most desktop date fields.
      monthName(date, 'en-US', 'long'),
      monthName(date, 'en-US', 'short'),
    ].map((name) => name.toLowerCase().replace(/\.$/, ''));
  });
}

function literalToRegExp(text: string): string {
  return Array.from(text.replace(BIDI_MARKS, ''))
    .map((char) => {
      if (/\s/.test(char)) {
        return '\\s*';
      }
      // A comma is easy to leave out when typing and never disambiguates a date.
      if (char === ',') {
        return ',?';
      }
      return escapeRegExp(char);
    })
    .join('');
}

/**
 * Parses `text` against one token pattern. Returns a local `Date` (with a time of
 * day when the pattern has time tokens), or `null` if the text does not match or
 * names a date that does not exist.
 */
export function parseWithPattern(
  text: string,
  pattern: string,
  context: AndesFormatContext,
): Date | null {
  const input = normalizeDigits(text.replace(BIDI_MARKS, '').trim());
  if (!input) {
    return null;
  }

  const tokens = tokenize(pattern);
  const fields: string[] = [];
  let source = '';
  let months: string[][] | null = null;

  for (const token of tokens) {
    if (token.kind === 'literal') {
      source += literalToRegExp(token.text);
      continue;
    }
    fields.push(token.token);
    switch (token.token) {
      case 'YYYY':
        source += '(\\d{4})';
        break;
      case 'YY':
        source += '(\\d{2})';
        break;
      case 'Q':
        source += '([1-4])';
        break;
      case 'MMMM':
      case 'MMM': {
        months ??= monthNameTable(context.locale);
        const names = [...new Set(months.flat())]
          .sort((a, b) => b.length - a.length)
          .map(escapeRegExp);
        source += `(${names.join('|')})\\.?`;
        break;
      }
      case 'dddd':
      case 'ddd':
        source += '([\\p{L}\\p{M}]+\\.?)';
        break;
      case 'A':
      case 'a':
        source += '([\\p{L}\\p{M}.\\s]+?)';
        break;
      default:
        source += '(\\d{1,2})';
    }
  }

  const match = new RegExp(`^\\s*${source}\\s*$`, 'iu').exec(input);
  if (!match) {
    return null;
  }

  let year: number | null = null;
  let month = 0;
  let day = 1;
  let quarter: number | null = null;
  let week: number | null = null;
  let hours = 0;
  let minutes = 0;
  let seconds = 0;
  let pm: boolean | null = null;
  let twelveHour = false;

  fields.forEach((token, index) => {
    const raw = match[index + 1];
    const value = Number(raw);
    switch (token) {
      case 'YYYY':
        year = value;
        break;
      case 'YY':
        // dayjs's customParseFormat pivot: 69-99 are the 1900s.
        year = value > 68 ? 1900 + value : 2000 + value;
        break;
      case 'Q':
        quarter = value;
        break;
      case 'MMMM':
      case 'MMM': {
        const name = raw.toLowerCase().replace(/\.$/, '');
        month = (months ?? []).findIndex((names) => names.includes(name));
        break;
      }
      case 'MM':
      case 'M':
        month = value - 1;
        break;
      case 'DD':
      case 'D':
        day = value;
        break;
      case 'ww':
      case 'w':
        week = value;
        break;
      case 'HH':
      case 'H':
        hours = value;
        break;
      case 'hh':
      case 'h':
        hours = value;
        twelveHour = true;
        break;
      case 'mm':
      case 'm':
        minutes = value;
        break;
      case 'ss':
      case 's':
        seconds = value;
        break;
      case 'A':
      case 'a': {
        const period = raw.trim().toLowerCase().replace(/\s|\./g, '');
        const pmName = dayPeriod(new Date(2024, 0, 1, 13), context.locale)
          .toLowerCase()
          .replace(/\s|\./g, '');
        pm = period === pmName || period === 'pm';
        break;
      }
    }
  });

  if (year === null || month < 0 || month > 11) {
    return null;
  }
  if (twelveHour) {
    if (hours < 1 || hours > 12) {
      return null;
    }
    hours = (hours % 12) + (pm ? 12 : 0);
  }
  if (hours > 23 || minutes > 59 || seconds > 59) {
    return null;
  }

  if (week !== null) {
    if (week < 1 || week > 53) {
      return null;
    }
    const start = startOfWeekNumber(year, week, context.weekStartsOn);
    // Week 53 only exists in some years; reject it when it is really week 1.
    return weekOfYear(start, context.weekStartsOn).week === week ? start : null;
  }
  if (quarter !== null) {
    return new Date(year, (quarter - 1) * 3, 1);
  }

  const date = new Date(year, month, day, hours, minutes, seconds);
  // `new Date` rolls Feb 30 into March; a date that does not round-trip its own
  // fields was never a real date.
  if (
    !isValidDate(date) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/** Tries each pattern in turn; the first that parses wins. */
export function parseWithPatterns(
  text: string,
  patterns: readonly string[],
  context: AndesFormatContext,
): Date | null {
  for (const pattern of patterns) {
    const parsed = parseWithPattern(text, pattern, context);
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

/**
 * Derives a token pattern that parses what `Intl.DateTimeFormat(locale, options)`
 * prints. This is what lets the picker keep its localized `Intl` display ("Feb 15,
 * 2024", "15 feb 2024", "2024/02/15") *and* accept that same text typed back.
 */
export function patternFromIntl(
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  // Jan 5, 13:07:09: single-digit month and day tell `M` from `MM` and `D` from `DD`.
  const sample = new Date(2024, 0, 5, 13, 7, 9);
  const format = new Intl.DateTimeFormat(locale, options);
  const hourCycle = format.resolvedOptions().hourCycle;
  const twelveHour = hourCycle === 'h11' || hourCycle === 'h12';

  return format
    .formatToParts(sample)
    .map((part) => {
      const value = normalizeDigits(part.value);
      switch (part.type) {
        case 'year':
          return value.length === 2 ? 'YY' : 'YYYY';
        case 'month':
          if (/^\d+$/.test(value)) {
            return value.length === 2 ? 'MM' : 'M';
          }
          return 'MMMM';
        case 'day':
          return value.length === 2 ? 'DD' : 'D';
        case 'weekday':
          return 'dddd';
        case 'hour':
          return twelveHour ? 'h' : 'H';
        case 'minute':
          return 'mm';
        case 'second':
          return 'ss';
        case 'dayPeriod':
          return 'A';
        case 'literal':
          return `[${part.value.replace(/]/g, '')}]`;
        default:
          // Eras, time zone names and non-Gregorian year names are display-only.
          return '';
      }
    })
    .join('');
}

/** Formats with `Intl`, the picker's default display path. */
export function formatWithIntl(
  date: Date,
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}
