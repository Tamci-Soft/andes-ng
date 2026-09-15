import {
  andesOverlayPreset,
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
  AndesOverlayTriggerPrimitive,
  provideAndesOverlay,
} from '@andes-ng/primitives';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

import {
  AndesCalendar,
  type AndesCalendarMode,
  type AndesCalendarValue,
} from '../calendar/calendar';
import {
  coerceDate,
  formatDate,
  toDateRange,
  type AndesDateRange,
  type AndesWeekday,
} from '../calendar/date-utils';

/**
 * What a date picker reports to a form. A `Date` in `single` mode, a
 * `[start, end]` tuple in `range` mode, `null` when nothing (or only half a range)
 * is selected.
 */
export type AndesDatePickerValue = Date | readonly [Date, Date] | null;

/**
 * A calendar in a popover, wired into Angular forms.
 *
 * Following the shadcn/ui anatomy, this is a *composition* rather than a monolith:
 * `AndesCalendar` does the date work, `AndesOverlayPrimitive`'s `popover` preset
 * does the panel work, and this component only owns the trigger, the formatted
 * display value and the `ControlValueAccessor`. Consumers who want an inline
 * calendar use `AndesCalendar` directly.
 *
 * ## The trigger
 *
 * The trigger is a `<button>` styled to look like a form field — the same anatomy
 * shadcn/ui documents for its date picker. It is deliberately not a text input:
 * this version has no date parsing, so a field the user can focus and type into
 * would promise something that silently does nothing. A button is also the honest
 * ARIA: it natively supports the `aria-haspopup`/`aria-expanded`/`aria-controls`
 * that `AndesOverlayTriggerPrimitive` applies, whereas a `textbox` supports none
 * of them and `role="combobox"` would announce a text-entry affordance that does
 * not exist.
 *
 * When typed-date support lands, the trigger becomes a real
 * `<input role="combobox">` and gains the properties that role requires.
 *
 * Because the accessible name lives on the inner button rather than the host, a
 * consumer labels the picker with `aria-label`/`aria-labelledby` (pointing at a
 * visible label element) rather than a `<label for>`.
 */
@Component({
  selector: 'andes-date-picker',
  imports: [
    AndesCalendar,
    AndesOverlayContentPrimitive,
    AndesOverlayTriggerPrimitive,
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
    '[attr.data-disabled]': 'isDisabled() || null',
    '[attr.data-state]': 'overlay.isOpen() ? "open" : "closed"',
  },
})
export class AndesDatePicker implements ControlValueAccessor {
  /** The overlay this picker owns. Exposed so a consumer can drive it imperatively. */
  readonly overlay = inject(AndesOverlayPrimitive);

  private readonly panel = viewChild.required<TemplateRef<unknown>>('panel');

  /** One day or a span of days. */
  readonly mode = input<AndesCalendarMode>('single');

  /** Earliest selectable day, inclusive. */
  readonly min = input<Date | null, unknown>(null, { transform: coerceDate });

  /** Latest selectable day, inclusive. */
  readonly max = input<Date | null, unknown>(null, { transform: coerceDate });

  /** BCP 47 tag driving month/weekday names and the trigger's display format. */
  readonly locale = input<string | undefined>(undefined);

  /** First column of the week, `0` = Sunday. */
  readonly weekStartsOn = input<AndesWeekday>(0);

  /** Render the adjacent months' days in the calendar's leading/trailing cells. */
  readonly showOutsideDays = input(true, { transform: booleanAttribute });

  /** Keep the panel a constant six rows tall across months. */
  readonly fixedWeeks = input(false, { transform: booleanAttribute });

  /** Per-day veto, applied on top of `min`/`max`. */
  readonly dateDisabled = input<((date: Date) => boolean) | null>(null);

  /**
   * Month the panel opens on when there is no selection. Defaults to the selected
   * value's month, else the current month.
   */
  readonly defaultMonth = input<Date | null, unknown>(null, {
    transform: coerceDate,
  });

  /** Disables the trigger and the calendar. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Shown in the trigger while nothing is selected. */
  readonly placeholder = input('Select a date');

  /** Separator between the two dates of a range in the trigger. */
  readonly rangeSeparator = input(' – ');

  /** `Intl.DateTimeFormat` options for the trigger's display value. */
  readonly displayFormat = input<Intl.DateTimeFormatOptions>({
    dateStyle: 'medium',
  });

  /** Accessible name for the trigger. */
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });

  /** Points the trigger at an external `<label>`/description element. */
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });

  /** Accessible name for the calendar panel. */
  readonly panelLabel = input('Choose a date');

  /** Emits the committed value: a `Date`, a complete `[start, end]`, or `null`. */
  readonly valueChange = output<AndesDatePickerValue>();

  /** Emits whenever the panel opens or closes. */
  readonly openChange = output<boolean>();

  /** The live selection, including a half-finished range the user is still drawing. */
  protected readonly selection = signal<AndesCalendarValue>(null);

  /** Set by `setDisabledState`, i.e. by a disabled reactive-forms control. */
  private readonly disabledByForm = signal(false);

  protected readonly isDisabled = computed(
    () => this.disabled() || this.disabledByForm(),
  );

  /** The formatted text shown in the trigger, or `''` when there is nothing to show. */
  protected readonly displayValue = computed(() => {
    const locale = this.locale();
    const format = this.displayFormat();

    if (this.mode() === 'range') {
      const range = toDateRange(this.selection());
      if (!range) {
        return '';
      }
      const start = formatDate(range.start, locale, format);
      // A half-drawn range still shows its start, so the trigger reflects that
      // the user is mid-selection rather than appearing to have done nothing.
      return range.end
        ? `${start}${this.rangeSeparator()}${formatDate(range.end, locale, format)}`
        : start;
    }

    const date = coerceDate(this.selection());
    return date ? formatDate(date, locale, format) : '';
  });

  private onChange: (value: AndesDatePickerValue) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    this.overlay.configure({
      ...andesOverlayPreset('popover'),
      // A date panel reads as a menu anchored under its field, not centred on it.
      positioning: {
        kind: 'anchored',
        side: 'bottom',
        align: 'start',
        sideOffset: 6,
      },
      // The preset's `first-tabbable` would land on the previous-month button.
      // The calendar focuses its own active day instead, via `[autoFocus]`.
      autoFocus: 'none',
    });

    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe(() => {
      this.onTouched();
      this.openChange.emit(false);
    });

    this.overlay.opened.pipe(takeUntilDestroyed()).subscribe(() => {
      this.openChange.emit(true);
    });

    // A control disabled while its panel is open would otherwise leave an
    // interactive calendar floating over a disabled field.
    effect(() => {
      if (this.isDisabled() && this.overlay.isOpen()) {
        this.overlay.close('imperative');
      }
    });
  }

  /** Opens the panel if closed, closes it if open. */
  toggle(): void {
    if (this.isDisabled()) {
      return;
    }
    this.overlay.toggle(this.panel());
  }

  /** Opens the panel. */
  open(): void {
    if (!this.isDisabled()) {
      this.overlay.open(this.panel());
    }
  }

  /** Closes the panel. */
  close(): void {
    this.overlay.close('imperative');
  }

  protected onTriggerKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) {
      return;
    }
    // ArrowDown/Alt+ArrowDown is the combobox convention for opening a popup;
    // Enter and Space match the trigger's click behavior.
    if (
      event.key === 'ArrowDown' ||
      event.key === 'Enter' ||
      event.key === ' '
    ) {
      event.preventDefault();
      if (!this.overlay.isOpen()) {
        this.open();
      }
    }
  }

  protected onCalendarValueChange(next: AndesCalendarValue): void {
    this.selection.set(next);

    if (this.mode() === 'range') {
      const range = toDateRange(next);
      if (range?.end) {
        this.commit([range.start, range.end] as const);
        this.close();
      } else {
        // Half a range is not a value a form can hold; publish `null` until the
        // user closes it, so a required validator stays unsatisfied meanwhile.
        this.commit(null);
      }
      return;
    }

    const date = coerceDate(next);
    this.commit(date);
    this.close();
  }

  private commit(value: AndesDatePickerValue): void {
    this.onChange(value);
    this.valueChange.emit(value);
  }

  // --- ControlValueAccessor ------------------------------------------------

  writeValue(value: unknown): void {
    if (this.mode() === 'range') {
      this.selection.set(toDateRange(value) as AndesDateRange | null);
      return;
    }
    this.selection.set(coerceDate(value));
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
