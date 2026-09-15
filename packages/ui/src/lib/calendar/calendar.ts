import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  linkedSignal,
  model,
  output,
  signal,
} from '@angular/core';
import clsx from 'clsx';

import {
  addDays,
  addMonths,
  addYears,
  buildCalendarWeeks,
  clampDate,
  coerceDate,
  compareDays,
  endOfMonth,
  formatDayLabel,
  formatMonthCaption,
  isInsideRange,
  isSameDay,
  isSameMonth,
  isWithinBounds,
  normalizeRange,
  startOfMonth,
  toDateKey,
  toDateRange,
  today,
  weekdayNames,
  type AndesCalendarDay,
  type AndesDateRange,
  type AndesWeekday,
} from './date-utils';

export type { AndesDateRange, AndesWeekday } from './date-utils';

/** Whether the calendar selects one day or a span of days. */
export type AndesCalendarMode = 'single' | 'range';

/**
 * What `AndesCalendar`'s `value` accepts. The tuple and `{ start, end }` shapes are
 * both accepted for a range so a consumer's existing form value does not have to be
 * reshaped; the calendar always writes back `{ start, end }`.
 */
export type AndesCalendarValue =
  Date | AndesDateRange | readonly [Date, Date] | null;

/** A day cell with its rendered state resolved. */
export interface AndesCalendarCell extends AndesCalendarDay {
  /** Part of the current selection (either endpoint in range mode). */
  readonly selected: boolean;
  /** The range's opening boundary. */
  readonly rangeStart: boolean;
  /** The range's closing boundary. */
  readonly rangeEnd: boolean;
  /** Strictly between a complete range's boundaries. */
  readonly inRange: boolean;
  /** Today, in the runtime's local timezone. */
  readonly isToday: boolean;
  /** Out of `min`/`max` bounds, rejected by `dateDisabled`, or the whole calendar is disabled. */
  readonly disabled: boolean;
  /** The single cell holding `tabindex="0"` (roving tabindex). */
  readonly active: boolean;
  /** Full localized date, used as the cell's accessible name. */
  readonly label: string;
  readonly classes: string;
}

interface AndesCalendarCellRow {
  readonly key: string;
  readonly days: readonly AndesCalendarCell[];
}

/**
 * A month-grid calendar: the day-selection surface, with no overlay of its own.
 *
 * `AndesDatePicker` composes this inside a popover, but it is exported on its own
 * because an always-visible calendar (a booking page, a dashboard date filter) is a
 * legitimate use that should not have to fight a popover.
 *
 * ## Accessibility
 *
 * The grid follows the WAI-ARIA date-picker-dialog pattern: `role="grid"` with
 * `role="row"` rows, and each day is a `<button role="gridcell">`. Putting the role
 * on the button — rather than wrapping a button in a separate `role="gridcell"`
 * element — is deliberate: `aria-selected`, `aria-disabled` and
 * `aria-current="date"` then live on the element that is actually focusable and
 * clickable, instead of on a non-interactive wrapper a screen reader never lands on.
 *
 * Out-of-range days carry `aria-disabled` rather than the native `disabled`
 * attribute, because a natively disabled button is unfocusable and would punch
 * holes in arrow-key navigation across the grid.
 *
 * ## Dates
 *
 * Every date in and out of this component is a *local* midnight; see `date-utils.ts`
 * for why that invariant matters and how the arithmetic avoids the usual
 * leap-year/month-length/timezone traps.
 */
@Component({
  selector: 'andes-calendar',
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'calendar',
    '[attr.data-mode]': 'mode()',
    '[attr.data-disabled]': 'disabled() || null',
  },
})
export class AndesCalendar {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  /** One day or a span of days. */
  readonly mode = input<AndesCalendarMode>('single');

  /**
   * The current selection. A `Date` in `single` mode; `{ start, end }` (or a
   * `[start, end]` tuple, which is accepted and normalized) in `range` mode.
   */
  readonly value = model<AndesCalendarValue>(null);

  /** Earliest selectable day, inclusive. */
  readonly min = input<Date | null, unknown>(null, { transform: coerceDate });

  /** Latest selectable day, inclusive. */
  readonly max = input<Date | null, unknown>(null, { transform: coerceDate });

  /**
   * BCP 47 tag driving month and weekday names via `Intl`. Left `undefined` to use
   * the runtime's own locale, which is the right default for an app that has not
   * made a locale decision.
   */
  readonly locale = input<string | undefined>(undefined);

  /** First column of the week, `0` = Sunday. */
  readonly weekStartsOn = input<AndesWeekday>(0);

  /** Render the adjacent months' days in the leading/trailing cells. */
  readonly showOutsideDays = input(true, { transform: booleanAttribute });

  /** Always render six rows, so the panel's height does not change between months. */
  readonly fixedWeeks = input(false, { transform: booleanAttribute });

  /** Disables the whole calendar. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Per-day veto, applied on top of `min`/`max` (weekends, holidays, booked days). */
  readonly dateDisabled = input<((date: Date) => boolean) | null>(null);

  /** Month shown on first render. Defaults to the selection's month, else today's. */
  readonly defaultMonth = input<Date | null, unknown>(null, {
    transform: coerceDate,
  });

  /** Move focus into the grid once rendered. Used by `AndesDatePicker` on open. */
  readonly autoFocus = input(false, { transform: booleanAttribute });

  /** Accessible name for the grid. Falls back to the visible month caption. */
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });

  /**
   * Accessible label for the previous-month button. An input rather than a constant
   * so a non-English app can localize it; `Intl` only covers the month and weekday
   * names, not the surrounding control labels.
   */
  readonly previousMonthLabel = input('Previous month');

  /** Accessible label for the next-month button. */
  readonly nextMonthLabel = input('Next month');

  /** Emits the first day of the month whenever the visible month changes. */
  readonly monthChange = output<Date>();

  /** Emits the clicked day, even when it does not change `value`. */
  readonly daySelected = output<Date>();

  /**
   * The month the user has navigated to. Keyed off a stable `YYYY-MM-DD` string so
   * the linked signal resets only when the *anchor month* genuinely changes, not on
   * every re-evaluation that happens to build an equal-but-new `Date`.
   */
  protected readonly visibleMonth = linkedSignal<string, Date>({
    source: () => toDateKey(this.anchorMonth()),
    computation: (key) => coerceDate(key) ?? startOfMonth(today()),
  });

  /**
   * The day holding `tabindex="0"`, once the user has moved focus. `null` means
   * "derive it", which is what keeps the roving tabindex sensible after the visible
   * month changes underneath it.
   */
  private readonly focusedDate = signal<Date | null>(null);

  private readonly selectedDate = computed(() =>
    this.mode() === 'single' ? coerceDate(this.value()) : null,
  );

  private readonly selectedRange = computed(() =>
    this.mode() === 'range' ? toDateRange(this.value()) : null,
  );

  /** The month a fresh calendar opens on. */
  private readonly anchorMonth = computed(() => {
    const explicit = this.defaultMonth();
    if (explicit) {
      return startOfMonth(explicit);
    }
    const selection = this.selectedDate() ?? this.selectedRange()?.start;
    if (selection) {
      return startOfMonth(selection);
    }
    return startOfMonth(clampDate(today(), this.min(), this.max()));
  });

  /** The effective roving-tabindex target for the visible month. */
  protected readonly activeDate = computed(() => {
    const month = this.visibleMonth();
    const explicit = this.focusedDate();
    if (explicit && isSameMonth(explicit, month)) {
      return explicit;
    }
    return this.defaultActiveDate(month);
  });

  protected readonly monthCaption = computed(() =>
    formatMonthCaption(this.visibleMonth(), this.locale()),
  );

  protected readonly gridLabel = computed(
    () => this.ariaLabel() ?? this.monthCaption(),
  );

  protected readonly weekdays = computed(() =>
    weekdayNames(this.locale(), this.weekStartsOn()),
  );

  protected readonly weeks = computed<readonly AndesCalendarCellRow[]>(() => {
    const month = this.visibleMonth();
    const locale = this.locale();
    const activeKey = toDateKey(this.activeDate());
    const selected = this.selectedDate();
    const range = this.selectedRange();
    const now = today();

    return buildCalendarWeeks(
      month,
      this.weekStartsOn(),
      this.fixedWeeks(),
    ).map((week) => ({
      key: week.key,
      days: week.days.map((day) => {
        const isRangeStart = isSameDay(day.date, range?.start ?? null);
        const isRangeEnd = isSameDay(day.date, range?.end ?? null);
        const isSelected =
          this.mode() === 'range'
            ? isRangeStart || isRangeEnd
            : isSameDay(day.date, selected);
        const inRange = isInsideRange(day.date, range);
        const isDisabled = !this.isSelectable(day.date);
        const isToday = isSameDay(day.date, now);

        return {
          ...day,
          selected: isSelected,
          rangeStart: isRangeStart,
          rangeEnd: isRangeEnd,
          inRange,
          isToday,
          disabled: isDisabled,
          active: day.key === activeKey,
          label: formatDayLabel(day.date, locale),
          classes: clsx(
            'andes-calendar__day',
            day.outside && 'andes-calendar__day--outside',
            isSelected && 'andes-calendar__day--selected',
            isRangeStart && 'andes-calendar__day--range-start',
            isRangeEnd && 'andes-calendar__day--range-end',
            inRange && 'andes-calendar__day--in-range',
            isToday && 'andes-calendar__day--today',
            isDisabled && 'andes-calendar__day--disabled',
          ),
        };
      }),
    }));
  });

  /** False when every day of the previous month is before `min`. */
  protected readonly canGoPrevious = computed(() => {
    if (this.disabled()) {
      return false;
    }
    const min = this.min();
    if (!min) {
      return true;
    }
    return (
      compareDays(endOfMonth(addMonths(this.visibleMonth(), -1)), min) >= 0
    );
  });

  /** False when every day of the next month is after `max`. */
  protected readonly canGoNext = computed(() => {
    if (this.disabled()) {
      return false;
    }
    const max = this.max();
    if (!max) {
      return true;
    }
    return (
      compareDays(startOfMonth(addMonths(this.visibleMonth(), 1)), max) <= 0
    );
  });

  constructor() {
    afterNextRender(() => {
      if (this.autoFocus()) {
        this.focusActiveDay();
      }
    });
  }

  /** Whether a day can be picked: in bounds, not vetoed, calendar not disabled. */
  isSelectable(date: Date): boolean {
    if (this.disabled()) {
      return false;
    }
    if (!isWithinBounds(date, this.min(), this.max())) {
      return false;
    }
    return !this.dateDisabled()?.(date);
  }

  /** Moves the visible month by `amount`, clamping focus into the new month. */
  shiftMonth(amount: number): void {
    const next = startOfMonth(addMonths(this.visibleMonth(), amount));
    this.visibleMonth.set(next);
    this.focusedDate.set(null);
    this.monthChange.emit(next);
  }

  /** Focuses the grid's active day. Called on open by `AndesDatePicker`. */
  focusActiveDay(): void {
    this.dayElement(toDateKey(this.activeDate()))?.focus();
  }

  protected goToPreviousMonth(): void {
    if (this.canGoPrevious()) {
      this.shiftMonth(-1);
    }
  }

  protected goToNextMonth(): void {
    if (this.canGoNext()) {
      this.shiftMonth(1);
    }
  }

  protected selectDay(cell: AndesCalendarCell): void {
    if (cell.disabled) {
      return;
    }

    this.focusedDate.set(cell.date);
    if (!isSameMonth(cell.date, this.visibleMonth())) {
      // Clicking a leading/trailing cell navigates to the month it belongs to,
      // rather than selecting a day the user can no longer see in context.
      this.visibleMonth.set(startOfMonth(cell.date));
    }

    if (this.mode() === 'range') {
      this.value.set(this.nextRange(cell.date));
    } else {
      this.value.set(cell.date);
    }

    this.daySelected.emit(cell.date);
  }

  /**
   * Range selection state machine.
   *
   * With no range, or with a *complete* one, a click starts a new range anchored at
   * the clicked day. The alternative — extending or moving the nearest boundary —
   * reads as the calendar second-guessing the user: having picked Mar 10-20, a
   * click on Mar 5 could equally mean "start over at Mar 5" or "widen to Mar 5-20",
   * and guessing wrong silently produces a range nobody asked for. Restarting is
   * always one further click away from any range the user wants, and it is what
   * react-day-picker and Ant Design's `RangePicker` both do.
   *
   * A click on the second day of a half-open range closes it, swapped into order if
   * the user picked backwards. Clicking the same day twice yields a valid one-day
   * range.
   */
  private nextRange(date: Date): AndesDateRange {
    const current = this.selectedRange();
    if (!current || current.end) {
      return { start: date, end: null };
    }
    return normalizeRange({ start: current.start, end: date });
  }

  /**
   * The grid's whole keyboard contract, bound to each day button — the elements
   * that actually hold focus. Enter/Space select the focused day; everything else
   * moves the roving tabindex.
   */
  protected onDayKeydown(event: KeyboardEvent, cell: AndesCalendarCell): void {
    if (this.disabled()) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      // A `<button role="gridcell">` loses the button role's implicit
      // Enter/Space activation, so activate it explicitly.
      event.preventDefault();
      this.selectDay(cell);
      return;
    }

    const active = this.activeDate();
    const weekStart = addDays(
      active,
      -((active.getDay() - this.weekStartsOn() + 7) % 7),
    );

    let target: Date | undefined;
    switch (event.key) {
      case 'ArrowLeft':
        target = addDays(active, -1);
        break;
      case 'ArrowRight':
        target = addDays(active, 1);
        break;
      case 'ArrowUp':
        target = event.shiftKey ? addYears(active, -1) : addDays(active, -7);
        break;
      case 'ArrowDown':
        target = event.shiftKey ? addYears(active, 1) : addDays(active, 7);
        break;
      case 'Home':
        target = weekStart;
        break;
      case 'End':
        target = addDays(weekStart, 6);
        break;
      case 'PageUp':
        target = event.shiftKey ? addYears(active, -1) : addMonths(active, -1);
        break;
      case 'PageDown':
        target = event.shiftKey ? addYears(active, 1) : addMonths(active, 1);
        break;
      default:
        return;
    }

    event.preventDefault();
    this.moveFocusTo(target);
  }

  /**
   * Moves the roving tabindex, paging the visible month when the target falls
   * outside it.
   *
   * The target is clamped into `[min, max]` so arrow keys stop at the bounds instead
   * of walking into a region where nothing is selectable. Days vetoed by
   * `dateDisabled` are still reachable — skipping them would make a calendar with
   * many blocked days unnavigable, and they announce as disabled on arrival.
   */
  private moveFocusTo(date: Date): void {
    const target = clampDate(date, this.min(), this.max());
    this.focusedDate.set(target);

    if (!isSameMonth(target, this.visibleMonth())) {
      const month = startOfMonth(target);
      this.visibleMonth.set(month);
      this.monthChange.emit(month);
    }

    // The signals above have updated but the DOM has not: in a zoneless app the
    // re-render is still queued. Flush this view synchronously so the button for
    // `target` exists before focus moves to it, instead of deferring focus to a
    // microtask and making keyboard navigation racy.
    this.changeDetectorRef.detectChanges();
    this.dayElement(toDateKey(target))?.focus();
  }

  /** First selectable day of the month, preferring the selection, then today. */
  private defaultActiveDate(month: Date): Date {
    const selection = this.selectedDate() ?? this.selectedRange()?.start;
    if (selection && isSameMonth(selection, month)) {
      return selection;
    }

    const now = today();
    if (isSameMonth(now, month) && this.isSelectable(now)) {
      return now;
    }

    const monthStart = startOfMonth(month);
    const lastDay = endOfMonth(month).getDate();
    for (let offset = 0; offset < lastDay; offset++) {
      const candidate = addDays(monthStart, offset);
      if (this.isSelectable(candidate)) {
        return candidate;
      }
    }
    // Nothing in this month is selectable; the 1st still needs to hold the
    // tabindex so the grid stays reachable by Tab.
    return monthStart;
  }

  private dayElement(key: string): HTMLElement | null {
    return this.elementRef.nativeElement.querySelector<HTMLElement>(
      `[data-date="${key}"]`,
    );
  }
}
