import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  input,
  linkedSignal,
  numberAttribute,
  output,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type AndesSliderOrientation = 'horizontal' | 'vertical';
export type AndesSliderTooltip = 'hover' | 'always' | 'never';

/** Public value shape: a single number, or `[low, high]` when `range` is set. */
export type AndesSliderValue = number | [number, number];

export interface AndesSliderMark {
  readonly value: number;
  readonly label?: string;
}

export type AndesSliderMarkInput = AndesSliderMark | number;

/**
 * Accepts either bare numbers (`[0, 50, 100]`) or labelled marks
 * (`[{ value: 0, label: 'Cold' }]`) and always yields ascending `AndesSliderMark`s.
 */
function normalizeMarks(
  raw: readonly AndesSliderMarkInput[] | null | undefined,
): readonly AndesSliderMark[] {
  if (!raw) {
    return [];
  }

  const marks: AndesSliderMark[] = [];
  for (const item of raw) {
    if (typeof item === 'number') {
      if (Number.isFinite(item)) {
        marks.push({ value: item });
      }
      continue;
    }
    if (item && Number.isFinite(item.value)) {
      marks.push({ value: item.value, label: item.label });
    }
  }

  return marks.sort((a, b) => a.value - b.value);
}

/** `step` accepts `null` ("snap to `marks` only", Ant Design semantics), so it needs its own transform. */
function nullableNumberAttribute(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Decimal places implied by a number's own literal form. Used to undo the float drift that
 * `min + Math.round((v - min) / step) * step` introduces for fractional steps (0.1 * 3 is
 * 0.30000000000000004, which would leak into `aria-valuenow` and into emitted values).
 */
function decimalPlaces(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const text = String(value);
  const exponent = text.indexOf('e-');
  if (exponent >= 0) {
    const mantissaDecimals = text.slice(0, exponent).split('.')[1]?.length ?? 0;
    return mantissaDecimals + Number(text.slice(exponent + 2));
  }

  const dot = text.indexOf('.');
  return dot < 0 ? 0 : text.length - dot - 1;
}

function roundTo(value: number, decimals: number): number {
  if (decimals <= 0) {
    return Math.round(value);
  }
  const factor = 10 ** Math.min(decimals, 12);
  return Math.round(value * factor) / factor;
}

function sameValues(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

interface AndesSliderThumbView {
  readonly index: number;
  readonly value: number;
  readonly offset: string;
  readonly label: string;
  readonly valueText: string | null;
  readonly ariaLabel: string | null;
  readonly ariaLabelledby: string | null;
  readonly ariaDescribedby: string | null;
}

@Component({
  selector: 'andes-slider',
  templateUrl: './slider.html',
  styleUrl: './slider.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesSlider),
      multi: true,
    },
  ],
  host: {
    class: 'andes-slider',
    '[attr.data-orientation]': 'orientation()',
    '[attr.data-tooltip]': 'tooltip()',
    '[attr.data-disabled]': "isDisabled() ? '' : null",
    '[attr.data-dragging]': "dragging() ? '' : null",
    // In range mode the host groups two real sliders, so the group carries the overall
    // label. In single mode there is exactly one slider and the labels belong on the thumb
    // itself - a screen reader never reaches ARIA left on a roleless host element, the same
    // bug already fixed in AndesButton.
    '[attr.role]': "range() ? 'group' : null",
    '[attr.aria-label]': 'range() ? (ariaLabel() ?? null) : null',
    '[attr.aria-labelledby]': 'range() ? (ariaLabelledby() ?? null) : null',
    '[attr.aria-describedby]': 'range() ? (ariaDescribedby() ?? null) : null',
  },
})
export class AndesSlider implements ControlValueAccessor {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly trackRef =
    viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly controlRef =
    viewChild.required<ElementRef<HTMLElement>>('control');
  private readonly thumbRefs =
    viewChildren<ElementRef<HTMLElement>>('thumbElement');

  readonly value = input<AndesSliderValue | null | undefined>(undefined);
  readonly min = input(0, { transform: numberAttribute });
  readonly max = input(100, { transform: numberAttribute });
  /** `null` restricts the slider to the `marks` values only. */
  readonly step = input(1, { transform: nullableNumberAttribute });
  /** Increment for Page Up/Down and Shift + Arrow. */
  readonly largeStep = input(10, { transform: numberAttribute });
  readonly orientation = input<AndesSliderOrientation>('horizontal');
  readonly range = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly keyboard = input(true, { transform: booleanAttribute });
  /** Restrict the thumbs to the `marks` values, like Ant Design's `dots`. */
  readonly dots = input(false, { transform: booleanAttribute });
  /** Fill the track from its start to the value in single mode. */
  readonly included = input(true, { transform: booleanAttribute });
  /** Flip the value axis relative to the reading direction. */
  readonly reverse = input(false, { transform: booleanAttribute });
  readonly marks = input<
    readonly AndesSliderMark[],
    readonly AndesSliderMarkInput[] | null | undefined
  >([], { transform: normalizeMarks });
  readonly tooltip = input<AndesSliderTooltip>('hover');
  /** Formats the tooltip text and `aria-valuetext`; omitted entirely when unset. */
  readonly valueFormatter = input<
    ((value: number, index: number) => string) | undefined
  >(undefined);

  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });
  readonly ariaDescribedby = input<string | undefined>(undefined, {
    alias: 'aria-describedby',
  });
  /** Per-thumb accessible name for the low handle in range mode (mandatory: no adjacent text). */
  readonly startAriaLabel = input<string | undefined>(undefined);
  /** Per-thumb accessible name for the high handle in range mode. */
  readonly endAriaLabel = input<string | undefined>(undefined);

  readonly valueChange = output<AndesSliderValue>();
  /** Fires once when a drag or keystroke interaction ends. */
  readonly valueCommit = output<AndesSliderValue>();

  protected readonly dragging = signal(false);
  protected readonly activeIndex = signal(0);
  private readonly cvaDisabled = signal(false);

  private onChangeFn: (value: AndesSliderValue) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;

  protected readonly isDisabled = computed(
    () => this.disabled() || this.cvaDisabled(),
  );

  private readonly markValues = computed(() => {
    const seen = new Set<number>();
    const values: number[] = [];
    for (const mark of this.marks()) {
      if (!seen.has(mark.value)) {
        seen.add(mark.value);
        values.push(mark.value);
      }
    }
    return values;
  });

  private readonly snapsToMarksOnly = computed(
    () => (this.dots() || this.step() === null) && this.markValues().length > 0,
  );

  private readonly decimals = computed(() =>
    Math.max(decimalPlaces(this.step() ?? 1), decimalPlaces(this.min())),
  );

  /**
   * Single source of truth, always an array (length 1, or 2 in range mode). A `linkedSignal`
   * rather than a plain signal so a bound `value` input wins, while drag/keyboard/`writeValue`
   * updates survive until that input actually changes - and so an incoming `min`/`max`/`step`
   * change re-clamps whatever is currently held.
   */
  private readonly values = linkedSignal<
    {
      readonly value: AndesSliderValue | null | undefined;
      readonly range: boolean;
      readonly min: number;
      readonly max: number;
      readonly step: number | null;
      readonly marksOnly: boolean;
      readonly markValues: readonly number[];
    },
    number[]
  >({
    source: () => ({
      value: this.value(),
      range: this.range(),
      min: this.min(),
      max: this.max(),
      step: this.step(),
      marksOnly: this.snapsToMarksOnly(),
      markValues: this.markValues(),
    }),
    computation: (source, previous) => {
      if (source.value !== undefined && source.value !== null) {
        return this.normalize(source.value);
      }
      return this.normalize(previous ? previous.value : undefined);
    },
  });

  private readonly percentages = computed(() => {
    const min = this.min();
    const span = this.max() - min;
    return this.values().map((value) =>
      span === 0 ? 0 : ((value - min) / span) * 100,
    );
  });

  /** Percentages measured from the track's inline/block start, after `reverse`. */
  private readonly offsets = computed(() => {
    const reverse = this.reverse();
    return this.percentages().map((percent) =>
      reverse ? 100 - percent : percent,
    );
  });

  protected readonly fill = computed(() => {
    const offsets = this.offsets();
    const head = offsets[offsets.length - 1] ?? 0;
    let anchor: number;
    if (this.range()) {
      anchor = offsets[0] ?? 0;
    } else if (this.included()) {
      anchor = this.reverse() ? 100 : 0;
    } else {
      anchor = head;
    }

    return {
      start: `${Math.min(anchor, head)}%`,
      size: `${Math.abs(head - anchor)}%`,
    };
  });

  protected readonly thumbs = computed<readonly AndesSliderThumbView[]>(() => {
    const values = this.values();
    const offsets = this.offsets();
    const formatter = this.valueFormatter();
    const isRange = this.range();

    return values.map((value, index) => {
      const formatted = formatter?.(value, index);
      const ariaLabel = isRange
        ? ((index === 0 ? this.startAriaLabel() : this.endAriaLabel()) ?? null)
        : (this.ariaLabel() ?? null);

      return {
        index,
        value,
        offset: `${offsets[index] ?? 0}%`,
        label: formatted ?? String(value),
        valueText: formatted ?? null,
        ariaLabel,
        ariaLabelledby: isRange ? null : (this.ariaLabelledby() ?? null),
        ariaDescribedby: isRange ? null : (this.ariaDescribedby() ?? null),
      };
    });
  });

  protected readonly dotViews = computed(() => {
    const min = this.min();
    const span = this.max() - min;
    const values = this.values();
    const low = values.length > 1 ? values[0] : min;
    const high = values[values.length - 1];
    const reverse = this.reverse();

    return this.marks().map((mark) => {
      const percent = span === 0 ? 0 : ((mark.value - min) / span) * 100;
      return {
        value: mark.value,
        offset: `${reverse ? 100 - percent : percent}%`,
        active: this.included() && mark.value >= low && mark.value <= high,
      };
    });
  });

  protected readonly markViews = computed(() => {
    const min = this.min();
    const span = this.max() - min;
    const reverse = this.reverse();

    return this.marks()
      .filter((mark) => mark.label !== undefined && mark.label !== '')
      .map((mark) => {
        const percent = span === 0 ? 0 : ((mark.value - min) / span) * 100;
        return {
          value: mark.value,
          label: mark.label as string,
          offset: `${reverse ? 100 - percent : percent}%`,
        };
      });
  });

  // ControlValueAccessor -----------------------------------------------------

  writeValue(value: unknown): void {
    this.values.set(
      this.normalize(
        typeof value === 'number' || Array.isArray(value)
          ? (value as AndesSliderValue)
          : undefined,
      ),
    );
  }

  registerOnChange(fn: (value: AndesSliderValue) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }

  // Pointer ------------------------------------------------------------------

  protected onPointerDown(event: PointerEvent): void {
    if (this.isDisabled()) {
      return;
    }
    // Primary button only; `button` is absent on synthetic events in tests.
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    const next = this.valueFromPointer(event);
    if (next === undefined) {
      return;
    }

    const index = this.nearestIndex(next);
    this.activeIndex.set(index);
    this.dragging.set(true);

    const control = this.controlRef().nativeElement;
    if (
      typeof control.setPointerCapture === 'function' &&
      event.pointerId !== undefined
    ) {
      control.setPointerCapture(event.pointerId);
    }

    event.preventDefault();
    this.thumbRefs()[index]?.nativeElement.focus();
    this.setValueAt(index, next);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragging() || this.isDisabled()) {
      return;
    }

    const next = this.valueFromPointer(event);
    if (next !== undefined) {
      this.setValueAt(this.activeIndex(), next);
    }
  }

  protected onPointerUp(event: PointerEvent): void {
    if (!this.dragging()) {
      return;
    }

    const control = this.controlRef().nativeElement;
    if (
      typeof control.releasePointerCapture === 'function' &&
      event.pointerId !== undefined &&
      control.hasPointerCapture?.(event.pointerId)
    ) {
      control.releasePointerCapture(event.pointerId);
    }

    this.dragging.set(false);
    this.commit();
  }

  /**
   * Converts a pointer position into a value using the **track's** own bounding rect, so the
   * result is a fraction along the rendered track rather than a raw viewport coordinate. The
   * track is the element the fill and the thumb offsets are positioned against, which is why
   * it - and not the padded control wrapper or the host - is the reference box.
   */
  private valueFromPointer(event: PointerEvent): number | undefined {
    const rect = this.trackRef().nativeElement.getBoundingClientRect();
    let fraction: number;

    if (this.orientation() === 'vertical') {
      if (rect.height === 0) {
        return undefined;
      }
      // The block axis runs bottom-to-top: the track's bottom edge is the minimum.
      fraction = (rect.bottom - event.clientY) / rect.height;
    } else {
      if (rect.width === 0) {
        return undefined;
      }
      fraction = (event.clientX - rect.left) / rect.width;
      // Thumb/fill offsets use logical properties, so RTL mirrors them for free - the
      // pointer math has to mirror too, otherwise a drag runs backwards.
      if (this.resolveDirection() === 'rtl') {
        fraction = 1 - fraction;
      }
    }

    if (this.reverse()) {
      fraction = 1 - fraction;
    }

    fraction = Math.min(1, Math.max(0, fraction));
    return this.snap(this.min() + fraction * (this.max() - this.min()));
  }

  // Keyboard -----------------------------------------------------------------

  protected onKeydown(event: KeyboardEvent, index: number): void {
    if (this.isDisabled() || !this.keyboard()) {
      return;
    }

    const vertical = this.orientation() === 'vertical';
    const rtl = this.resolveDirection() === 'rtl';
    const reverse = this.reverse();
    const step = event.shiftKey ? this.largeStep() : (this.step() ?? 1);
    // Left/Right act on the inline axis: RTL mirrors them, and `reverse` mirrors them again
    // when the inline axis is the slider's own axis.
    const rightSign = (rtl ? -1 : 1) * (!vertical && reverse ? -1 : 1);
    // Up/Down act on the block axis, which `reverse` only owns in vertical orientation.
    const upSign = vertical && reverse ? -1 : 1;
    const current = this.values()[index];

    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = this.stepFrom(current, rightSign * step);
        break;
      case 'ArrowLeft':
        next = this.stepFrom(current, -rightSign * step);
        break;
      case 'ArrowUp':
        next = this.stepFrom(current, upSign * step);
        break;
      case 'ArrowDown':
        next = this.stepFrom(current, -upSign * step);
        break;
      case 'PageUp':
        next = this.stepFrom(current, this.largeStep());
        break;
      case 'PageDown':
        next = this.stepFrom(current, -this.largeStep());
        break;
      case 'Home':
        next = this.min();
        break;
      case 'End':
        next = this.max();
        break;
      default:
        return;
    }

    event.preventDefault();
    this.activeIndex.set(index);
    this.setValueAt(index, next);
    this.commit();
  }

  protected onBlur(): void {
    this.onTouchedFn();
  }

  /** One `step` away from `current`, or one mark away when the slider snaps to marks only. */
  private stepFrom(current: number, delta: number): number {
    if (delta === 0) {
      return current;
    }

    if (this.snapsToMarksOnly()) {
      const values = this.markValues();
      let nearest = 0;
      let best = Number.POSITIVE_INFINITY;
      values.forEach((value, index) => {
        const distance = Math.abs(value - current);
        if (distance < best) {
          best = distance;
          nearest = index;
        }
      });
      const target = Math.min(
        values.length - 1,
        Math.max(0, nearest + Math.sign(delta)),
      );
      return values[target];
    }

    return current + delta;
  }

  // Value plumbing -----------------------------------------------------------

  private normalize(
    raw: AndesSliderValue | readonly number[] | undefined,
  ): number[] {
    const list = Array.isArray(raw)
      ? raw.map(Number)
      : typeof raw === 'number'
        ? [raw]
        : [];

    if (this.range()) {
      const low = Number.isFinite(list[0]) ? list[0] : this.min();
      const high = Number.isFinite(list[1]) ? list[1] : low;
      const a = this.snap(low);
      const b = this.snap(high);
      return a <= b ? [a, b] : [b, a];
    }

    return [this.snap(Number.isFinite(list[0]) ? list[0] : this.min())];
  }

  /** Clamps to `[min, max]`, then snaps to the step grid (or to the nearest mark). */
  private snap(raw: number): number {
    const min = this.min();
    const max = this.max();
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    let value = Math.min(high, Math.max(low, raw));

    if (this.snapsToMarksOnly()) {
      return this.markValues().reduce(
        (best, mark) =>
          Math.abs(mark - value) < Math.abs(best - value) ? mark : best,
        this.markValues()[0],
      );
    }

    const step = this.step();
    if (step !== null && step > 0) {
      value = min + Math.round((value - min) / step) * step;
      // A max that is not on the step grid stays reachable, matching both reference libraries.
      value = Math.min(high, Math.max(low, value));
    }

    return roundTo(value, this.decimals());
  }

  private setValueAt(index: number, next: number): void {
    const current = this.values();
    const updated = [...current];
    const snapped = this.snap(next);

    if (updated.length > 1) {
      // Neither handle may cross the other.
      updated[index] =
        index === 0
          ? Math.min(snapped, updated[1])
          : Math.max(snapped, updated[0]);
    } else {
      updated[0] = snapped;
    }

    if (sameValues(updated, current)) {
      return;
    }

    this.values.set(updated);
    const published = this.publicValue(updated);
    this.valueChange.emit(published);
    this.onChangeFn(published);
  }

  private commit(): void {
    this.onTouchedFn();
    this.valueCommit.emit(this.publicValue(this.values()));
  }

  private publicValue(values: readonly number[]): AndesSliderValue {
    return this.range() ? [values[0], values[1]] : values[0];
  }

  /**
   * Resolved at interaction time rather than cached: the `dir` attribute can change at any
   * point, and reading it from the DOM keeps the component free of a bidi service dependency.
   */
  private resolveDirection(): 'ltr' | 'rtl' {
    const host = this.elementRef.nativeElement;
    const scoped = host.closest?.('[dir]');
    const attribute = scoped?.getAttribute('dir')?.toLowerCase();
    if (attribute === 'rtl' || attribute === 'ltr') {
      return attribute;
    }

    const computedDirection =
      typeof getComputedStyle === 'function'
        ? getComputedStyle(host).direction
        : '';
    return computedDirection === 'rtl' ? 'rtl' : 'ltr';
  }

  private nearestIndex(value: number): number {
    const values = this.values();
    if (values.length < 2) {
      return 0;
    }

    const toLow = Math.abs(values[0] - value);
    const toHigh = Math.abs(values[1] - value);
    if (toLow === toHigh) {
      // Both handles sit together: move whichever one can actually travel that way.
      return value < values[0] ? 0 : 1;
    }
    return toLow < toHigh ? 0 : 1;
  }
}
