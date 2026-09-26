import {
  formatWithPattern,
  parseWithPattern,
  parseWithPatterns,
  patternFromIntl,
} from './date-format';
import { toDateKey } from './date-utils';

/** `YYYY-MM-DD` of a parse result, or `null` when it did not parse. */
const keyOf = (date: Date | null) => (date ? toDateKey(date) : null);

const en = { locale: 'en-US', weekStartsOn: 0 } as const;
const iso = { locale: 'en-GB', weekStartsOn: 1 } as const;

describe('date-format', () => {
  describe('formatWithPattern', () => {
    const date = new Date(2024, 1, 5, 14, 7, 9);

    it('formats numeric tokens, padded and unpadded', () => {
      expect(formatWithPattern(date, 'YYYY-MM-DD', en)).toBe('2024-02-05');
      expect(formatWithPattern(date, 'D/M/YY', en)).toBe('5/2/24');
      expect(formatWithPattern(date, 'HH:mm:ss', en)).toBe('14:07:09');
      expect(formatWithPattern(date, 'h:mm A', en)).toBe('2:07 PM');
    });

    it('formats localized month names', () => {
      expect(formatWithPattern(date, 'D MMMM YYYY', en)).toBe(
        '5 February 2024',
      );
      expect(
        formatWithPattern(date, 'D MMMM YYYY', { ...en, locale: 'es-ES' }),
      ).toBe('5 febrero 2024');
    });

    it('keeps bracketed text literal', () => {
      expect(formatWithPattern(date, 'YYYY-[Q]Q', en)).toBe('2024-Q1');
      expect(formatWithPattern(date, '[Year] YYYY', en)).toBe('Year 2024');
    });

    it('prints the week-numbering year alongside a week token', () => {
      // 2024-12-30 is a Monday in ISO week 1 of 2025.
      expect(formatWithPattern(new Date(2024, 11, 30), 'YYYY-[W]ww', iso)).toBe(
        '2025-W01',
      );
      expect(formatWithPattern(new Date(2024, 1, 12), 'YYYY-[W]ww', iso)).toBe(
        '2024-W07',
      );
    });
  });

  describe('parseWithPattern', () => {
    it('parses a numeric date as a local date', () => {
      const parsed = parseWithPattern('2024-03-01', 'YYYY-MM-DD', en);
      expect(parsed && toDateKey(parsed)).toBe('2024-03-01');
      expect(parsed?.getHours()).toBe(0);
    });

    it('accepts one-digit fields and flexible whitespace', () => {
      const parsed = parseWithPattern(' 5/2/2024 ', 'DD/MM/YYYY', en);
      expect(parsed && toDateKey(parsed)).toBe('2024-02-05');
    });

    it('rejects dates that do not exist instead of rolling them over', () => {
      expect(parseWithPattern('2023-02-29', 'YYYY-MM-DD', en)).toBeNull();
      expect(parseWithPattern('2024-02-30', 'YYYY-MM-DD', en)).toBeNull();
      expect(parseWithPattern('2024-13-01', 'YYYY-MM-DD', en)).toBeNull();
      // ...while a real leap day parses.
      expect(parseWithPattern('2024-02-29', 'YYYY-MM-DD', en)).not.toBeNull();
    });

    it('rejects text that does not match the pattern', () => {
      expect(parseWithPattern('Feb 5', 'YYYY-MM-DD', en)).toBeNull();
      expect(parseWithPattern('', 'YYYY-MM-DD', en)).toBeNull();
    });

    it('parses month names case-insensitively, in the locale and in English', () => {
      const spanish = { ...en, locale: 'es-ES' };
      expect(
        keyOf(parseWithPattern('5 FEBRERO 2024', 'D MMMM YYYY', spanish)),
      ).toBe('2024-02-05');
      expect(keyOf(parseWithPattern('5 feb 2024', 'D MMM YYYY', spanish))).toBe(
        '2024-02-05',
      );
      expect(
        keyOf(parseWithPattern('5 February 2024', 'D MMM YYYY', spanish)),
      ).toBe('2024-02-05');
    });

    it('tolerates a missing comma', () => {
      expect(keyOf(parseWithPattern('Feb 5 2024', 'MMM D, YYYY', en))).toBe(
        '2024-02-05',
      );
    });

    it('pivots two-digit years like dayjs', () => {
      expect(parseWithPattern('01/01/24', 'DD/MM/YY', en)?.getFullYear()).toBe(
        2024,
      );
      expect(parseWithPattern('01/01/99', 'DD/MM/YY', en)?.getFullYear()).toBe(
        1999,
      );
    });

    it('parses time of day, including a 12-hour clock', () => {
      const parsed = parseWithPattern(
        '2024-02-05 2:07 pm',
        'YYYY-MM-DD h:mm A',
        en,
      );
      expect(parsed?.getHours()).toBe(14);
      expect(parsed?.getMinutes()).toBe(7);
      expect(
        parseWithPattern(
          '2024-02-05 12:00 AM',
          'YYYY-MM-DD h:mm A',
          en,
        )?.getHours(),
      ).toBe(0);
      expect(
        parseWithPattern('2024-02-05 24:00', 'YYYY-MM-DD HH:mm', en),
      ).toBeNull();
    });

    it('parses quarters to their first day', () => {
      expect(keyOf(parseWithPattern('2024-Q3', 'YYYY-[Q]Q', en))).toBe(
        '2024-07-01',
      );
    });

    it('parses week numbers to the first day of the week', () => {
      expect(keyOf(parseWithPattern('2025-W01', 'YYYY-[W]ww', iso))).toBe(
        '2024-12-30',
      );
      expect(keyOf(parseWithPattern('2024-W07', 'YYYY-[W]ww', iso))).toBe(
        '2024-02-12',
      );
      // 2025 has no ISO week 53.
      expect(parseWithPattern('2025-W53', 'YYYY-[W]ww', iso)).toBeNull();
    });

    it('accepts non-Latin digits', () => {
      expect(keyOf(parseWithPattern('٢٠٢٤-٠٢-٠٥', 'YYYY-MM-DD', en))).toBe(
        '2024-02-05',
      );
    });
  });

  describe('parseWithPatterns', () => {
    it('returns the first pattern that parses', () => {
      const patterns = ['DD/MM/YYYY', 'YYYY-MM-DD'];
      expect(keyOf(parseWithPatterns('05/02/2024', patterns, en))).toBe(
        '2024-02-05',
      );
      expect(keyOf(parseWithPatterns('2024-02-05', patterns, en))).toBe(
        '2024-02-05',
      );
      expect(parseWithPatterns('nope', patterns, en)).toBeNull();
    });
  });

  describe('patternFromIntl', () => {
    function roundTrip(
      locale: string,
      options: Intl.DateTimeFormatOptions,
      date = new Date(2024, 1, 15),
    ) {
      const text = new Intl.DateTimeFormat(locale, options).format(date);
      return parseWithPattern(text, patternFromIntl(locale, options), {
        locale,
        weekStartsOn: 0,
      });
    }

    it.each([
      ['en-US', { dateStyle: 'medium' }],
      ['en-GB', { dateStyle: 'medium' }],
      ['es-ES', { dateStyle: 'medium' }],
      ['es-PE', { dateStyle: 'short' }],
      ['fr-FR', { dateStyle: 'long' }],
      ['ja-JP', { dateStyle: 'medium' }],
      ['de-DE', { dateStyle: 'full' }],
      ['en-US', { month: 'short', year: 'numeric' }],
    ] as const)('parses what Intl prints for %s %j', (locale, options) => {
      const parsed = roundTrip(locale, options);
      expect(parsed).not.toBeNull();
      expect(parsed?.getFullYear()).toBe(2024);
      expect(parsed?.getMonth()).toBe(1);
    });

    it('round-trips a date and time', () => {
      const parsed = roundTrip(
        'en-US',
        { dateStyle: 'medium', timeStyle: 'short' },
        new Date(2024, 1, 15, 21, 45),
      );
      expect(parsed?.getHours()).toBe(21);
      expect(parsed?.getMinutes()).toBe(45);
    });
  });
});
