import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  TemplateRef,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import clsx from 'clsx';

import { AndesRadio } from './radio';
import {
  AndesRadioButtonStyle,
  AndesRadioGroupOrientation,
  AndesRadioGroupState,
  AndesRadioLabelPlacement,
  AndesRadioOptionType,
  AndesRadioSize,
} from './radio-group-state';

export type {
  AndesRadioButtonStyle,
  AndesRadioGroupOrientation,
  AndesRadioLabelPlacement,
  AndesRadioOptionType,
  AndesRadioSize,
} from './radio-group-state';

/** One entry of `AndesRadioGroup`'s `options` input. */
export interface AndesRadioOption<T = unknown> {
  label: string;
  value: T;
  disabled?: boolean;
  /** Native tooltip on the rendered item. */
  title?: string;
  /** `id` of the rendered native `<input type="radio">`. */
  id?: string;
}

/** A bare string/number is shorthand for `{ label: String(value), value }`. */
export type AndesRadioOptionInput<T = unknown> =
  AndesRadioOption<T> | (T & string) | (T & number);

/** Context of the `optionLabel` template - `let-option` is the normalized option. */
export interface AndesRadioOptionLabelContext<T = unknown> {
  $implicit: AndesRadioOption<T>;
  checked: boolean;
  index: number;
}

/** Payload of the group's `(selectionChange)` output - emitted only for user selections, never for
 *  programmatic writes (`[value]`, `writeValue()`). */
export interface AndesRadioChange<T = unknown> {
  value: T;
  /** The native `change` event of the `<input type="radio">` the user selected. */
  event: Event;
}

let nextGroupId = 0;

function noop(): void {
  /* no-op default until registerOnChange/registerOnTouched is called by Angular forms */
}

@Component({
  selector: 'andes-radio-group',
  imports: [AndesRadio, NgTemplateOutlet],
  templateUrl: './radio-group.html',
  styleUrl: './radio-group.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    AndesRadioGroupState,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesRadioGroup),
      multi: true,
    },
  ],
  host: {
    role: 'radiogroup',
    '[class]': 'classes()',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-labelledby]': 'ariaLabelledby()',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '[attr.aria-required]': 'required() || null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-orientation]': 'resolvedOrientation()',
    '[attr.data-option-type]': 'optionType()',
    '(focusout)': 'onTouched()',
  },
})
export class AndesRadioGroup<T = unknown> implements ControlValueAccessor {
  private readonly state = inject(AndesRadioGroupState);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly generatedName = `andes-radio-group-${++nextGroupId}`;

  /** Selected value. Two-way bindable (`[(value)]`); also driven by `[formControl]`/
   *  `[(ngModel)]` through the ControlValueAccessor. A one-way `[value]` that never changes
   *  only seeds the initial selection - use `[(value)]` to keep the parent in sync. */
  readonly value = model<T | null>(null);
  readonly name = input<string | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  /** Defaults to `horizontal` for `optionType="button"` (a segmented control) and to
   *  `vertical` for the classic style. */
  readonly orientation = input<AndesRadioGroupOrientation | undefined>(
    undefined,
  );
  /** Generate the items from data instead of (or in addition to, rendered before)
   *  projected `<andes-radio>` children. */
  readonly options = input<readonly AndesRadioOptionInput<T>[]>([]);
  /** Custom label for every generated option; receives the option as `let-option`. */
  readonly optionLabel = input<
    TemplateRef<AndesRadioOptionLabelContext<T>> | undefined
  >(undefined);
  readonly optionType = input<AndesRadioOptionType>('default');
  readonly buttonStyle = input<AndesRadioButtonStyle>('outline');
  readonly size = input<AndesRadioSize>('md');
  /** Stretch the group to its container's width, sharing it equally between the items. */
  readonly block = input(false, { transform: booleanAttribute });
  readonly labelPlacement = input<AndesRadioLabelPlacement>('end');
  /** Focus the checked item (or the first enabled one) once the group first renders. */
  readonly autoFocus = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });

  /** Fires only when the user selects an item (click, Space or arrow keys) - not for
   *  programmatic writes. Named `selectionChange` rather than `change` because a `change`
   *  output would collide with the native `change` event bubbling up from the inner
   *  `<input type="radio">` (Angular binds `(change)` to both). */
  readonly selectionChange = output<AndesRadioChange<T>>();

  /** Set via `setDisabledState()` when bound through `[formControl]`/`[(ngModel)]` and the
   *  control itself is disabled - distinct from the `disabled` input, which is the group's own
   *  template-authored disabled state. Either one disables the whole group. */
  private readonly cvaDisabled = signal(false);

  private onChange: (value: T | null) => void = noop;
  protected onTouched: () => void = noop;

  protected readonly isDisabled = computed(
    () => this.disabled() || this.cvaDisabled(),
  );

  protected readonly resolvedName = computed(
    () => this.name() || this.generatedName,
  );

  protected readonly resolvedOrientation = computed<AndesRadioGroupOrientation>(
    () =>
      this.orientation() ??
      (this.optionType() === 'button' ? 'horizontal' : 'vertical'),
  );

  protected readonly normalizedOptions = computed<AndesRadioOption<T>[]>(() =>
    this.options().map((option) =>
      typeof option === 'object' && option !== null
        ? (option as AndesRadioOption<T>)
        : { label: String(option), value: option as T },
    ),
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-radio-group',
      `andes-radio-group--${this.resolvedOrientation()}`,
      this.optionType() === 'button' && 'andes-radio-group--button',
      this.block() && 'andes-radio-group--block',
      this.isDisabled() && 'andes-radio-group--disabled',
    ),
  );

  constructor() {
    this.state.connect({
      name: this.resolvedName,
      value: this.value,
      disabled: this.isDisabled,
      required: this.required,
      optionType: this.optionType,
      buttonStyle: this.buttonStyle,
      size: this.size,
      orientation: this.resolvedOrientation,
      block: this.block,
      labelPlacement: this.labelPlacement,
      select: (value, event) => this.select(value as T, event),
    });

    afterNextRender(() => {
      if (this.autoFocus()) {
        this.focus();
      }
    });
  }

  /** Focus the checked item, or the first enabled one when nothing is checked yet - the
   *  same item a Tab key press would land on. */
  focus(options?: FocusOptions): void {
    const host = this.host.nativeElement;
    const target =
      host.querySelector<HTMLInputElement>(
        'input[type=radio]:checked:not(:disabled)',
      ) ??
      host.querySelector<HTMLInputElement>('input[type=radio]:not(:disabled)');
    target?.focus(options);
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

  private select(value: T, event: Event): void {
    if (this.isDisabled()) {
      return;
    }
    this.value.set(value);
    this.onChange(value);
    this.onTouched();
    this.selectionChange.emit({ value, event });
  }
}
