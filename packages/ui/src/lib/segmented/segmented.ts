import { Directionality } from '@angular/cdk/bidi';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  TemplateRef,
  viewChildren,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import { AndesSegmentedOption } from './segmented-option';
import {
  ANDES_SEGMENTED,
  AndesSegmentedApi,
  AndesSegmentedChange,
  AndesSegmentedOptionConfig,
  AndesSegmentedOptionContext,
  AndesSegmentedOptionInput,
  AndesSegmentedShape,
  AndesSegmentedSize,
} from './segmented-types';

export type {
  AndesSegmentedChange,
  AndesSegmentedOptionConfig,
  AndesSegmentedOptionContext,
  AndesSegmentedOptionInput,
  AndesSegmentedShape,
  AndesSegmentedSize,
} from './segmented-types';

interface ThumbBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function noop(): void {
  /* replaced by registerOnChange/registerOnTouched */
}

/**
 * A single-choice control drawn as one pill of adjacent segments, with a thumb that slides to
 * the selected one. Semantically it is a radio group: `role="radiogroup"` containing
 * `role="radio"` buttons with a roving tab stop, so Tab reaches the selected segment and the
 * arrow keys (mirrored in right-to-left layouts) move and select, Home/End jump to the ends,
 * and disabled segments are skipped.
 *
 * Options come from the `options` input, from projected `<andes-segmented-option>` elements, or
 * both (generated ones first). The thumb is placed by measuring the selected segment, so it
 * follows any label width, font or `block`/`vertical` layout; it slides over 180ms and snaps
 * instantly under `prefers-reduced-motion`.
 *
 * Integrates with Angular forms (`[(ngModel)]`, `formControl`) and with `[(value)]`.
 */
@Component({
  selector: 'andes-segmented',
  imports: [AndesSegmentedOption, NgTemplateOutlet],
  templateUrl: './segmented.html',
  styleUrl: './segmented.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesSegmented),
      multi: true,
    },
    { provide: ANDES_SEGMENTED, useExisting: forwardRef(() => AndesSegmented) },
  ],
  host: {
    role: 'radiogroup',
    'data-slot': 'segmented',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-labelledby]': 'ariaLabelledby()',
    '[attr.aria-describedby]': 'ariaDescribedby()',
    '[attr.aria-invalid]': 'ariaInvalid() || null',
    '[attr.aria-required]': 'required() || null',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '[attr.data-size]': 'size()',
    '[attr.data-shape]': 'shape()',
    '[attr.data-orientation]': "vertical() ? 'vertical' : 'horizontal'",
    '[attr.data-block]': "block() ? '' : null",
    '[attr.data-disabled]': "isDisabled() ? '' : null",
    '[attr.data-thumb]': 'thumbState()',
    '(keydown)': 'onKeydown($event)',
    '(focusout)': 'onFocusOut($event)',
  },
})
export class AndesSegmented<T = unknown>
  implements ControlValueAccessor, AndesSegmentedApi
{
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly directionality = inject(Directionality);
  private readonly destroyRef = inject(DestroyRef);

  /** Selected value. Two-way bindable (`[(value)]`) and driven by Angular forms. */
  readonly value = model<T | null>(null);
  /** Generated options; strings and numbers are shorthand for `{ label, value }`. */
  readonly options = input<readonly AndesSegmentedOptionInput<T>[]>([]);
  /** Custom content for generated options; receives the option as `let-option`. */
  readonly optionLabel = input<
    TemplateRef<AndesSegmentedOptionContext<T>> | undefined
  >(undefined);
  readonly size = input<AndesSegmentedSize>('md');
  readonly shape = input<AndesSegmentedShape>('default');
  /** Stretch to the container's width, giving every segment an equal share. */
  readonly block = input(false, { transform: booleanAttribute });
  /** Stack the segments top to bottom. */
  readonly vertical = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  /** Submitted with a native form as a hidden input of this name. */
  readonly name = input<string | undefined>(undefined);
  /** Decides whether two values are the same choice; defaults to `Object.is`. */
  readonly compareWith = input<(a: T | null, b: T | null) => boolean>(
    Object.is,
  );
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

  /** Fires when the user selects a segment (click, Space/Enter or arrow keys), not for
   *  programmatic writes. Not named `change` so it cannot collide with the native event. */
  readonly selectionChange = output<AndesSegmentedChange<T>>();

  private readonly cvaDisabled = signal(false);
  private onChange: (value: T | null) => void = noop;
  private onTouched: () => void = noop;

  protected readonly normalizedOptions = computed<
    AndesSegmentedOptionConfig<T>[]
  >(() =>
    this.options().map((option) =>
      typeof option === 'object' && option !== null
        ? (option as AndesSegmentedOptionConfig<T>)
        : { label: String(option), value: option as T },
    ),
  );

  private readonly viewOptions = viewChildren(AndesSegmentedOption);
  private readonly contentOptions = contentChildren(AndesSegmentedOption, {
    descendants: true,
  });
  /** Every option in DOM order: generated ones, then projected ones. */
  protected readonly allOptions = computed(
    () =>
      [
        ...this.viewOptions(),
        ...this.contentOptions(),
      ] as AndesSegmentedOption<T>[],
  );

  readonly isDisabled = computed(() => this.disabled() || this.cvaDisabled());

  readonly isChecked = (value: unknown): boolean =>
    this.compareWith()(this.value(), value as T) && this.value() !== null;

  private readonly checkedOption = computed(
    () =>
      this.allOptions().find((option) => this.isChecked(option.value())) ??
      null,
  );

  readonly tabbable = computed<unknown>(() => {
    const enabled = this.allOptions().filter((option) => !option.isDisabled());
    const checked = this.checkedOption();
    return checked && !checked.isDisabled() ? checked : (enabled[0] ?? null);
  });

  protected readonly thumb = signal<ThumbBox | null>(null);
  private readonly thumbReady = signal(false);
  protected readonly thumbState = computed(() =>
    this.thumbReady() ? 'ready' : 'pending',
  );
  protected readonly thumbStyle = computed(() => {
    const box = this.thumb();
    return box
      ? {
          width: `${box.width}px`,
          height: `${box.height}px`,
          transform: `translate(${box.x}px, ${box.y}px)`,
        }
      : null;
  });

  private observer: ResizeObserver | undefined;
  private readyTimer: ReturnType<typeof setTimeout> | undefined;

  constructor() {
    afterRenderEffect(() => {
      // Re-measure whenever anything that can move the selected segment changes.
      this.checkedOption();
      const options = this.allOptions();
      this.size();
      this.shape();
      this.vertical();
      this.block();
      this.measureThumb();
      this.observeSizes(options);
    });

    this.destroyRef.onDestroy(() => {
      this.observer?.disconnect();
      clearTimeout(this.readyTimer);
    });
    // Web fonts change label widths after the first measurement.
    afterNextRender(() => {
      void this.host.nativeElement.ownerDocument.fonts?.ready.then(() =>
        this.measureThumb(),
      );
    });
  }

  /** Focus the selected segment, or the first enabled one. */
  focus(options?: FocusOptions): void {
    (this.tabbable() as AndesSegmentedOption<T> | null)?.focus(options);
  }

  select(value: unknown, event: Event): void {
    if (this.isDisabled()) {
      return;
    }
    const next = value as T;
    const changed = !this.isChecked(next);
    this.value.set(next);
    if (changed) {
      this.onChange(next);
      this.selectionChange.emit({ value: next, event });
    }
    this.onTouched();
  }

  writeValue(value: T | null): void {
    this.value.set(value);
  }

  registerOnChange(fn: (value: T | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }

  protected serialize(value: T | null): string {
    return value === null || value === undefined ? '' : String(value);
  }

  protected onFocusOut(event: FocusEvent): void {
    const next = event.relatedTarget as Node | null;
    if (!next || !this.host.nativeElement.contains(next)) {
      this.onTouched();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled() || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const enabled = this.allOptions().filter((option) => !option.isDisabled());
    const current = enabled.findIndex((option) =>
      option.element.contains(event.target as Node),
    );
    if (current === -1) {
      return;
    }
    const rtl = this.directionality.value === 'rtl';
    const forward = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backward = rtl ? 'ArrowRight' : 'ArrowLeft';
    let target: number;
    switch (event.key) {
      case 'ArrowDown':
      case forward:
        target = (current + 1) % enabled.length;
        break;
      case 'ArrowUp':
      case backward:
        target = (current - 1 + enabled.length) % enabled.length;
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = enabled.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const option = enabled[target];
    option.focus();
    this.select(option.value(), event);
  }

  /** Re-places the thumb when the group or any segment is resized (window, font, content). */
  private observeSizes(options: readonly AndesSegmentedOption<T>[]): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.observer ??= new ResizeObserver(() => this.measureThumb());
    this.observer.disconnect();
    this.observer.observe(this.host.nativeElement);
    for (const option of options) {
      this.observer.observe(option.element);
    }
  }

  private measureThumb(): void {
    const selected = this.checkedOption();
    if (!selected) {
      this.thumb.set(null);
      return;
    }
    const element = selected.element;
    const next: ThumbBox = {
      x: element.offsetLeft,
      y: element.offsetTop,
      width: element.offsetWidth,
      height: element.offsetHeight,
    };
    const previous = this.thumb();
    if (
      !previous ||
      previous.x !== next.x ||
      previous.y !== next.y ||
      previous.width !== next.width ||
      previous.height !== next.height
    ) {
      this.thumb.set(next);
    }
    if (!this.thumbReady() && next.width > 0 && this.readyTimer === undefined) {
      // Enable the slide only after the first placement has been painted, so the thumb never
      // glides in from 0,0. A timer rather than a frame callback: those pause in hidden tabs.
      this.readyTimer = setTimeout(() => this.thumbReady.set(true), 32);
    }
  }
}
