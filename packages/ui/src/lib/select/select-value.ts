import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { AndesSelectState } from './select-state';

/**
 * The selected option's text inside the trigger, or the placeholder while nothing is
 * selected.
 *
 * A value that no option carries - a stale value, or one whose option has not loaded
 * yet - is rendered by the select's `displayWith` input, and stringified if there is
 * none.
 */
@Component({
  selector: 'andes-select-value',
  template: `{{ text() }}`,
  styleUrl: './select-value.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'select-value',
    '[attr.data-placeholder]': 'select.hasValue() ? null : ""',
  },
})
export class AndesSelectValue {
  protected readonly select = inject(AndesSelectState);

  /** Overrides the select's own `placeholder` for this instance. */
  readonly placeholder = input<string | undefined>(undefined);

  protected readonly text = computed(
    () =>
      this.select.displayLabel() ??
      this.placeholder() ??
      this.select.placeholder(),
  );
}
