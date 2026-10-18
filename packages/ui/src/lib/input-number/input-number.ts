import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  forwardRef,
  inject,
  input,
  LOCALE_ID,
  linkedSignal,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import clsx from 'clsx';

import {
  addDecimals,
  clampDecimal,
  compareDecimals,
  type DecimalInput,
  decimalToNumber,
  isDecimal,
  normalizeDecimal,
  roundDecimal,
  shiftDecimal,
  subtractDecimals,
} from './decimal';
import {
  type AndesInputNumberCurrencyDisplay,
  type AndesInputNumberFormat,
  type AndesParsedNumber,
  createNumberCodec,
} from './number-format';

export type {
  AndesInputNumberCurrencyDisplay,
  AndesInputNumberFormat,
} from './number-format';

export type AndesInputNumberSize = 'sm' | 'md' | 'lg';
export type AndesInputNumberVariant =
  'outlined' | 'filled' | 'borderless' | 'underlined';
export type AndesInputNumberStatus = 'error' | 'warning';
/** `input` shows the up/down stepper on hover/focus; `spinner` draws "-" and "+" buttons on both sides. */
export type AndesInputNumberMode = 'input' | 'spinner';

/**
 * What the field holds and emits: a `number`, or - with `stringMode` - a decimal string that
 * keeps every digit. `null` is an empty field.
 */
export type AndesInputNumberValue = number | string | null;

export type AndesInputNumberStepDirection = 'up' | 'down';
/** `handler` is the stepper / spinner button, `keyboard` an arrow or Page key, `wheel` the mouse wheel. */
export type AndesInputNumberStepSource = 'handler' | 'keyboard' | 'wheel';

/** Payload of the `stepped` output. */
export interface AndesInputNumberStep {
  /** The value after stepping. */
  readonly value: AndesInputNumberValue;
  /** The signed amount that was added, as a decimal string (`"0.1"`, `"-10"`). */
  readonly offset: string;
  readonly direction: AndesInputNumberStepDirection;
  readonly source: AndesInputNumberStepSource;
}

/** Writes a value as text. Receives the value after `precision` rounding. */
export type AndesInputNumberFormatter = (value: number | string) => string;

/**
 * Reads typed text back into a value. Return `null` for "empty" and `NaN`/`undefined` for "not a
 * number yet" - the field then keeps the previous value.
 */
export type AndesInputNumberParser = (
  text: string,
) => number | string | null | undefined;

export interface AndesInputNumberFocusOptions extends FocusOptions {
  cursor?: 'start' | 'end' | 'all';
}

let nextId = 0;

/** Time the stepper button is held before it starts repeating. */
const REPEAT_INITIAL_DELAY = 400;
/** First gap between repeats; each repeat shortens it by `REPEAT_ACCELERATION` down to the floor. */
const REPEAT_START_INTERVAL = 160;
const REPEAT_MIN_INTERVAL = 35;
const REPEAT_ACCELERATION = 0.85;

function optionalDecimal(value: unknown): DecimalInput | undefined {
  return isDecimal(value) ? value : undefined;
}

@Component({
  selector: 'andes-input-number',
  templateUrl: './input-number.html',
  styleUrl: './input-number.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesInputNumber),
      multi: true,
    },
  ],
  host: {
    // Forwarded to the real <input> in the template instead - a screen reader never sees this
    // non-interactive host element (same convention as AndesInput).
    '[attr.id]': 'null',
    '[attr.name]': 'null',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
  },
})
export class AndesInputNumber implements ControlValueAccessor {
  // Optional: the forms API calls `writeValue` before the first render, when there is no input yet.
  private readonly nativeInput =
    viewChild<ElementRef<HTMLInputElement>>('nativeInput');
  private readonly localeId = inject(LOCALE_ID);
  private readonly destroyRef = inject(DestroyRef);

  /** Two-way value; `null` is empty. A `string` is accepted too and read as a decimal. */
  readonly value = model<AndesInputNumberValue>(null);
  readonly size = input<AndesInputNumberSize>('md');
  readonly variant = input<AndesInputNumberVariant>('outlined');
  readonly status = input<AndesInputNumberStatus | undefined>(undefined);
  readonly mode = input<AndesInputNumberMode>('input');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly readOnly = input(false, { transform: booleanAttribute });

  /** Lowest allowed value. Typing past it is pulled back on blur; the stepper stops at it. */
  readonly min = input<DecimalInput | undefined, unknown>(undefined, {
    transform: optionalDecimal,
  });
  readonly max = input<DecimalInput | undefined, unknown>(undefined, {
    transform: optionalDecimal,
  });
  /** How much one step adds. Shift multiplies it by 10, Alt by 0.1. */
  readonly step = input<DecimalInput, unknown>(1, {
    transform: (value: unknown) => (isDecimal(value) ? value : 1),
  });
  /** Fixed number of fraction digits: values are rounded to it and always shown with it. */
  readonly precision = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) => {
      const parsed = value == null || value === '' ? NaN : Number(value);
      return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
    },
  });
  /** Emit and accept decimal strings instead of numbers, so no digit is ever lost to a double. */
  readonly stringMode = input(false, { transform: booleanAttribute });

  /** Show the up/down stepper (`input` mode). Arrow keys still work when it is off. */
  readonly controls = input(true, { transform: booleanAttribute });
  /** Whether Arrow/Page/Home/End step the value. Typing is unaffected. */
  readonly keyboard = input(true, { transform: booleanAttribute });
  /** Step with the mouse wheel while the field is focused. */
  readonly changeOnWheel = input(false, { transform: booleanAttribute });
  /**
   * Hold typed text back until the field blurs (or Enter is pressed). Off: every keystroke that
   * reads as an in-range number updates the value right away; the final clamp always happens
   * on blur.
   */
  readonly changeOnBlur = input(false, { transform: booleanAttribute });

  /** Built-in locale formatting; `none` shows plain digits. */
  readonly format = input<AndesInputNumberFormat>('none');
  /** BCP 47 tag for `format`; defaults to the application locale. */
  readonly locale = input<string | undefined>(undefined);
  /** ISO 4217 code for `format="currency"`. */
  readonly currency = input('USD');
  readonly currencyDisplay = input<AndesInputNumberCurrencyDisplay>('symbol');
  readonly useGrouping = input(true, { transform: booleanAttribute });
  /** Decimal separator of the plain (`format="none"`) text, e.g. `,`. */
  readonly decimalSeparator = input('.');
  /** Replaces the built-in text for a value. Pair it with `parser`. */
  readonly formatter = input<AndesInputNumberFormatter | undefined>(undefined);
  /** Reads text the `formatter` wrote back into a value. */
  readonly parser = input<AndesInputNumberParser | undefined>(undefined);
  /** Overrides the on-screen keyboard hint (`numeric` for integers, `decimal` otherwise). */
  readonly inputmode = input<'numeric' | 'decimal' | 'text' | undefined>(
    undefined,
  );

  readonly addonBefore = input<string | undefined>(undefined);
  readonly addonAfter = input<string | undefined>(undefined);
  readonly placeholder = input<string | undefined>(undefined);
  readonly increaseLabel = input('Increase');
  readonly decreaseLabel = input('Decrease');
  readonly id = input<string | undefined>(undefined);
  readonly name = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });
  readonly ariaDescribedby = input<string | undefined>(undefined, {
    alias: 'aria-describedby',
  });
  readonly ariaInvalid = input(false, {
    alias: 'aria-invalid',
    transform: booleanAttribute,
  });

  /** The value was stepped by a button, key or wheel (fires even when `valueChange` would not). */
  readonly stepped = output<AndesInputNumberStep>();
  /** Enter pressed in the field (never mid-composition); the typed text is committed first. */
  readonly pressEnter = output<KeyboardEvent>();
  readonly focused = output<FocusEvent>();
  readonly blurred = output<FocusEvent>();

  private readonly disabledByForm = signal(false);
  protected readonly uid = `andes-input-number-${nextId++}`;

  protected readonly controlId = computed(() => this.id() ?? this.uid);

  protected readonly isDisabled = computed(
    () => this.disabled() || this.disabledByForm(),
  );

  private readonly effectiveLocale = computed(
    () => this.locale() || this.localeId,
  );

  private readonly codec = computed(() =>
    createNumberCodec({
      locale: this.effectiveLocale(),
      format: this.format(),
      currency: this.currency(),
      currencyDisplay: this.currencyDisplay(),
      useGrouping: this.useGrouping(),
      precision: this.precision(),
      decimalSeparator: this.decimalSeparator(),
    }),
  );

  /** The held value as a canonical decimal string, `null` when empty or not a number. */
  private readonly committed = computed<string | null>(() => {
    const current = this.value();
    return isDecimal(current) ? normalizeDecimal(current) : null;
  });

  /** The text the field shows for the held value. */
  protected readonly display = computed(() => {
    const current = this.committed();
    if (current === null) {
      return '';
    }
    const formatter = this.formatter();
    if (!formatter) {
      return this.codec().format(current);
    }
    const precision = this.precision();
    const shown =
      precision === undefined ? current : roundDecimal(current, precision);
    return formatter(this.outputOf(shown) as number | string);
  });

  /** True from the first keystroke until the text is committed - external changes must not clobber typing. */
  private editing = false;

  /** What is in the box. Follows `display` except while the user is typing. */
  protected readonly text = linkedSignal<string, string>({
    source: this.display,
    computation: (next, previous) =>
      this.editing && previous ? previous.value : next,
  });

  protected readonly outOfRange = computed(() => {
    const current = this.committed();
    if (current === null) {
      return false;
    }
    const min = this.min();
    const max = this.max();
    return (
      (min !== undefined && compareDecimals(current, min) < 0) ||
      (max !== undefined && compareDecimals(current, max) > 0)
    );
  });

  protected readonly isInvalid = computed(
    () => this.ariaInvalid() || this.status() === 'error' || this.outOfRange(),
  );

  protected readonly atMin = computed(() => {
    const current = this.committed();
    const min = this.min();
    return (
      current !== null &&
      min !== undefined &&
      compareDecimals(current, min) <= 0
    );
  });

  protected readonly atMax = computed(() => {
    const current = this.committed();
    const max = this.max();
    return (
      current !== null &&
      max !== undefined &&
      compareDecimals(current, max) >= 0
    );
  });

  protected readonly canStep = computed(
    () => !this.isDisabled() && !this.readOnly(),
  );

  protected readonly showStepper = computed(
    () => this.mode() === 'input' && this.controls() && this.canStep(),
  );

  protected readonly isSpinner = computed(() => this.mode() === 'spinner');

  protected readonly resolvedInputmode = computed(
    () => this.inputmode() ?? (this.precision() === 0 ? 'numeric' : 'decimal'),
  );

  protected readonly ariaMin = computed(() => this.numericBound(this.min()));
  protected readonly ariaMax = computed(() => this.numericBound(this.max()));
  protected readonly ariaNow = computed(() => {
    const current = this.committed();
    return current === null ? null : decimalToNumber(current);
  });
  /** Only differs from the number itself when the text adds something (currency, grouping, a unit). */
  protected readonly ariaText = computed(() => {
    const current = this.committed();
    if (current === null) {
      return null;
    }
    const shown = this.display();
    return shown === String(decimalToNumber(current)) ? null : shown;
  });

  protected readonly groupClasses = computed(() =>
    clsx(
      'andes-input-number-group',
      `andes-input-number-group--${this.size()}`,
      this.isDisabled() && 'andes-input-number-group--disabled',
    ),
  );

  protected readonly wrapperClasses = computed(() =>
    clsx(
      'andes-input-number',
      `andes-input-number--${this.size()}`,
      `andes-input-number--${this.variant()}`,
      this.isSpinner() && 'andes-input-number--spinner',
      this.isInvalid() && 'andes-input-number--invalid',
      this.status() === 'warning' &&
        !this.isInvalid() &&
        'andes-input-number--warning',
      this.isDisabled() && 'andes-input-number--disabled',
      this.readOnly() && 'andes-input-number--readonly',
    ),
  );

  private focusedNow = false;
  private repeatTimer: ReturnType<typeof setTimeout> | undefined;

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: AndesInputNumberValue) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

  constructor() {
    this.destroyRef.onDestroy(() => this.stopRepeat());
  }

  writeValue(value: unknown): void {
    this.editing = false;
    this.value.set(this.coerce(value));
    this.syncText();
  }

  registerOnChange(fn: (value: AndesInputNumberValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
    if (isDisabled) {
      this.stopRepeat();
    }
  }

  /** Focuses the field, optionally placing the caret. */
  focus(options?: AndesInputNumberFocusOptions): void {
    const element = this.nativeInput()?.nativeElement;
    if (!element) {
      return;
    }
    element.focus({ preventScroll: options?.preventScroll });
    const end = element.value.length;
    switch (options?.cursor) {
      case 'start':
        element.setSelectionRange(0, 0);
        break;
      case 'end':
        element.setSelectionRange(end, end);
        break;
      case 'all':
        element.select();
        break;
    }
  }

  blur(): void {
    this.nativeInput()?.nativeElement.blur();
  }

  /** Selects all the text in the field. */
  select(): void {
    this.nativeInput()?.nativeElement.select();
  }

  /** Adds one step, as if the stepper's up button was pressed. */
  stepUp(): void {
    this.stepBy('up', 0, 'handler');
  }

  /** Subtracts one step, as if the stepper's down button was pressed. */
  stepDown(): void {
    this.stepBy('down', 0, 'handler');
  }

  protected onInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    this.editing = true;
    this.text.set(element.value);
    if ((event as InputEvent).isComposing || this.changeOnBlur()) {
      return;
    }
    this.commitTyping(element.value);
  }

  protected onCompositionEnd(event: CompositionEvent): void {
    const element = event.target as HTMLInputElement;
    this.editing = true;
    this.text.set(element.value);
    if (!this.changeOnBlur()) {
      this.commitTyping(element.value);
    }
  }

  /** Keeps characters a number can't contain out of the box (only for the built-in format). */
  protected onBeforeInput(event: InputEvent): void {
    if (
      this.formatter() ||
      this.parser() ||
      !event.data ||
      event.isComposing ||
      !event.inputType.startsWith('insert')
    ) {
      return;
    }
    let allowed = this.codec().allowedCharacters;
    const min = this.min();
    if (min !== undefined && compareDecimals(min, 0) >= 0) {
      allowed = allowed.replace(/[-−]/g, '');
    }
    for (const char of event.data) {
      if (!allowed.includes(char)) {
        event.preventDefault();
        return;
      }
    }
  }

  protected onFocus(event: FocusEvent): void {
    this.focusedNow = true;
    this.focused.emit(event);
  }

  protected onBlur(event: FocusEvent): void {
    this.focusedNow = false;
    this.stopRepeat();
    this.finalize();
    this.onTouched();
    this.blurred.emit(event);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.isComposing) {
      return;
    }
    if (event.key === 'Enter') {
      this.finalize();
      this.pressEnter.emit(event);
      return;
    }
    if (event.key === 'Escape' && this.editing) {
      event.stopPropagation();
      this.editing = false;
      this.syncText();
      return;
    }
    if (!this.keyboard() || !this.canStep() || event.ctrlKey || event.metaKey) {
      return;
    }
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown': {
        event.preventDefault();
        const places = event.shiftKey ? 1 : event.altKey ? -1 : 0;
        this.stepBy(
          event.key === 'ArrowUp' ? 'up' : 'down',
          places,
          'keyboard',
        );
        break;
      }
      case 'PageUp':
      case 'PageDown':
        event.preventDefault();
        this.stepBy(event.key === 'PageUp' ? 'up' : 'down', 1, 'keyboard');
        break;
      case 'Home':
      case 'End': {
        const bound = event.key === 'Home' ? this.min() : this.max();
        if (bound !== undefined) {
          event.preventDefault();
          this.editing = false;
          this.commitValue(normalizeDecimal(bound));
          this.syncText();
        }
        break;
      }
    }
  }

  protected onWheel(event: WheelEvent): void {
    if (
      !this.changeOnWheel() ||
      !this.focusedNow ||
      !this.canStep() ||
      event.deltaY === 0
    ) {
      return;
    }
    event.preventDefault();
    this.stepBy(event.deltaY < 0 ? 'up' : 'down', 0, 'wheel');
  }

  /** Keeps focus in the text box while a button is pressed with the mouse. */
  protected keepFocus(event: MouseEvent): void {
    event.preventDefault();
  }

  protected onHandlerPointerDown(
    event: PointerEvent,
    direction: AndesInputNumberStepDirection,
  ): void {
    if (event.button !== 0 || !this.canStep()) {
      return;
    }
    event.preventDefault();
    this.nativeInput()?.nativeElement.focus({ preventScroll: true });
    this.stopRepeat();
    if (!this.stepBy(direction, 0, 'handler')) {
      return;
    }
    this.repeatTimer = setTimeout(
      () => this.repeat(direction, REPEAT_START_INTERVAL),
      REPEAT_INITIAL_DELAY,
    );
  }

  /** A click with no pointer behind it - assistive technology or a synthetic activation. */
  protected onHandlerClick(
    event: MouseEvent,
    direction: AndesInputNumberStepDirection,
  ): void {
    if (event.detail === 0 && this.canStep()) {
      this.stepBy(direction, 0, 'handler');
    }
  }

  protected stopRepeat(): void {
    if (this.repeatTimer !== undefined) {
      clearTimeout(this.repeatTimer);
      this.repeatTimer = undefined;
    }
  }

  private repeat(
    direction: AndesInputNumberStepDirection,
    interval: number,
  ): void {
    if (!this.stepBy(direction, 0, 'handler')) {
      this.repeatTimer = undefined;
      return;
    }
    this.repeatTimer = setTimeout(
      () =>
        this.repeat(
          direction,
          Math.max(REPEAT_MIN_INTERVAL, interval * REPEAT_ACCELERATION),
        ),
      interval,
    );
  }

  /**
   * Adds or subtracts `step * 10^places` to the typed-or-held value, clamps and rounds it.
   * Returns whether the value moved, so a held button stops repeating at a bound.
   */
  private stepBy(
    direction: AndesInputNumberStepDirection,
    places: number,
    source: AndesInputNumberStepSource,
  ): boolean {
    if (!this.canStep()) {
      return false;
    }
    const base = this.baseForStep();
    const magnitude = shiftDecimal(this.step(), Math.round(places));
    const offset =
      direction === 'up' ? magnitude : subtractDecimals(0, magnitude);
    const start = base ?? '0';
    const next = this.settle(addDecimals(start, offset));
    this.editing = false;
    const moved = base === null || compareDecimals(next, base) !== 0;
    if (!moved) {
      this.syncText();
      return false;
    }
    this.commitValue(next);
    this.syncText();
    this.stepped.emit({
      value: this.outputOf(next),
      offset,
      direction,
      source,
    });
    return true;
  }

  /** The number stepping starts from: whatever parses from the box right now, else the held value. */
  private baseForStep(): string | null {
    if (this.editing) {
      const parsed = this.parseText(this.text());
      if (parsed.kind === 'ok') {
        return parsed.value;
      }
      if (parsed.kind === 'empty') {
        return null;
      }
    }
    return this.committed();
  }

  /** Per-keystroke path: updates the value only for text that reads as an in-range number (or empty). */
  private commitTyping(text: string): void {
    const parsed = this.parseText(text);
    if (parsed.kind === 'empty') {
      this.commitValue(null);
    } else if (parsed.kind === 'ok') {
      const rounded = this.round(parsed.value);
      if (this.inRange(rounded)) {
        this.commitValue(rounded);
      }
    }
  }

  /** Blur / Enter: turns the typed text into a final, clamped, rounded value and reformats the box. */
  private finalize(): void {
    if (this.editing) {
      const parsed = this.parseText(this.text());
      if (parsed.kind === 'empty') {
        this.commitValue(null);
      } else if (parsed.kind === 'ok') {
        this.commitValue(this.settle(parsed.value));
      }
    }
    this.editing = false;
    this.syncText();
  }

  private parseText(text: string): AndesParsedNumber {
    const parser = this.parser();
    if (!parser) {
      return this.codec().parse(text);
    }
    if (text.trim() === '') {
      return { kind: 'empty' };
    }
    const parsed = parser(text);
    if (parsed === null || parsed === '') {
      return { kind: 'empty' };
    }
    return isDecimal(parsed)
      ? { kind: 'ok', value: normalizeDecimal(parsed) }
      : { kind: 'invalid' };
  }

  private round(value: string): string {
    const precision = this.precision();
    return precision === undefined ? value : roundDecimal(value, precision);
  }

  private settle(value: string): string {
    return clampDecimal(this.round(value), this.min(), this.max());
  }

  private inRange(value: string): boolean {
    const min = this.min();
    const max = this.max();
    return (
      (min === undefined || compareDecimals(value, min) >= 0) &&
      (max === undefined || compareDecimals(value, max) <= 0)
    );
  }

  /** Stores a new value and tells the form and the outputs; nothing happens when it is the same number. */
  private commitValue(next: string | null): void {
    const current = this.committed();
    if (
      next === current ||
      (next !== null &&
        current !== null &&
        compareDecimals(next, current) === 0)
    ) {
      return;
    }
    const output = this.outputOf(next);
    this.value.set(output);
    this.onChange(output);
  }

  /** Puts the held value's text in the box, also when the signal would not notice a change. */
  private syncText(): void {
    const shown = this.display();
    this.text.set(shown);
    const element = this.nativeInput()?.nativeElement;
    if (element && element.value !== shown) {
      element.value = shown;
    }
  }

  private outputOf(value: string | null): AndesInputNumberValue {
    if (value === null) {
      return null;
    }
    return this.stringMode() ? value : decimalToNumber(value);
  }

  private coerce(value: unknown): AndesInputNumberValue {
    if (!isDecimal(value)) {
      return null;
    }
    return this.outputOf(normalizeDecimal(value));
  }

  private numericBound(bound: DecimalInput | undefined): number | null {
    return bound === undefined ? null : decimalToNumber(bound);
  }
}
