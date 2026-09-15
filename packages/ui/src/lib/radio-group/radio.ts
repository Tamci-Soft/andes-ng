import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import clsx from 'clsx';

import { AndesRadioGroupState } from './radio-group-state';

let nextRadioId = 0;

@Component({
  selector: 'andes-radio',
  templateUrl: './radio.html',
  styleUrl: './radio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.data-checked]': 'isChecked() ? "" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    // Forwarded to the real native radio input in the template instead - a screen reader
    // never sees this non-interactive host element, so leaving these here would do nothing.
    '[attr.aria-label]': 'null',
    '[attr.aria-describedby]': 'null',
  },
})
export class AndesRadio {
  private readonly state = inject(AndesRadioGroupState);
  private readonly generatedId = `andes-radio-${++nextRadioId}`;

  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly id = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaDescribedby = input<string | undefined>(undefined, {
    alias: 'aria-describedby',
  });

  protected readonly inputId = computed(() => this.id() ?? this.generatedId);
  protected readonly name = this.state.name;
  protected readonly required = this.state.required;

  protected readonly isChecked = computed(
    () => this.state.value() === this.value(),
  );
  protected readonly isDisabled = computed(
    () => this.disabled() || this.state.disabled(),
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-radio',
      this.isChecked() && 'andes-radio--checked',
      this.isDisabled() && 'andes-radio--disabled',
    ),
  );

  protected onChange(event: Event): void {
    if ((event.target as HTMLInputElement).checked) {
      this.state.selectFromItem(this.value());
    }
  }
}
