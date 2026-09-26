import {
  andesOverlayPreset,
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  provideAndesOverlay,
  type AndesOverlayAnchoredPositioning,
} from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';
import clsx from 'clsx';

import { AndesButton } from '../button/button';
import {
  AndesCalendar,
  type AndesCalendarCellContext,
  type AndesCalendarMode,
  type AndesCalendarPanelChange,
  type AndesCalendarValue,
  type AndesDateDisabledFn,
} from '../calendar/calendar';
import {
  formatWithIntl,
  formatWithPattern,
  parseWithPatterns,
  patternFromIntl,
  type AndesDateFormat,
} from '../calendar/date-format';
import {
  clampWeekday,
  coerceDate,
  coerceDateTime,
  compareDays,
  endOfPeriod,
  MIDNIGHT,
  startOfDay,
  startOfPeriod,
  timeOf,
  toDateRange,
  today,
  withTime,
  type AndesPickerType,
  type AndesTimeOfDay,
  type AndesWeekday,
} from '../calendar/date-utils';

/**
 * What a date picker reports to a form. A `Date` in `single` mode, a
 * `[start, end]` tuple in `range` mode, `null` when nothing (or only half a range)
 * is selected. Dates are local midnights unless `showTime` is on.
 */
export type AndesDatePickerValue = Date | readonly [Date, Date] | null;

/** Field height, matching `AndesButton`'s `sm`/`md`/`lg`. */
export type AndesDatePickerSize = 'sm' | 'md' | 'lg';

/** Validation styling. `error` also sets `aria-invalid` on the input(s). */
export type AndesDatePickerStatus = 'error' | 'warning';

/** The field's visual treatment. */
export type AndesDatePickerVariant =
  'outlined' | 'filled' | 'borderless' | 'underlined';

/** Where the panel opens relative to the field. Flips automatically when it does not fit. */
export type AndesDatePickerPlacement =
  'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';

/** `showTime` options. */
export interface AndesTimeOptions {
  /** Interval between hour options. Default `1`. */
  readonly hourStep?: number;
  /** Interval between minute options. Default `1`. */
  readonly minuteStep?: number;
  /** Interval between second options. Default `1`. */
  readonly secondStep?: number;
  /** Add a seconds column. Default `false`. */
  readonly showSecond?: boolean;
}

/** A one-click value in the panel's side list. */
export interface AndesDatePickerPreset {
  readonly label: string;
  /** The value, or a function evaluated on click so "Last 7 days" stays current. */
  readonly value: AndesDatePickerValue | (() => AndesDatePickerValue);
}

type Side = 'start' | 'end';
type TimeUnit = 'hours' | 'minutes' | 'seconds';

interface TimeColumn {
  readonly unit: TimeUnit;
  readonly label: string;
  readonly activeId: string;
  readonly options: readonly {
    readonly value: number;
    readonly text: string;
    readonly id: string;
    readonly selected: boolean;
  }[];
}

const PLACEMENTS: Readonly<
  Record<AndesDatePickerPlacement, AndesOverlayAnchoredPositioning>
> = {
  bottomLeft: {
    kind: 'anchored',
    side: 'bottom',
    align: 'start',
    sideOffset: 6,
  },
  bottomRight: {
    kind: 'anchored',
    side: 'bottom',
    align: 'end',
    sideOffset: 6,
  },
  topLeft: { kind: 'anchored', side: 'top', align: 'start', sideOffset: 6 },
  topRight: { kind: 'anchored', side: 'top', align: 'end', sideOffset: 6 },
};

/** Token patterns for pickers `Intl` has no notion of. */
const DEFAULT_PATTERNS: Partial<Record<AndesPickerType, string>> = {
  week: 'YYYY-[W]ww',
  quarter: 'YYYY-[Q]Q',
};

/** `Intl` display options for the pickers that do have an `Intl` shape. */
const DEFAULT_INTL: Partial<
  Record<AndesPickerType, Intl.DateTimeFormatOptions>
> = {
  date: { dateStyle: 'medium' },
  month: { month: 'short', year: 'numeric' },
  year: { year: 'numeric' },
};

/** Machine formats always accepted when typing, whatever the display format. */
const FALLBACK_PATTERNS: Readonly<Record<AndesPickerType, readonly string[]>> =
  {
    date: ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DD'],
    week: ['YYYY-[W]ww', 'YYYY-ww'],
    month: ['YYYY-MM'],
    quarter: ['YYYY-[Q]Q', 'YYYY-Q'],
    year: ['YYYY'],
  };

const PLACEHOLDER_NOUNS: Readonly<Record<AndesPickerType, string>> = {
  date: 'date',
  week: 'week',
  month: 'month',
  quarter: 'quarter',
  year: 'year',
};

let nextId = 0;

/** `showTime` accepts `true`, a bare attribute, or an options object. */
function coerceTimeOptions(value: unknown): AndesTimeOptions | null {
  if (value && typeof value === 'object') {
    return value as AndesTimeOptions;
  }
  return booleanAttribute(value) ? {} : null;
}

function sameInstant(a: Date | null | undefined, b: Date | null | undefined) {
  return (a?.getTime() ?? null) === (b?.getTime() ?? null);
}

function sameValue(a: AndesDatePickerValue, b: AndesDatePickerValue): boolean {
  if (Array.isArray(a) || Array.isArray(b)) {
    const left = (a ?? []) as readonly Date[];
    const right = (b ?? []) as readonly Date[];
    return sameInstant(left[0], right[0]) && sameInstant(left[1], right[1]);
  }
  return sameInstant(a as Date | null, b as Date | null);
}

/**
 * A date (or range) field with a calendar popover, wired into Angular forms.
 *
 * Following the shadcn/ui anatomy, this is a *composition*: `AndesCalendar` does
 * the date work, `AndesOverlayPrimitive`'s `popover` preset does the panel work,
 * and this component owns the field, typed-date parsing, the time columns, the
 * commit rules and the `ControlValueAccessor`.
 *
 * ## The field
 *
 * Each input is an `<input role="combobox" aria-haspopup="dialog">`, the WAI-ARIA
 * APG "date picker combobox" pattern: the user can type a date in the display
 * format (or ISO `YYYY-MM-DD`), and the calendar follows as soon as the text
 * parses. Enter or leaving the field commits typed text; text that does not parse
 * is discarded. ArrowDown (or Alt+ArrowDown) moves focus into the calendar grid,
 * Escape closes the panel and returns focus to the input.
 *
 * `range` mode renders two inputs in one field, grouped with `role="group"`; the
 * panel shows two months side by side and previews the range under the pointer.
 *
 * Because the accessible name lives on the inner input(s) rather than the host, a
 * consumer labels the picker with `aria-label`/`aria-labelledby` (pointing at a
 * visible label element) rather than a `<label for>`.
 *
 * ## Committing
 *
 * Without `showTime`/`needConfirm` a pick commits at once and closes the panel
 * (after the second day in `range` mode). With `needConfirm` — on by default with
 * `showTime` — picks are pending until the OK button (or Enter), and
 * closing the panel any other way discards them.
 */
@Component({
  selector: 'andes-date-picker',
  imports: [
    AndesButton,
    AndesCalendar,
    AndesOverlayContentPrimitive,
    NgTemplateOutlet,
  ],
  templateUrl: './date-picker.html',
  styleUrl: './date-picker.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideAndesOverlay(),
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesDatePicker),
      multi: true,
    },
  ],
  host: {
    'data-slot': 'date-picker',
    '[attr.data-mode]': 'mode()',
    '[attr.data-picker]': 'picker()',
    '[attr.data-size]': 'size()',
    '[attr.data-variant]': 'variant()',
    '[attr.data-status]': 'status()',
    '[attr.data-disabled]': 'isDisabled() || null',
    '[attr.data-state]': 'overlay.isOpen() ? "open" : "closed"',
  },
})
export class AndesDatePicker implements ControlValueAccessor {
  /** The overlay this picker owns. Exposed so a consumer can drive it imperatively. */
  readonly overlay = inject(AndesOverlayPrimitive);

  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');
  private readonly field = viewChild.required<ElementRef<HTMLElement>>('field');
  private readonly startInput =
    viewChild.required<ElementRef<HTMLInputElement>>('startInput');
  private readonly endInput =
    viewChild<ElementRef<HTMLInputElement>>('endInput');
  private readonly calendar = viewChild(AndesCalendar);

  protected readonly idPrefix = `andes-date-picker-${nextId++}`;

  /** One date or a span of dates. */
  readonly mode = input<AndesCalendarMode>('single');

  /** Selection granularity: `date`, `week`, `month`, `quarter` or `year`. */
  readonly picker = input<AndesPickerType>('date');

  /** Earliest selectable day, inclusive. */
  readonly min = input<Date | null, unknown>(null, { transform: coerceDate });

  /** Latest selectable day, inclusive. */
  readonly max = input<Date | null, unknown>(null, { transform: coerceDate });

  /** BCP 47 tag driving month/weekday names and the display format. */
  readonly locale = input<string | undefined>(undefined);

  /**
   * First column of the week, `0` = Sunday.
   *
   * Coerced the same way as `AndesCalendar`'s own `weekStartsOn` (which this
   * value is passed straight through to): `numberAttribute` guards the bare
   * `weekStartsOn="1"` attribute case, and `clampWeekday` keeps the result in
   * the valid `0`-`6` range. See `AndesCalendar.weekStartsOn` for why an
   * uncoerced string silently corrupts the grid.
   */
  readonly weekStartsOn = input<AndesWeekday>(0, {
    transform: (value: unknown) => clampWeekday(numberAttribute(value, 0)),
  });

  /** Render the adjacent months' days in the calendar's leading/trailing cells. */
  readonly showOutsideDays = input(true, { transform: booleanAttribute });

  /** Keep the panel a constant six rows tall across months. */
  readonly fixedWeeks = input(false, { transform: booleanAttribute });

  /**
   * Months shown side by side. Defaults to two for a `range` day/week picker, one
   * otherwise.
   */
  readonly numberOfMonths = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value == null || value === '' ? undefined : numberAttribute(value, 1),
  });

  /** Prefix each week with its number (always on for `picker="week"`). */
  readonly showWeek = input(false, { transform: booleanAttribute });

  /** Per-date veto, applied on top of `min`/`max`. */
  readonly dateDisabled = input<AndesDateDisabledFn | null>(null);

  /** Custom cell content, passed to the calendar. */
  readonly cellTemplate = input<TemplateRef<AndesCalendarCellContext> | null>(
    null,
  );

  /**
   * Month the panel opens on when there is no selection. Defaults to the selected
   * value's month, else the current month.
   */
  readonly defaultMonth = input<Date | null, unknown>(null, {
    transform: coerceDate,
  });

  /** Disables the field and the calendar. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Input placeholder(s). A `[start, end]` pair in `range` mode; a single string
   * applies to both inputs. Defaults to "Select a date" / "Start date"-"End date",
   * with the noun following `picker`.
   */
  readonly placeholder = input<string | readonly [string, string] | undefined>(
    undefined,
  );

  /** Text between the two inputs of a range. */
  readonly rangeSeparator = input('→');

  /**
   * `Intl.DateTimeFormat` options for the display value, used when `format` is not
   * set. Typed input in the same shape is parsed back. Defaults per `picker`
   * (`{ dateStyle: 'medium' }` for days).
   */
  readonly displayFormat = input<Intl.DateTimeFormatOptions | null>(null);

  /**
   * Token format(s) for display and typed input (`'DD/MM/YYYY'`,
   * `['DD/MM/YYYY', 'DD/MM/YY']`, …; see `date-format.ts` for the tokens). The
   * first pattern displays, every pattern parses. A function formats only; typing
   * then accepts ISO dates. Takes precedence over `displayFormat`.
   */
  readonly format = input<AndesDateFormat | null>(null);

  /** Show a clear button while there is a value. */
  readonly allowClear = input(true, { transform: booleanAttribute });

  /** Field height. */
  readonly size = input<AndesDatePickerSize>('md');

  /** Validation styling. */
  readonly status = input<AndesDatePickerStatus | null>(null);

  /** Visual treatment of the field. */
  readonly variant = input<AndesDatePickerVariant>('outlined');

  /** Where the panel opens. */
  readonly placement = input<AndesDatePickerPlacement>('bottomLeft');

  /**
   * Add hour/minute (and optionally second) columns to the panel. `true`, a bare
   * attribute, or an {@link AndesTimeOptions} object. Only applies to `picker="date"`.
   */
  readonly showTime = input<AndesTimeOptions | null, unknown>(null, {
    transform: coerceTimeOptions,
  });

  /**
   * Require the OK button to commit. Defaults to on with `showTime`, off without.
   */
  readonly needConfirm = input<boolean | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value == null ? undefined : booleanAttribute(value),
  });

  /** A "Today" (or, with `showTime`, "Now") shortcut in the footer. Single mode only. */
  readonly showNow = input(false, { transform: booleanAttribute });

  /** One-click values listed beside the calendar. */
  readonly presets = input<readonly AndesDatePickerPreset[]>([]);

  /** Make the inputs read-only, e.g. to keep a phone's keyboard closed. */
  readonly inputReadOnly = input(false, { transform: booleanAttribute });

  /** Content before the input(s). */
  readonly prefix = input<TemplateRef<unknown> | null>(null);

  /** Replaces the calendar icon at the end of the field. */
  readonly suffixIcon = input<TemplateRef<unknown> | null>(null);

  /** Extra footer content in the panel. */
  readonly extraFooter = input<TemplateRef<unknown> | null>(null);

  /** Accessible name for the input (single) or the input group (range). */
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });

  /** Points the input (single) or group (range) at an external label element. */
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });

  /** Accessible name for the calendar panel. */
  readonly panelLabel = input('Choose a date');

  /** Accessible name of a range's start input. */
  readonly startInputLabel = input('Start date');

  /** Accessible name of a range's end input. */
  readonly endInputLabel = input('End date');

  /** Accessible name of the clear button. */
  readonly clearLabel = input('Clear');

  /** Text of the confirm button. */
  readonly okLabel = input('OK');

  /** Text of the `showNow` button. Defaults to "Now" with `showTime`, else "Today". */
  readonly nowLabel = input<string | undefined>(undefined);

  /** Accessible name of the presets list. */
  readonly presetsLabel = input('Presets');

  /** Accessible names of the time columns. */
  readonly hoursLabel = input('Hours');
  readonly minutesLabel = input('Minutes');
  readonly secondsLabel = input('Seconds');

  /**
   * Whether the panel is open. Two-way bindable (`[(open)]`); `openChange` fires
   * whenever the picker opens or closes itself.
   */
  readonly open = model(false);

  /** Emits the committed value: a `Date`, a complete `[start, end]`, or `null`. */
  readonly valueChange = output<AndesDatePickerValue>();

  /** Emits when the clear button (or clearing the text) empties the value. */
  readonly clear = output<void>();

  /** Emits when the OK button confirms a pending value. */
  readonly ok = output<AndesDatePickerValue>();

  /**
   * Emits each boundary pick of a range, before it is complete.
   */
  readonly calendarChange = output<readonly [Date | null, Date | null]>();

  /** Re-emits the calendar's panel navigation. */
  readonly panelChange = output<AndesCalendarPanelChange>();

  /** The live day-level selection, including a pending or half-finished one. */
  protected readonly selection = signal<AndesCalendarValue>(null);

  /** Time of day of the (start) value, when `showTime` is on. */
  private readonly startTime = signal<AndesTimeOfDay>(MIDNIGHT);

  /** Time of day of a range's end, when `showTime` is on. */
  private readonly endTime = signal<AndesTimeOfDay>(MIDNIGHT);

  /** The last value committed to (or written by) the form, for reverting. */
  private readonly committed = signal<AndesDatePickerValue>(null);

  /** Text typed but not yet resolved; `null` shows the formatted value. */
  private readonly startDraft = signal<string | null>(null);
  private readonly endDraft = signal<string | null>(null);

  /** Which input (and which time) the user is editing. */
  protected readonly activeSide = signal<Side>('start');

  /** Move focus into the grid when the panel opens (keyboard open). */
  protected readonly focusGridOnOpen = signal(false);

  /** Set by `setDisabledState`, i.e. by a disabled reactive-forms control. */
  private readonly disabledByForm = signal(false);

  /** Why the panel is being closed from inside, when that affects focus. */
  private closingForBlur = false;

  protected readonly isDisabled = computed(
    () => this.disabled() || this.disabledByForm(),
  );

  protected readonly isRange = computed(() => this.mode() === 'range');

  private readonly openRequested = computed(() =>
    booleanAttribute(this.open()),
  );

  /** `showTime`, when it applies (day pickers only). */
  protected readonly timeOptions = computed(() =>
    this.picker() === 'date' ? this.showTime() : null,
  );

  protected readonly confirmRequired = computed(
    () => this.needConfirm() ?? this.timeOptions() !== null,
  );

  protected readonly monthCount = computed(() => {
    const explicit = this.numberOfMonths();
    if (explicit !== undefined) {
      return explicit;
    }
    const dayGrid = this.picker() === 'date' || this.picker() === 'week';
    return this.isRange() && dayGrid ? 2 : 1;
  });

  private readonly formatContext = computed(() => ({
    locale: this.locale(),
    weekStartsOn: this.weekStartsOn(),
  }));

  /** Token patterns from `format`, or the picker's default where `Intl` has none. */
  private readonly patterns = computed<readonly string[] | null>(() => {
    const format = this.format();
    if (typeof format === 'string') {
      return [format];
    }
    if (Array.isArray(format)) {
      return format.length ? (format as readonly string[]) : null;
    }
    if (typeof format === 'function') {
      return null;
    }
    const fallback = DEFAULT_PATTERNS[this.picker()];
    return fallback && !this.displayFormat() ? [fallback] : null;
  });

  /** `Intl` options for display when no token pattern applies. */
  private readonly intlOptions = computed<Intl.DateTimeFormatOptions>(() => {
    const base = this.displayFormat() ??
      DEFAULT_INTL[this.picker()] ?? { dateStyle: 'medium' };
    const time = this.timeOptions();
    if (!time) {
      return base;
    }
    if (base.dateStyle) {
      return { ...base, timeStyle: time.showSecond ? 'medium' : 'short' };
    }
    return {
      ...base,
      hour: '2-digit',
      minute: '2-digit',
      ...(time.showSecond ? { second: '2-digit' } : {}),
    };
  });

  /** Every pattern typed text is tried against, display format first. */
  private readonly parsePatterns = computed(() => {
    const own =
      this.patterns() ??
      (typeof this.format() === 'function'
        ? []
        : [patternFromIntl(this.locale(), this.intlOptions())]);
    return [...own, ...FALLBACK_PATTERNS[this.picker()]];
  });

  protected readonly placeholders = computed<readonly [string, string]>(() => {
    const placeholder = this.placeholder();
    if (Array.isArray(placeholder)) {
      return placeholder as readonly [string, string];
    }
    if (typeof placeholder === 'string') {
      return [placeholder, placeholder];
    }
    const noun = PLACEHOLDER_NOUNS[this.picker()];
    return this.isRange()
      ? [`Start ${noun}`, `End ${noun}`]
      : [`Select a ${noun}`, ''];
  });

  private readonly startDate = computed(() =>
    this.isRange()
      ? (toDateRange(this.selection())?.start ?? null)
      : coerceDate(this.selection()),
  );

  private readonly endDate = computed(() =>
    this.isRange() ? (toDateRange(this.selection())?.end ?? null) : null,
  );

  /** The value the current selection would commit, or `null` if incomplete. */
  private readonly currentValue = computed<AndesDatePickerValue>(() => {
    const start = this.startDate();
    const time = this.timeOptions() !== null;
    if (!start) {
      return null;
    }
    const first = time ? withTime(start, this.startTime()) : start;
    if (!this.isRange()) {
      return first;
    }
    const end = this.endDate();
    if (!end) {
      return null;
    }
    const last = time ? withTime(end, this.endTime()) : end;
    return last.getTime() < first.getTime() ? [last, first] : [first, last];
  });

  protected readonly startText = computed(
    () =>
      this.startDraft() ?? this.formatSide(this.startDate(), this.startTime()),
  );

  protected readonly endText = computed(
    () => this.endDraft() ?? this.formatSide(this.endDate(), this.endTime()),
  );

  protected readonly hasValue = computed(
    () => !!this.startDate() || !!this.endDate(),
  );

  protected readonly showClear = computed(
    () => this.allowClear() && !this.isDisabled() && this.hasValue(),
  );

  protected readonly canConfirm = computed(() => this.currentValue() !== null);

  protected readonly nowText = computed(
    () => this.nowLabel() ?? (this.timeOptions() ? 'Now' : 'Today'),
  );

  protected readonly showFooter = computed(
    () =>
      !!this.extraFooter() ||
      this.confirmRequired() ||
      (this.showNow() && !this.isRange()),
  );

  protected readonly fieldClasses = computed(() =>
    clsx(
      'andes-date-picker__field',
      `andes-date-picker__field--${this.size()}`,
      `andes-date-picker__field--${this.variant()}`,
      this.status() && `andes-date-picker__field--${this.status()}`,
      this.overlay.isOpen() && 'andes-date-picker__field--open',
    ),
  );

  protected readonly timeColumns = computed<readonly TimeColumn[]>(() => {
    const options = this.timeOptions();
    if (!options) {
      return [];
    }
    const time =
      this.isRange() && this.activeSide() === 'end'
        ? this.endTime()
        : this.startTime();
    const column = (
      unit: TimeUnit,
      label: string,
      count: number,
      step: number | undefined,
    ): TimeColumn => {
      const interval = Math.max(1, Math.floor(step ?? 1));
      const values: number[] = [];
      for (let value = 0; value < count; value += interval) {
        values.push(value);
      }
      const current = time[unit];
      return {
        unit,
        label,
        activeId: `${this.idPrefix}-${unit}-${current}`,
        options: values.map((value) => ({
          value,
          text: String(value).padStart(2, '0'),
          id: `${this.idPrefix}-${unit}-${value}`,
          selected: value === current,
        })),
      };
    };

    return [
      column('hours', this.hoursLabel(), 24, options.hourStep),
      column('minutes', this.minutesLabel(), 60, options.minuteStep),
      ...(options.showSecond
        ? [column('seconds', this.secondsLabel(), 60, options.secondStep)]
        : []),
    ];
  });

  private onChange: (value: AndesDatePickerValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    this.overlay.configure({
      ...andesOverlayPreset('popover'),
      positioning: PLACEMENTS.bottomLeft,
      // Focus stays in the input on a pointer open, so the user can type; a
      // keyboard open moves it into the grid via the calendar's `autoFocus`.
      autoFocus: 'none',
      // Restored by hand in `onClosed`: the anchor is the non-focusable field
      // wrapper, and a close caused by tabbing away must not pull focus back.
      restoreFocus: false,
    });

    effect(() => {
      const positioning = PLACEMENTS[this.placement()];
      untracked(() => this.overlay.configure({ positioning }));
    });

    this.overlay.closed
      .pipe(takeUntilDestroyed())
      .subscribe((reason) => this.onClosed(reason));

    this.overlay.opened.pipe(takeUntilDestroyed()).subscribe(() => {
      if (!untracked(this.open)) {
        this.open.set(true);
      }
    });

    // `[open]` / `[(open)]`: follow the requested state once the view exists.
    afterRenderEffect(() => {
      const requested = this.openRequested();
      untracked(() => {
        if (requested && !this.overlay.isOpen()) {
          this.openPanel();
        } else if (!requested && this.overlay.isOpen()) {
          this.close();
        }
      });
    });

    // A control disabled while its panel is open would otherwise leave an
    // interactive calendar floating over a disabled field.
    effect(() => {
      if (this.isDisabled() && this.overlay.isOpen()) {
        this.overlay.close('imperative');
      }
    });

    // Keep each time column scrolled to its selected option.
    afterRenderEffect(() => {
      this.timeColumns();
      const pane = this.overlay.panelElement();
      pane
        ?.querySelectorAll<HTMLElement>('.andes-date-picker__time-column')
        .forEach((column) => {
          const selected = column.querySelector<HTMLElement>(
            '[aria-selected="true"]',
          );
          const first = column.firstElementChild as HTMLElement | null;
          if (selected && first) {
            column.scrollTop = selected.offsetTop - first.offsetTop;
          }
        });
    });
  }

  /**
   * Opens the panel. `focusGrid` moves focus into the calendar, as a keyboard
   * open should; a pointer open leaves it in the input.
   */
  openPanel(focusGrid = false): void {
    if (this.isDisabled()) {
      return;
    }
    if (this.overlay.isOpen()) {
      if (focusGrid) {
        this.calendar()?.focusActiveDay();
      }
      return;
    }
    this.focusGridOnOpen.set(focusGrid);
    this.overlay.registerAnchor(this.field().nativeElement);
    this.overlay.open(this.panel());
  }

  /** Opens the panel if closed, closes it if open. */
  toggle(): void {
    if (this.overlay.isOpen()) {
      this.close();
    } else {
      this.openPanel();
    }
  }

  /** Closes the panel. Pending (unconfirmed) picks are discarded. */
  close(): void {
    this.overlay.close('imperative');
  }

  /** Commits the pending value and closes the panel (the OK button). */
  confirm(): void {
    const value = this.currentValue();
    if (value === null) {
      return;
    }
    this.commit(value);
    this.ok.emit(value);
    this.close();
  }

  // --- Field --------------------------------------------------------------

  /**
   * A press on the field's chrome (padding, prefix, icon) acts on the input: it
   * keeps focus from landing on nothing, focuses the active input and opens. The
   * inputs handle their own clicks; the clear button handles its own.
   */
  protected onFieldMousedown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (
      this.isDisabled() ||
      event.button !== 0 ||
      target.tagName === 'INPUT' ||
      target.closest('[data-slot="date-picker-clear"]')
    ) {
      return;
    }
    event.preventDefault();
    this.inputFor(this.activeSide())?.focus();
    this.openPanel();
  }

  protected onInputFocus(side: Side): void {
    this.activeSide.set(side);
  }

  protected onInput(side: Side, event: Event): void {
    const text = (event.target as HTMLInputElement).value;
    this.draftFor(side).set(text);
    const parsed = this.parse(text);
    if (parsed) {
      this.preview(side, parsed);
    }
    this.openPanel();
  }

  protected onInputKeydown(side: Side, event: KeyboardEvent): void {
    if (this.isDisabled()) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
        // The APG date-picker combobox: Down (with or without Alt) opens the
        // dialog and moves focus to the grid.
        event.preventDefault();
        this.openPanel(true);
        return;
      case 'Enter':
        event.preventDefault();
        this.onEnter(side);
        return;
      case ' ':
        // A space is text in an editable input; only a read-only one opens on it.
        if (this.inputReadOnly()) {
          event.preventDefault();
          this.openPanel();
        }
        return;
      case 'Escape':
        if (!this.overlay.isOpen() && this.draftFor(side)() !== null) {
          this.draftFor(side).set(null);
          this.applyValue(this.committed());
        }
        return;
    }
  }

  private onEnter(side: Side): void {
    if (this.draftFor(side)() !== null) {
      if (!this.resolveDraft(side)) {
        return;
      }
      if (this.isRange() && side === 'start' && !this.endDate()) {
        this.activeSide.set('end');
        this.endInput()?.nativeElement.focus();
        return;
      }
      const value = this.currentValue();
      if (value !== null || !this.hasValue()) {
        this.commit(value);
        this.close();
      }
      return;
    }
    if (!this.overlay.isOpen()) {
      this.openPanel();
    } else if (this.confirmRequired() && this.canConfirm()) {
      this.confirm();
    }
  }

  /**
   * Focus left the picker (field and panel) entirely: resolve typed text and close.
   * `relatedTarget` is the element receiving focus; inside the field or the panel
   * means the user is still working in the picker.
   */
  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (
      next &&
      (this.field().nativeElement.contains(next) ||
        this.overlay.panelElement()?.contains(next))
    ) {
      return;
    }

    let changed = false;
    for (const side of ['start', 'end'] as const) {
      if (this.draftFor(side)() !== null) {
        changed = this.resolveDraft(side) || changed;
      }
    }
    if (changed && !this.confirmRequired()) {
      const value = this.currentValue();
      if (!sameValue(value, this.committed())) {
        this.commit(value);
      }
    }

    if (this.overlay.isOpen()) {
      this.closingForBlur = true;
      this.close();
      this.closingForBlur = false;
    } else {
      this.onTouched();
    }
  }

  /**
   * Keeps focus where it is (the input, usually) when the panel is clicked, so
   * picking a day never blurs the field. A scroll container's own scrollbar is
   * left alone.
   */
  protected onPanelMousedown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.classList.contains('andes-date-picker__time-column')) {
      event.preventDefault();
    }
  }

  protected clearValue(event: MouseEvent): void {
    event.stopPropagation();
    this.selection.set(null);
    this.startTime.set(MIDNIGHT);
    this.endTime.set(MIDNIGHT);
    this.startDraft.set(null);
    this.endDraft.set(null);
    this.activeSide.set('start');
    this.commit(null);
    this.clear.emit();
    this.close();
    this.startInput().nativeElement.focus();
  }

  // --- Panel --------------------------------------------------------------

  protected onCalendarValueChange(next: AndesCalendarValue): void {
    this.selection.set(next);
    this.startDraft.set(null);
    this.endDraft.set(null);

    const keepOpen = this.timeOptions() !== null;

    if (this.isRange()) {
      const range = toDateRange(next);
      this.calendarChange.emit([range?.start ?? null, range?.end ?? null]);
      this.activeSide.set(range?.end ? 'end' : 'start');
      if (this.confirmRequired()) {
        return;
      }
      if (range?.end) {
        this.commit(this.currentValue());
        if (!keepOpen) {
          this.close();
        }
      } else {
        // Half a range is not a value a form can hold; publish `null` until the
        // range is complete, so a required validator stays unsatisfied meanwhile.
        this.commit(null);
      }
      return;
    }

    if (this.confirmRequired()) {
      return;
    }
    this.commit(this.currentValue());
    if (!keepOpen) {
      this.close();
    }
  }

  protected setTimePart(unit: TimeUnit, value: number): void {
    const target =
      this.isRange() && this.activeSide() === 'end'
        ? this.endTime
        : this.startTime;
    target.update((time) => ({ ...time, [unit]: value }));
    this.startDraft.set(null);
    this.endDraft.set(null);
    if (!this.confirmRequired() && this.currentValue() !== null) {
      this.commit(this.currentValue());
    }
  }

  /**
   * Options are picked on press, the usual listbox behavior: they are not
   * focusable themselves (the listbox owns focus via `aria-activedescendant`).
   */
  protected onTimeOptionMousedown(
    event: MouseEvent,
    unit: TimeUnit,
    value: number,
  ): void {
    if (event.button === 0) {
      this.setTimePart(unit, value);
    }
  }

  protected onTimeKeydown(event: KeyboardEvent, column: TimeColumn): void {
    const index = column.options.findIndex((option) => option.selected);
    let next: number;
    switch (event.key) {
      case 'ArrowUp':
        next = Math.max(0, index - 1);
        break;
      case 'ArrowDown':
        next = Math.min(column.options.length - 1, index + 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = column.options.length - 1;
        break;
      case 'Enter':
        event.preventDefault();
        if (this.confirmRequired()) {
          this.confirm();
        }
        return;
      default:
        return;
    }
    event.preventDefault();
    this.setTimePart(column.unit, column.options[Math.max(0, next)].value);
  }

  protected selectNow(): void {
    const now = this.timeOptions() ? new Date() : today();
    if (!this.isAllowed(now)) {
      return;
    }
    this.applyValue(now);
    this.commit(this.currentValue());
    this.close();
  }

  protected applyPreset(preset: AndesDatePickerPreset): void {
    const value =
      typeof preset.value === 'function' ? preset.value() : preset.value;
    this.applyValue(value);
    this.commit(this.currentValue());
    this.close();
  }

  // --- Internals ----------------------------------------------------------

  private onClosed(reason: string): void {
    // Pending picks (needConfirm) and unresolved typed text are both discarded
    // by a close; a close caused by leaving the field resolves the text first,
    // in `onFocusOut`, so it never reaches here as a draft.
    const hadDraft = this.startDraft() !== null || this.endDraft() !== null;
    if (
      (this.confirmRequired() || hadDraft) &&
      !sameValue(this.currentValue(), this.committed())
    ) {
      this.applyValue(this.committed());
    }
    this.startDraft.set(null);
    this.endDraft.set(null);
    this.focusGridOnOpen.set(false);
    this.onTouched();
    if (untracked(this.open)) {
      this.open.set(false);
    }

    // Focus was inside the panel, which is gone now: hand it back to the input,
    // unless the user deliberately moved it elsewhere (a click or Tab away).
    const active = document.activeElement;
    if (
      !this.closingForBlur &&
      reason !== 'outside-click' &&
      (!active || active === document.body)
    ) {
      this.inputFor(this.activeSide())?.focus();
    }
  }

  private formatSide(day: Date | null, time: AndesTimeOfDay): string {
    if (!day) {
      return '';
    }
    return this.formatValue(this.timeOptions() ? withTime(day, time) : day);
  }

  private formatValue(date: Date): string {
    const format = this.format();
    if (typeof format === 'function') {
      return format(date);
    }
    const patterns = this.patterns();
    if (patterns) {
      return formatWithPattern(date, patterns[0], this.formatContext());
    }
    return formatWithIntl(date, this.locale(), this.intlOptions());
  }

  /** Parses typed text into an allowed date, or `null`. */
  private parse(text: string): Date | null {
    const parsed = parseWithPatterns(
      text,
      this.parsePatterns(),
      this.formatContext(),
    );
    if (!parsed) {
      return null;
    }
    const date =
      this.picker() === 'date'
        ? parsed
        : startOfPeriod(parsed, this.picker(), this.weekStartsOn());
    return this.isAllowed(date) ? date : null;
  }

  private isAllowed(date: Date): boolean {
    const unit = this.picker();
    const min = this.min();
    const max = this.max();
    if (
      min &&
      compareDays(endOfPeriod(date, unit, this.weekStartsOn()), min) < 0
    ) {
      return false;
    }
    if (
      max &&
      compareDays(startOfPeriod(date, unit, this.weekStartsOn()), max) > 0
    ) {
      return false;
    }
    return !this.dateDisabled()?.(
      startOfPeriod(date, unit, this.weekStartsOn()),
      { type: unit },
    );
  }

  /** Shows a typed date in the calendar without committing it. */
  private preview(side: Side, date: Date): void {
    const day = startOfDay(date);
    if (this.timeOptions()) {
      (side === 'end' ? this.endTime : this.startTime).set(timeOf(date));
    }
    // Show the typed date even when `defaultMonth` pins the calendar's anchor.
    this.calendar()?.goTo(day);
    if (!this.isRange()) {
      this.selection.set(day);
      return;
    }
    const range = toDateRange(this.selection());
    if (side === 'start') {
      this.selection.set({ start: day, end: range?.end ?? null });
    } else if (range) {
      this.selection.set({ start: range.start, end: day });
    } else {
      this.selection.set({ start: day, end: null });
    }
  }

  /**
   * Resolves one side's typed text. Valid text is applied; empty text clears (when
   * `allowClear`); anything else is discarded and the value restored. Returns
   * whether the selection changed.
   */
  private resolveDraft(side: Side): boolean {
    const text = this.draftFor(side)() ?? '';
    this.draftFor(side).set(null);

    if (!text.trim()) {
      if (!this.allowClear()) {
        this.applyValue(this.committed());
        return false;
      }
      if (this.isRange() && side === 'end') {
        const range = toDateRange(this.selection());
        this.selection.set(range ? { start: range.start, end: null } : null);
      } else {
        this.selection.set(null);
      }
      return true;
    }

    const parsed = this.parse(text);
    if (!parsed) {
      this.applyValue(this.committed());
      return false;
    }
    this.preview(side, parsed);
    return true;
  }

  /** Loads a value (from the form, a preset, a revert) into the live state. */
  private applyValue(value: unknown): void {
    if (this.isRange()) {
      let raw: readonly unknown[] = [value, null];
      if (Array.isArray(value)) {
        raw = value;
      } else if (
        value &&
        typeof value === 'object' &&
        !(value instanceof Date)
      ) {
        const candidate = value as { start?: unknown; end?: unknown };
        raw = [candidate.start, candidate.end];
      }
      let start = coerceDateTime(raw[0]);
      let end = coerceDateTime(raw[1]);
      if (start && end && start.getTime() > end.getTime()) {
        [start, end] = [end, start];
      }
      this.selection.set(
        start
          ? { start: startOfDay(start), end: end ? startOfDay(end) : null }
          : null,
      );
      this.startTime.set(timeOf(start));
      this.endTime.set(timeOf(end));
      return;
    }
    const date = coerceDateTime(value);
    this.selection.set(date ? startOfDay(date) : null);
    this.startTime.set(timeOf(date));
  }

  private commit(value: AndesDatePickerValue): void {
    this.committed.set(value);
    this.onChange(value);
    this.valueChange.emit(value);
  }

  private draftFor(side: Side) {
    return side === 'start' ? this.startDraft : this.endDraft;
  }

  private inputFor(side: Side): HTMLInputElement | undefined {
    return side === 'end' && this.isRange()
      ? this.endInput()?.nativeElement
      : this.startInput().nativeElement;
  }

  // --- ControlValueAccessor ------------------------------------------------

  writeValue(value: unknown): void {
    this.applyValue(value);
    this.startDraft.set(null);
    this.endDraft.set(null);
    this.committed.set(this.currentValue());
  }

  registerOnChange(fn: (value: AndesDatePickerValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
  }
}
