import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesCalendar,
  type AndesCalendarMode,
  type AndesCalendarValue,
} from './calendar';
import {
  toDateKey,
  type AndesDateRange,
  type AndesWeekday,
} from './date-utils';

/** Local-midnight constructor, with a human month number. */
function d(year: number, month1: number, day: number): Date {
  return new Date(year, month1 - 1, day);
}

@Component({
  imports: [AndesCalendar],
  template: `<andes-calendar
    [mode]="mode()"
    [(value)]="value"
    [min]="min()"
    [max]="max()"
    [locale]="locale()"
    [weekStartsOn]="weekStartsOn()"
    [showOutsideDays]="showOutsideDays()"
    [fixedWeeks]="fixedWeeks()"
    [disabled]="disabled()"
    [dateDisabled]="dateDisabled()"
    [defaultMonth]="defaultMonth()"
    (monthChange)="lastMonthChange.set($event)"
    (daySelected)="lastDaySelected.set($event)"
  />`,
})
class CalendarHost {
  readonly mode = signal<AndesCalendarMode>('single');
  readonly value = signal<AndesCalendarValue>(null);
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly locale = signal<string | undefined>('en-US');
  readonly weekStartsOn = signal<AndesWeekday>(0);
  readonly showOutsideDays = signal(true);
  readonly fixedWeeks = signal(false);
  readonly disabled = signal(false);
  readonly dateDisabled = signal<((date: Date) => boolean) | null>(null);
  readonly defaultMonth = signal<Date | null>(d(2024, 2, 1));

  readonly lastMonthChange = signal<Date | null>(null);
  readonly lastDaySelected = signal<Date | null>(null);
}

describe('AndesCalendar', () => {
  function createHost() {
    const fixture = TestBed.createComponent(CalendarHost);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const query = <T extends HTMLElement>(selector: string) =>
      root.querySelector<T>(selector) as T;

    return {
      fixture,
      host: fixture.componentInstance,
      root,
      grid: () => query('[role="grid"]'),
      caption: () => query('[data-slot="calendar-caption"]'),
      previous: () =>
        query<HTMLButtonElement>('[data-slot="calendar-previous"]'),
      next: () => query<HTMLButtonElement>('[data-slot="calendar-next"]'),
      rows: () =>
        Array.from(
          root.querySelectorAll<HTMLElement>(
            '.andes-calendar__row:not(.andes-calendar__row--weekdays)',
          ),
        ),
      days: () =>
        Array.from(root.querySelectorAll<HTMLButtonElement>('[data-date]')),
      day: (date: Date) =>
        root.querySelector<HTMLButtonElement>(
          `[data-date="${toDateKey(date)}"]`,
        ) as HTMLButtonElement,
      weekdayHeaders: () =>
        Array.from(root.querySelectorAll<HTMLElement>('[role="columnheader"]')),
      activeDay: () =>
        root.querySelector<HTMLButtonElement>('[data-date][tabindex="0"]'),
      press: (key: string, options: KeyboardEventInit = {}) => {
        const target = root.querySelector<HTMLElement>(
          '[data-date][tabindex="0"]',
        );
        (target ?? query('[role="grid"]')).dispatchEvent(
          new KeyboardEvent('keydown', { key, bubbles: true, ...options }),
        );
        fixture.detectChanges();
      },
    };
  }

  describe('day grid', () => {
    it('renders whole weeks of seven cells', () => {
      const { rows } = createHost();

      expect(rows().length).toBeGreaterThan(0);
      for (const row of rows()) {
        expect(row.querySelectorAll('[role="gridcell"]')).toHaveLength(7);
      }
    });

    it('aligns a leap February to the correct weekday', () => {
      const { day, days, rows } = createHost();

      // Feb 2024 has 29 days and starts on a Thursday.
      expect(rows()).toHaveLength(5);
      expect(day(d(2024, 2, 29))).toBeTruthy();

      const firstRow = rows()[0].querySelectorAll('[role="gridcell"]');
      expect(firstRow[4].getAttribute('data-date')).toBe('2024-02-01');
      expect(firstRow[0].getAttribute('data-outside')).toBe('true');

      const inMonth = days().filter((cell) => !cell.dataset['outside']);
      expect(inMonth).toHaveLength(29);
      // The month ends on the 29th: no phantom Feb 30 cell.
      expect(inMonth.at(-1)?.getAttribute('data-date')).toBe('2024-02-29');
    });

    it('renders a non-leap February with 28 in-month days', () => {
      const { fixture, host, days, day } = createHost();
      host.defaultMonth.set(d(2023, 2, 1));
      fixture.detectChanges();

      const inMonth = days().filter((cell) => !cell.dataset['outside']);
      expect(inMonth).toHaveLength(28);
      expect(day(d(2023, 2, 28))).toBeTruthy();
      // No Feb 29 in a non-leap year.
      expect(inMonth.at(-1)?.getAttribute('data-date')).toBe('2023-02-28');
    });

    it('tiles a Sunday-starting, Saturday-ending month with no outside days', () => {
      const { fixture, host, rows, days } = createHost();
      // Feb 2015 ran Sunday the 1st to Saturday the 28th.
      host.defaultMonth.set(d(2015, 2, 1));
      fixture.detectChanges();

      expect(rows()).toHaveLength(4);
      expect(days().some((cell) => cell.dataset['outside'])).toBe(false);
    });

    it('bridges December into January with next-year outside days', () => {
      const { fixture, host, day } = createHost();
      host.defaultMonth.set(d(2024, 12, 1));
      fixture.detectChanges();

      expect(day(d(2024, 12, 31))).toBeTruthy();
      const january = day(d(2025, 1, 1));
      expect(january).toBeTruthy();
      expect(january.getAttribute('data-outside')).toBe('true');
    });

    it('pads to six rows when fixedWeeks is set', () => {
      const { fixture, host, rows } = createHost();
      host.fixedWeeks.set(true);
      fixture.detectChanges();

      expect(rows()).toHaveLength(6);
    });

    it('replaces outside days with placeholders when showOutsideDays is off', () => {
      const { fixture, host, rows, days } = createHost();
      host.showOutsideDays.set(false);
      fixture.detectChanges();

      expect(days().every((cell) => !cell.dataset['outside'])).toBe(true);
      // Rows stay seven cells wide so the column geometry survives.
      for (const row of rows()) {
        expect(row.querySelectorAll('[role="gridcell"]')).toHaveLength(7);
      }
      expect(
        rows()[0].querySelectorAll('.andes-calendar__day-placeholder'),
      ).toHaveLength(4);
    });

    it('respects the configured first day of the week', () => {
      const { fixture, host, rows } = createHost();
      host.weekStartsOn.set(1);
      fixture.detectChanges();

      for (const row of rows()) {
        const first = row.querySelector('[role="gridcell"][data-date]');
        const key = first?.getAttribute('data-date');
        expect(new Date(`${key}T00:00:00`).getDay()).toBe(1);
      }
    });
  });

  describe('localization', () => {
    it('renders localized month captions rather than hard-coded English', () => {
      const { fixture, host, caption } = createHost();

      expect(caption().textContent?.trim()).toBe('February 2024');

      host.locale.set('es-ES');
      fixture.detectChanges();
      expect(caption().textContent?.trim().toLowerCase()).toContain('febrero');
    });

    it('renders localized weekday headers', () => {
      const { fixture, host, weekdayHeaders } = createHost();

      expect(weekdayHeaders()).toHaveLength(7);
      expect(weekdayHeaders()[0].getAttribute('aria-label')).toBe('Sunday');

      host.locale.set('es-ES');
      host.weekStartsOn.set(1);
      fixture.detectChanges();
      expect(
        weekdayHeaders()[0].getAttribute('aria-label')?.toLowerCase(),
      ).toBe('lunes');
    });

    it('gives each day a full localized accessible name', () => {
      const { day } = createHost();

      expect(day(d(2024, 2, 15)).getAttribute('aria-label')).toBe(
        'Thursday, February 15, 2024',
      );
    });

    it('keeps the weekday abbreviation as real text in the column header', () => {
      const { weekdayHeaders } = createHost();

      // Regression guard: aria-hiding the abbreviation leaves the header with no
      // text content, which axe reports as `empty-table-header`.
      expect(weekdayHeaders()[0].textContent?.trim()).toBe('Sun');
      expect(
        weekdayHeaders().every(
          (header) => (header.textContent?.trim().length ?? 0) > 0,
        ),
      ).toBe(true);
      expect(
        weekdayHeaders().some((header) =>
          header.querySelector('[aria-hidden="true"]'),
        ),
      ).toBe(false);
    });
  });

  describe('month navigation', () => {
    it('moves to the previous and next month', () => {
      const { caption, previous, next, fixture } = createHost();

      previous().click();
      fixture.detectChanges();
      expect(caption().textContent?.trim()).toBe('January 2024');

      next().click();
      next().click();
      fixture.detectChanges();
      expect(caption().textContent?.trim()).toBe('March 2024');
    });

    it('rolls December forward into January of the next year', () => {
      const { fixture, host, caption, next } = createHost();
      host.defaultMonth.set(d(2024, 12, 1));
      fixture.detectChanges();

      next().click();
      fixture.detectChanges();
      expect(caption().textContent?.trim()).toBe('January 2025');
    });

    it('rolls January back into December of the previous year', () => {
      const { fixture, host, caption, previous } = createHost();
      host.defaultMonth.set(d(2025, 1, 1));
      fixture.detectChanges();

      previous().click();
      fixture.detectChanges();
      expect(caption().textContent?.trim()).toBe('December 2024');
    });

    it('emits monthChange with the first day of the new month', () => {
      const { host, next, fixture } = createHost();

      next().click();
      fixture.detectChanges();

      expect(toDateKey(host.lastMonthChange() as Date)).toBe('2024-03-01');
    });

    it('disables previous when the whole previous month is before min', () => {
      const { fixture, host, previous, next } = createHost();
      host.min.set(d(2024, 2, 1));
      fixture.detectChanges();

      expect(previous().disabled).toBe(true);
      expect(next().disabled).toBe(false);
    });

    it('keeps previous enabled when min falls inside the previous month', () => {
      const { fixture, host, previous } = createHost();
      host.min.set(d(2024, 1, 20));
      fixture.detectChanges();

      expect(previous().disabled).toBe(false);
    });

    it('disables next when the whole next month is after max', () => {
      const { fixture, host, next } = createHost();
      host.max.set(d(2024, 2, 29));
      fixture.detectChanges();

      expect(next().disabled).toBe(true);
    });

    it('disables both nav buttons when the calendar is disabled', () => {
      const { fixture, host, previous, next } = createHost();
      host.disabled.set(true);
      fixture.detectChanges();

      expect(previous().disabled).toBe(true);
      expect(next().disabled).toBe(true);
    });
  });

  describe('min / max bounds', () => {
    it('marks days before min and after max as aria-disabled', () => {
      const { fixture, host, day } = createHost();
      host.min.set(d(2024, 2, 10));
      host.max.set(d(2024, 2, 20));
      fixture.detectChanges();

      expect(day(d(2024, 2, 9)).getAttribute('aria-disabled')).toBe('true');
      expect(day(d(2024, 2, 21)).getAttribute('aria-disabled')).toBe('true');
    });

    it('leaves the boundary days themselves selectable', () => {
      const { fixture, host, day } = createHost();
      host.min.set(d(2024, 2, 10));
      host.max.set(d(2024, 2, 20));
      fixture.detectChanges();

      expect(day(d(2024, 2, 10)).getAttribute('aria-disabled')).toBeNull();
      expect(day(d(2024, 2, 20)).getAttribute('aria-disabled')).toBeNull();
    });

    it('handles a min/max window landing exactly on the visible month edges', () => {
      const { fixture, host, day, days } = createHost();
      host.min.set(d(2024, 2, 1));
      host.max.set(d(2024, 2, 29));
      fixture.detectChanges();

      expect(day(d(2024, 2, 1)).getAttribute('aria-disabled')).toBeNull();
      expect(day(d(2024, 2, 29)).getAttribute('aria-disabled')).toBeNull();
      // Every leading/trailing cell is out of range.
      const outside = days().filter((cell) => cell.dataset['outside']);
      expect(outside.length).toBeGreaterThan(0);
      expect(
        outside.every((cell) => cell.getAttribute('aria-disabled') === 'true'),
      ).toBe(true);
    });

    it('keeps disabled days focusable so arrow navigation can cross them', () => {
      const { fixture, host, day } = createHost();
      host.min.set(d(2024, 2, 10));
      fixture.detectChanges();

      // `aria-disabled`, never the native attribute, which would remove the
      // button from the focus order and break the grid.
      expect(day(d(2024, 2, 5)).disabled).toBe(false);
      expect(day(d(2024, 2, 5)).hasAttribute('disabled')).toBe(false);
    });

    it('refuses to select an out-of-range day', () => {
      const { fixture, host, day } = createHost();
      host.min.set(d(2024, 2, 10));
      fixture.detectChanges();

      day(d(2024, 2, 5)).click();
      fixture.detectChanges();

      expect(host.value()).toBeNull();
      expect(host.lastDaySelected()).toBeNull();
    });

    it('applies the dateDisabled predicate on top of the bounds', () => {
      const { fixture, host, day } = createHost();
      // Block weekends.
      host.dateDisabled.set(
        (date) => date.getDay() === 0 || date.getDay() === 6,
      );
      fixture.detectChanges();

      // 2024-02-03 was a Saturday, 2024-02-05 a Monday.
      expect(day(d(2024, 2, 3)).getAttribute('aria-disabled')).toBe('true');
      expect(day(d(2024, 2, 5)).getAttribute('aria-disabled')).toBeNull();

      day(d(2024, 2, 3)).click();
      fixture.detectChanges();
      expect(host.value()).toBeNull();
    });

    it('disables every day when the calendar is disabled', () => {
      const { fixture, host, days } = createHost();
      host.disabled.set(true);
      fixture.detectChanges();

      expect(
        days().every((cell) => cell.getAttribute('aria-disabled') === 'true'),
      ).toBe(true);
    });
  });

  describe('single selection', () => {
    it('selects a clicked day and writes it back through the model', () => {
      const { fixture, host, day } = createHost();

      day(d(2024, 2, 15)).click();
      fixture.detectChanges();

      expect(toDateKey(host.value() as Date)).toBe('2024-02-15');
      expect(toDateKey(host.lastDaySelected() as Date)).toBe('2024-02-15');
    });

    it('marks the selected day with aria-selected="true" and the rest false', () => {
      const { fixture, host, day, days } = createHost();
      host.value.set(d(2024, 2, 15));
      fixture.detectChanges();

      expect(day(d(2024, 2, 15)).getAttribute('aria-selected')).toBe('true');
      expect(day(d(2024, 2, 16)).getAttribute('aria-selected')).toBe('false');
      expect(
        days().filter((cell) => cell.getAttribute('aria-selected') === 'true'),
      ).toHaveLength(1);
    });

    it('moves the selection when another day is clicked', () => {
      const { fixture, host, day } = createHost();

      day(d(2024, 2, 15)).click();
      fixture.detectChanges();
      day(d(2024, 2, 20)).click();
      fixture.detectChanges();

      expect(toDateKey(host.value() as Date)).toBe('2024-02-20');
      expect(day(d(2024, 2, 15)).getAttribute('aria-selected')).toBe('false');
    });

    it('navigates to the adjacent month when an outside day is clicked', () => {
      const { fixture, host, caption, day } = createHost();

      day(d(2024, 1, 31)).click();
      fixture.detectChanges();

      expect(toDateKey(host.value() as Date)).toBe('2024-01-31');
      expect(caption().textContent?.trim()).toBe('January 2024');
    });

    it('opens on the selected value month when no defaultMonth is given', () => {
      const { fixture, host, caption } = createHost();
      host.defaultMonth.set(null);
      host.value.set(d(2022, 7, 4));
      fixture.detectChanges();

      expect(caption().textContent?.trim()).toBe('July 2022');
    });
  });

  describe('aria-current', () => {
    it('marks today with aria-current="date" and nothing else', () => {
      const { fixture, host, days } = createHost();
      const now = new Date();
      host.defaultMonth.set(now);
      fixture.detectChanges();

      const current = days().filter(
        (cell) => cell.getAttribute('aria-current') === 'date',
      );
      expect(current).toHaveLength(1);
      expect(current[0].getAttribute('data-date')).toBe(toDateKey(now));
    });

    it('marks no day when today is outside the visible month', () => {
      const { days } = createHost();

      // The host defaults to Feb 2024, which is in the past.
      expect(
        days().filter((cell) => cell.getAttribute('aria-current') === 'date'),
      ).toHaveLength(0);
    });
  });

  describe('range selection', () => {
    function rangeHost() {
      const harness = createHost();
      harness.host.mode.set('range');
      harness.fixture.detectChanges();
      return harness;
    }

    function currentRange(value: AndesCalendarValue): AndesDateRange {
      return value as AndesDateRange;
    }

    it('opens a half-open range on the first click', () => {
      const { fixture, host, day } = rangeHost();

      day(d(2024, 2, 10)).click();
      fixture.detectChanges();

      const range = currentRange(host.value());
      expect(toDateKey(range.start)).toBe('2024-02-10');
      expect(range.end).toBeNull();
    });

    it('closes the range on the second click', () => {
      const { fixture, host, day } = rangeHost();

      day(d(2024, 2, 10)).click();
      fixture.detectChanges();
      day(d(2024, 2, 20)).click();
      fixture.detectChanges();

      const range = currentRange(host.value());
      expect(toDateKey(range.start)).toBe('2024-02-10');
      expect(toDateKey(range.end as Date)).toBe('2024-02-20');
    });

    it('swaps the boundaries when the range is drawn backwards', () => {
      const { fixture, host, day } = rangeHost();

      day(d(2024, 2, 20)).click();
      fixture.detectChanges();
      day(d(2024, 2, 10)).click();
      fixture.detectChanges();

      const range = currentRange(host.value());
      expect(toDateKey(range.start)).toBe('2024-02-10');
      expect(toDateKey(range.end as Date)).toBe('2024-02-20');
    });

    it('allows a single-day range', () => {
      const { fixture, host, day } = rangeHost();

      day(d(2024, 2, 10)).click();
      fixture.detectChanges();
      day(d(2024, 2, 10)).click();
      fixture.detectChanges();

      const range = currentRange(host.value());
      expect(toDateKey(range.start)).toBe('2024-02-10');
      expect(toDateKey(range.end as Date)).toBe('2024-02-10');
    });

    it('restarts the range when a day is clicked after the range is complete', () => {
      const { fixture, host, day } = rangeHost();

      day(d(2024, 2, 10)).click();
      fixture.detectChanges();
      day(d(2024, 2, 20)).click();
      fixture.detectChanges();

      // The documented decision: a click on a complete range starts over at the
      // clicked day rather than guessing which boundary to move.
      day(d(2024, 2, 5)).click();
      fixture.detectChanges();

      const range = currentRange(host.value());
      expect(toDateKey(range.start)).toBe('2024-02-05');
      expect(range.end).toBeNull();
    });

    it('restarts from a click inside the completed range too', () => {
      const { fixture, host, day } = rangeHost();
      host.value.set({ start: d(2024, 2, 10), end: d(2024, 2, 20) });
      fixture.detectChanges();

      day(d(2024, 2, 15)).click();
      fixture.detectChanges();

      const range = currentRange(host.value());
      expect(toDateKey(range.start)).toBe('2024-02-15');
      expect(range.end).toBeNull();
    });

    it('marks both boundaries selected and the interior in-range', () => {
      const { fixture, host, day } = rangeHost();
      host.value.set({ start: d(2024, 2, 10), end: d(2024, 2, 13) });
      fixture.detectChanges();

      expect(day(d(2024, 2, 10)).getAttribute('aria-selected')).toBe('true');
      expect(day(d(2024, 2, 13)).getAttribute('aria-selected')).toBe('true');
      // Interior days are highlighted but not themselves "selected".
      expect(day(d(2024, 2, 11)).getAttribute('aria-selected')).toBe('false');
      expect(day(d(2024, 2, 11)).getAttribute('data-in-range')).toBe('true');
      expect(day(d(2024, 2, 10)).getAttribute('data-in-range')).toBeNull();
      expect(day(d(2024, 2, 14)).getAttribute('data-in-range')).toBeNull();
    });

    it('accepts a [start, end] tuple as the incoming value', () => {
      const { fixture, host, day } = rangeHost();
      host.value.set([d(2024, 2, 10), d(2024, 2, 12)]);
      fixture.detectChanges();

      expect(day(d(2024, 2, 10)).getAttribute('aria-selected')).toBe('true');
      expect(day(d(2024, 2, 12)).getAttribute('aria-selected')).toBe('true');
      expect(day(d(2024, 2, 11)).getAttribute('data-in-range')).toBe('true');
    });

    it('normalizes an out-of-order incoming tuple', () => {
      const { fixture, host, day } = rangeHost();
      host.value.set([d(2024, 2, 12), d(2024, 2, 10)]);
      fixture.detectChanges();

      expect(day(d(2024, 2, 11)).getAttribute('data-in-range')).toBe('true');
    });
  });

  describe('keyboard navigation', () => {
    it('gives exactly one day the tabindex', () => {
      const { days, activeDay } = createHost();

      expect(days().filter((cell) => cell.tabIndex === 0)).toHaveLength(1);
      expect(activeDay()).toBeTruthy();
    });

    it('starts the roving tabindex on the selected day', () => {
      const { fixture, host, activeDay } = createHost();
      host.value.set(d(2024, 2, 15));
      fixture.detectChanges();

      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-15');
    });

    it('falls back to the first day of the month when nothing is selected', () => {
      const { activeDay } = createHost();

      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-01');
    });

    it('moves one day left and right with the arrow keys', () => {
      const { fixture, host, press, activeDay } = createHost();
      host.value.set(d(2024, 2, 15));
      fixture.detectChanges();

      press('ArrowRight');
      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-16');

      press('ArrowLeft');
      press('ArrowLeft');
      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-14');
    });

    it('moves one week up and down with the arrow keys', () => {
      const { fixture, host, press, activeDay } = createHost();
      host.value.set(d(2024, 2, 15));
      fixture.detectChanges();

      press('ArrowDown');
      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-22');

      press('ArrowUp');
      press('ArrowUp');
      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-08');
    });

    it('moves DOM focus along with the roving tabindex', () => {
      const { fixture, host, press, day } = createHost();
      host.value.set(d(2024, 2, 15));
      fixture.detectChanges();
      day(d(2024, 2, 15)).focus();

      press('ArrowRight');

      expect(document.activeElement).toBe(day(d(2024, 2, 16)));
    });

    it('pages into the next month when arrowing past the last day', () => {
      const { fixture, host, press, caption, activeDay } = createHost();
      host.value.set(d(2024, 2, 29));
      fixture.detectChanges();

      press('ArrowRight');

      expect(caption().textContent?.trim()).toBe('March 2024');
      expect(activeDay()?.getAttribute('data-date')).toBe('2024-03-01');
    });

    it('pages into the previous month when arrowing before the first day', () => {
      const { fixture, host, press, caption, activeDay } = createHost();
      host.value.set(d(2024, 2, 1));
      fixture.detectChanges();

      press('ArrowLeft');

      expect(caption().textContent?.trim()).toBe('January 2024');
      expect(activeDay()?.getAttribute('data-date')).toBe('2024-01-31');
    });

    it('crosses the leap day rather than skipping it', () => {
      const { fixture, host, press, activeDay } = createHost();
      host.value.set(d(2024, 2, 28));
      fixture.detectChanges();

      press('ArrowRight');
      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-29');

      press('ArrowRight');
      expect(activeDay()?.getAttribute('data-date')).toBe('2024-03-01');
    });

    it('moves to the start and end of the visible week with Home and End', () => {
      const { fixture, host, press, activeDay } = createHost();
      // 2024-02-15 was a Thursday; the Sunday-first week runs Feb 11 to Feb 17.
      host.value.set(d(2024, 2, 15));
      fixture.detectChanges();

      press('Home');
      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-11');

      press('End');
      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-17');
    });

    it('honours the configured week start for Home and End', () => {
      const { fixture, host, press, activeDay } = createHost();
      host.weekStartsOn.set(1);
      host.value.set(d(2024, 2, 15));
      fixture.detectChanges();

      press('Home');
      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-12');

      press('End');
      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-18');
    });

    it('changes month with PageUp and PageDown', () => {
      const { fixture, host, press, caption, activeDay } = createHost();
      host.value.set(d(2024, 2, 15));
      fixture.detectChanges();

      press('PageDown');
      expect(caption().textContent?.trim()).toBe('March 2024');
      expect(activeDay()?.getAttribute('data-date')).toBe('2024-03-15');

      press('PageUp');
      press('PageUp');
      expect(caption().textContent?.trim()).toBe('January 2024');
      expect(activeDay()?.getAttribute('data-date')).toBe('2024-01-15');
    });

    it('clamps the day when paging into a shorter month', () => {
      const { fixture, host, press, activeDay } = createHost();
      host.defaultMonth.set(d(2024, 1, 1));
      host.value.set(d(2024, 1, 31));
      fixture.detectChanges();

      press('PageDown');

      // Jan 31 has no counterpart in February, so it clamps rather than
      // overflowing into March.
      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-29');
    });

    it('changes year with Shift+PageUp and Shift+PageDown', () => {
      const { fixture, host, press, caption } = createHost();
      host.value.set(d(2024, 2, 15));
      fixture.detectChanges();

      press('PageDown', { shiftKey: true });
      expect(caption().textContent?.trim()).toBe('February 2025');

      press('PageUp', { shiftKey: true });
      press('PageUp', { shiftKey: true });
      expect(caption().textContent?.trim()).toBe('February 2023');
    });

    it('clamps arrow navigation at the min bound', () => {
      const { fixture, host, press, activeDay, caption } = createHost();
      host.min.set(d(2024, 2, 10));
      host.value.set(d(2024, 2, 10));
      fixture.detectChanges();

      press('ArrowLeft');

      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-10');
      expect(caption().textContent?.trim()).toBe('February 2024');
    });

    it('clamps arrow navigation at the max bound', () => {
      const { fixture, host, press, activeDay } = createHost();
      host.max.set(d(2024, 2, 20));
      host.value.set(d(2024, 2, 20));
      fixture.detectChanges();

      press('ArrowRight');

      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-20');
    });

    it('clamps a week jump to the min bound instead of overshooting', () => {
      const { fixture, host, press, activeDay } = createHost();
      host.min.set(d(2024, 2, 12));
      host.value.set(d(2024, 2, 15));
      fixture.detectChanges();

      press('ArrowUp');

      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-12');
    });

    it('selects the active day with Enter and with Space', () => {
      const { fixture, host, press, day } = createHost();
      host.value.set(d(2024, 2, 15));
      fixture.detectChanges();

      press('ArrowRight');
      press('Enter');
      expect(toDateKey(host.value() as Date)).toBe('2024-02-16');

      day(d(2024, 2, 16)).dispatchEvent(
        new KeyboardEvent('keydown', { key: ' ', bubbles: true }),
      );
      fixture.detectChanges();
      expect(toDateKey(host.value() as Date)).toBe('2024-02-16');
    });

    it('ignores keys it does not handle', () => {
      const { fixture, host, press, activeDay } = createHost();
      host.value.set(d(2024, 2, 15));
      fixture.detectChanges();

      press('a');
      press('Tab');

      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-15');
    });

    it('does not navigate while disabled', () => {
      const { fixture, host, press, activeDay } = createHost();
      host.value.set(d(2024, 2, 15));
      host.disabled.set(true);
      fixture.detectChanges();

      press('ArrowRight');

      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-15');
    });

    it('re-derives the active day after the month is changed by a nav button', () => {
      const { fixture, next, activeDay } = createHost();

      next().click();
      fixture.detectChanges();

      expect(activeDay()?.getAttribute('data-date')).toBe('2024-03-01');
    });

    it('puts the tabindex on the first selectable day when the month opens blocked', () => {
      const { fixture, host, activeDay } = createHost();
      host.min.set(d(2024, 2, 12));
      fixture.detectChanges();

      expect(activeDay()?.getAttribute('data-date')).toBe('2024-02-12');
    });
  });

  describe('grid semantics', () => {
    it('exposes grid, row, columnheader and gridcell roles', () => {
      const { grid, root, rows } = createHost();

      expect(grid()).toBeTruthy();
      expect(root.querySelectorAll('[role="row"]').length).toBe(
        rows().length + 1,
      );
      expect(root.querySelectorAll('[role="columnheader"]')).toHaveLength(7);
      expect(
        root.querySelectorAll('[role="gridcell"]').length,
      ).toBeGreaterThanOrEqual(28);
    });

    it('labels the grid with the visible month', () => {
      const { grid } = createHost();

      expect(grid().getAttribute('aria-label')).toBe('February 2024');
    });

    it('puts the interactive ARIA state on the focusable cell itself', () => {
      const { fixture, host, day } = createHost();
      host.value.set(d(2024, 2, 15));
      host.min.set(d(2024, 2, 10));
      fixture.detectChanges();

      const selected = day(d(2024, 2, 15));
      expect(selected.tagName).toBe('BUTTON');
      expect(selected.getAttribute('role')).toBe('gridcell');
      expect(selected.getAttribute('aria-selected')).toBe('true');

      // The disabled state is on the button too, not on a wrapper.
      const blocked = day(d(2024, 2, 5));
      expect(blocked.tagName).toBe('BUTTON');
      expect(blocked.getAttribute('aria-disabled')).toBe('true');
    });
  });
});
