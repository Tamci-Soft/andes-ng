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
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  forwardRef,
  inject,
  Injector,
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
  type AndesCalendarView,
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
  toDateKey,
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

/** Field height (24 / 32 / 40px), matching `AndesButton`'s `sm`/`md`/`lg`. */
export type AndesDatePickerSize = 'sm' | 'md' | 'lg';

/** Validation styling. `error` also sets `aria-invalid` on the input(s). */
export type AndesDatePickerStatus = 'error' | 'warning';

/** The field's visual treatment. */
export type AndesDatePickerVariant =
  'outlined' | 'filled' | 'borderless' | 'underlined';

/** Where the panel opens relative to the field. Flips automatically when it does not fit. */
export type AndesDatePickerPlacement =
  'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';

/**
 * What the picker selects: one of the calendar granularities, or `time` for a
 * time of day alone (time columns, no calendar).
 */
export type AndesDatePickerType = AndesPickerType | 'time';

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
  /**
   * A 12-hour clock: hours run 12, 1-11 with an AM/PM column beside them, and
   * the displayed value uses the locale's 12-hour form. Default `false`.
   */
  readonly use12Hours?: boolean;
  /**
   * Leave out the options `timeDisabled` rules out, instead of listing them as
   * disabled. Default `false`.
   */
  readonly hideDisabledOptions?: boolean;
  /**
   * Time of day a freshly picked date starts at, instead of midnight. Only the
   * time part of the `Date` is read; a `[start, end]` pair sets each side of a
   * range (e.g. 09:00 to 18:00).
   */
  readonly defaultTime?: Date | readonly [Date, Date];
}

/** Which time options to rule out, returned by a `timeDisabled` function. */
export interface AndesDisabledTime {
  /** Hours (0-23) that cannot be picked. */
  readonly disabledHours?: () => readonly number[];
  /** Minutes that cannot be picked within `hour`. */
  readonly disabledMinutes?: (hour: number) => readonly number[];
  /** Seconds that cannot be picked within `hour:minute`. */
  readonly disabledSeconds?: (
    hour: number,
    minute: number,
  ) => readonly number[];
}

/** Extra information handed to a `timeDisabled` function. */
export interface AndesTimeDisabledInfo {
  /** The side being edited; always `start` in `single` mode. */
  readonly side: 'start' | 'end';
  /** While a range's end is edited: the start already chosen. */
  readonly from?: Date;
}

/**
 * Rules out time options for the date being edited (`null` before a date is
 * picked), e.g. outside business hours or before the range's start.
 */
export type AndesTimeDisabledFn = (
  date: Date | null,
  info: AndesTimeDisabledInfo,
) => AndesDisabledTime | null | undefined;

/**
 * Template context for `panelTemplate`: `$implicit` is the panel's own content,
 * to render with `ngTemplateOutlet` wherever the wrapper wants it.
 */
export interface AndesDatePickerPanelContext {
  readonly $implicit: TemplateRef<unknown>;
}

/**
 * Whether hovering a day or a preset shows it in the input before it is picked.
 */
export type AndesDatePickerPreview = 'hover' | false;

/** A one-click value in the panel's side list. */
export interface AndesDatePickerPreset {
  readonly label: string;
  /** The value, or a function evaluated on click so "Last 7 days" stays current. */
  readonly value: AndesDatePickerValue | (() => AndesDatePickerValue);
}

type Side = 'start' | 'end';
type TimeUnit = 'hours' | 'minutes' | 'seconds' | 'meridiem';

interface TimeColumn {
  readonly unit: TimeUnit;
  readonly label: string;
  readonly activeId: string;
  readonly options: readonly {
    readonly value: number;
    readonly text: string;
    readonly id: string;
    readonly selected: boolean;
    readonly disabled: boolean;
  }[];
}

/**
 * The panel opens above or below the field, never beside it: when it fits on neither
 * side it is shifted into view rather than moved next to the field.
 */
const PLACEMENTS: Readonly<
  Record<AndesDatePickerPlacement, AndesOverlayAnchoredPositioning>
> = {
  bottomLeft: {
    kind: 'anchored',
    side: 'bottom',
    align: 'start',
    sideOffset: 6,
    crossSideFallback: false,
  },
  bottomRight: {
    kind: 'anchored',
    side: 'bottom',
    align: 'end',
    sideOffset: 6,
    crossSideFallback: false,
  },
  topLeft: {
    kind: 'anchored',
    side: 'top',
    align: 'start',
    sideOffset: 6,
    crossSideFallback: false,
  },
  topRight: {
    kind: 'anchored',
    side: 'top',
    align: 'end',
    sideOffset: 6,
    crossSideFallback: false,
  },
};

/** Token patterns for pickers `Intl` has no notion of. */
const DEFAULT_PATTERNS: Partial<Record<AndesDatePickerType, string>> = {
  week: 'YYYY-[W]ww',
  quarter: 'YYYY-[Q]Q',
};

/** `Intl` display options for the pickers that do have an `Intl` shape. */
const DEFAULT_INTL: Partial<
  Record<AndesDatePickerType, Intl.DateTimeFormatOptions>
> = {
  date: { dateStyle: 'medium' },
  month: { month: 'short', year: 'numeric' },
  year: { year: 'numeric' },
  // The time fields are added from `showTime`, like for a date with time.
  time: {},
};

/** Machine formats always accepted when typing, whatever the display format. */
const FALLBACK_PATTERNS: Readonly<
  Record<AndesDatePickerType, readonly string[]>
> = {
  date: ['YYYY-MM-DD HH:mm:ss', 'YYYY-MM-DD HH:mm', 'YYYY-MM-DD'],
  week: ['YYYY-[W]ww', 'YYYY-ww'],
  month: ['YYYY-MM'],
  quarter: ['YYYY-[Q]Q', 'YYYY-Q'],
  year: ['YYYY'],
  time: ['HH:mm:ss', 'HH:mm'],
};

const PLACEHOLDER_NOUNS: Readonly<Record<AndesDatePickerType, string>> = {
  date: 'date',
  week: 'week',
  month: 'month',
  quarter: 'quarter',
  year: 'year',
  time: 'time',
};

let nextId = 0;

/** `showTime` accepts `true`, a bare attribute, or an options object. */
function coerceTimeOptions(value: unknown): AndesTimeOptions | null {
  if (value && typeof value === 'object') {
    return value as AndesTimeOptions;
  }
  return booleanAttribute(value) ? {} : null;
}

/** The locale's name for the morning (`hour` < 12) or afternoon day period. */
function dayPeriodName(locale: string | undefined, hour: number): string {
  const part = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    hour12: true,
  })
    .formatToParts(new Date(2024, 0, 1, hour))
    .find((candidate) => candidate.type === 'dayPeriod');
  return part?.value ?? (hour < 12 ? 'AM' : 'PM');
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
 * This is a *composition*: `AndesCalendar` does the date work,
 * `AndesOverlayPrimitive`'s `popover` preset does the panel work, and this component
 * owns the field, typed-date parsing, the time columns, the commit rules and the
 * `ControlValueAccessor`.
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
 * Because the accessible name lives on the inner input(s) rather than the host,
 * `id`, `name`, `aria-*` and `required` are forwarded onto the input(s) and
 * nulled on the host, so `<label for>` reaches the real input and no id is ever
 * on two elements. In `range` mode `id` goes on the start input only; the rest
 * applies to both, since help or error text describes the whole range.
 *
 * ## Committing
 *
 * Without `showTime`/`needConfirm` a pick commits at once and closes the panel
 * (after the second day in `range` mode). With `needConfirm` — on by default with
 * `showTime` — picks are pending until the OK button (or Enter), and
 * closing the panel any other way discards them.
 *
 * ## Time of day alone
 *
 * `picker="time"` drops the calendar and keeps the time columns: the same
 * field, forms integration, range mode, presets and OK flow, selecting a time.
 * The value is still a `Date` — the time on the day already held, or today.
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
    // Forwarded to the real input(s) in the template instead (same rationale as AndesInput).
    '[attr.id]': 'null',
    '[attr.name]': 'null',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
    '[attr.aria-required]': 'null',
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
  private readonly injector = inject(Injector);

  protected readonly idPrefix = `andes-date-picker-${nextId++}`;

  /** One date or a span of dates. */
  readonly mode = input<AndesCalendarMode>('single');

  /**
   * Selection granularity: `date`, `week`, `month`, `quarter`, `year`, or
   * `time` for a time of day without a calendar.
   */
  readonly picker = input<AndesDatePickerType>('date');

  /**
   * The value, for use without Angular forms: `[value]` sets it and
   * `[(value)]` keeps a field or signal in sync through `valueChange`. Left
   * `undefined`, the picker holds its own value (or the form's, with
   * `formControl`/`ngModel`, which should not be combined with this input).
   */
  readonly value = input<AndesDatePickerValue | undefined>(undefined);

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

  /** Replaces the clear button's icon. */
  readonly clearIcon = input<TemplateRef<unknown> | null>(null);

  /**
   * Put a range's boundaries in order. Days are always ordered in the calendar;
   * this governs the times: turn it off for a range that crosses midnight on
   * the same day, such as a 22:00 to 06:00 shift in a time range.
   */
  readonly order = input(true, { transform: booleanAttribute });

  /**
   * Keep text that does not parse in the input when focus leaves, instead of
   * restoring the value, so the user can correct it. The value is unchanged
   * either way.
   */
  readonly preserveInvalidOnBlur = input(false, {
    transform: booleanAttribute,
  });

  /**
   * `hover` shows the day or preset under the pointer in the input, muted,
   * before it is picked; `false` turns that off.
   */
  readonly previewValue = input<AndesDatePickerPreview>('hover');

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
   * Rules out hours, minutes or seconds of the time columns, per date (and per
   * side of a range). A ruled-out time cannot be picked, typed or confirmed.
   */
  readonly timeDisabled = input<AndesTimeDisabledFn | null>(null);

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

  /**
   * Wraps the panel's content: the template receives that content as
   * `$implicit` and renders it with `ngTemplateOutlet`, adding whatever it
   * needs around it (a heading, a side note, a tabbed switch).
   */
  readonly panelTemplate =
    input<TemplateRef<AndesDatePickerPanelContext> | null>(null);

  /**
   * The calendar grid to open on (`date`, `month`, `quarter` or `year`),
   * passed to the calendar. Changing it switches the grid; `panelChange`
   * reports the user's own moves.
   */
  readonly panelView = input<AndesCalendarView | null>(null);

  /** Replaces the calendar's single-step previous chevron. */
  readonly previousIcon = input<TemplateRef<unknown> | null>(null);

  /** Replaces the calendar's single-step next chevron. */
  readonly nextIcon = input<TemplateRef<unknown> | null>(null);

  /** Replaces the calendar's fast (year or decade) previous chevron. */
  readonly fastPreviousIcon = input<TemplateRef<unknown> | null>(null);

  /** Replaces the calendar's fast (year or decade) next chevron. */
  readonly fastNextIcon = input<TemplateRef<unknown> | null>(null);

  /** Accessible name for the input (single) or the input group (range). */
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });

  /** Points the input (single) or group (range) at an external label element. */
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });

  /** `id` of the input (the start input in `range` mode), for a `<label for>`. */
  readonly id = input<string | undefined>(undefined);

  /** Native `name` of the input(s). */
  readonly name = input<string | undefined>(undefined);

  /** Puts the native `required` attribute on the input(s). */
  readonly required = input(false, { transform: booleanAttribute });

  /** Points the input(s) at help or error text. */
  readonly ariaDescribedby = input<string | undefined>(undefined, {
    alias: 'aria-describedby',
  });

  /** Marks the input(s) invalid. `status="error"` does the same. */
  readonly ariaInvalid = input(false, {
    alias: 'aria-invalid',
    transform: booleanAttribute,
  });

  /** Sets `aria-required` on the input(s), e.g. from a form field's validators. */
  readonly ariaRequired = input(false, {
    alias: 'aria-required',
    transform: booleanAttribute,
  });

  /**
   * Accessible name for the panel. Defaults to "Choose a date", or "Choose a
   * time" for `picker="time"`.
   */
  readonly panelLabel = input<string | undefined>(undefined);

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
  readonly meridiemLabel = input('AM/PM');

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

  /** A hovered day or preset, shown in the input(s) until the pointer leaves. */
  protected readonly hoverText = signal<
    readonly [string | null, string | null] | null
  >(null);

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

  protected readonly isTimeOnly = computed(() => this.picker() === 'time');

  /** The side the time columns edit. */
  private readonly editedSide = computed<Side>(() =>
    this.isRange() && this.activeSide() === 'end' ? 'end' : 'start',
  );

  /** The calendar's granularity; a time picker keeps whole days. */
  protected readonly calendarPicker = computed<AndesPickerType>(() => {
    const picker = this.picker();
    return picker === 'time' ? 'date' : picker;
  });

  protected readonly panelName = computed(
    () =>
      this.panelLabel() ??
      (this.isTimeOnly() ? 'Choose a time' : 'Choose a date'),
  );

  private readonly openRequested = computed(() =>
    booleanAttribute(this.open()),
  );

  /** `showTime`, when it applies (day pickers, and always for `time`). */
  protected readonly timeOptions = computed<AndesTimeOptions | null>(() => {
    switch (this.picker()) {
      case 'time':
        return this.showTime() ?? {};
      case 'date':
        return this.showTime();
      default:
        return null;
    }
  });

  /** The time each side starts at before one is picked (`showTime.defaultTime`). */
  private readonly defaultTimes = computed<
    readonly [AndesTimeOfDay, AndesTimeOfDay]
  >(() => {
    const value = this.timeOptions()?.defaultTime;
    if (value instanceof Date) {
      return [timeOf(value), timeOf(value)];
    }
    if (value) {
      return [
        timeOf(coerceDateTime(value[0])),
        timeOf(coerceDateTime(value[1])),
      ];
    }
    return [MIDNIGHT, MIDNIGHT];
  });

  protected readonly confirmRequired = computed(
    () => this.needConfirm() ?? this.timeOptions() !== null,
  );

  protected readonly monthCount = computed(() => {
    const explicit = this.numberOfMonths();
    if (explicit !== undefined) {
      return explicit;
    }
    const dayGrid =
      this.calendarPicker() === 'date' || this.calendarPicker() === 'week';
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
    const clock = time.use12Hours ? { hour12: true } : {};
    if (base.dateStyle) {
      return {
        ...base,
        timeStyle: time.showSecond ? 'medium' : 'short',
        ...clock,
      };
    }
    return {
      ...base,
      hour: '2-digit',
      minute: '2-digit',
      ...(time.showSecond ? { second: '2-digit' } : {}),
      ...clock,
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
    return this.order() && last.getTime() < first.getTime()
      ? [last, first]
      : [first, last];
  });

  protected readonly startText = computed(
    () =>
      this.hoverText()?.[0] ??
      this.startDraft() ??
      this.formatSide(this.startDate(), this.startTime()),
  );

  protected readonly endText = computed(
    () =>
      this.hoverText()?.[1] ??
      this.endDraft() ??
      this.formatSide(this.endDate(), this.endTime()),
  );

  /** `status="error"` is announced too (via `aria-invalid`), not just painted. */
  protected readonly isInvalid = computed(
    () => this.ariaInvalid() || this.status() === 'error',
  );

  protected readonly hasValue = computed(
    () => !!this.startDate() || !!this.endDate(),
  );

  protected readonly showClear = computed(
    () => this.allowClear() && !this.isDisabled() && this.hasValue(),
  );

  /** Whether every side's time passes `timeDisabled`. */
  private readonly timesAllowed = computed(() => {
    if (!this.timeOptions() || !this.timeDisabled()) {
      return true;
    }
    const sides: readonly Side[] = this.isRange()
      ? ['start', 'end']
      : ['start'];
    return sides.every((side) =>
      this.isTimeAllowed(side, this.timeFor(side)()),
    );
  });

  /**
   * A time range's OK first confirms the start and moves on to the end, so it
   * is live as soon as the start has a time.
   */
  private readonly confirmMovesToEnd = computed(
    () =>
      this.isTimeOnly() &&
      this.isRange() &&
      this.activeSide() === 'start' &&
      !!this.startDate() &&
      !this.endDate(),
  );

  protected readonly canConfirm = computed(
    () =>
      (this.currentValue() !== null && this.timesAllowed()) ||
      this.confirmMovesToEnd(),
  );

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
    const side = this.editedSide();
    const time = this.timeFor(side)();
    const rules = this.timeRules(side);
    const twelve = !!options.use12Hours;
    const afternoon = time.hours >= 12 ? 12 : 0;

    const steps = (count: number, step: number | undefined): number[] => {
      const interval = Math.max(1, Math.floor(step ?? 1));
      const values: number[] = [];
      for (let value = 0; value < count; value += interval) {
        values.push(value);
      }
      return values;
    };

    // Option values are what `setTimePart` stores: a 12-hour column still
    // holds 0-23, on the half of the day currently selected.
    const column = (
      unit: TimeUnit,
      label: string,
      current: number,
      entries: readonly {
        readonly value: number;
        readonly text: string;
        readonly disabled: boolean;
      }[],
    ): TimeColumn => ({
      unit,
      label,
      activeId: `${this.idPrefix}-${unit}-${current}`,
      options: entries
        .filter(
          (entry) =>
            !options.hideDisabledOptions ||
            !entry.disabled ||
            entry.value === current,
        )
        .map((entry) => ({
          ...entry,
          id: `${this.idPrefix}-${unit}-${entry.value}`,
          selected: entry.value === current,
        })),
    });

    const pad = (value: number) => String(value).padStart(2, '0');
    const disabledHours = new Set(rules.disabledHours?.() ?? []);
    const disabledMinutes = new Set(rules.disabledMinutes?.(time.hours) ?? []);
    const disabledSeconds = new Set(
      rules.disabledSeconds?.(time.hours, time.minutes) ?? [],
    );

    const hours = twelve
      ? steps(12, options.hourStep).map((value) => ({
          value: value + afternoon,
          text: pad(value === 0 ? 12 : value),
          disabled: disabledHours.has(value + afternoon),
        }))
      : steps(24, options.hourStep).map((value) => ({
          value,
          text: pad(value),
          disabled: disabledHours.has(value),
        }));

    const columns: TimeColumn[] = [
      column('hours', this.hoursLabel(), time.hours, hours),
      column(
        'minutes',
        this.minutesLabel(),
        time.minutes,
        steps(60, options.minuteStep).map((value) => ({
          value,
          text: pad(value),
          disabled: disabledMinutes.has(value),
        })),
      ),
    ];
    if (options.showSecond) {
      columns.push(
        column(
          'seconds',
          this.secondsLabel(),
          time.seconds,
          steps(60, options.secondStep).map((value) => ({
            value,
            text: pad(value),
            disabled: disabledSeconds.has(value),
          })),
        ),
      );
    }
    if (twelve) {
      const locale = this.locale();
      const halfDisabled = (offset: number) =>
        Array.from({ length: 12 }, (_, hour) => hour + offset).every((hour) =>
          disabledHours.has(hour),
        );
      columns.push(
        column('meridiem', this.meridiemLabel(), afternoon, [
          {
            value: 0,
            text: dayPeriodName(locale, 9),
            disabled: halfDisabled(0),
          },
          {
            value: 12,
            text: dayPeriodName(locale, 15),
            disabled: halfDisabled(12),
          },
        ]),
      );
    }
    return columns;
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

    // `[value]` / `[(value)]`. The echo of the picker's own commit is skipped,
    // or a half-finished range (published as `null`) would be wiped by it.
    effect(() => {
      const value = this.value();
      if (value === undefined) {
        return;
      }
      untracked(() => {
        if (!sameValue(value, this.committed())) {
          this.writeValue(value);
        }
      });
    });

    // A side with no date yet shows (and starts from) `showTime.defaultTime`.
    effect(() => {
      const [start, end] = this.defaultTimes();
      untracked(() => {
        if (!this.startDate()) {
          this.startTime.set(start);
        }
        if (!this.endDate()) {
          this.endTime.set(end);
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
        this.focusPanel();
      }
      return;
    }
    this.focusGridOnOpen.set(focusGrid);
    this.overlay.registerAnchor(this.field().nativeElement);
    this.overlay.open(this.panel());
    if (focusGrid && this.isTimeOnly()) {
      // No calendar to take focus through `autoFocus`: the first time column does.
      afterNextRender(() => this.focusPanel(), { injector: this.injector });
    }
  }

  /** Focuses the input being edited (the start one, unless the end is active). */
  focus(options?: FocusOptions): void {
    this.inputFor(this.activeSide())?.focus(options);
  }

  /**
   * Moves focus out of the picker, which resolves typed text and closes the
   * panel just as tabbing away does.
   */
  blur(): void {
    const active = document.activeElement;
    if (
      active instanceof HTMLElement &&
      (this.field().nativeElement.contains(active) ||
        this.overlay.panelElement()?.contains(active))
    ) {
      active.blur();
    }
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

  /**
   * Commits the pending value and closes the panel (the OK button). In a time
   * range with only the start set, it moves on to the end instead.
   */
  confirm(): void {
    if (this.confirmMovesToEnd()) {
      this.ensureDay('end');
      this.activeSide.set('end');
      this.endInput()?.nativeElement.focus();
      return;
    }
    const value = this.currentValue();
    if (value === null || !this.timesAllowed()) {
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
    this.hoverText.set(null);
    this.draftFor(side).set(text);
    const parsed = this.parse(text, side);
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
        this.commitTyped(value);
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
        changed =
          this.resolveDraft(side, this.preserveInvalidOnBlur()) || changed;
      }
    }
    if (changed && !this.confirmRequired()) {
      const value = this.currentValue();
      if (!sameValue(value, this.committed())) {
        this.commitTyped(value);
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
    this.startTime.set(this.defaultTimes()[0]);
    this.endTime.set(this.defaultTimes()[1]);
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
    const hadEnd = !!this.endDate();
    this.selection.set(next);
    this.startDraft.set(null);
    this.endDraft.set(null);
    this.hoverText.set(null);

    const keepOpen = this.timeOptions() !== null;

    if (this.isRange()) {
      const range = toDateRange(next);
      if (range?.end && !hadEnd) {
        // A new end starts at the default time, not at the last range's end.
        this.endTime.set(this.defaultTimes()[1]);
      }
      this.calendarChange.emit([range?.start ?? null, range?.end ?? null]);
      this.activeSide.set(range?.end ? 'end' : 'start');
      if (this.confirmRequired()) {
        return;
      }
      if (range?.end) {
        if (!this.timesAllowed()) {
          return;
        }
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

    if (this.confirmRequired() || !this.timesAllowed()) {
      return;
    }
    this.commit(this.currentValue());
    if (!keepOpen) {
      this.close();
    }
  }

  /** The day under the pointer, previewed in the input it would fill. */
  protected onCalendarHover(date: Date | null): void {
    if (this.previewValue() !== 'hover' || !date) {
      this.hoverText.set(null);
      return;
    }
    const day = startOfPeriod(date, this.calendarPicker(), this.weekStartsOn());
    const side: Side =
      this.isRange() && this.startDate() && !this.endDate() ? 'end' : 'start';
    const text = this.formatSide(day, this.timeFor(side)());
    this.hoverText.set(side === 'end' ? [null, text] : [text, null]);
  }

  protected onPresetHover(preset: AndesDatePickerPreset | null): void {
    if (this.previewValue() !== 'hover' || !preset) {
      this.hoverText.set(null);
      return;
    }
    const value =
      typeof preset.value === 'function' ? preset.value() : preset.value;
    if (Array.isArray(value)) {
      const [start, end] = value as readonly Date[];
      this.hoverText.set([
        start ? this.formatValue(start) : '',
        end ? this.formatValue(end) : '',
      ]);
    } else if (value) {
      this.hoverText.set([this.formatValue(value as Date), null]);
    }
  }

  protected setTimePart(unit: TimeUnit, value: number): void {
    const side = this.editedSide();
    if (this.isTimeOnly()) {
      this.ensureDay(side);
    }
    this.timeFor(side).update((time) =>
      unit === 'meridiem'
        ? { ...time, hours: (time.hours % 12) + value }
        : { ...time, [unit]: value },
    );
    this.startDraft.set(null);
    this.endDraft.set(null);
    if (
      !this.confirmRequired() &&
      this.currentValue() !== null &&
      this.timesAllowed()
    ) {
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
    option: TimeColumn['options'][number],
  ): void {
    if (event.button === 0 && !option.disabled) {
      this.setTimePart(unit, option.value);
    }
  }

  /** Arrow keys walk the enabled options; disabled ones are skipped. */
  protected onTimeKeydown(event: KeyboardEvent, column: TimeColumn): void {
    const options = column.options;
    const index = options.findIndex((option) => option.selected);
    const scan = (from: number, step: 1 | -1): number => {
      for (let at = from; at >= 0 && at < options.length; at += step) {
        if (!options[at].disabled) {
          return at;
        }
      }
      return -1;
    };
    let next: number;
    switch (event.key) {
      case 'ArrowUp':
        next = scan(index - 1, -1);
        break;
      case 'ArrowDown':
        next = scan(index + 1, 1);
        break;
      case 'Home':
        next = scan(0, 1);
        break;
      case 'End':
        next = scan(options.length - 1, -1);
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
    if (next >= 0) {
      this.setTimePart(column.unit, options[next].value);
    }
  }

  protected selectNow(): void {
    const now = this.timeOptions() ? new Date() : today();
    if (!this.isAllowed(now, 'start')) {
      return;
    }
    this.applyValue(now);
    this.commit(this.currentValue());
    this.close();
  }

  protected applyPreset(preset: AndesDatePickerPreset): void {
    const value =
      typeof preset.value === 'function' ? preset.value() : preset.value;
    this.hoverText.set(null);
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
    this.hoverText.set(null);
    // Text kept by `preserveInvalidOnBlur` outlives a close caused by leaving.
    if (!(this.closingForBlur && this.preserveInvalidOnBlur())) {
      this.startDraft.set(null);
      this.endDraft.set(null);
    }
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

  /**
   * Parses typed text into an allowed date, or `null`. A time picker parses the
   * time onto the side's day (or today), by prefixing that day in ISO form.
   */
  private parse(text: string, side: Side): Date | null {
    const day = this.isTimeOnly() ? this.baseDay(side) : null;
    const parsed = day
      ? parseWithPatterns(
          `${toDateKey(day)} ${text}`,
          this.parsePatterns().map((pattern) => `YYYY-MM-DD ${pattern}`),
          this.formatContext(),
        )
      : parseWithPatterns(text, this.parsePatterns(), this.formatContext());
    if (!parsed) {
      return null;
    }
    const unit = this.calendarPicker();
    const date =
      unit === 'date'
        ? parsed
        : startOfPeriod(parsed, unit, this.weekStartsOn());
    return this.isAllowed(date, side) ? date : null;
  }

  private isAllowed(date: Date, side: Side): boolean {
    if (this.timeOptions() && !this.isTimeAllowed(side, timeOf(date), date)) {
      return false;
    }
    if (this.isTimeOnly()) {
      return true;
    }
    const unit = this.calendarPicker();
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
    const from = side === 'end' ? this.startDate() : null;
    return !this.dateDisabled()?.(
      startOfPeriod(date, unit, this.weekStartsOn()),
      from ? { type: unit, from } : { type: unit },
    );
  }

  /** The time signal of one side. */
  private timeFor(side: Side) {
    return side === 'end' ? this.endTime : this.startTime;
  }

  /** One side's date and time, or `null` before it has a date. */
  private sideValue(side: Side): Date | null {
    const day = side === 'end' ? this.endDate() : this.startDate();
    return day ? withTime(day, this.timeFor(side)()) : null;
  }

  /** `timeDisabled`'s rules for one side, for `date` or the side's own value. */
  private timeRules(side: Side, date?: Date): AndesDisabledTime {
    const rules = this.timeDisabled();
    if (!rules) {
      return {};
    }
    const from = side === 'end' ? this.sideValue('start') : null;
    return (
      rules(date ?? this.sideValue(side), from ? { side, from } : { side }) ??
      {}
    );
  }

  private isTimeAllowed(
    side: Side,
    time: AndesTimeOfDay,
    date?: Date,
  ): boolean {
    const rules = this.timeRules(side, date);
    if (rules.disabledHours?.().includes(time.hours)) {
      return false;
    }
    if (rules.disabledMinutes?.(time.hours).includes(time.minutes)) {
      return false;
    }
    return !(
      this.timeOptions()?.showSecond &&
      rules.disabledSeconds?.(time.hours, time.minutes).includes(time.seconds)
    );
  }

  /** The day a time picker's side sits on: its own, the start's, or today. */
  private baseDay(side: Side): Date {
    const own = side === 'end' ? this.endDate() : this.startDate();
    return own ?? this.startDate() ?? today();
  }

  /** Gives a time picker's side a day, so a time can be set on it. */
  private ensureDay(side: Side): void {
    if (!this.isRange()) {
      if (!this.startDate()) {
        this.selection.set(this.baseDay('start'));
      }
      return;
    }
    const range = toDateRange(this.selection());
    if (!range) {
      const day = today();
      this.selection.set({ start: day, end: side === 'end' ? day : null });
    } else if (side === 'end' && !range.end) {
      this.selection.set({ start: range.start, end: range.start });
    }
  }

  /** Moves focus into the panel: the calendar grid, or the first time column. */
  private focusPanel(): void {
    const calendar = this.calendar();
    if (calendar) {
      calendar.focusActiveDay();
      return;
    }
    this.overlay
      .panelElement()
      ?.querySelector<HTMLElement>('.andes-date-picker__time-column')
      ?.focus();
  }

  /** Shows a typed date in the calendar without committing it. */
  private preview(side: Side, date: Date): void {
    const day = startOfDay(date);
    if (this.timeOptions()) {
      this.timeFor(side).set(timeOf(date));
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
   * `allowClear`); anything else is discarded and the value restored — or, with
   * `keepInvalid`, left in the input over the restored value. Returns whether the
   * selection changed.
   */
  private resolveDraft(side: Side, keepInvalid = false): boolean {
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

    const parsed = this.parse(text, side);
    if (!parsed) {
      this.applyValue(this.committed());
      if (keepInvalid) {
        this.draftFor(side).set(text);
      }
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
      // Days are always put in order (the calendar shows them so); with
      // `order` off, two times on the same day keep the order they came in.
      if (
        start &&
        end &&
        start.getTime() > end.getTime() &&
        (this.order() || compareDays(start, end) !== 0)
      ) {
        [start, end] = [end, start];
      }
      this.selection.set(
        start
          ? { start: startOfDay(start), end: end ? startOfDay(end) : null }
          : null,
      );
      const [startDefault, endDefault] = this.defaultTimes();
      this.startTime.set(start ? timeOf(start) : startDefault);
      this.endTime.set(end ? timeOf(end) : endDefault);
      return;
    }
    const date = coerceDateTime(value);
    this.selection.set(date ? startOfDay(date) : null);
    this.startTime.set(date ? timeOf(date) : this.defaultTimes()[0]);
  }

  private commit(value: AndesDatePickerValue): void {
    this.committed.set(value);
    this.onChange(value);
    this.valueChange.emit(value);
  }

  /**
   * Commits the outcome of resolved typed text. Emptying the text down to no
   * selection at all is a clear, so it emits `clear` like the clear button does;
   * emptying only a range's end leaves the start and is not.
   */
  private commitTyped(value: AndesDatePickerValue): void {
    const hadValue = this.committed() !== null;
    this.commit(value);
    if (hadValue && !this.hasValue()) {
      this.clear.emit();
    }
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
