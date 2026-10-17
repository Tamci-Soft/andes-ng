import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  input,
} from '@angular/core';

import { AndesInput } from './input';
import { AndesInputPassword } from './input-password';
import { AndesInputSearch } from './input-search';

/**
 * Lays inputs, buttons and other controls out as one attached row: neighbours share a single
 * border and only the outer corners stay rounded - e.g. a currency picker, an amount field and
 * a "Convert" button reading as one control. Give the fields the same `size`; buttons next to
 * a field stretch to the field's height, so they line up whatever their own size.
 *
 * The host is the `role="group"` element, so `aria-label` / `aria-labelledby` set on it name
 * the whole row.
 */
@Component({
  selector: 'andes-input-group',
  template: '<ng-content />',
  styleUrl: './input-group.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    class: 'andes-input-compact',
    '[class.andes-input-compact--block]': 'block()',
    '[class.andes-input-compact--fields]': 'hasFields()',
  },
})
export class AndesInputGroup {
  /** Stretches the row to its container's width; the fields share the room the buttons leave. */
  readonly block = input(false, { transform: booleanAttribute });

  private readonly inputs = contentChildren(AndesInput);
  private readonly passwords = contentChildren(AndesInputPassword);
  private readonly searches = contentChildren(AndesInputSearch);

  /** A text field sets the row's height; buttons only stretch to it when there is one. */
  protected readonly hasFields = computed(
    () =>
      this.inputs().length + this.passwords().length + this.searches().length >
      0,
  );
}
