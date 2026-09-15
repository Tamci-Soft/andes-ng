import {
  addDays,
  addMonths,
  addYears,
  buildCalendarWeeks,
  clampDate,
  clampWeekday,
  coerceDate,
  compareDays,
  daysInMonth,
  endOfMonth,
  formatMonthCaption,
  isInsideRange,
  isSameDay,
  isSameMonth,
  isValidDate,
  isWithinBounds,
  leadingDayCount,
  normalizeRange,
  startOfDay,
  startOfMonth,
  toDateKey,
  weekdayNames,
} from './date-utils';

/** Local-midnight constructor, so no test accidentally introduces a UTC date. */
function d(year: number, month1: number, day: number): Date {
  return new Date(year, month1 - 1, day);
}

describe('date-utils', () => {
  describe('startOfDay / startOfMonth / endOfMonth', () => {
    it('strips the time while keeping the local calendar day', () => {
      const result = startOfDay(new Date(2024, 1, 29, 23, 59, 59, 999));

      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(1);
      expect(result.getDate()).toBe(29);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('finds the first and last day of a leap February', () => {
      expect(toDateKey(startOfMonth(d(2024, 2, 15)))).toBe('2024-02-01');
      expect(toDateKey(endOfMonth(d(2024, 2, 15)))).toBe('2024-02-29');
    });

    it('finds the last day of a non-leap February', () => {
      expect(toDateKey(endOfMonth(d(2023, 2, 15)))).toBe('2023-02-28');
    });

    it('finds the last day of December without rolling into January', () => {
      expect(toDateKey(endOfMonth(d(2024, 12, 1)))).toBe('2024-12-31');
    });
  });

  describe('daysInMonth', () => {
    it.each([
      [2024, 1, 29],
      [2023, 1, 28],
      [2000, 1, 29],
      [1900, 1, 28],
      [2100, 1, 28],
    ])(
      'handles the leap rule for %i (month index %i)',
      (year, month, expected) => {
        expect(daysInMonth(year, month)).toBe(expected);
      },
    );

    it.each([
      [0, 31],
      [3, 30],
      [5, 30],
      [6, 31],
      [8, 30],
      [10, 30],
      [11, 31],
    ])('returns the length of month index %i', (month, expected) => {
      expect(daysInMonth(2024, month)).toBe(expected);
    });
  });

  describe('addDays', () => {
    it('crosses into Feb 29 in a leap year', () => {
      expect(toDateKey(addDays(d(2024, 2, 28), 1))).toBe('2024-02-29');
      expect(toDateKey(addDays(d(2024, 2, 28), 2))).toBe('2024-03-01');
    });

    it('skips Feb 29 in a non-leap year', () => {
      expect(toDateKey(addDays(d(2023, 2, 28), 1))).toBe('2023-03-01');
    });

    it('rolls Dec 31 forward into the next year', () => {
      expect(toDateKey(addDays(d(2024, 12, 31), 1))).toBe('2025-01-01');
    });

    it('rolls Jan 1 backward into the previous year', () => {
      expect(toDateKey(addDays(d(2025, 1, 1), -1))).toBe('2024-12-31');
    });

    it('returns local midnight, not a shifted timestamp', () => {
      expect(addDays(d(2024, 6, 10), 5).getHours()).toBe(0);
    });
  });

  describe('addMonths', () => {
    it('rolls December into January of the next year', () => {
      expect(toDateKey(addMonths(d(2024, 12, 15), 1))).toBe('2025-01-15');
    });

    it('rolls January back into December of the previous year', () => {
      expect(toDateKey(addMonths(d(2025, 1, 15), -1))).toBe('2024-12-15');
    });

    it('clamps Jan 31 to the end of February instead of overflowing into March', () => {
      expect(toDateKey(addMonths(d(2024, 1, 31), 1))).toBe('2024-02-29');
      expect(toDateKey(addMonths(d(2023, 1, 31), 1))).toBe('2023-02-28');
    });

    it('clamps Mar 31 to Apr 30', () => {
      expect(toDateKey(addMonths(d(2024, 3, 31), 1))).toBe('2024-04-30');
    });

    it('clamps May 31 back to Feb 29 across a three-month jump', () => {
      expect(toDateKey(addMonths(d(2024, 5, 31), -3))).toBe('2024-02-29');
    });

    it('handles multi-year offsets in either direction', () => {
      expect(toDateKey(addMonths(d(2024, 6, 15), 18))).toBe('2025-12-15');
      expect(toDateKey(addMonths(d(2024, 6, 15), -18))).toBe('2022-12-15');
    });

    it('never changes the day of month when the target month is long enough', () => {
      expect(toDateKey(addMonths(d(2024, 1, 15), 1))).toBe('2024-02-15');
    });
  });

  describe('addYears', () => {
    it('clamps Feb 29 to Feb 28 in a non-leap target year', () => {
      expect(toDateKey(addYears(d(2024, 2, 29), 1))).toBe('2025-02-28');
    });

    it('keeps Feb 29 when the target year is also a leap year', () => {
      expect(toDateKey(addYears(d(2024, 2, 29), 4))).toBe('2028-02-29');
    });
  });

  describe('comparison helpers', () => {
    it('treats different times on the same day as the same day', () => {
      expect(
        isSameDay(new Date(2024, 1, 29, 1), new Date(2024, 1, 29, 23)),
      ).toBe(true);
    });

    it('does not treat the same day number in a different month as the same day', () => {
      expect(isSameDay(d(2024, 1, 15), d(2024, 2, 15))).toBe(false);
    });

    it('returns false when either side is null', () => {
      expect(isSameDay(null, d(2024, 1, 1))).toBe(false);
      expect(isSameDay(d(2024, 1, 1), null)).toBe(false);
      expect(isSameMonth(null, null)).toBe(false);
    });

    it('compares at day granularity, ignoring the time', () => {
      expect(
        compareDays(new Date(2024, 1, 29, 23, 59), new Date(2024, 2, 1, 0, 0)),
      ).toBeLessThan(0);
      expect(
        compareDays(new Date(2024, 1, 29, 0, 0), new Date(2024, 1, 29, 23, 59)),
      ).toBe(0);
    });
  });

  describe('bounds', () => {
    it('includes both boundary days', () => {
      const min = d(2024, 2, 10);
      const max = d(2024, 2, 20);

      expect(isWithinBounds(d(2024, 2, 10), min, max)).toBe(true);
      expect(isWithinBounds(d(2024, 2, 20), min, max)).toBe(true);
      expect(isWithinBounds(d(2024, 2, 9), min, max)).toBe(false);
      expect(isWithinBounds(d(2024, 2, 21), min, max)).toBe(false);
    });

    it('treats null bounds as open', () => {
      expect(isWithinBounds(d(1900, 1, 1), null, null)).toBe(true);
      expect(isWithinBounds(d(2024, 2, 1), null, d(2024, 2, 15))).toBe(true);
      expect(isWithinBounds(d(2024, 3, 1), d(2024, 2, 15), null)).toBe(true);
    });

    it('clamps to the nearer bound and normalizes to midnight', () => {
      const min = d(2024, 2, 10);
      const max = d(2024, 2, 20);

      expect(toDateKey(clampDate(d(2024, 1, 1), min, max))).toBe('2024-02-10');
      expect(toDateKey(clampDate(d(2024, 12, 1), min, max))).toBe('2024-02-20');
      expect(toDateKey(clampDate(d(2024, 2, 15), min, max))).toBe('2024-02-15');
      expect(clampDate(new Date(2024, 1, 15, 18), min, max).getHours()).toBe(0);
    });
  });

  describe('toDateKey', () => {
    it('uses the local calendar day rather than the UTC one', () => {
      // `toISOString()` would render this as the previous day for any negative
      // UTC offset, which is exactly the bug this helper exists to avoid.
      expect(toDateKey(d(2024, 3, 1))).toBe('2024-03-01');
      expect(toDateKey(new Date(2024, 2, 1, 0, 0, 0))).toBe('2024-03-01');
    });

    it('zero-pads month and day', () => {
      expect(toDateKey(d(2024, 1, 5))).toBe('2024-01-05');
    });
  });

  describe('leadingDayCount', () => {
    it('is zero when the month starts on the week start day', () => {
      // 2015-02-01 was a Sunday.
      expect(leadingDayCount(d(2015, 2, 1), 0)).toBe(0);
    });

    it('stays positive for a Sunday 1st in a Monday-first week', () => {
      expect(leadingDayCount(d(2015, 2, 1), 1)).toBe(6);
    });

    it('counts the offset for a mid-week 1st', () => {
      // 2024-02-01 was a Thursday.
      expect(leadingDayCount(d(2024, 2, 1), 0)).toBe(4);
      expect(leadingDayCount(d(2024, 2, 1), 1)).toBe(3);
    });
  });

  describe('clampWeekday', () => {
    it('passes through every valid weekday index unchanged', () => {
      for (let day = 0; day <= 6; day++) {
        expect(clampWeekday(day)).toBe(day);
      }
    });

    it('falls back to 0 for a non-integer value', () => {
      expect(clampWeekday(Number.NaN)).toBe(0);
      expect(clampWeekday(1.5)).toBe(0);
    });

    it('falls back to 0 for an out-of-range value instead of indexing past the valid range', () => {
      expect(clampWeekday(7)).toBe(0);
      expect(clampWeekday(-1)).toBe(0);
      expect(clampWeekday(100)).toBe(0);
    });
  });

  describe('buildCalendarWeeks', () => {
    it('renders a leap February aligned to the correct weekday', () => {
      const weeks = buildCalendarWeeks(d(2024, 2, 1), 0);

      // Feb 2024: 29 days starting Thursday -> 4 leading cells, 33 natural
      // cells, so 5 rows of 7.
      expect(weeks).toHaveLength(5);
      expect(weeks.every((week) => week.days.length === 7)).toBe(true);

      const firstRow = weeks[0].days;
      expect(firstRow.slice(0, 4).every((day) => day.outside)).toBe(true);
      expect(firstRow[4].outside).toBe(false);
      expect(firstRow[4].dayOfMonth).toBe(1);
      expect(firstRow[4].key).toBe('2024-02-01');
      // The 1st must land in the Thursday column.
      expect(firstRow[4].date.getDay()).toBe(4);

      const inMonth = weeks
        .flatMap((week) => week.days)
        .filter((day) => !day.outside);
      expect(inMonth).toHaveLength(29);
      expect(inMonth.at(-1)?.key).toBe('2024-02-29');
    });

    it('renders a non-leap February with 28 in-month days', () => {
      const inMonth = buildCalendarWeeks(d(2023, 2, 1), 0)
        .flatMap((week) => week.days)
        .filter((day) => !day.outside);

      expect(inMonth).toHaveLength(28);
      expect(inMonth.at(-1)?.key).toBe('2023-02-28');
    });

    it('fits a Sunday-starting, Saturday-ending February into exactly four rows', () => {
      // 2015-02-01 was a Sunday and 2015-02-28 a Saturday, so with a Sunday week
      // start the month tiles perfectly with no outside days at all.
      const weeks = buildCalendarWeeks(d(2015, 2, 1), 0);

      expect(weeks).toHaveLength(4);
      expect(
        weeks.flatMap((week) => week.days).some((day) => day.outside),
      ).toBe(false);
      expect(weeks[0].days[0].key).toBe('2015-02-01');
      expect(weeks[3].days[6].key).toBe('2015-02-28');
    });

    it('spills that same February onto an extra row in a Monday-first week', () => {
      const weeks = buildCalendarWeeks(d(2015, 2, 1), 1);

      expect(weeks).toHaveLength(5);
      expect(weeks[0].days[0].date.getDay()).toBe(1);
      expect(weeks[0].days[6].key).toBe('2015-02-01');
    });

    it('bridges the December to January rollover with the right outside days', () => {
      const weeks = buildCalendarWeeks(d(2024, 12, 1), 0);
      const days = weeks.flatMap((week) => week.days);

      // 2024-12-01 was a Sunday, so there are no leading outside days.
      expect(days[0].key).toBe('2024-12-01');
      expect(days[0].outside).toBe(false);

      const inMonth = days.filter((day) => !day.outside);
      expect(inMonth).toHaveLength(31);
      expect(inMonth.at(-1)?.key).toBe('2024-12-31');

      // Trailing cells must come from January 2025, not January 2024.
      const trailing = days.filter((day) => day.outside);
      expect(trailing.length).toBeGreaterThan(0);
      expect(trailing.every((day) => day.date.getFullYear() === 2025)).toBe(
        true,
      );
      expect(trailing[0].key).toBe('2025-01-01');
    });

    it('bridges the January back to December rollover', () => {
      const leading = buildCalendarWeeks(d(2025, 1, 1), 0)
        .flatMap((week) => week.days)
        .filter((day) => day.outside && day.date.getMonth() === 11);

      expect(leading.every((day) => day.date.getFullYear() === 2024)).toBe(
        true,
      );
      expect(leading.at(-1)?.key).toBe('2024-12-31');
    });

    it('produces strictly consecutive days across every row boundary', () => {
      const days = buildCalendarWeeks(d(2024, 2, 1), 0).flatMap(
        (week) => week.days,
      );

      for (let index = 1; index < days.length; index++) {
        expect(toDateKey(addDays(days[index - 1].date, 1))).toBe(
          days[index].key,
        );
      }
    });

    it('keeps every cell at local midnight across a DST transition month', () => {
      // March 2024 contains the northern-hemisphere DST start in most zones; a
      // millisecond-arithmetic implementation drifts to 23:00 partway through.
      const days = buildCalendarWeeks(d(2024, 3, 1), 0).flatMap(
        (week) => week.days,
      );

      expect(days.every((day) => day.date.getHours() === 0)).toBe(true);
      expect(days.every((day) => day.date.getMinutes() === 0)).toBe(true);
    });

    it('pads to a constant six rows when fixedWeeks is set', () => {
      expect(buildCalendarWeeks(d(2015, 2, 1), 0, true)).toHaveLength(6);
      expect(buildCalendarWeeks(d(2024, 2, 1), 0, true)).toHaveLength(6);
    });

    it('starts each row on the configured week start day', () => {
      for (const weekStartsOn of [0, 1, 6] as const) {
        const weeks = buildCalendarWeeks(d(2024, 5, 1), weekStartsOn);
        expect(
          weeks.every((week) => week.days[0].date.getDay() === weekStartsOn),
        ).toBe(true);
      }
    });
  });

  describe('weekdayNames', () => {
    it('returns seven localized names starting at the configured day', () => {
      const sundayFirst = weekdayNames('en-US', 0);
      const mondayFirst = weekdayNames('en-US', 1);

      expect(sundayFirst).toHaveLength(7);
      expect(sundayFirst[0].long).toBe('Sunday');
      expect(mondayFirst[0].long).toBe('Monday');
      expect(mondayFirst.at(-1)?.long).toBe('Sunday');
    });

    it('localizes rather than hard-coding English', () => {
      const spanish = weekdayNames('es-ES', 1);

      expect(spanish[0].long.toLowerCase()).toBe('lunes');
      expect(spanish[0].long).not.toBe('Monday');
    });
  });

  describe('formatMonthCaption', () => {
    it('includes the localized month name and the year', () => {
      expect(formatMonthCaption(d(2024, 2, 1), 'en-US')).toBe('February 2024');
      expect(formatMonthCaption(d(2024, 2, 1), 'es-ES')).toContain('febrero');
      expect(formatMonthCaption(d(2024, 2, 1), 'es-ES')).toContain('2024');
    });
  });

  describe('coerceDate', () => {
    it('parses an ISO date-only string as a local date', () => {
      const parsed = coerceDate('2024-03-01');

      expect(toDateKey(parsed as Date)).toBe('2024-03-01');
      expect((parsed as Date).getDate()).toBe(1);
      expect((parsed as Date).getMonth()).toBe(2);
    });

    it('normalizes a Date with a time component to midnight', () => {
      expect(coerceDate(new Date(2024, 1, 29, 18, 30))?.getHours()).toBe(0);
    });

    it('accepts an epoch number', () => {
      const source = d(2024, 2, 29);
      expect(toDateKey(coerceDate(source.getTime()) as Date)).toBe(
        '2024-02-29',
      );
    });

    it('returns null for empty and invalid input', () => {
      expect(coerceDate(null)).toBeNull();
      expect(coerceDate(undefined)).toBeNull();
      expect(coerceDate('')).toBeNull();
      expect(coerceDate('not a date')).toBeNull();
      expect(coerceDate(new Date(Number.NaN))).toBeNull();
      expect(coerceDate({})).toBeNull();
    });
  });

  describe('isValidDate', () => {
    it('rejects Invalid Date and non-dates', () => {
      expect(isValidDate(new Date(2024, 0, 1))).toBe(true);
      expect(isValidDate(new Date(Number.NaN))).toBe(false);
      expect(isValidDate('2024-01-01')).toBe(false);
      expect(isValidDate(null)).toBe(false);
    });
  });

  describe('normalizeRange', () => {
    it('leaves an already ordered range alone', () => {
      const range = normalizeRange({
        start: d(2024, 2, 10),
        end: d(2024, 2, 20),
      });

      expect(toDateKey(range.start)).toBe('2024-02-10');
      expect(toDateKey(range.end as Date)).toBe('2024-02-20');
    });

    it('swaps a backwards range so start precedes end', () => {
      const range = normalizeRange({
        start: d(2024, 2, 20),
        end: d(2024, 2, 10),
      });

      expect(toDateKey(range.start)).toBe('2024-02-10');
      expect(toDateKey(range.end as Date)).toBe('2024-02-20');
    });

    it('keeps a half-open range half-open', () => {
      const range = normalizeRange({ start: d(2024, 2, 20), end: null });

      expect(toDateKey(range.start)).toBe('2024-02-20');
      expect(range.end).toBeNull();
    });

    it('normalizes both boundaries to midnight', () => {
      const range = normalizeRange({
        start: new Date(2024, 1, 10, 9),
        end: new Date(2024, 1, 20, 21),
      });

      expect(range.start.getHours()).toBe(0);
      expect((range.end as Date).getHours()).toBe(0);
    });
  });

  describe('isInsideRange', () => {
    const range = { start: d(2024, 2, 10), end: d(2024, 2, 20) };

    it('is true strictly between the boundaries', () => {
      expect(isInsideRange(d(2024, 2, 15), range)).toBe(true);
    });

    it('excludes the boundaries themselves', () => {
      expect(isInsideRange(d(2024, 2, 10), range)).toBe(false);
      expect(isInsideRange(d(2024, 2, 20), range)).toBe(false);
    });

    it('is false for a half-open or missing range', () => {
      expect(
        isInsideRange(d(2024, 2, 15), { start: d(2024, 2, 10), end: null }),
      ).toBe(false);
      expect(isInsideRange(d(2024, 2, 15), null)).toBe(false);
    });
  });
});
