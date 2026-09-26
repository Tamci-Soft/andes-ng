import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  ElementRef,
  forwardRef,
  inject,
  Injector,
  input,
  linkedSignal,
  model,
  numberAttribute,
  signal,
  viewChild,
  viewChildren,
  output,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import {
  AndesSliderMarkTemplate,
  AndesSliderTooltipTemplate,
} from './slider-templates';

export type AndesSliderOrientation = 'horizontal' | 'vertical';
export type AndesSliderTooltip = 'hover' | 'always' | 'never';
export type AndesSliderTooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

/**
 * Public value shape: a single number, or one number per handle when `range` is set - two
 * by default, any count when `range` is editable or the bound array carries more.
 */
export type AndesSliderValue = number | number[];

export interface AndesSliderMark {
  readonly value: number;
  readonly label?: string;
  /** Inline styles for this mark's label, like Ant Design's `{ style, label }` mark shape. */
  readonly style?: Readonly<Record<string, string | number>>;
  /** Extra class(es) for this mark's label. */
  readonly class?: string;
}

export type AndesSliderMarkInput = AndesSliderMark | number;

/** Ant Design's object shape: `{ 0: '0°C', 100: { label: '100°C', style: { color: 'red' } } }`. */
export type AndesSliderMarksRecord = Readonly<
  Record<number | string, string | Omit<AndesSliderMark, 'value'>>
>;

export type AndesSliderMarks =
  readonly AndesSliderMarkInput[] | AndesSliderMarksRecord;

/** Ant Design's `range` object. `range` also accepts a plain boolean. */
export interface AndesSliderRangeConfig {
  /** Drag the filled segment to move every handle at once, keeping their spacing. */
  readonly draggableTrack?: boolean;
  /**
   * Click the rail to add a handle; press Delete/Backspace on a handle, or drag it more than
   * 130px away from the track, to remove it. Takes precedence over `draggableTrack`.
   */
  readonly editable?: boolean;
  /** Fewest handles an editable range may shrink to (default 0). */
  readonly minCount?: number;
  /** Most handles an editable range may grow to (default unlimited). */
  readonly maxCount?: number;
}

/** How far (px) a handle must be dragged off the track before an editable range drops it. */
const REMOVE_DISTANCE = 130;

/** Beyond this many step dots the rail would be a solid smear of circles; render none. */
const MAX_STEP_DOTS = 100;

function isMarkLike(value: unknown): value is Omit<AndesSliderMark, 'value'> {
  return typeof value === 'object' && value !== null;
}

/**
 * Accepts bare numbers (`[0, 50, 100]`), labelled marks (`[{ value: 0, label: 'Cold' }]`) or
 * Ant Design's keyed object, and always yields ascending `AndesSliderMark`s.
 */
function normalizeMarks(
  raw: AndesSliderMarks | null | undefined,
): readonly AndesSliderMark[] {
  if (!raw) {
    return [];
  }

  const marks: AndesSliderMark[] = [];
  if (!Array.isArray(raw)) {
    for (const [key, entry] of Object.entries(raw as AndesSliderMarksRecord)) {
      const value = Number(key);
      if (!Number.isFinite(value)) {
        continue;
      }
      if (typeof entry === 'string') {
        marks.push({ value, label: entry });
      } else if (isMarkLike(entry)) {
        marks.push({ ...entry, value });
      }
    }
    return marks.sort((a, b) => a.value - b.value);
  }

  for (const item of raw as readonly AndesSliderMarkInput[]) {
    if (typeof item === 'number') {
      if (Number.isFinite(item)) {
        marks.push({ value: item });
      }
      continue;
    }
    if (item && Number.isFinite(item.value)) {
      marks.push({ ...item });
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

/** `range` is a boolean attribute or an Ant-style config object; `null` means single mode. */
function rangeAttribute(value: unknown): AndesSliderRangeConfig | null {
  if (typeof value === 'object' && value !== null) {
    return value as AndesSliderRangeConfig;
  }
  return booleanAttribute(value) ? {} : null;
}

/** `disabled` is a boolean attribute, or one flag per handle (Ant Design's `boolean[]`). */
function disabledAttribute(value: unknown): boolean | readonly boolean[] {
  return Array.isArray(value)
    ? value.map((flag) => booleanAttribute(flag))
    : booleanAttribute(value);
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

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

interface AndesSliderThumbView {
  readonly index: number;
  readonly value: number;
  readonly offset: string;
  /** Tooltip text; `null` when the tooltip formatter hides this thumb's tooltip. */
  readonly label: string | null;
  readonly valueText: string | null;
  readonly ariaLabel: string | null;
  readonly ariaLabelledby: string | null;
  readonly ariaDescribedby: string | null;
  readonly disabled: boolean;
  readonly removing: boolean;
}

type AndesSliderDrag =
  | {
      readonly kind: 'thumb';
      /** Thumbs stacked on the same value: the first move decides which one travels. */
      readonly tied: readonly number[] | null;
    }
  | {
      readonly kind: 'track';
      readonly startRaw: number;
      readonly startValues: readonly number[];
    };

@Component({
  selector: 'andes-slider',
  imports: [NgTemplateOutlet],
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
    '[attr.data-draggable-track]': "draggableTrack() ? '' : null",
    '[attr.data-editable]': "editable() ? '' : null",
    // In range mode the host groups several real sliders, so the group carries the overall
    // label. In single mode there is exactly one slider and the labels belong on the thumb
    // itself - a screen reader never reaches ARIA left on a roleless host element, the same
    // bug already fixed in AndesButton.
    '[attr.role]': "isRange() ? 'group' : null",
    '[attr.aria-label]': 'isRange() ? (ariaLabel() ?? null) : null',
    '[attr.aria-labelledby]': 'isRange() ? (ariaLabelledby() ?? null) : null',
    '[attr.aria-describedby]': 'isRange() ? (ariaDescribedby() ?? null) : null',
  },
})
export class AndesSlider implements ControlValueAccessor {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  private readonly trackRef =
    viewChild.required<ElementRef<HTMLElement>>('track');
  private readonly controlRef =
    viewChild.required<ElementRef<HTMLElement>>('control');
  private readonly thumbRefs =
    viewChildren<ElementRef<HTMLElement>>('thumbElement');

  protected readonly tooltipTemplate = contentChild(AndesSliderTooltipTemplate);
  protected readonly markTemplate = contentChild(AndesSliderMarkTemplate);

  /** Two-way bindable with `[(value)]`; also works through `ngModel`/`formControl`. */
  readonly value = model<AndesSliderValue | undefined>(undefined);
  readonly min = input(0, { transform: numberAttribute });
  readonly max = input(100, { transform: numberAttribute });
  /** `null` restricts the slider to the `marks` values only. */
  readonly step = input(1, { transform: nullableNumberAttribute });
  /** Increment for Page Up/Down and Shift + Arrow. */
  readonly largeStep = input(10, { transform: numberAttribute });
  readonly orientation = input<AndesSliderOrientation>('horizontal');
  /** `true` for two handles, or an `AndesSliderRangeConfig` for draggable/editable ranges. */
  readonly range = input<
    AndesSliderRangeConfig | null,
    boolean | string | AndesSliderRangeConfig | null | undefined
  >(null, { transform: rangeAttribute });
  /** Disables the whole slider, or - given an array - individual handles by index. */
  readonly disabled = input<boolean | readonly boolean[], unknown>(false, {
    transform: disabledAttribute,
  });
  readonly keyboard = input(true, { transform: booleanAttribute });
  /**
   * The thumbs may only sit on tick marks: the `marks` values when there are any, otherwise
   * a dot is drawn at every `step` (the thumbs already snap to it).
   */
  readonly dots = input(false, { transform: booleanAttribute });
  /** Fill the track (and highlight the dots/marks) covered by the value; `false` shows a point only. */
  readonly included = input(true, { transform: booleanAttribute });
  /** Flip the value axis relative to the reading direction. */
  readonly reverse = input(false, { transform: booleanAttribute });
  readonly marks = input<
    readonly AndesSliderMark[],
    AndesSliderMarks | null | undefined
  >([], { transform: normalizeMarks });
  /** `hover` (hover, focus and drag), `always` or `never` - Ant Design's `tooltip.open`. */
  readonly tooltip = input<AndesSliderTooltip>('hover');
  /** Side of the thumb the tooltip opens on. Defaults to `top`, or the inline end when vertical. */
  readonly tooltipPlacement = input<AndesSliderTooltipPlacement | undefined>(
    undefined,
  );
  /**
   * Tooltip text only (Ant Design's `tooltip.formatter`). Returning `null` hides that thumb's
   * tooltip; passing `null` hides every tooltip. Falls back to `valueFormatter`.
   */
  readonly tooltipFormatter = input<
    ((value: number, index: number) => string | null) | null | undefined
  >(undefined);
  /** Formats the tooltip text and `aria-valuetext`; omitted entirely when unset. */
  readonly valueFormatter = input<
    ((value: number, index: number) => string) | undefined
  >(undefined);
  /** Focus the first handle once the slider has rendered. */
  readonly autoFocus = input(false, { transform: booleanAttribute });

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
  /**
   * Accessible name per handle in range mode, for sliders with more than two handles.
   * Wins over `startAriaLabel`/`endAriaLabel` when set.
   */
  readonly thumbAriaLabel = input<
    ((index: number, count: number) => string) | undefined
  >(undefined);

  /** Fires once when a drag, mark click or keystroke interaction ends (Ant's `onChangeComplete`). */
  readonly valueCommit = output<AndesSliderValue>();

  protected readonly dragging = signal(false);
  protected readonly activeIndex = signal(0);
  /** Index of a handle dragged far enough off an editable track to be dropped on release. */
  protected readonly removingIndex = signal<number | null>(null);
  private readonly cvaDisabled = signal(false);
  private drag: AndesSliderDrag | null = null;

  private onChangeFn: (value: AndesSliderValue) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;

  constructor() {
    afterNextRender(() => {
      if (this.autoFocus()) {
        this.focus();
      }
    });
  }

  protected readonly isRange = computed(() => this.range() !== null);
  protected readonly editable = computed(() => this.range()?.editable === true);
  /** Ant Design: `editable` cannot be combined with `draggableTrack`, so editable wins. */
  protected readonly draggableTrack = computed(
    () => this.range()?.draggableTrack === true && !this.editable(),
  );
  private readonly minCount = computed(() =>
    Math.max(0, Math.floor(this.range()?.minCount ?? 0)),
  );
  private readonly maxCount = computed(() => {
    const maxCount = this.range()?.maxCount;
    return maxCount === undefined || !Number.isFinite(maxCount)
      ? Number.POSITIVE_INFINITY
      : Math.max(this.minCount(), Math.floor(maxCount));
  });

  protected readonly isDisabled = computed(
    () => this.disabled() === true || this.cvaDisabled(),
  );

  protected readonly tooltipSide = computed(
    () =>
      this.tooltipPlacement() ??
      (this.orientation() === 'vertical' ? 'end' : 'top'),
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
   * Single source of truth, always an array (length 1 in single mode). A `linkedSignal`
   * rather than a plain signal so an incoming `value` wins, while drag/keyboard/`writeValue`
   * updates survive until that value actually changes - and so an incoming `min`/`max`/`step`
   * change re-clamps whatever is currently held. Comparing the previous source's `value`
   * (rather than just "is it set") keeps a stale bound `value` from overwriting a newer
   * `writeValue` when only `min`/`max` change.
   */
  private readonly values = linkedSignal<
    {
      readonly value: AndesSliderValue | undefined;
      readonly range: boolean;
      readonly editable: boolean;
      readonly minCount: number;
      readonly maxCount: number;
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
      range: this.isRange(),
      editable: this.editable(),
      minCount: this.minCount(),
      maxCount: this.maxCount(),
      min: this.min(),
      max: this.max(),
      step: this.step(),
      marksOnly: this.snapsToMarksOnly(),
      markValues: this.markValues(),
    }),
    computation: (source, previous) => {
      const incoming = !previous || previous.source.value !== source.value;
      if (incoming && source.value !== undefined && source.value !== null) {
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

  /** The value interval the fill covers, or `null` when nothing is filled. */
  private readonly filledInterval = computed<readonly [number, number] | null>(
    () => {
      if (!this.included()) {
        return null;
      }
      const values = this.values();
      if (this.isRange()) {
        return values.length < 2
          ? null
          : [values[0], values[values.length - 1]];
      }
      return [this.min(), values[0]];
    },
  );

  protected readonly fill = computed(() => {
    const offsets = this.offsets();
    const head = offsets[offsets.length - 1] ?? 0;
    let anchor: number;
    if (!this.included() || (this.isRange() && offsets.length < 2)) {
      anchor = head;
    } else if (this.isRange()) {
      anchor = offsets[0];
    } else {
      anchor = this.reverse() ? 100 : 0;
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
    const tooltipFormatter = this.tooltipFormatter();
    const tooltipHidden =
      this.tooltip() === 'never' || tooltipFormatter === null;
    const isRange = this.isRange();
    const perThumbLabel = this.thumbAriaLabel();
    const removing = this.removingIndex();

    return values.map((value, index) => {
      const formatted = formatter?.(value, index);
      let label: string | null = null;
      if (!tooltipHidden) {
        label = tooltipFormatter
          ? tooltipFormatter(value, index)
          : (formatted ?? String(value));
      }

      let ariaLabel: string | null;
      if (!isRange) {
        ariaLabel = this.ariaLabel() ?? null;
      } else if (perThumbLabel) {
        ariaLabel = perThumbLabel(index, values.length);
      } else if (index === 0) {
        ariaLabel = this.startAriaLabel() ?? null;
      } else if (index === values.length - 1) {
        ariaLabel = this.endAriaLabel() ?? null;
      } else {
        ariaLabel = null;
      }

      return {
        index,
        value,
        offset: `${offsets[index] ?? 0}%`,
        label,
        valueText: formatted ?? null,
        ariaLabel,
        ariaLabelledby: isRange ? null : (this.ariaLabelledby() ?? null),
        ariaDescribedby: isRange ? null : (this.ariaDescribedby() ?? null),
        disabled: this.isThumbDisabled(index),
        removing: removing === index,
      };
    });
  });

  protected readonly dotViews = computed(() => {
    const min = this.min();
    const max = this.max();
    const span = max - min;
    const reverse = this.reverse();
    const interval = this.filledInterval();

    const dotValues = [...this.markValues()];
    const step = this.step();
    if (this.dots() && !this.snapsToMarksOnly() && step !== null && step > 0) {
      const count = Math.floor((max - min) / step) + 1;
      if (count > 0 && count <= MAX_STEP_DOTS + 1) {
        const decimals = this.decimals();
        const seen = new Set(dotValues);
        for (let i = 0; i < count; i++) {
          const value = roundTo(min + i * step, decimals);
          if (!seen.has(value)) {
            seen.add(value);
            dotValues.push(value);
          }
        }
        dotValues.sort((a, b) => a - b);
      }
    }

    return dotValues.map((value) => {
      const percent = span === 0 ? 0 : ((value - min) / span) * 100;
      return {
        value,
        offset: `${reverse ? 100 - percent : percent}%`,
        active:
          interval !== null && value >= interval[0] && value <= interval[1],
      };
    });
  });

  protected readonly markViews = computed(() => {
    const min = this.min();
    const span = this.max() - min;
    const reverse = this.reverse();
    const interval = this.filledInterval();
    const templated = this.markTemplate() !== undefined;

    return this.marks()
      .filter(
        (mark) => templated || (mark.label !== undefined && mark.label !== ''),
      )
      .map((mark) => {
        const percent = span === 0 ? 0 : ((mark.value - min) / span) * 100;
        const active =
          interval !== null &&
          mark.value >= interval[0] &&
          mark.value <= interval[1];
        return {
          mark,
          value: mark.value,
          label: mark.label,
          offset: `${reverse ? 100 - percent : percent}%`,
          active,
          style: mark.style ?? null,
          className: mark.class ?? '',
        };
      });
  });

  // Public methods -----------------------------------------------------------

  /** Moves focus to a handle (the first one by default), like Ant Design's `focus()`. */
  focus(index = 0): void {
    this.thumbRefs()[index]?.nativeElement.focus();
  }

  /** Removes focus from whichever handle holds it, like Ant Design's `blur()`. */
  blur(): void {
    const active = this.elementRef.nativeElement.ownerDocument?.activeElement;
    if (
      active instanceof HTMLElement &&
      this.elementRef.nativeElement.contains(active)
    ) {
      active.blur();
    }
  }

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

    const raw = this.rawFromPointer(event);
    if (raw === undefined) {
      return;
    }
    const next = this.snap(raw);
    const values = this.values();
    const pressedThumb = this.thumbIndexFromTarget(event.target);

    if (
      pressedThumb === null &&
      this.draggableTrack() &&
      values.length >= 2 &&
      raw > values[0] &&
      raw < values[values.length - 1] &&
      values.every((_, index) => !this.isThumbDisabled(index))
    ) {
      this.drag = { kind: 'track', startRaw: raw, startValues: values };
      this.startDrag(event);
      return;
    }

    if (
      pressedThumb === null &&
      this.editable() &&
      values.length < this.maxCount()
    ) {
      const insertAt = values.findIndex((value) => value > next);
      const index = insertAt < 0 ? values.length : insertAt;
      const updated = [...values];
      updated.splice(index, 0, next);
      this.activeIndex.set(index);
      this.drag = { kind: 'thumb', tied: null };
      this.startDrag(event);
      this.setValues(updated);
      // The new handle only exists after the next render.
      afterNextRender(() => this.focus(index), { injector: this.injector });
      return;
    }

    let index: number | null;
    if (pressedThumb !== null) {
      index = this.isThumbDisabled(pressedThumb) ? null : pressedThumb;
    } else {
      index = this.nearestIndex(next);
    }
    if (index === null) {
      return;
    }

    const tied = values
      .map((value, i) =>
        value === values[index] && !this.isThumbDisabled(i) ? i : -1,
      )
      .filter((i) => i >= 0);
    this.activeIndex.set(index);
    this.drag = {
      kind: 'thumb',
      tied: tied.length > 1 && next === values[index] ? tied : null,
    };
    this.startDrag(event);
    this.thumbRefs()[index]?.nativeElement.focus();
    this.setValueAt(index, next);
  }

  protected onPointerMove(event: PointerEvent): void {
    const drag = this.drag;
    if (!this.dragging() || !drag || this.isDisabled()) {
      return;
    }

    const raw = this.rawFromPointer(event);
    if (raw === undefined) {
      return;
    }

    if (drag.kind === 'track') {
      this.moveTrack(drag, raw);
      return;
    }

    const next = this.snap(raw);
    let index = this.activeIndex();
    if (drag.tied) {
      const current = this.values()[index];
      if (next === current) {
        return;
      }
      // Stacked handles: whichever can actually travel in the drag direction takes over.
      index = next < current ? drag.tied[0] : drag.tied[drag.tied.length - 1];
      this.drag = { kind: 'thumb', tied: null };
      this.activeIndex.set(index);
      this.thumbRefs()[index]?.nativeElement.focus();
    }

    if (this.editable() && this.values().length > this.minCount()) {
      const offTrack = this.distanceFromTrack(event) > REMOVE_DISTANCE;
      this.removingIndex.set(offTrack ? index : null);
      if (offTrack) {
        return;
      }
    }

    this.setValueAt(index, next);
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
    this.drag = null;
    const removing = this.removingIndex();
    if (removing !== null) {
      this.removingIndex.set(null);
      this.removeAt(removing);
    }
    this.commit();
  }

  protected onMarkClick(value: number): void {
    if (this.isDisabled()) {
      return;
    }
    const index = this.nearestIndex(value);
    if (index === null) {
      return;
    }
    this.activeIndex.set(index);
    this.setValueAt(index, value);
    this.commit();
  }

  private startDrag(event: PointerEvent): void {
    this.dragging.set(true);
    this.removingIndex.set(null);

    const control = this.controlRef().nativeElement;
    if (
      typeof control.setPointerCapture === 'function' &&
      event.pointerId !== undefined
    ) {
      control.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
  }

  /** Shifts every handle by the same (step-aligned) delta, stopping at whichever bound hits first. */
  private moveTrack(
    drag: Extract<AndesSliderDrag, { kind: 'track' }>,
    raw: number,
  ): void {
    const { startRaw, startValues } = drag;
    const low = Math.min(this.min(), this.max());
    const high = Math.max(this.min(), this.max());
    const lowest = low - startValues[0];
    const highest = high - startValues[startValues.length - 1];

    let delta = clamp(raw - startRaw, lowest, highest);
    const step = this.step();
    if (!this.snapsToMarksOnly() && step !== null && step > 0) {
      delta = clamp(Math.round(delta / step) * step, lowest, highest);
    }

    this.setValues(startValues.map((value) => this.snap(value + delta)));
  }

  /**
   * Converts a pointer position into a value using the **track's** own bounding rect, so the
   * result is a fraction along the rendered track rather than a raw viewport coordinate. The
   * track is the element the fill and the thumb offsets are positioned against, which is why
   * it - and not the padded control wrapper or the host - is the reference box. Unsnapped:
   * a track drag needs the raw delta.
   */
  private rawFromPointer(event: PointerEvent): number | undefined {
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

    fraction = clamp(fraction, 0, 1);
    return this.min() + fraction * (this.max() - this.min());
  }

  /** Perpendicular pixel distance from the pointer to the track (0 while over it). */
  private distanceFromTrack(event: PointerEvent): number {
    const rect = this.trackRef().nativeElement.getBoundingClientRect();
    if (this.orientation() === 'vertical') {
      return Math.max(rect.left - event.clientX, event.clientX - rect.right, 0);
    }
    return Math.max(rect.top - event.clientY, event.clientY - rect.bottom, 0);
  }

  private thumbIndexFromTarget(target: EventTarget | null): number | null {
    if (!(target instanceof Element)) {
      return null;
    }
    const thumb = target.closest('[data-slot="slider-thumb"]');
    if (!thumb || !this.elementRef.nativeElement.contains(thumb)) {
      return null;
    }
    const index = Number(thumb.getAttribute('data-index'));
    return Number.isInteger(index) ? index : null;
  }

  // Keyboard -----------------------------------------------------------------

  protected onKeydown(event: KeyboardEvent, index: number): void {
    if (this.isDisabled() || this.isThumbDisabled(index) || !this.keyboard()) {
      return;
    }

    if (
      (event.key === 'Delete' || event.key === 'Backspace') &&
      this.editable()
    ) {
      if (this.values().length <= this.minCount()) {
        return;
      }
      event.preventDefault();
      this.removeAt(index);
      this.commit();
      const remaining = this.values().length;
      if (remaining > 0) {
        const target = Math.min(index, remaining - 1);
        afterNextRender(() => this.focus(target), { injector: this.injector });
      }
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
      const target = clamp(nearest + Math.sign(delta), 0, values.length - 1);
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

    if (!this.isRange()) {
      return [this.snap(Number.isFinite(list[0]) ? list[0] : this.min())];
    }

    // A non-finite entry inherits its predecessor (or `min`), so `[NaN, 50]` reads as
    // `[min, 50]` and `[10, NaN]` as `[10, 10]`.
    const filled: number[] = [];
    list.forEach((value, index) => {
      filled.push(
        Number.isFinite(value) ? value : (filled[index - 1] ?? this.min()),
      );
    });

    let counted: number[];
    if (raw === undefined) {
      // No value at all (unbound, or a form reset to null): two handles at `min`, like
      // Ant Design - even when editable, within `maxCount`.
      counted = [this.min(), this.min()].slice(0, this.maxCount());
      while (counted.length < this.minCount()) {
        counted.push(this.min());
      }
    } else if (this.editable()) {
      counted = filled.slice(0, this.maxCount());
      while (counted.length < this.minCount()) {
        counted.push(counted[counted.length - 1] ?? this.min());
      }
    } else {
      counted = filled.length > 0 ? filled : [this.min()];
      if (counted.length === 1) {
        counted = [counted[0], counted[0]];
      }
    }

    return counted.map((value) => this.snap(value)).sort((a, b) => a - b);
  }

  /** Clamps to `[min, max]`, then snaps to the step grid (or to the nearest mark). */
  private snap(raw: number): number {
    const min = this.min();
    const max = this.max();
    const low = Math.min(min, max);
    const high = Math.max(min, max);
    let value = clamp(raw, low, high);

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
      value = clamp(value, low, high);
    }

    return roundTo(value, this.decimals());
  }

  private setValueAt(index: number, next: number): void {
    const current = this.values();
    const updated = [...current];
    // Neither handle may cross its neighbours.
    const floor = index > 0 ? updated[index - 1] : Number.NEGATIVE_INFINITY;
    const ceiling =
      index < updated.length - 1
        ? updated[index + 1]
        : Number.POSITIVE_INFINITY;
    updated[index] = clamp(this.snap(next), floor, ceiling);
    this.setValues(updated);
  }

  private removeAt(index: number): void {
    const updated = [...this.values()];
    updated.splice(index, 1);
    this.setValues(updated);
  }

  private setValues(updated: number[]): void {
    if (sameValues(updated, this.values())) {
      return;
    }

    this.values.set(updated);
    const published = this.publicValue(updated);
    // Also emits `valueChange`, which keeps `[(value)]` in sync.
    this.value.set(published);
    this.onChangeFn(published);
  }

  private commit(): void {
    this.onTouchedFn();
    this.valueCommit.emit(this.publicValue(this.values()));
  }

  private publicValue(values: readonly number[]): AndesSliderValue {
    return this.isRange() ? [...values] : values[0];
  }

  private isThumbDisabled(index: number): boolean {
    const disabled = this.disabled();
    return (
      this.isDisabled() || (Array.isArray(disabled) && disabled[index] === true)
    );
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

  /**
   * The enabled handle closest to `value`. Among handles stacked on the same value, the one
   * that can actually travel towards `value` wins.
   */
  private nearestIndex(value: number): number | null {
    const values = this.values();
    let best: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < values.length; index++) {
      if (this.isThumbDisabled(index)) {
        continue;
      }
      const candidate = values[index];
      const distance = Math.abs(candidate - value);
      if (distance < bestDistance) {
        best = index;
        bestDistance = distance;
      } else if (
        distance === bestDistance &&
        best !== null &&
        (candidate !== values[best] || value >= candidate)
      ) {
        // Equidistant between two handles: the higher one. Same stack: moving up, so the
        // last handle of the stack is the one that can move.
        best = index;
      }
    }

    return best;
  }
}
