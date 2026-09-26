import { NgTemplateOutlet } from '@angular/common';
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
  numberAttribute,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import clsx from 'clsx';

import {
  addDays,
  addMonths,
  addYears,
  baseViewFor,
  buildCalendarWeeks,
  clampDate,
  clampWeekday,
  coerceDate,
  compareDays,
  comparePeriods,
  endOfMonth,
  endOfPeriod,
  formatDayLabel,
  formatMonthCaption,
  isSamePeriod,
  isWithinBounds,
  normalizeRange,
  startOfDecade,
  startOfMonth,
  startOfPeriod,
  startOfYear,
  toDateKey,
  toDateRange,
  today,
  weekdayNames,
  weekOfYear,
  type AndesCalendarDay,
  type AndesCalendarView,
  type AndesDateRange,
  type AndesPickerType,
  type AndesWeekday,
} from './date-utils';

export type {
  AndesCalendarView,
  AndesDateRange,
  AndesPickerType,
  AndesWeekday,
} from './date-utils';

/** Whether the calendar selects one day or a span of days. */
export type AndesCalendarMode = 'single' | 'range';

/**
 * What `AndesCalendar`'s `value` accepts. The tuple and `{ start, end }` shapes are
 * both accepted for a range so a consumer's existing form value does not have to be
 * reshaped; the calendar always writes back `{ start, end }`.
 */
export type AndesCalendarValue =
  Date | AndesDateRange | readonly [Date, Date] | null;

/** Extra information handed to a `dateDisabled` predicate, as Ant's `disabledDate` does. */
export interface AndesDateDisabledInfo {
  /** The granularity the date is being offered at. */
  readonly type: AndesPickerType;
}

/**
 * Per-date veto. The second argument is optional to honour, so a plain
 * `(date) => boolean` keeps working.
 */
export type AndesDateDisabledFn = (
  date: Date,
  info: AndesDateDisabledInfo,
) => boolean;

/** A cell with its rendered state resolved. Day cells and month/quarter/year cells share it. */
export interface AndesCalendarCell extends AndesCalendarDay {
  /** Which grid the cell belongs to. */
  readonly view: AndesCalendarView;
  /** The visible text: the day number, a short month name, `Q1`, or a year. */
  readonly text: string;
  /** Part of the current selection (either endpoint in range mode). */
  readonly selected: boolean;
  /** The range's opening boundary. */
  readonly rangeStart: boolean;
  /** The range's closing boundary. */
  readonly rangeEnd: boolean;
  /** Strictly between a complete range's boundaries. */
  readonly inRange: boolean;
  /** Inside the range the pointer (or keyboard focus) would close if picked now. */
  readonly inPreview: boolean;
  /** Today — or, in the period views, the current month/quarter/year. */
  readonly isToday: boolean;
  /** Out of `min`/`max` bounds, rejected by `dateDisabled`, or the whole calendar is disabled. */
  readonly disabled: boolean;
  /** The single cell holding `tabindex="0"` (roving tabindex). */
  readonly active: boolean;
  /** Full localized name, used as the cell's accessible name. */
  readonly label: string;
  readonly classes: string;
}

/** Template context for `cellTemplate` (Ant's `cellRender`). */
export interface AndesCalendarCellContext {
  /** The cell's date: the day, or the first day of its month/quarter/year. */
  readonly $implicit: Date;
  readonly cell: AndesCalendarCell;
  readonly view: AndesCalendarView;
}

/** Template context for `headerTemplate` (Ant's `headerRender`). */
export interface AndesCalendarHeaderContext {
  /** First day of the (first) visible month. */
  readonly $implicit: Date;
  readonly view: AndesCalendarView;
  /** Jump the calendar to the month containing `date`. */
  readonly goTo: (date: Date) => void;
  /** Switch the visible grid. */
  readonly setView: (view: AndesCalendarView) => void;
}

/** Emitted by `panelChange` whenever the visible period or grid changes. */
export interface AndesCalendarPanelChange {
  readonly date: Date;
  readonly view: AndesCalendarView;
}

interface CellRow {
  readonly key: string;
  /** Week number, when week numbers are shown. */
  readonly weekNumber: number | null;
  readonly cells: readonly (AndesCalendarCell | null)[];
}

interface MonthPanel {
  readonly key: string;
  readonly month: Date;
  readonly caption: string;
  readonly gridLabel: string;
  readonly rows: readonly CellRow[];
}

/** Columns and paging steps of the three period grids, in months. */
const PERIOD_GRID: Readonly<
  Record<
    Exclude<AndesCalendarView, 'date'>,
    { readonly columns: number; readonly step: number; readonly page: number }
  >
> = {
  month: { columns: 3, step: 1, page: 12 },
  quarter: { columns: 4, step: 3, page: 12 },
  year: { columns: 3, step: 12, page: 120 },
};

/** The grid one level up, reached by clicking the caption. */
const PARENT_VIEW: Readonly<
  Record<AndesCalendarView, AndesCalendarView | null>
> = {
  date: 'month',
  month: 'year',
  quarter: 'year',
  year: null,
};

/**
 * A calendar: the date-selection surface, with no overlay of its own.
 *
 * `AndesDatePicker` composes this inside a popover, but it is exported on its own
 * because an always-visible calendar (a booking page, a dashboard date filter, a
 * full-page event calendar via `fullscreen` + `cellTemplate`) is a legitimate use
 * that should not have to fight a popover.
 *
 * ## Grids
 *
 * `picker` sets what is selected — a day, a week, a month, a quarter or a year —
 * and which grid opens. The caption is a button that climbs to the coarser grid
 * (days → months → years), and picking a cell in a coarser grid than `picker`
 * drills back down instead of selecting, the same panel model as Ant Design's
 * `DatePicker` and `Calendar`.
 *
 * ## Accessibility
 *
 * Every grid follows the WAI-ARIA date-picker-dialog pattern: `role="grid"` with
 * `role="row"` rows, and each cell is a `<button role="gridcell">`. Putting the role
 * on the button — rather than wrapping a button in a separate `role="gridcell"`
 * element — is deliberate: `aria-selected`, `aria-disabled` and
 * `aria-current="date"` then live on the element that is actually focusable and
 * clickable, instead of on a non-interactive wrapper a screen reader never lands on.
 *
 * Out-of-range cells carry `aria-disabled` rather than the native `disabled`
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
  imports: [NgTemplateOutlet],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'calendar',
    '[attr.data-mode]': 'mode()',
    '[attr.data-picker]': 'picker()',
    '[attr.data-view]': 'view()',
    '[attr.data-disabled]': 'disabled() || null',
    '[attr.data-fullscreen]': 'fullscreen() || null',
  },
})
export class AndesCalendar {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly changeDetectorRef = inject(ChangeDetectorRef);

  /** One day or a span of days. */
  readonly mode = input<AndesCalendarMode>('single');

  /**
   * The granularity selected, as Ant's `picker`. The value written back is always
   * the first day of the chosen period (the Monday/Sunday of a week, the 1st of a
   * month, January 1st of a year).
   */
  readonly picker = input<AndesPickerType>('date');

  /**
   * The current selection. A `Date` in `single` mode; `{ start, end }` (or a
   * `[start, end]` tuple, which is accepted and normalized) in `range` mode.
   */
  readonly value = model<AndesCalendarValue>(null);

  /** Earliest selectable day, inclusive. Ant's `minDate` / `validRange[0]`. */
  readonly min = input<Date | null, unknown>(null, { transform: coerceDate });

  /** Latest selectable day, inclusive. Ant's `maxDate` / `validRange[1]`. */
  readonly max = input<Date | null, unknown>(null, { transform: coerceDate });

  /**
   * BCP 47 tag driving month and weekday names via `Intl`. Left `undefined` to use
   * the runtime's own locale, which is the right default for an app that has not
   * made a locale decision.
   */
  readonly locale = input<string | undefined>(undefined);

  /**
   * First column of the week, `0` = Sunday.
   *
   * `numberAttribute` guards against the bare-attribute case:
   * `<andes-calendar weekStartsOn="1">` (no square brackets) passes Angular
   * the literal string `"1"`, and left uncoerced that string reaches
   * `weekdayNames`'s `+`-based offset arithmetic as a string, silently
   * producing the wrong grid via JS string concatenation instead of
   * addition. `clampWeekday` then falls back to `0` for anything that
   * isn't a whole number in the valid `0`-`6` range.
   */
  readonly weekStartsOn = input<AndesWeekday>(0, {
    transform: (value: unknown) => clampWeekday(numberAttribute(value, 0)),
  });

  /**
   * Render the adjacent months' days in the leading/trailing cells. Ignored when
   * more than one month is shown, where they would duplicate the next panel's days.
   */
  readonly showOutsideDays = input(true, { transform: booleanAttribute });

  /** Always render six rows, so the panel's height does not change between months. */
  readonly fixedWeeks = input(false, { transform: booleanAttribute });

  /** Months shown side by side in the day grid, as a range picker's two panels. */
  readonly numberOfMonths = input(1, {
    transform: (value: unknown) =>
      Math.max(1, Math.floor(numberAttribute(value, 1)) || 1),
  });

  /** Prefix each week with its week number. Always on for the `week` picker. */
  readonly showWeek = input(false, { transform: booleanAttribute });

  /**
   * A roomy, full-width layout for page-level calendars (Ant's `fullscreen`), where
   * each day has space for `cellTemplate` content under its number.
   */
  readonly fullscreen = input(false, { transform: booleanAttribute });

  /** Disables the whole calendar. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Per-date veto, applied on top of `min`/`max` (weekends, holidays, booked days).
   * Ant's `disabledDate`. For month/quarter/year pickers it is called with each
   * cell's first day and `info.type` set to the picker.
   */
  readonly dateDisabled = input<AndesDateDisabledFn | null>(null);

  /**
   * Custom cell content (Ant's `cellRender`/`fullCellRender`). Replaces the cell's
   * text; in `fullscreen` it renders under the day number instead. Rendered inside
   * the cell's button, so it must not contain interactive elements.
   */
  readonly cellTemplate = input<TemplateRef<AndesCalendarCellContext> | null>(
    null,
  );

  /** Replaces the whole navigation header (Ant's `headerRender`). */
  readonly headerTemplate =
    input<TemplateRef<AndesCalendarHeaderContext> | null>(null);

  /** Month shown on first render. Defaults to the selection's month, else today's. */
  readonly defaultMonth = input<Date | null, unknown>(null, {
    transform: coerceDate,
  });

  /** Move focus into the grid once rendered. Used by `AndesDatePicker` on open. */
  readonly autoFocus = input(false, { transform: booleanAttribute });

  /** Accessible name for the grid. Falls back to the visible caption. */
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

  /** Accessible label for the previous-year buttons. */
  readonly previousYearLabel = input('Previous year');

  /** Accessible label for the next-year buttons. */
  readonly nextYearLabel = input('Next year');

  /** Accessible label for the previous-decade button. */
  readonly previousDecadeLabel = input('Previous decade');

  /** Accessible label for the next-decade button. */
  readonly nextDecadeLabel = input('Next decade');

  /** Header of the week-number column. */
  readonly weekNumberLabel = input('Week');

  /** Emits the first day of the month whenever the visible month changes. */
  readonly monthChange = output<Date>();

  /** Emits the clicked day, even when it does not change `value`. */
  readonly daySelected = output<Date>();

  /** Emits whenever the visible period or grid changes (Ant's `onPanelChange`). */
  readonly panelChange = output<AndesCalendarPanelChange>();

  /**
   * Which grid is showing. Follows `picker` until the user climbs to a coarser
   * grid through the caption.
   */
  readonly view = linkedSignal<AndesCalendarView>(() =>
    baseViewFor(this.picker()),
  );

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
   * The cell holding `tabindex="0"`, once the user has moved focus. `null` means
   * "derive it", which is what keeps the roving tabindex sensible after the visible
   * period changes underneath it.
   */
  private readonly focusedDate = signal<Date | null>(null);

  /** The cell under the pointer (or keyboard focus), for the range preview. */
  private readonly hoverDate = signal<Date | null>(null);

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

  protected readonly showWeekNumbers = computed(
    () => this.showWeek() || this.picker() === 'week',
  );

  /** Months shown in the day grid; period grids always show one panel. */
  private readonly monthCount = computed(() =>
    this.view() === 'date' ? this.numberOfMonths() : 1,
  );

  /** First and last day of what is on screen, used to decide when to page. */
  private readonly visibleSpan = computed(() => {
    const anchor = this.visibleMonth();
    switch (this.view()) {
      case 'date':
        return {
          start: startOfMonth(anchor),
          end: endOfMonth(addMonths(anchor, this.monthCount() - 1)),
        };
      case 'month':
      case 'quarter':
        return {
          start: startOfYear(anchor),
          end: new Date(anchor.getFullYear(), 11, 31),
        };
      case 'year': {
        const decade = startOfDecade(anchor);
        return {
          start: decade,
          end: new Date(decade.getFullYear() + 9, 11, 31),
        };
      }
    }
  });

  /** The unit a cell in the current grid stands for. */
  private readonly cellUnit = computed<AndesPickerType>(() =>
    this.view() === 'date'
      ? this.picker() === 'week'
        ? 'week'
        : 'date'
      : this.view(),
  );

  /** The effective roving-tabindex target for the visible period. */
  protected readonly activeDate = computed(() => {
    const view = this.view();
    const unit = view === 'date' ? 'date' : view;
    const { start, end } = this.visibleSpan();
    const inSpan = (date: Date | null | undefined): date is Date =>
      !!date && isWithinBounds(date, start, end);

    const explicit = this.focusedDate();
    if (inSpan(explicit)) {
      return startOfPeriod(explicit, unit);
    }
    const selection = this.selectedDate() ?? this.selectedRange()?.start;
    if (inSpan(selection)) {
      return startOfPeriod(selection, unit);
    }
    return this.defaultActiveDate(start, end, unit);
  });

  protected readonly weekdays = computed(() =>
    weekdayNames(this.locale(), this.weekStartsOn()),
  );

  /** The range as the user would see it if they picked the hovered cell now. */
  private readonly previewRange = computed(() => {
    const range = this.selectedRange();
    const hover = this.hoverDate();
    if (!range || range.end || !hover) {
      return null;
    }
    return normalizeRange({ start: range.start, end: hover });
  });

  /** The day grid, one entry per visible month. */
  protected readonly panels = computed<readonly MonthPanel[]>(() => {
    if (this.view() !== 'date') {
      return [];
    }
    const locale = this.locale();
    const count = this.monthCount();
    const hideOutside = count > 1 || !this.showOutsideDays();
    const weekStartsOn = this.weekStartsOn();

    return Array.from({ length: count }, (_, index) => {
      const month = addMonths(this.visibleMonth(), index);
      const caption = formatMonthCaption(month, locale);
      return {
        key: toDateKey(month),
        month,
        caption,
        gridLabel: this.ariaLabel() ?? caption,
        rows: buildCalendarWeeks(month, weekStartsOn, this.fixedWeeks()).map(
          (week) => ({
            key: week.key,
            weekNumber: this.showWeekNumbers()
              ? weekOfYear(week.days[0].date, weekStartsOn).week
              : null,
            cells: week.days.map((day) =>
              day.outside && hideOutside
                ? null
                : this.resolveCell(
                    day,
                    'date',
                    String(day.dayOfMonth),
                    formatDayLabel(day.date, locale),
                  ),
            ),
          }),
        ),
      };
    });
  });

  /** The month / quarter / year grid, as rows of cells. */
  protected readonly periodRows = computed<readonly CellRow[]>(() => {
    const view = this.view();
    if (view === 'date') {
      return [];
    }
    const locale = this.locale();
    const anchor = this.visibleMonth();
    const year = anchor.getFullYear();
    const dates: { date: Date; outside: boolean }[] = [];

    if (view === 'month') {
      for (let month = 0; month < 12; month++) {
        dates.push({ date: new Date(year, month, 1), outside: false });
      }
    } else if (view === 'quarter') {
      for (let quarter = 0; quarter < 4; quarter++) {
        dates.push({ date: new Date(year, quarter * 3, 1), outside: false });
      }
    } else {
      // Twelve cells: the decade plus the year either side, as Ant draws it.
      const first = startOfDecade(anchor).getFullYear() - 1;
      for (let offset = 0; offset < 12; offset++) {
        dates.push({
          date: new Date(first + offset, 0, 1),
          outside: offset === 0 || offset === 11,
        });
      }
    }

    const shortMonth = new Intl.DateTimeFormat(locale, { month: 'short' });
    const longMonth = new Intl.DateTimeFormat(locale, {
      month: 'long',
      year: 'numeric',
    });
    const yearFormat = new Intl.DateTimeFormat(locale, { year: 'numeric' });

    const cells = dates.map(({ date, outside }) => {
      const day: AndesCalendarDay = {
        date,
        key: toDateKey(date),
        dayOfMonth: 1,
        outside,
      };
      switch (view) {
        case 'month':
          return this.resolveCell(
            day,
            view,
            shortMonth.format(date),
            longMonth.format(date),
          );
        case 'quarter': {
          const text = `Q${date.getMonth() / 3 + 1}`;
          return this.resolveCell(
            day,
            view,
            text,
            `${text} ${yearFormat.format(date)}`,
          );
        }
        default: {
          const text = yearFormat.format(date);
          return this.resolveCell(day, view, text, text);
        }
      }
    });

    const { columns } = PERIOD_GRID[view];
    const rows: CellRow[] = [];
    for (let index = 0; index < cells.length; index += columns) {
      const slice = cells.slice(index, index + columns);
      rows.push({ key: slice[0].key, weekNumber: null, cells: slice });
    }
    return rows;
  });

  /** Caption of the period grids: the year, or the decade span. */
  protected readonly periodCaption = computed(() => {
    const format = new Intl.DateTimeFormat(this.locale(), { year: 'numeric' });
    const anchor = this.visibleMonth();
    if (this.view() === 'year') {
      const decade = startOfDecade(anchor);
      return `${format.format(decade)} – ${format.format(
        new Date(decade.getFullYear() + 9, 0, 1),
      )}`;
    }
    return format.format(anchor);
  });

  protected readonly periodGridLabel = computed(
    () => this.ariaLabel() ?? this.periodCaption(),
  );

  /** Whether the caption climbs to a coarser grid. */
  protected readonly canClimb = computed(
    () => !this.disabled() && PARENT_VIEW[this.view()] !== null,
  );

  /** The single-step shift of the current grid, in months. */
  private readonly step = computed(() => {
    switch (this.view()) {
      case 'date':
        return 1;
      case 'month':
      case 'quarter':
        return 12;
      case 'year':
        return 120;
    }
  });

  protected readonly canGoPrevious = computed(() =>
    this.canShift(-this.step()),
  );
  protected readonly canGoNext = computed(() => this.canShift(this.step()));
  protected readonly canGoPreviousYear = computed(() => this.canShift(-12));
  protected readonly canGoNextYear = computed(() => this.canShift(12));

  protected readonly previousLabel = computed(() => {
    switch (this.view()) {
      case 'date':
        return this.previousMonthLabel();
      case 'year':
        return this.previousDecadeLabel();
      default:
        return this.previousYearLabel();
    }
  });

  protected readonly nextLabel = computed(() => {
    switch (this.view()) {
      case 'date':
        return this.nextMonthLabel();
      case 'year':
        return this.nextDecadeLabel();
      default:
        return this.nextYearLabel();
    }
  });

  protected readonly headerContext = computed<AndesCalendarHeaderContext>(
    () => ({
      $implicit: startOfMonth(this.visibleMonth()),
      view: this.view(),
      goTo: (date: Date) => this.goTo(date),
      setView: (view: AndesCalendarView) => this.setView(view),
    }),
  );

  protected readonly wrapperClasses = computed(() =>
    clsx(
      'andes-calendar',
      this.fullscreen() && 'andes-calendar--fullscreen',
      this.showWeekNumbers() &&
        this.view() === 'date' &&
        'andes-calendar--with-week',
      this.picker() === 'week' && 'andes-calendar--week-picker',
    ),
  );

  constructor() {
    afterNextRender(() => {
      if (this.autoFocus()) {
        this.focusActiveDay();
      }
    });
  }

  /**
   * Whether a date can be picked in the current grid: in bounds, not vetoed,
   * calendar not disabled. Cells in a coarser grid than `picker` are only
   * navigation targets, so only the bounds apply to them.
   */
  isSelectable(date: Date, view: AndesCalendarView = this.view()): boolean {
    if (this.disabled()) {
      return false;
    }
    const unit = view === 'date' ? 'date' : view;
    const min = this.min();
    const max = this.max();
    if (min && compareDays(endOfPeriod(date, unit), min) < 0) {
      return false;
    }
    if (max && compareDays(startOfPeriod(date, unit), max) > 0) {
      return false;
    }
    if (view !== baseViewFor(this.picker())) {
      return true;
    }
    return !this.dateDisabled()?.(date, { type: this.picker() });
  }

  /** Moves the visible month by `amount`, clamping focus into the new span. */
  shiftMonth(amount: number): void {
    const next = startOfMonth(addMonths(this.visibleMonth(), amount));
    this.visibleMonth.set(next);
    this.focusedDate.set(null);
    this.monthChange.emit(next);
    this.panelChange.emit({ date: next, view: this.view() });
  }

  /** Shows the period containing `date`; a no-op when it is already on screen. */
  goTo(date: Date): void {
    const month = startOfMonth(date);
    const { start, end } = this.visibleSpan();
    if (isWithinBounds(month, start, end)) {
      return;
    }
    this.visibleMonth.set(month);
    this.focusedDate.set(null);
    this.monthChange.emit(month);
    this.panelChange.emit({ date: month, view: this.view() });
  }

  /** Switches the visible grid (Ant's `mode` on `Calendar`). */
  setView(view: AndesCalendarView): void {
    if (view === this.view()) {
      return;
    }
    this.view.set(view);
    this.focusedDate.set(null);
    this.panelChange.emit({ date: startOfMonth(this.visibleMonth()), view });
  }

  /** Focuses the grid's active cell. Called on open by `AndesDatePicker`. */
  focusActiveDay(): void {
    this.cellElement(toDateKey(this.activeDate()))?.focus();
  }

  protected goToPrevious(): void {
    if (this.canGoPrevious()) {
      this.shiftMonth(-this.step());
    }
  }

  protected goToNext(): void {
    if (this.canGoNext()) {
      this.shiftMonth(this.step());
    }
  }

  protected goToPreviousYear(): void {
    if (this.canGoPreviousYear()) {
      this.shiftMonth(-12);
    }
  }

  protected goToNextYear(): void {
    if (this.canGoNextYear()) {
      this.shiftMonth(12);
    }
  }

  /** Caption click: climb to the coarser grid and focus its active cell. */
  protected climb(): void {
    const parent = PARENT_VIEW[this.view()];
    if (!parent || this.disabled()) {
      return;
    }
    this.setView(parent);
    this.flushAndFocus();
  }

  protected onCellHover(cell: AndesCalendarCell): void {
    if (this.mode() === 'range' && !cell.disabled) {
      this.hoverDate.set(cell.date);
    }
  }

  protected clearHover(): void {
    this.hoverDate.set(null);
  }

  protected selectCell(cell: AndesCalendarCell): void {
    if (cell.disabled) {
      return;
    }

    const base = baseViewFor(this.picker());
    if (cell.view !== base) {
      this.drillDown(cell);
      return;
    }

    this.focusedDate.set(cell.date);
    if (
      cell.view === 'date' &&
      !isWithinBounds(
        cell.date,
        this.visibleSpan().start,
        this.visibleSpan().end,
      )
    ) {
      // Clicking a leading/trailing cell navigates to the month it belongs to,
      // rather than selecting a day the user can no longer see in context.
      this.visibleMonth.set(startOfMonth(cell.date));
    } else if (cell.outside && cell.view === 'year') {
      this.visibleMonth.set(startOfMonth(cell.date));
    }

    const date = startOfPeriod(cell.date, this.picker(), this.weekStartsOn());
    if (this.mode() === 'range') {
      this.value.set(this.nextRange(date));
      this.hoverDate.set(null);
    } else {
      this.value.set(date);
    }

    this.daySelected.emit(date);
  }

  /** A click in a coarser grid than `picker`: open the next finer grid on it. */
  private drillDown(cell: AndesCalendarCell): void {
    const base = baseViewFor(this.picker());
    let month = cell.date;
    if (cell.view === 'year') {
      // Keep the month the user was on; only the year changes.
      month = new Date(
        cell.date.getFullYear(),
        this.visibleMonth().getMonth(),
        1,
      );
    }
    this.visibleMonth.set(startOfMonth(month));
    this.monthChange.emit(startOfMonth(month));
    const next: AndesCalendarView =
      cell.view === 'year' && base === 'date' ? 'month' : base;
    this.view.set(next);
    this.focusedDate.set(null);
    this.panelChange.emit({ date: startOfMonth(month), view: next });
    this.flushAndFocus();
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
   * The grid's whole keyboard contract, bound to each cell button — the elements
   * that actually hold focus. Enter/Space select the focused cell; everything else
   * moves the roving tabindex.
   */
  protected onCellKeydown(event: KeyboardEvent, cell: AndesCalendarCell): void {
    if (this.disabled()) {
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      // A `<button role="gridcell">` loses the button role's implicit
      // Enter/Space activation, so activate it explicitly.
      event.preventDefault();
      this.selectCell(cell);
      return;
    }

    const target =
      cell.view === 'date'
        ? this.dayKeyTarget(event)
        : this.periodKeyTarget(event, cell.view);
    if (!target) {
      return;
    }

    event.preventDefault();
    this.moveFocusTo(target);
  }

  private dayKeyTarget(event: KeyboardEvent): Date | null {
    const active = this.activeDate();
    const weekStart = addDays(
      active,
      -((active.getDay() - this.weekStartsOn() + 7) % 7),
    );

    switch (event.key) {
      case 'ArrowLeft':
        return event.shiftKey ? addMonths(active, -1) : addDays(active, -1);
      case 'ArrowRight':
        return event.shiftKey ? addMonths(active, 1) : addDays(active, 1);
      case 'ArrowUp':
        return event.shiftKey ? addYears(active, -1) : addDays(active, -7);
      case 'ArrowDown':
        return event.shiftKey ? addYears(active, 1) : addDays(active, 7);
      case 'Home':
        return weekStart;
      case 'End':
        return addDays(weekStart, 6);
      case 'PageUp':
        return event.shiftKey ? addYears(active, -1) : addMonths(active, -1);
      case 'PageDown':
        return event.shiftKey ? addYears(active, 1) : addMonths(active, 1);
      default:
        return null;
    }
  }

  private periodKeyTarget(
    event: KeyboardEvent,
    view: Exclude<AndesCalendarView, 'date'>,
  ): Date | null {
    const active = this.activeDate();
    const { columns, step, page } = PERIOD_GRID[view];
    const index =
      view === 'year'
        ? active.getFullYear() - (startOfDecade(active).getFullYear() - 1)
        : active.getMonth() / step;
    const column = index % columns;

    switch (event.key) {
      case 'ArrowLeft':
        return addMonths(active, -step);
      case 'ArrowRight':
        return addMonths(active, step);
      case 'ArrowUp':
        return addMonths(active, view === 'quarter' ? -12 : -step * columns);
      case 'ArrowDown':
        return addMonths(active, view === 'quarter' ? 12 : step * columns);
      case 'Home':
        return addMonths(active, -step * column);
      case 'End':
        return addMonths(active, step * (columns - 1 - column));
      case 'PageUp':
        return addMonths(active, -page);
      case 'PageDown':
        return addMonths(active, page);
      default:
        return null;
    }
  }

  /**
   * Moves the roving tabindex, paging the visible period when the target falls
   * outside it.
   *
   * The target is clamped into `[min, max]` so arrow keys stop at the bounds instead
   * of walking into a region where nothing is selectable. Days vetoed by
   * `dateDisabled` are still reachable — skipping them would make a calendar with
   * many blocked days unnavigable, and they announce as disabled on arrival.
   */
  private moveFocusTo(date: Date): void {
    const view = this.view();
    const unit = view === 'date' ? 'date' : view;
    const min = this.min();
    const target = startOfPeriod(
      clampDate(date, min ? startOfPeriod(min, unit) : null, this.max()),
      unit,
    );
    this.focusedDate.set(target);
    if (this.mode() === 'range') {
      this.hoverDate.set(target);
    }

    const { start, end } = this.visibleSpan();
    if (!isWithinBounds(target, start, end)) {
      let month = startOfMonth(target);
      if (view === 'date' && compareDays(target, end) > 0) {
        // Paging forward in a multi-month grid keeps the target in the last panel.
        month = addMonths(month, -(this.monthCount() - 1));
      }
      this.visibleMonth.set(month);
      this.monthChange.emit(month);
      this.panelChange.emit({ date: month, view });
    }

    this.flushAndFocus(target);
  }

  /**
   * The signals have updated but the DOM has not: in a zoneless app the re-render
   * is still queued. Flush this view synchronously so the target cell exists before
   * focus moves to it, instead of deferring focus to a microtask and making keyboard
   * navigation racy.
   */
  private flushAndFocus(target: Date = this.activeDate()): void {
    this.changeDetectorRef.detectChanges();
    this.cellElement(toDateKey(target))?.focus();
  }

  /** Whether moving the visible anchor by `amount` months still shows something in bounds. */
  private canShift(amount: number): boolean {
    if (this.disabled()) {
      return false;
    }
    const min = this.min();
    const max = this.max();
    const shifted = addMonths(this.visibleMonth(), amount);
    const view = this.view();
    let start: Date;
    let end: Date;
    if (view === 'date') {
      start = startOfMonth(shifted);
      end = endOfMonth(addMonths(shifted, this.monthCount() - 1));
    } else if (view === 'year') {
      start = startOfDecade(shifted);
      end = new Date(start.getFullYear() + 9, 11, 31);
    } else {
      start = startOfYear(shifted);
      end = new Date(shifted.getFullYear(), 11, 31);
    }
    if (amount < 0 && min && compareDays(end, min) < 0) {
      return false;
    }
    if (amount > 0 && max && compareDays(start, max) > 0) {
      return false;
    }
    return true;
  }

  /** Resolves every state flag of one cell. */
  private resolveCell(
    day: AndesCalendarDay,
    view: AndesCalendarView,
    text: string,
    label: string,
  ): AndesCalendarCell {
    const unit = view === 'date' ? this.cellUnit() : view;
    const weekStartsOn = this.weekStartsOn();
    const same = (other: Date | null | undefined) =>
      isSamePeriod(day.date, other ?? null, unit, weekStartsOn);
    const compare = (other: Date) =>
      comparePeriods(day.date, other, unit, weekStartsOn);

    const range = this.selectedRange();
    const isRangeStart = same(range?.start);
    const isRangeEnd = same(range?.end);
    const isSelected =
      this.mode() === 'range'
        ? isRangeStart || isRangeEnd
        : same(this.selectedDate());
    const inRange =
      !!range?.end && compare(range.start) > 0 && compare(range.end) < 0;

    const preview = this.previewRange();
    const inPreview =
      !!preview?.end &&
      !isSelected &&
      compare(preview.start) >= 0 &&
      compare(preview.end) <= 0;

    const isToday = isSamePeriod(
      day.date,
      today(),
      view === 'date' ? 'date' : view,
    );
    const isDisabled = !this.isSelectable(day.date, view);
    const active = day.key === toDateKey(this.activeDate());

    return {
      ...day,
      view,
      text,
      selected: isSelected,
      rangeStart: isRangeStart,
      rangeEnd: isRangeEnd,
      inRange,
      inPreview,
      isToday,
      disabled: isDisabled,
      active,
      label,
      classes: clsx(
        view === 'date' ? 'andes-calendar__day' : 'andes-calendar__period',
        day.outside && 'andes-calendar__day--outside',
        isSelected && 'andes-calendar__day--selected',
        isRangeStart && 'andes-calendar__day--range-start',
        isRangeEnd && 'andes-calendar__day--range-end',
        inRange && 'andes-calendar__day--in-range',
        inPreview && 'andes-calendar__day--in-preview',
        isToday && 'andes-calendar__day--today',
        isDisabled && 'andes-calendar__day--disabled',
      ),
    };
  }

  /** First selectable cell of the span, preferring today / the current period. */
  private defaultActiveDate(
    start: Date,
    end: Date,
    unit: AndesPickerType,
  ): Date {
    const view = this.view();
    const now = startOfPeriod(today(), unit);
    if (isWithinBounds(now, start, end) && this.isSelectable(now, view)) {
      return now;
    }

    const stepMonths = view === 'date' ? 0 : PERIOD_GRID[view].step;
    for (
      let candidate = start;
      compareDays(candidate, end) <= 0;
      candidate =
        stepMonths === 0
          ? addDays(candidate, 1)
          : addMonths(candidate, stepMonths)
    ) {
      if (this.isSelectable(candidate, view)) {
        return candidate;
      }
    }
    // Nothing in this span is selectable; its first cell still needs to hold the
    // tabindex so the grid stays reachable by Tab.
    return start;
  }

  private cellElement(key: string): HTMLElement | null {
    const root = this.elementRef.nativeElement;
    // Prefer the in-month cell over an adjacent month's outside day of the same date.
    return (
      root.querySelector<HTMLElement>(
        `[data-date="${key}"]:not([data-outside])`,
      ) ?? root.querySelector<HTMLElement>(`[data-date="${key}"]`)
    );
  }
}
