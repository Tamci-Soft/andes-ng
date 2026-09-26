/**
 * Date helpers for `AndesCalendar`, built on the native `Date` and `Intl` only —
 * no `date-fns`/`dayjs` dependency, matching the rest of the library.
 *
 * ## The one invariant everything here relies on
 *
 * Every date this module produces is a **local midnight**: `new Date(y, m, d)`.
 * The calendar grid is a calendar-days widget, so two dates are "the same day"
 * when their local Y/M/D match — never when their epoch milliseconds do. Mixing
 * `getUTCDate()` with `getDate()` is what makes hand-rolled calendars render the
 * wrong month for users west of UTC, so the UTC accessors are deliberately not
 * used anywhere in this file.
 *
 * Month/day arithmetic goes through the `Date` constructor's own normalization
 * (`new Date(2024, 1, 30)` → 2024-03-01), which already knows leap years and
 * month lengths. The only place that needs explicit care is adding *months*,
 * where the naive version silently skips (Jan 31 + 1 month → Mar 2/3); see
 * {@link addMonths}.
 */

/** A day-granularity selection range. `end` is `null` while the range is half-open. */
export interface AndesDateRange {
  readonly start: Date;
  readonly end: Date | null;
}

/** First day of the week, `0` = Sunday through `6` = Saturday. */
export type AndesWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** One rendered day cell. */
export interface AndesCalendarDay {
  /** Local midnight of the day this cell represents. */
  readonly date: Date;
  /** Stable `YYYY-MM-DD` key, used for `@for` tracking and DOM lookup. */
  readonly key: string;
  /** Day of the month, 1-31. */
  readonly dayOfMonth: number;
  /** Whether the day belongs to a month other than the one being displayed. */
  readonly outside: boolean;
}

/** One rendered week row. */
export interface AndesCalendarWeek {
  /** Stable key for `@for` tracking: the `YYYY-MM-DD` of the week's first day. */
  readonly key: string;
  readonly days: readonly AndesCalendarDay[];
}

/** Local midnight of the given date. The canonical form for every date here. */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** Local midnight of the first day of the given date's month. */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/**
 * Number of days in the given month. `day 0` of the *next* month is the last day
 * of this one, so the native constructor answers this without a leap-year table.
 */
export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Local midnight of the last day of the given date's month. */
export function endOfMonth(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    daysInMonth(date.getFullYear(), date.getMonth()),
  );
}

/**
 * Adds days, letting the `Date` constructor normalize the overflow. Crossing a
 * DST boundary is safe because the result is rebuilt from Y/M/D rather than by
 * adding milliseconds.
 */
export function addDays(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

/**
 * Adds months, clamping the day to the target month's length.
 *
 * The naive `new Date(y, m + n, d)` overflows instead of clamping: Jan 31 plus
 * one month becomes Mar 2 (or Mar 3 in a leap year), so a "next month" key press
 * from Jan 31 would skip February entirely. Clamping gives Feb 28/29 instead,
 * which is what every calendar UI does.
 */
export function addMonths(date: Date, amount: number): Date {
  const year = date.getFullYear();
  const month = date.getMonth() + amount;
  // Normalize the month index (which may be negative or > 11) into a year/month
  // pair before measuring the target month's length.
  const target = new Date(year, month, 1);
  const clampedDay = Math.min(
    date.getDate(),
    daysInMonth(target.getFullYear(), target.getMonth()),
  );
  return new Date(target.getFullYear(), target.getMonth(), clampedDay);
}

/** Adds years, clamping Feb 29 to Feb 28 in a non-leap target year. */
export function addYears(date: Date, amount: number): Date {
  return addMonths(date, amount * 12);
}

/** Whether two dates fall on the same local calendar day. */
export function isSameDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) {
    return false;
  }
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Whether two dates fall in the same local calendar month. */
export function isSameMonth(a: Date | null, b: Date | null): boolean {
  if (!a || !b) {
    return false;
  }
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

/**
 * Day-granularity comparison: negative if `a` is an earlier day than `b`, `0` on
 * the same day, positive otherwise. Comparing normalized midnights means a
 * 23:59 timestamp never sorts after the next day's 00:00.
 */
export function compareDays(a: Date, b: Date): number {
  return startOfDay(a).getTime() - startOfDay(b).getTime();
}

/** Whether `date` falls within `[min, max]` at day granularity. `null` bounds are open. */
export function isWithinBounds(
  date: Date,
  min: Date | null,
  max: Date | null,
): boolean {
  if (min && compareDays(date, min) < 0) {
    return false;
  }
  if (max && compareDays(date, max) > 0) {
    return false;
  }
  return true;
}

/** Pulls `date` into `[min, max]`, returning it unchanged when already inside. */
export function clampDate(
  date: Date,
  min: Date | null,
  max: Date | null,
): Date {
  if (min && compareDays(date, min) < 0) {
    return startOfDay(min);
  }
  if (max && compareDays(date, max) > 0) {
    return startOfDay(max);
  }
  return startOfDay(date);
}

/**
 * Stable `YYYY-MM-DD` key from the *local* Y/M/D.
 *
 * Deliberately not `toISOString()`, which converts to UTC first and would label
 * local midnight of Mar 1 in São Paulo as `2026-02-28`.
 */
export function toDateKey(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Whether the value is a usable `Date` (not `Invalid Date`). */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

/**
 * Clamps a `numberAttribute`-coerced `weekStartsOn` value into the valid
 * `AndesWeekday` range (`0`-`6`), falling back to `0` (Sunday) for anything
 * that is not a whole number in that range (`NaN` from a non-numeric bare
 * attribute, or an out-of-range integer like `7` or `-1`).
 *
 * Shared by `AndesCalendar` and `AndesDatePicker`: both declare their own
 * `weekStartsOn` input and both need the same guard, because a bare
 * `weekStartsOn="1"` attribute (no square brackets) reaches Angular as the
 * *string* `"1"`, not the number `1`. Left uncoerced, that string survives
 * into {@link weekdayNames}'s `(weekStartsOn + index) % 7`, where `+` on a
 * string operand is concatenation, not addition — `"1" + 0` produces the
 * string `"10"`, and `"10" % 7` coerces back to a number for a silently
 * wrong result (`3`) instead of the intended `1`.
 */
export function clampWeekday(value: number): AndesWeekday {
  if (!Number.isInteger(value) || value < 0 || value > 6) {
    return 0;
  }
  return value as AndesWeekday;
}

/**
 * How many cells precede the 1st of the month, given which weekday the week
 * starts on. The `+ 7` keeps the modulo positive for e.g. a Sunday 1st in a
 * Monday-first week.
 */
export function leadingDayCount(
  monthStart: Date,
  weekStartsOn: AndesWeekday,
): number {
  return (monthStart.getDay() - weekStartsOn + 7) % 7;
}

/**
 * Builds the month's day grid as whole weeks, always starting on `weekStartsOn`.
 *
 * Leading/trailing cells come from the adjacent months so every row has exactly
 * seven cells — a grid with a ragged first row is what breaks arrow-key
 * navigation and screen-reader row/column announcements. The number of rows is
 * whatever the month needs (4 for a non-leap February starting on the week's
 * first day, up to 6), unless `fixedWeeks` pads it to a constant 6 so the panel
 * does not change height as the user pages through months.
 */
export function buildCalendarWeeks(
  visibleMonth: Date,
  weekStartsOn: AndesWeekday = 0,
  fixedWeeks = false,
): readonly AndesCalendarWeek[] {
  const monthStart = startOfMonth(visibleMonth);
  const month = monthStart.getMonth();
  const gridStart = addDays(
    monthStart,
    -leadingDayCount(monthStart, weekStartsOn),
  );

  const totalDays = daysInMonth(monthStart.getFullYear(), month);
  const naturalCells = leadingDayCount(monthStart, weekStartsOn) + totalDays;
  const weekCount = fixedWeeks ? 6 : Math.ceil(naturalCells / 7);

  const weeks: AndesCalendarWeek[] = [];
  for (let week = 0; week < weekCount; week++) {
    const days: AndesCalendarDay[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const date = addDays(gridStart, week * 7 + dayIndex);
      days.push({
        date,
        key: toDateKey(date),
        dayOfMonth: date.getDate(),
        outside: date.getMonth() !== month,
      });
    }
    weeks.push({ key: days[0].key, days });
  }
  return weeks;
}

/**
 * Localized weekday names for the column headers, in the order the grid renders
 * them. Derived from `Intl` against a known week (2021-08-01 was a Sunday) so no
 * English weekday string is ever hard-coded.
 */
export function weekdayNames(
  locale: string | undefined,
  weekStartsOn: AndesWeekday = 0,
): readonly {
  readonly key: string;
  readonly short: string;
  readonly long: string;
}[] {
  const shortFormat = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const longFormat = new Intl.DateTimeFormat(locale, { weekday: 'long' });
  // A Sunday, so `+ index` walks Sunday..Saturday regardless of the locale.
  const knownSunday = new Date(2021, 7, 1);

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(knownSunday, (weekStartsOn + index) % 7);
    return {
      key: String(date.getDay()),
      short: shortFormat.format(date),
      long: longFormat.format(date),
    };
  });
}

/** Localized "month year" caption, e.g. `February 2024` / `febrero de 2024`. */
export function formatMonthCaption(
  date: Date,
  locale: string | undefined,
): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

/** Localized full-date label for a day cell's accessible name. */
export function formatDayLabel(date: Date, locale: string | undefined): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'full' }).format(date);
}

/** Localized display value for a selected date, honouring caller format options. */
export function formatDate(
  date: Date,
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' },
): string {
  return new Intl.DateTimeFormat(locale, options).format(date);
}

/**
 * Normalizes an unknown incoming value (a `ControlValueAccessor` gets whatever
 * the consumer's form holds) into a local-midnight `Date`, or `null`.
 *
 * An ISO `YYYY-MM-DD` string is parsed as a *local* date rather than handed to
 * `new Date(string)`, which the spec says to read as UTC midnight — that is the
 * classic "my date picker shows yesterday" bug for negative-offset timezones.
 */
export function coerceDate(value: unknown): Date | null {
  if (value == null || value === '') {
    return null;
  }
  if (value instanceof Date) {
    return isValidDate(value) ? startOfDay(value) : null;
  }
  if (typeof value === 'number') {
    const fromEpoch = new Date(value);
    return isValidDate(fromEpoch) ? startOfDay(fromEpoch) : null;
  }
  if (typeof value === 'string') {
    const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      const parsed = new Date(Number(year), Number(month) - 1, Number(day));
      return isValidDate(parsed) ? parsed : null;
    }
    const parsed = new Date(value);
    return isValidDate(parsed) ? startOfDay(parsed) : null;
  }
  return null;
}

/**
 * Orders a range's boundaries so `start` is never after `end`. Selecting the end
 * before the start is a normal way to drag a range backwards, not an error.
 */
export function normalizeRange(range: AndesDateRange): AndesDateRange {
  const { start, end } = range;
  if (end && compareDays(start, end) > 0) {
    return { start: startOfDay(end), end: startOfDay(start) };
  }
  return {
    start: startOfDay(start),
    end: end ? startOfDay(end) : null,
  };
}

/**
 * Normalizes any of the accepted range shapes — a bare `Date`, a `[start, end]`
 * tuple, or `{ start, end }` — into an ordered `{ start, end }`, or `null`.
 *
 * Takes `unknown` because both the calendar's `value` input and the date picker's
 * `ControlValueAccessor` receive whatever shape the consumer's form happens to
 * hold, and neither should crash on a surprise.
 */
export function toDateRange(value: unknown): AndesDateRange | null {
  if (value == null || value === '') {
    return null;
  }
  if (Array.isArray(value)) {
    const start = coerceDate(value[0]);
    return start ? normalizeRange({ start, end: coerceDate(value[1]) }) : null;
  }
  if (
    value instanceof Date ||
    typeof value === 'string' ||
    typeof value === 'number'
  ) {
    const start = coerceDate(value);
    return start ? { start, end: null } : null;
  }
  if (typeof value === 'object') {
    const candidate = value as { start?: unknown; end?: unknown };
    const start = coerceDate(candidate.start);
    return start
      ? normalizeRange({ start, end: coerceDate(candidate.end) })
      : null;
  }
  return null;
}

/** Whether `date` falls strictly between a complete range's boundaries. */
export function isInsideRange(
  date: Date,
  range: AndesDateRange | null,
): boolean {
  if (!range?.end) {
    return false;
  }
  return compareDays(date, range.start) > 0 && compareDays(date, range.end) < 0;
}

/**
 * Today's local date at midnight. A seam for tests, which need a fixed "today"
 * without freezing the whole clock.
 */
export function today(): Date {
  return startOfDay(new Date());
}

// --- Periods: week / month / quarter / year --------------------------------

/**
 * The granularity a picker selects at. A `month` picker's value is the first
 * day of the chosen month, a `week` picker's value the first day of the chosen
 * week, and so on.
 */
export type AndesPickerType = 'date' | 'week' | 'month' | 'quarter' | 'year';

/**
 * Which grid the calendar is currently drawing. `week` has no view of its own: a
 * week picker draws the day grid and selects whole rows of it.
 */
export type AndesCalendarView = 'date' | 'month' | 'quarter' | 'year';

/** The view a picker type opens on. */
export function baseViewFor(picker: AndesPickerType): AndesCalendarView {
  return picker === 'week' ? 'date' : picker;
}

/** Local midnight of the first day of the week containing `date`. */
export function startOfWeek(date: Date, weekStartsOn: AndesWeekday = 0): Date {
  return addDays(date, -((date.getDay() - weekStartsOn + 7) % 7));
}

/** Local midnight of the first day of the quarter containing `date`. */
export function startOfQuarter(date: Date): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth() - (date.getMonth() % 3),
    1,
  );
}

/** Local midnight of January 1st of `date`'s year. */
export function startOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

/** January 1st of the first year of `date`'s decade (2020 for 2024). */
export function startOfDecade(date: Date): Date {
  const year = date.getFullYear();
  return new Date(year - (((year % 10) + 10) % 10), 0, 1);
}

/** 1-4. */
export function quarterOf(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

/** The first day of the period of the given granularity that contains `date`. */
export function startOfPeriod(
  date: Date,
  unit: AndesPickerType,
  weekStartsOn: AndesWeekday = 0,
): Date {
  switch (unit) {
    case 'date':
      return startOfDay(date);
    case 'week':
      return startOfWeek(date, weekStartsOn);
    case 'month':
      return startOfMonth(date);
    case 'quarter':
      return startOfQuarter(date);
    case 'year':
      return startOfYear(date);
  }
}

/** The last day (local midnight) of the period of the given granularity. */
export function endOfPeriod(
  date: Date,
  unit: AndesPickerType,
  weekStartsOn: AndesWeekday = 0,
): Date {
  switch (unit) {
    case 'date':
      return startOfDay(date);
    case 'week':
      return addDays(startOfWeek(date, weekStartsOn), 6);
    case 'month':
      return endOfMonth(date);
    case 'quarter':
      return endOfMonth(addMonths(startOfQuarter(date), 2));
    case 'year':
      return new Date(date.getFullYear(), 11, 31);
  }
}

/** Compares the periods containing `a` and `b`: negative, `0` or positive. */
export function comparePeriods(
  a: Date,
  b: Date,
  unit: AndesPickerType,
  weekStartsOn: AndesWeekday = 0,
): number {
  return compareDays(
    startOfPeriod(a, unit, weekStartsOn),
    startOfPeriod(b, unit, weekStartsOn),
  );
}

/** Whether `a` and `b` fall in the same period. `null` never matches. */
export function isSamePeriod(
  a: Date | null,
  b: Date | null,
  unit: AndesPickerType,
  weekStartsOn: AndesWeekday = 0,
): boolean {
  return !!a && !!b && comparePeriods(a, b, unit, weekStartsOn) === 0;
}

/**
 * How many days of a week must fall in the new year for that week to be the
 * year's week 1. Monday-first weeks follow ISO 8601 (the week holding the first
 * Thursday, i.e. 4 days); every other week start follows the North American rule
 * (the week holding January 1st, i.e. 1 day). This is the same split CLDR makes.
 */
function minimalDaysInFirstWeek(weekStartsOn: AndesWeekday): number {
  return weekStartsOn === 1 ? 4 : 1;
}

/**
 * The week-numbering year and week number of `date`. The week-year can differ
 * from the calendar year at the edges: 2024-12-30 is ISO week 1 of 2025.
 */
export function weekOfYear(
  date: Date,
  weekStartsOn: AndesWeekday = 0,
): { readonly year: number; readonly week: number } {
  // A week belongs to the year that holds its "anchor" day - the Thursday for
  // ISO weeks, the Saturday for Sunday-first weeks.
  const anchor = addDays(
    startOfWeek(date, weekStartsOn),
    7 - minimalDaysInFirstWeek(weekStartsOn),
  );
  const year = anchor.getFullYear();
  const dayOfYear =
    Math.round(
      (anchor.getTime() - new Date(year, 0, 1).getTime()) / 86_400_000,
    ) + 1;
  return { year, week: Math.floor((dayOfYear - 1) / 7) + 1 };
}

/** First day of week `week` of week-numbering year `year`. Inverse of {@link weekOfYear}. */
export function startOfWeekNumber(
  year: number,
  week: number,
  weekStartsOn: AndesWeekday = 0,
): Date {
  const firstWeek = startOfWeek(
    new Date(year, 0, minimalDaysInFirstWeek(weekStartsOn)),
    weekStartsOn,
  );
  return addDays(firstWeek, (week - 1) * 7);
}

/** Wall-clock time of day, used by the date picker's `showTime` columns. */
export interface AndesTimeOfDay {
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
}

export const MIDNIGHT: AndesTimeOfDay = { hours: 0, minutes: 0, seconds: 0 };

/** The time-of-day part of a date. */
export function timeOf(date: Date | null): AndesTimeOfDay {
  return date
    ? {
        hours: date.getHours(),
        minutes: date.getMinutes(),
        seconds: date.getSeconds(),
      }
    : MIDNIGHT;
}

/** `day`'s calendar date at `time`, in local time. */
export function withTime(day: Date, time: AndesTimeOfDay): Date {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    time.hours,
    time.minutes,
    time.seconds,
  );
}

/**
 * Like {@link coerceDate}, but keeps the time of day. Used where a value may carry
 * a time (`showTime`). ISO strings with a time and no offset (`2024-02-15T10:30`)
 * are local by spec, so `new Date(string)` is correct for them; a date-only ISO
 * string still goes through the local-midnight path.
 */
export function coerceDateTime(value: unknown): Date | null {
  if (value instanceof Date) {
    return isValidDate(value) ? new Date(value.getTime()) : null;
  }
  if (typeof value === 'number') {
    const fromEpoch = new Date(value);
    return isValidDate(fromEpoch) ? fromEpoch : null;
  }
  if (typeof value === 'string' && /\d[T ]\d/.test(value.trim())) {
    const parsed = new Date(value.trim().replace(' ', 'T'));
    return isValidDate(parsed) ? parsed : null;
  }
  return coerceDate(value);
}
