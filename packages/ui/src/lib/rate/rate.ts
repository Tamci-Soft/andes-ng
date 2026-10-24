import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  numberAttribute,
  output,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import {
  AndesRateCharacter,
  AndesRateCharacterContext,
} from './rate-character';

export type AndesRateSizePreset = 'sm' | 'md' | 'lg';
/** A preset, or a custom number of pixels / CSS length. */
export type AndesRateSize = AndesRateSizePreset | number | string;
/** A character to draw: text (an emoji, a letter), a template, or a function of the position. */
export type AndesRateCharacterInput =
  string | TemplateRef<AndesRateCharacterContext> | ((index: number) => string);

const SIZE_PRESETS: Record<AndesRateSizePreset, number> = {
  sm: 16,
  md: 20,
  lg: 28,
};

const EPSILON = 1e-9;

function normalizeValue(value: unknown, count: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.min(count, Math.max(0, parsed));
}

/**
 * A star rating: click, hover-preview and keyboard, with whole or half steps and partial fill
 * for read-only averages (a value of 3.7 fills 70% of the fourth star).
 *
 * The control is one `role="slider"` (0 to `count`), so assistive technology reads "3 of 5" or
 * a tooltip text instead of five unlabeled graphics. Arrow keys move by one (half with
 * `allowHalf`), Home / End jump to 0 / `count`, and a digit key sets that number. Left / Right
 * follow the reading direction, so they flip in right-to-left layouts, where the fill also
 * starts from the right.
 *
 * Works with `ngModel` and reactive forms, and inside `andes-form-field`.
 *
 * Styling hooks: `--andes-rate-color` (filled), `--andes-rate-empty-color`,
 * `--andes-rate-size`, `--andes-rate-gap`. `color` sets the filled colour from a binding.
 */
@Component({
  selector: 'andes-rate',
  imports: [NgTemplateOutlet],
  templateUrl: './rate.html',
  styleUrl: './rate.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesRate),
      multi: true,
    },
  ],
  host: {
    '[attr.data-slot]': '"rate"',
    '[attr.data-size]': 'presetSize()',
    '[attr.data-readonly]': 'readonly() ? "" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[style.--andes-rate-size]': 'cssSize()',
    '[style.--andes-rate-color]': 'color() ?? null',
    // Every ARIA attribute and the id belong to the inner slider, not this wrapper.
    '[attr.id]': 'null',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
  },
})
export class AndesRate implements ControlValueAccessor {
  private readonly hostRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly slider =
    viewChild.required<ElementRef<HTMLElement>>('slider');

  protected readonly customCharacter = contentChild(AndesRateCharacter);

  /** Two-way bindable with `[(value)]`; also works through `ngModel` / `formControl`. */
  readonly value = model(0);
  /** Number of characters. */
  readonly count = input(5, { transform: numberAttribute });
  /** Let the pointer and the arrow keys select half characters. */
  readonly allowHalf = input(false, { transform: booleanAttribute });
  /** Clicking the character that already matches the value clears it to 0. */
  readonly allowClear = input(true, { transform: booleanAttribute });
  /** Shows the value without letting the user change it; stays focusable and readable. */
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  /** `sm` 16px, `md` 20px (default), `lg` 28px, a pixel number, or a CSS length. */
  readonly size = input<AndesRateSize>('md');
  /**
   * Draws something other than the star: text (an emoji, a letter), a template, or a function
   * returning text for a position. An `<ng-template andesRateCharacter>` child works too.
   */
  readonly character = input<AndesRateCharacterInput | undefined>(undefined);
  /** One text per character, shown in a bubble on hover/focus and used as the spoken value. */
  readonly tooltips = input<readonly string[]>([]);
  /** The filled colour (any CSS colour); `--andes-rate-color` does the same from CSS. */
  readonly color = input<string | undefined>(undefined);
  /** Formats the spoken value (`aria-valuetext`); defaults to the tooltip text or "3 of 5". */
  readonly valueFormatter = input<
    ((value: number, count: number) => string) | undefined
  >(undefined);
  readonly id = input<string | undefined>(undefined);
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

  /** The value the pointer is previewing, or `undefined` when it leaves. */
  readonly hoverChange = output<number | undefined>();
  readonly focused = output<FocusEvent>();
  readonly blurred = output<FocusEvent>();

  private readonly cvaDisabled = signal(false);
  private readonly hoverValue = signal<number | undefined>(undefined);
  private readonly focusVisible = signal(false);
  private onChangeFn: (value: number) => void = () => undefined;
  private onTouchedFn: () => void = () => undefined;

  protected readonly isDisabled = computed(
    () => this.disabled() || this.cvaDisabled(),
  );
  protected readonly interactive = computed(
    () => !this.isDisabled() && !this.readonly(),
  );
  protected readonly total = computed(() =>
    Math.max(0, Math.floor(this.count())),
  );
  protected readonly stars = computed(() =>
    Array.from({ length: this.total() }, (_, index) => index),
  );
  protected readonly current = computed(() =>
    normalizeValue(this.value(), this.total()),
  );
  /** What is drawn: the hover preview while the pointer is over the stars, else the value. */
  protected readonly shown = computed(
    () => this.hoverValue() ?? this.current(),
  );

  protected readonly presetSize = computed(() => {
    const size = this.size();
    return size === 'sm' || size === 'md' || size === 'lg' ? size : null;
  });

  protected readonly cssSize = computed(() => {
    const size = this.size();
    if (typeof size === 'number') {
      return Number.isFinite(size) && size > 0 ? `${size}px` : null;
    }
    if (this.presetSize()) {
      return `${SIZE_PRESETS[size as AndesRateSizePreset]}px`;
    }
    const trimmed = size.trim();
    return /^\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed || null;
  });

  protected readonly valueText = computed(() => {
    const value = this.current();
    const formatter = this.valueFormatter();
    if (formatter) {
      return formatter(value, this.total());
    }
    const tooltip = value > 0 ? this.tooltips()[Math.ceil(value) - 1] : '';
    return tooltip || `${value} of ${this.total()}`;
  });

  /** Index of the character whose bubble shows: hovered, or the focused one for keyboard users. */
  private readonly tipIndex = computed(() => {
    const hover = this.hoverValue();
    if (hover !== undefined) {
      return hover > 0 ? Math.ceil(hover) - 1 : -1;
    }
    if (this.focusVisible()) {
      const value = this.current();
      return value > 0 ? Math.ceil(value) - 1 : -1;
    }
    return -1;
  });

  protected readonly template = computed(() => {
    const character = this.character();
    return character instanceof TemplateRef
      ? character
      : (this.customCharacter()?.templateRef ?? null);
  });

  protected readonly step = computed(() => (this.allowHalf() ? 0.5 : 1));

  // --- Template helpers ------------------------------------------------------------------------

  /** Fraction (0-1) of a character's box that is filled. */
  protected fill(index: number): number {
    return Math.min(1, Math.max(0, this.shown() - index));
  }

  /** `fill` as a percentage, rounded so float noise (3.7 - 3) never leaks into the style. */
  protected fillPercent(index: number): number {
    return Math.round(this.fill(index) * 10000) / 100;
  }

  protected text(index: number): string | null {
    const character = this.character();
    if (typeof character === 'string') {
      return character;
    }
    if (typeof character === 'function') {
      return character(index);
    }
    return null;
  }

  protected tip(index: number): string | null {
    return this.tipIndex() === index ? (this.tooltips()[index] ?? null) : null;
  }

  protected context(index: number, filled: boolean): AndesRateCharacterContext {
    return {
      $implicit: index,
      index,
      fill: this.fill(index),
      filled,
    };
  }

  // --- Public API ------------------------------------------------------------------------------

  focus(options?: FocusOptions): void {
    if (!this.isDisabled()) {
      this.slider().nativeElement.focus(options);
    }
  }

  blur(): void {
    this.slider().nativeElement.blur();
  }

  // --- ControlValueAccessor --------------------------------------------------------------------

  writeValue(value: unknown): void {
    this.value.set(normalizeValue(value, this.total()));
  }

  registerOnChange(fn: (value: number) => void): void {
    this.onChangeFn = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedFn = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }

  // --- Pointer ---------------------------------------------------------------------------------

  private isRtl(): boolean {
    const element = this.hostRef.nativeElement;
    return (
      getComputedStyle(element).direction === 'rtl' ||
      element.closest('[dir]')?.getAttribute('dir') === 'rtl'
    );
  }

  /** The character under the pointer, found from the event target (one listener for all). */
  private starAt(
    event: MouseEvent,
  ): { readonly element: HTMLElement; readonly index: number } | null {
    const element = (event.target as Element | null)?.closest<HTMLElement>(
      '.andes-rate__star',
    );
    const index = Number(element?.dataset['index']);
    return element && Number.isInteger(index) ? { element, index } : null;
  }

  /** The value under the pointer: half a character when `allowHalf` and on the first half. */
  private valueAt(event: MouseEvent, star: HTMLElement, index: number): number {
    if (!this.allowHalf()) {
      return index + 1;
    }
    const rect = star.getBoundingClientRect();
    if (rect.width === 0) {
      return index + 1;
    }
    const offset = this.isRtl()
      ? rect.right - event.clientX
      : event.clientX - rect.left;
    return offset < rect.width / 2 ? index + 0.5 : index + 1;
  }

  protected onPointerMove(event: MouseEvent): void {
    // Touch has no hover: a tap commits directly through `click`.
    const star = this.starAt(event);
    if (
      !star ||
      !this.interactive() ||
      (event as PointerEvent).pointerType === 'touch'
    ) {
      return;
    }
    this.setHover(this.valueAt(event, star.element, star.index));
  }

  protected onPointerLeave(): void {
    this.setHover(undefined);
  }

  private setHover(value: number | undefined): void {
    if (this.hoverValue() === value) {
      return;
    }
    this.hoverValue.set(value);
    this.hoverChange.emit(value);
  }

  protected onClick(event: MouseEvent): void {
    const star = this.starAt(event);
    if (!star || !this.interactive()) {
      return;
    }
    const next = this.valueAt(event, star.element, star.index);
    if (this.allowClear() && next === this.current()) {
      // Cleared stars must not stay lit by the preview while the pointer is still over them.
      this.setHover(undefined);
      this.commit(0);
      return;
    }
    this.commit(next);
  }

  // --- Keyboard --------------------------------------------------------------------------------

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.interactive() || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const step = this.step();
    const value = this.current();
    const total = this.total();
    const rtl = this.isRtl();
    let next: number | undefined;

    switch (event.key) {
      case 'ArrowUp':
      case rtl ? 'ArrowLeft' : 'ArrowRight':
        next = Math.min(total, (Math.floor(value / step + EPSILON) + 1) * step);
        break;
      case 'ArrowDown':
      case rtl ? 'ArrowRight' : 'ArrowLeft':
        next = Math.max(0, (Math.ceil(value / step - EPSILON) - 1) * step);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = total;
        break;
      default:
        if (/^[0-9]$/.test(event.key) && Number(event.key) <= total) {
          next = Number(event.key);
        }
    }

    if (next === undefined) {
      return;
    }
    event.preventDefault();
    this.commit(next);
  }

  private commit(next: number): void {
    if (next !== this.current()) {
      this.value.set(next);
      this.onChangeFn(next);
    }
  }

  // --- Focus -----------------------------------------------------------------------------------

  protected onFocus(event: FocusEvent): void {
    try {
      this.focusVisible.set(
        (event.target as HTMLElement).matches(':focus-visible'),
      );
    } catch {
      this.focusVisible.set(true);
    }
    this.focused.emit(event);
  }

  protected onBlur(event: FocusEvent): void {
    this.focusVisible.set(false);
    this.onTouchedFn();
    this.blurred.emit(event);
  }
}
