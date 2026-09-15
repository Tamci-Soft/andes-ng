import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import clsx from 'clsx';

import { AndesCheckboxGroupState } from './checkbox-group-state';

export type AndesCheckboxGroupOrientation = 'vertical' | 'horizontal';

/**
 * Coordinates the checked state of the `AndesCheckbox` items projected into it, exposing the
 * selection as one array of item values.
 *
 * ```html
 * <andes-checkbox-group [(value)]="fruits" aria-label="Fruits">
 *   <andes-checkbox andesSelectAll>Select all</andes-checkbox>
 *   <andes-checkbox value="apple">Apple</andes-checkbox>
 *   <andes-checkbox value="banana">Banana</andes-checkbox>
 * </andes-checkbox-group>
 * ```
 *
 * Items are discovered through DI (see `AndesCheckboxGroupState`), not a `contentChildren()`
 * query, so they can sit at any depth inside the group - wrapped in `@for`, a `<fieldset>`, or
 * any other component - and still participate.
 */
@Component({
  selector: 'andes-checkbox-group',
  templateUrl: './checkbox-group.html',
  styleUrl: './checkbox-group.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    AndesCheckboxGroupState,
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesCheckboxGroup),
      multi: true,
    },
  ],
  host: {
    // `role="group"` rather than the ARIA pattern's `group`-less default: a set of related
    // checkboxes is a group, not a `radiogroup`, and the accessible name below is what makes
    // the relationship announced at all.
    role: 'group',
    '[class]': 'classes()',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.aria-labelledby]': 'ariaLabelledby()',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-orientation]': 'orientation()',
  },
})
export class AndesCheckboxGroup implements ControlValueAccessor {
  private readonly state = inject(AndesCheckboxGroupState);

  /**
   * Two-way selection surface (`model()` auto-generates `valueChange`, enabling
   * `[(value)]`), and simultaneously the value this control reports to Angular forms. It is
   * deliberately the SAME signal for both: `AndesCheckbox` learned the hard way (see the long
   * note on its own `checked` model) that a separate "internal" copy of a controlled value can
   * diverge from the parent's after a click and then never recover, because a parent
   * re-asserting a value the reactive graph never saw change is an unobservable no-op write.
   */
  readonly value = model<readonly string[]>([]);

  readonly disabled = input(false, { transform: booleanAttribute });
  readonly orientation = input<AndesCheckboxGroupOrientation>('vertical');
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });

  /** Set through `setDisabledState()` by `[formControl]`/`[(ngModel)]`; distinct from the
   *  `disabled` input, which is the group's own template-authored state. Either disables the
   *  whole group (and, through the shared state, every item in it). */
  private readonly cvaDisabled = signal(false);

  protected readonly isDisabled = computed(
    () => this.disabled() || this.cvaDisabled(),
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-checkbox-group',
      `andes-checkbox-group--${this.orientation()}`,
      this.isDisabled() && 'andes-checkbox-group--disabled',
    ),
  );

  private onChange: (value: readonly string[]) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  constructor() {
    effect(() => this.state.setDisabled(this.isDisabled()));

    // Parent -> state. `setValue` normalizes (dedupes and reorders) the array, so writing the
    // normalized result back into the model below cannot loop: the effect re-runs once, hands
    // `setValue` an already-normalized array, and the resulting `set` is a no-op.
    effect(() => this.state.setValue(this.value()));

    // State -> parent, for USER-driven changes only. One handler feeds both the two-way
    // binding and Angular forms, so `[(value)]` and `[formControl]` can never disagree.
    this.state.registerOnUserChange((next) => {
      this.value.set(next);
      this.onChange(next);
      this.onTouched();
    });
  }

  writeValue(value: readonly string[] | null): void {
    this.value.set(value ?? []);
  }

  registerOnChange(fn: (value: readonly string[]) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }
}
