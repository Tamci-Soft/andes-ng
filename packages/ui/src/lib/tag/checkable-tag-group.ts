import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
} from '@angular/core';

import { AndesTag } from './tag';

export type AndesCheckableTagValue = string | number;

export interface AndesCheckableTagOption {
  readonly value: AndesCheckableTagValue;
  readonly label: string;
  readonly disabled?: boolean;
}

/**
 * Single selection holds one value (or `null`); `multiple` holds an array. Ant's
 * `Tag.CheckableTagGroup` uses the same shape.
 */
export type AndesCheckableTagGroupValue =
  AndesCheckableTagValue | readonly AndesCheckableTagValue[] | null;

/**
 * Ant's `Tag.CheckableTagGroup`: renders one checkable `andes-tag` per option and manages the
 * selection as a single `[(value)]`. Each tag stays a native toggle `<button aria-pressed>`
 * (Tab moves between them, Enter/Space toggles), grouped under `role="group"` - name it with
 * `aria-label`.
 *
 * Single mode behaves like Ant's rather than like a radio group: clicking the selected tag
 * clears the selection back to `null`.
 */
@Component({
  selector: 'andes-checkable-tag-group',
  imports: [AndesTag],
  templateUrl: './checkable-tag-group.html',
  styleUrl: './checkable-tag-group.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
  },
})
export class AndesCheckableTagGroup {
  /** Options as `{ value, label, disabled? }` objects, or bare values used as their own label. */
  readonly options = input<
    readonly (AndesCheckableTagOption | AndesCheckableTagValue)[]
  >([]);
  /** Allow several tags to be checked at once; `value` is then an array. */
  readonly multiple = input(false, { transform: booleanAttribute });
  /** Disables every tag in the group. */
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly value = model<AndesCheckableTagGroupValue>(null);

  protected readonly normalizedOptions = computed(() =>
    this.options().map((option) =>
      typeof option === 'object'
        ? option
        : { value: option, label: String(option) },
    ),
  );

  private readonly selected = computed(() => {
    const value = this.value();
    if (value === null || value === undefined) {
      return [];
    }
    return Array.isArray(value) ? value : [value as AndesCheckableTagValue];
  });

  protected isSelected(value: AndesCheckableTagValue): boolean {
    return this.selected().includes(value);
  }

  protected toggle(value: AndesCheckableTagValue, checked: boolean): void {
    if (this.multiple()) {
      const rest = this.selected().filter((v) => v !== value);
      // Keep the options' own order rather than click order, so the array is stable.
      const next = checked ? [...rest, value] : rest;
      const order = this.normalizedOptions().map((o) => o.value);
      this.value.set(
        [...next].sort((a, b) => order.indexOf(a) - order.indexOf(b)),
      );
    } else {
      this.value.set(checked ? value : null);
    }
  }
}
