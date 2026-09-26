import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { AndesSelectState, type AndesSelectLabelContext } from './select-state';

/**
 * The selected option's text inside the trigger, or the placeholder while nothing is
 * selected. In `multiple`/`tags` mode the selection is rendered as tags instead, so this
 * only ever shows the placeholder there.
 *
 * A value that no option carries - a stale value, or one whose option has not loaded
 * yet - is rendered by the select's `displayWith` input, and stringified if there is
 * none. The select's `labelTemplate` replaces the text entirely.
 */
@Component({
  selector: 'andes-select-value',
  imports: [NgTemplateOutlet],
  template: `@if (labelContext(); as context) {
      <ng-container
        [ngTemplateOutlet]="select.labelTemplate() ?? null"
        [ngTemplateOutletContext]="context"
      />
    } @else {
      {{ text() }}
    }`,
  styleUrl: './select-value.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'select-value',
    '[attr.data-placeholder]': 'select.displayLabel() === null ? "" : null',
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

  protected readonly labelContext = computed<AndesSelectLabelContext | null>(
    () => {
      const label = this.select.displayLabel();
      if (!this.select.labelTemplate() || label === null) {
        return null;
      }
      return { $implicit: { value: this.select.rawValue(), label } };
    },
  );
}
