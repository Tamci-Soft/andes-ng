import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  input,
} from '@angular/core';

import { AndesInput } from './input';
import type { AndesInputBase, AndesInputSize } from './input-base';
import { AndesInputPassword } from './input-password';
import { AndesInputSearch } from './input-search';

/**
 * Lays inputs, buttons and other controls out as one attached row: neighbours share a single
 * border and only the outer corners stay rounded - e.g. a currency picker, an amount field and
 * a "Convert" button reading as one control. Give the fields the same `size`; buttons next to
 * a field stretch to the field's height, so they line up whatever their own size.
 *
 * The host is the `role="group"` element, so `aria-label` / `aria-labelledby` set on it name
 * the whole row. The row is one control: hovering any part tints its outline and focusing any
 * part draws one focus border and ring around the whole row, instead of each child drawing its
 * own. The ring takes the status of the part that has focus (error or warning, including a value
 * past `countMax`) and the primary colour when that part has none, so a valid field beside one
 * in error keeps the normal ring. A focused button gets a 2px inset mark on keyboard focus.
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
    '[class.andes-input-compact--sm]': 'fieldSize() === "sm"',
    '[class.andes-input-compact--lg]': 'fieldSize() === "lg"',
    '[class.andes-input-compact--invalid]': 'hasInvalid()',
    '[class.andes-input-compact--warning]': 'hasWarning()',
  },
})
export class AndesInputGroup {
  /** Stretches the row to its container's width; the fields share the room the buttons leave. */
  readonly block = input(false, { transform: booleanAttribute });

  private readonly inputs = contentChildren(AndesInput);
  private readonly passwords = contentChildren(AndesInputPassword);
  private readonly searches = contentChildren(AndesInputSearch);

  private readonly fields = computed<readonly AndesInputBase[]>(() => [
    ...this.inputs(),
    ...this.passwords(),
    ...this.searches(),
  ]);

  /** A text field sets the row's height; buttons only stretch to it when there is one. */
  protected readonly hasFields = computed(() => this.fields().length > 0);

  /** The fields' common size, which sets the row's corner radius; `md` when they differ. */
  protected readonly fieldSize = computed<AndesInputSize>(() => {
    const sizes = new Set(this.fields().map((field) => field.size()));
    return sizes.size === 1 ? [...sizes][0] : 'md';
  });

  protected readonly hasInvalid = computed(() =>
    this.fields().some(
      (field) => field.status() === 'error' || field.ariaInvalid(),
    ),
  );

  protected readonly hasWarning = computed(
    () =>
      !this.hasInvalid() &&
      this.fields().some((field) => field.status() === 'warning'),
  );
}
