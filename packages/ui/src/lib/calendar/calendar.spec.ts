import { Component, signal, TemplateRef, viewChild } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AndesCalendar,
  type AndesCalendarCellContext,
  type AndesCalendarHeaderContext,
  type AndesCalendarMode,
  type AndesCalendarPanelChange,
  type AndesCalendarValue,
  type AndesDateDisabledFn,
  type AndesPickerType,
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

/** Host for the Ant-parity features: pickers, panels, templates. */
@Component({
  imports: [AndesCalendar],
  template: `
    <ng-template #cell let-date let-cell="cell" let-view="view">
      <span class="custom-cell" [attr.data-view]="view">{{ cell.text }}*</span>
    </ng-template>
    <ng-template #header let-month let-setView="setView" let-goTo="goTo">
      <div class="custom-header">{{ month.getMonth() }}</div>
      <button type="button" class="to-years" (click)="setView('year')">
        years
      </button>
      <button type="button" class="to-2030" (click)="goTo(jan2030)">
        2030
      </button>
    </ng-template>
    <andes-calendar
      [mode]="mode()"
      [picker]="picker()"
      [(value)]="value"
      [min]="min()"
      [max]="max()"
      locale="en-US"
      [weekStartsOn]="weekStartsOn()"
      [numberOfMonths]="numberOfMonths()"
      [showWeek]="showWeek()"
      [fullscreen]="fullscreen()"
      [dateDisabled]="dateDisabled()"
      [defaultMonth]="defaultMonth()"
      [cellTemplate]="useCellTemplate() ? cellTemplate() : null"
      [headerTemplate]="useHeaderTemplate() ? headerTemplate() : null"
      (panelChange)="panelChanges.push($event)"
    />
  `,
})
class FeatureHost {
  readonly cellTemplate =
    viewChild.required<TemplateRef<AndesCalendarCellContext>>('cell');
  readonly headerTemplate =
    viewChild.required<TemplateRef<AndesCalendarHeaderContext>>('header');
  readonly calendar = viewChild.required(AndesCalendar);
  readonly mode = signal<AndesCalendarMode>('single');
  readonly picker = signal<AndesPickerType>('date');
  readonly value = signal<AndesCalendarValue>(null);
  readonly min = signal<Date | null>(null);
  readonly max = signal<Date | null>(null);
  readonly weekStartsOn = signal<AndesWeekday>(0);
  readonly numberOfMonths = signal(1);
  readonly showWeek = signal(false);
  readonly fullscreen = signal(false);
  readonly dateDisabled = signal<AndesDateDisabledFn | null>(null);
  readonly defaultMonth = signal<Date | null>(d(2024, 2, 1));
  readonly useCellTemplate = signal(false);
  readonly useHeaderTemplate = signal(false);
  readonly jan2030 = d(2030, 1, 1);
  readonly panelChanges: AndesCalendarPanelChange[] = [];
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

  describe('weekStartsOn bare attribute', () => {
    /**
     * Regression guard for a string-concatenation bug: a *static* HTML attribute
     * (no square brackets) reaches Angular as the literal string `"1"`, not the
     * number `1`. `weekdayNames`'s `(weekStartsOn + index) % 7` used `+`, which is
     * string concatenation on a string operand — `"1" + 0` produced `"10"`, and
     * `"10" % 7` silently coerced back to `3`, rendering a Wednesday-first grid
     * for every consumer who wrote `weekStartsOn="1"` instead of
     * `[weekStartsOn]="1"`. The fix is `numberAttribute` on the input; these tests
     * must use the bare attribute form to actually exercise that path.
     */
    it('treats a bare weekStartsOn="1" attribute as the number 1, producing a Monday-first grid', () => {
      @Component({
        imports: [AndesCalendar],
        template: `<andes-calendar
          weekStartsOn="1"
          [defaultMonth]="defaultMonth"
        />`,
      })
      class BareWeekStartsOnHost {
        readonly defaultMonth = d(2024, 2, 1);
      }

      const fixture = TestBed.createComponent(BareWeekStartsOnHost);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const headers = Array.from(
        root.querySelectorAll<HTMLElement>('[role="columnheader"]'),
      );

      // Correct, Monday-first order. Before the fix this rendered
      // Wednesday-first (Wed, Thu, Fri, Sat, Sun, Mon, Tue).
      expect(
        headers.map((header) => header.getAttribute('aria-label')),
      ).toEqual([
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ]);

      // The day grid itself must also start each row on Monday, not just the
      // header labels — both are driven by the same coerced input.
      const firstRow = root.querySelector(
        '.andes-calendar__row:not(.andes-calendar__row--weekdays)',
      );
      const firstCellDate = firstRow
        ?.querySelector('[role="gridcell"][data-date]')
        ?.getAttribute('data-date');
      expect(new Date(`${firstCellDate}T00:00:00`).getDay()).toBe(1);
    });

    it('clamps an out-of-range bare weekStartsOn="9" attribute to 0 (Sunday) instead of crashing', () => {
      @Component({
        imports: [AndesCalendar],
        template: `<andes-calendar
          weekStartsOn="9"
          [defaultMonth]="defaultMonth"
        />`,
      })
      class OutOfRangeWeekStartsOnHost {
        readonly defaultMonth = d(2024, 2, 1);
      }

      const fixture = TestBed.createComponent(OutOfRangeWeekStartsOnHost);
      expect(() => fixture.detectChanges()).not.toThrow();

      const root = fixture.nativeElement as HTMLElement;
      const headers = Array.from(
        root.querySelectorAll<HTMLElement>('[role="columnheader"]'),
      );
      expect(headers).toHaveLength(7);
      expect(headers[0].getAttribute('aria-label')).toBe('Sunday');
    });

    it('falls back to 0 (Sunday) for a non-numeric bare weekStartsOn attribute', () => {
      @Component({
        imports: [AndesCalendar],
        template: `<andes-calendar
          weekStartsOn="not-a-number"
          [defaultMonth]="defaultMonth"
        />`,
      })
      class InvalidWeekStartsOnHost {
        readonly defaultMonth = d(2024, 2, 1);
      }

      const fixture = TestBed.createComponent(InvalidWeekStartsOnHost);
      expect(() => fixture.detectChanges()).not.toThrow();

      const root = fixture.nativeElement as HTMLElement;
      const headers = Array.from(
        root.querySelectorAll<HTMLElement>('[role="columnheader"]'),
      );
      expect(headers[0].getAttribute('aria-label')).toBe('Sunday');
    });
  });

  describe('Ant parity features', () => {
    function createFeatures(
      setup: (host: FeatureHost) => void = () => undefined,
    ) {
      const fixture = TestBed.createComponent(FeatureHost);
      setup(fixture.componentInstance);
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const cell = (date: Date) =>
        root.querySelector<HTMLButtonElement>(
          `[data-date="${toDateKey(date)}"]:not([data-outside])`,
        ) as HTMLButtonElement;
      return {
        fixture,
        host: fixture.componentInstance,
        root,
        cell,
        caption: () =>
          root.querySelector<HTMLElement>('[data-slot="calendar-caption"]'),
        click: (element: HTMLElement | null) => {
          element?.click();
          fixture.detectChanges();
        },
        press: (key: string, options: KeyboardEventInit = {}) => {
          root
            .querySelector<HTMLElement>('[data-date][tabindex="0"]')
            ?.dispatchEvent(
              new KeyboardEvent('keydown', { key, bubbles: true, ...options }),
            );
          fixture.detectChanges();
        },
        active: () =>
          root
            .querySelector<HTMLElement>('[data-date][tabindex="0"]')
            ?.getAttribute('data-date'),
      };
    }

    describe('picker="month"', () => {
      it('renders a 4x3 grid of months captioned with the year', () => {
        const { root, caption } = createFeatures((host) =>
          host.picker.set('month'),
        );

        expect(caption()?.textContent?.trim()).toBe('2024');
        const rows = root.querySelectorAll('.andes-calendar__period-row');
        expect(rows).toHaveLength(4);
        expect(rows[0].querySelectorAll('[role="gridcell"]')).toHaveLength(3);
        expect(
          root
            .querySelector('[data-date="2024-02-01"]')
            ?.getAttribute('aria-label'),
        ).toBe('February 2024');
      });

      it('selects the first day of the clicked month', () => {
        const { host, click, cell } = createFeatures((h) =>
          h.picker.set('month'),
        );

        click(cell(d(2024, 7, 1)));

        expect(toDateKey(host.value() as Date)).toBe('2024-07-01');
        expect(cell(d(2024, 7, 1)).getAttribute('aria-selected')).toBe('true');
      });

      it('highlights the month containing a mid-month value', () => {
        const { cell } = createFeatures((host) => {
          host.picker.set('month');
          host.value.set(d(2024, 5, 20));
        });

        expect(cell(d(2024, 5, 1)).getAttribute('aria-selected')).toBe('true');
      });

      it('pages by year with the nav buttons', () => {
        const { root, click, caption } = createFeatures((host) =>
          host.picker.set('month'),
        );

        click(root.querySelector('[data-slot="calendar-next"]'));
        expect(caption()?.textContent?.trim()).toBe('2025');
        expect(
          root
            .querySelector('[data-slot="calendar-next"]')
            ?.getAttribute('aria-label'),
        ).toBe('Next year');
      });

      it('moves by one, by a row and by a year from the keyboard', () => {
        const { press, active, caption } = createFeatures((host) => {
          host.picker.set('month');
          host.value.set(d(2024, 5, 1));
        });

        expect(active()).toBe('2024-05-01');
        press('ArrowRight');
        expect(active()).toBe('2024-06-01');
        press('ArrowDown');
        expect(active()).toBe('2024-09-01');
        press('Home');
        expect(active()).toBe('2024-07-01');
        press('End');
        expect(active()).toBe('2024-09-01');
        press('PageDown');
        expect(active()).toBe('2025-09-01');
        expect(caption()?.textContent?.trim()).toBe('2025');
      });

      it('disables months wholly outside min/max and asks dateDisabled with the type', () => {
        const calls: string[] = [];
        const { cell } = createFeatures((host) => {
          host.picker.set('month');
          host.min.set(d(2024, 3, 15));
          host.dateDisabled.set((date, info) => {
            calls.push(info.type);
            return date.getMonth() === 11;
          });
        });

        expect(cell(d(2024, 2, 1)).getAttribute('aria-disabled')).toBe('true');
        // March is only partly before min, so it stays selectable.
        expect(cell(d(2024, 3, 1)).getAttribute('aria-disabled')).toBeNull();
        expect(cell(d(2024, 12, 1)).getAttribute('aria-disabled')).toBe('true');
        expect(calls).toContain('month');
      });
    });

    describe('picker="quarter" and picker="year"', () => {
      it('renders four quarters and selects the quarter start', () => {
        const { root, host, click, cell } = createFeatures((h) =>
          h.picker.set('quarter'),
        );

        const cells = root.querySelectorAll('[role="gridcell"]');
        expect(Array.from(cells).map((c) => c.textContent?.trim())).toEqual([
          'Q1',
          'Q2',
          'Q3',
          'Q4',
        ]);
        click(cell(d(2024, 7, 1)));
        expect(toDateKey(host.value() as Date)).toBe('2024-07-01');
      });

      it('renders a decade with the neighbouring years as outside cells', () => {
        const { root, caption } = createFeatures((host) =>
          host.picker.set('year'),
        );

        expect(caption()?.textContent?.trim()).toBe('2020 – 2029');
        const cells = Array.from(
          root.querySelectorAll<HTMLElement>('[role="gridcell"]'),
        );
        expect(cells).toHaveLength(12);
        expect(cells[0].textContent?.trim()).toBe('2019');
        expect(cells[0].hasAttribute('data-outside')).toBe(true);
        expect(cells[11].textContent?.trim()).toBe('2030');
      });

      it('selects January 1st of the clicked year', () => {
        const { host, click, cell } = createFeatures((h) =>
          h.picker.set('year'),
        );

        click(cell(d(2026, 1, 1)));
        expect(toDateKey(host.value() as Date)).toBe('2026-01-01');
      });

      it('pages a decade with PageDown', () => {
        const { press, caption } = createFeatures((host) => {
          host.picker.set('year');
          host.value.set(d(2024, 1, 1));
        });

        press('PageDown');
        expect(caption()?.textContent?.trim()).toBe('2030 – 2039');
      });
    });

    describe('picker="week"', () => {
      it('shows week numbers and selects the whole week from its first day', () => {
        const { root, host, click, cell } = createFeatures((h) => {
          h.picker.set('week');
          h.weekStartsOn.set(1);
        });

        expect(root.querySelectorAll('[role="rowheader"]').length).toBe(
          root.querySelectorAll(
            '.andes-calendar__row:not(.andes-calendar__row--weekdays)',
          ).length,
        );
        click(cell(d(2024, 2, 14)));

        // Monday of that ISO week.
        expect(toDateKey(host.value() as Date)).toBe('2024-02-12');
        for (let day = 12; day <= 18; day++) {
          expect(cell(d(2024, 2, day)).getAttribute('aria-selected')).toBe(
            'true',
          );
        }
        expect(cell(d(2024, 2, 19)).getAttribute('aria-selected')).toBe(
          'false',
        );
      });
    });

    describe('showWeek', () => {
      it('adds a week-number row header to every week', () => {
        const { root } = createFeatures((host) => {
          host.showWeek.set(true);
          host.weekStartsOn.set(1);
        });

        const headers = Array.from(
          root.querySelectorAll<HTMLElement>('[role="rowheader"]'),
        ).map((header) => header.textContent?.trim());
        // February 2024, ISO weeks 5-9.
        expect(headers).toEqual(['5', '6', '7', '8', '9']);
        expect(
          root
            .querySelector(
              '.andes-calendar__row--weekdays [role="columnheader"]',
            )
            ?.getAttribute('aria-label'),
        ).toBe('Week');
      });
    });

    describe('caption drill-up and drill-down', () => {
      it('climbs from days to months to years, and drills back down', () => {
        const { root, host, caption, click, cell } = createFeatures();

        click(caption());
        expect(host.calendar().view()).toBe('month');
        expect(caption()?.textContent?.trim()).toBe('2024');

        click(caption());
        expect(host.calendar().view()).toBe('year');
        // The decade view is the top: its caption is not a button.
        expect(caption()?.tagName).toBe('SPAN');

        click(cell(d(2026, 1, 1)));
        expect(host.calendar().view()).toBe('month');
        expect(caption()?.textContent?.trim()).toBe('2026');
        // Drilling down navigates; it never selects.
        expect(host.value()).toBeNull();

        click(cell(d(2026, 8, 1)));
        expect(host.calendar().view()).toBe('date');
        expect(caption()?.textContent?.trim()).toBe('August 2026');
        expect(root.querySelector('[data-date="2026-08-15"]')).toBeTruthy();
      });

      it('moves focus into the new grid', () => {
        const { caption, click } = createFeatures();

        click(caption());

        expect(document.activeElement?.getAttribute('data-date')).toMatch(
          /^2024-\d{2}-01$/,
        );
      });

      it('emits panelChange with the view', () => {
        const { host, caption, click } = createFeatures();

        click(caption());

        expect(host.panelChanges.at(-1)).toEqual({
          date: d(2024, 2, 1),
          view: 'month',
        });
      });
    });

    describe('year navigation in the day grid', () => {
      it('jumps a year with the double-chevron buttons', () => {
        const { root, caption, click } = createFeatures();

        click(root.querySelector('[data-slot="calendar-next-year"]'));
        expect(caption()?.textContent?.trim()).toBe('February 2025');

        click(root.querySelector('[data-slot="calendar-previous-year"]'));
        click(root.querySelector('[data-slot="calendar-previous-year"]'));
        expect(caption()?.textContent?.trim()).toBe('February 2023');
      });

      it('moves a month with Shift+Arrow Left/Right', () => {
        const { press, active } = createFeatures((host) =>
          host.value.set(d(2024, 2, 15)),
        );

        press('ArrowRight', { shiftKey: true });
        expect(active()).toBe('2024-03-15');
        press('ArrowLeft', { shiftKey: true });
        expect(active()).toBe('2024-02-15');
      });
    });

    describe('numberOfMonths', () => {
      function twoPanels() {
        return createFeatures((host) => {
          host.mode.set('range');
          host.numberOfMonths.set(2);
        });
      }

      it('renders consecutive months with the nav buttons on the outer edges', () => {
        const { root } = twoPanels();

        const captions = Array.from(
          root.querySelectorAll('[data-slot="calendar-caption"]'),
        ).map((caption) => caption.textContent?.trim());
        expect(captions).toEqual(['February 2024', 'March 2024']);
        expect(root.querySelectorAll('[role="grid"]')).toHaveLength(2);
        const panels = root.querySelectorAll('[data-slot="calendar-panel"]');
        expect(
          panels[0].querySelector('[data-slot="calendar-previous"]'),
        ).toBeTruthy();
        expect(
          panels[0].querySelector('[data-slot="calendar-next"]'),
        ).toBeNull();
        expect(
          panels[1].querySelector('[data-slot="calendar-next"]'),
        ).toBeTruthy();
      });

      it('hides outside days so no date appears twice', () => {
        const { root } = twoPanels();

        const keys = Array.from(root.querySelectorAll('[data-date]')).map(
          (cell) => cell.getAttribute('data-date'),
        );
        expect(new Set(keys).size).toBe(keys.length);
      });

      it('keeps both panels still when a range is picked across them', () => {
        const { host, click, cell, caption } = twoPanels();

        click(cell(d(2024, 3, 10)));
        expect(caption()?.textContent?.trim()).toBe('February 2024');
        click(cell(d(2024, 2, 20)));

        expect(caption()?.textContent?.trim()).toBe('February 2024');
        expect(host.value()).toEqual({
          start: d(2024, 2, 20),
          end: d(2024, 3, 10),
        });
      });

      it('arrows from the first panel into the second without paging', () => {
        const { press, active, caption } = createFeatures((host) => {
          host.numberOfMonths.set(2);
          host.value.set(d(2024, 2, 29));
        });

        press('ArrowRight');
        expect(active()).toBe('2024-03-01');
        expect(caption()?.textContent?.trim()).toBe('February 2024');
      });

      it('pages so the target lands in the last panel when arrowing past it', () => {
        const { press, active, caption } = createFeatures((host) => {
          host.numberOfMonths.set(2);
          host.value.set(d(2024, 3, 31));
        });

        press('ArrowRight');
        expect(active()).toBe('2024-04-01');
        expect(caption()?.textContent?.trim()).toBe('March 2024');
      });
    });

    describe('range hover preview', () => {
      it('previews the range the hovered day would close', () => {
        const { root, click, cell, fixture } = createFeatures((host) =>
          host.mode.set('range'),
        );
        click(cell(d(2024, 2, 10)));

        cell(d(2024, 2, 14)).dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();

        const previewed = Array.from(
          root.querySelectorAll('[data-in-preview]'),
        ).map((c) => c.getAttribute('data-date'));
        expect(previewed).toEqual([
          '2024-02-11',
          '2024-02-12',
          '2024-02-13',
          '2024-02-14',
        ]);

        root
          .querySelector('[role="grid"]')
          ?.dispatchEvent(new MouseEvent('mouseleave'));
        fixture.detectChanges();
        expect(root.querySelectorAll('[data-in-preview]')).toHaveLength(0);
      });

      it('previews backwards and follows keyboard focus', () => {
        const { root, click, cell, press } = createFeatures((host) =>
          host.mode.set('range'),
        );
        click(cell(d(2024, 2, 10)));

        press('ArrowLeft');
        press('ArrowLeft');

        expect(
          Array.from(root.querySelectorAll('[data-in-preview]')).map((c) =>
            c.getAttribute('data-date'),
          ),
        ).toEqual(['2024-02-08', '2024-02-09']);
      });

      it('does not preview once the range is complete', () => {
        const { root, click, cell, fixture } = createFeatures((host) =>
          host.mode.set('range'),
        );
        click(cell(d(2024, 2, 10)));
        click(cell(d(2024, 2, 12)));

        cell(d(2024, 2, 20)).dispatchEvent(new MouseEvent('mouseenter'));
        fixture.detectChanges();

        expect(root.querySelectorAll('[data-in-preview]')).toHaveLength(0);
      });
    });

    describe('templates', () => {
      it('renders cellTemplate with the cell context', () => {
        const { root } = createFeatures((host) =>
          host.useCellTemplate.set(true),
        );

        const custom = root.querySelector(
          '[data-date="2024-02-15"] .custom-cell',
        );
        expect(custom?.textContent?.trim()).toBe('15*');
        expect(custom?.getAttribute('data-view')).toBe('date');
        // The accessible name is untouched by custom content.
        expect(
          root
            .querySelector('[data-date="2024-02-15"]')
            ?.getAttribute('aria-label'),
        ).toBe('Thursday, February 15, 2024');
      });

      it('keeps the day number above the template in fullscreen', () => {
        const { root } = createFeatures((host) => {
          host.useCellTemplate.set(true);
          host.fullscreen.set(true);
        });

        const day = root.querySelector('[data-date="2024-02-15"]');
        expect(
          day?.querySelector('.andes-calendar__cell-text')?.textContent?.trim(),
        ).toBe('15');
        expect(day?.querySelector('.custom-cell')).toBeTruthy();
        expect(
          root.querySelector('andes-calendar')?.hasAttribute('data-fullscreen'),
        ).toBe(true);
      });

      it('replaces the header with headerTemplate and drives the calendar through it', () => {
        const { root, click, host } = createFeatures((h) =>
          h.useHeaderTemplate.set(true),
        );

        expect(
          root.querySelector('[data-slot="calendar-previous"]'),
        ).toBeNull();
        expect(root.querySelector('.custom-header')?.textContent).toBe('1');

        click(root.querySelector<HTMLElement>('.to-2030'));
        expect(root.querySelector('[data-date="2030-01-15"]')).toBeTruthy();

        click(root.querySelector<HTMLElement>('.to-years'));
        expect(host.calendar().view()).toBe('year');
      });
    });
  });
});
