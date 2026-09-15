import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import clsx from 'clsx';

import { AndesRadioGroupState } from './radio-group-state';

export type AndesRadioGroupOrientation = 'vertical' | 'horizontal';

@Component({
  selector: 'andes-radio-group',
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
    '[attr.data-orientation]': 'orientation()',
  },
})
export class AndesRadioGroup implements ControlValueAccessor {
  private readonly state = inject(AndesRadioGroupState);

  readonly name = input<string | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly orientation = input<AndesRadioGroupOrientation>('vertical');
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });

  /** Set via `setDisabledState()` when bound through `[formControl]`/`[(ngModel)]` and the
   *  control itself is disabled - distinct from the `disabled` input, which is the group's own
   *  template-authored disabled state. Either one disables the whole group. */
  private readonly cvaDisabled = signal(false);

  protected readonly isDisabled = computed(
    () => this.disabled() || this.cvaDisabled(),
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-radio-group',
      `andes-radio-group--${this.orientation()}`,
      this.isDisabled() && 'andes-radio-group--disabled',
    ),
  );

  constructor() {
    effect(() => this.state.setName(this.name()));
    effect(() => this.state.setDisabled(this.isDisabled()));
    effect(() => this.state.setRequired(this.required()));
  }

  writeValue(value: string | null): void {
    this.state.setValue(value);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.state.registerOnChange(fn);
  }

  registerOnTouched(fn: () => void): void {
    this.state.registerOnTouched(fn);
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }
}
