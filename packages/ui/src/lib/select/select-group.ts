import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';

import { AndesSelectState, type AndesSelectItemRef } from './select-state';

let nextUniqueId = 0;

/**
 * Groups related options under a heading. Project an `<andes-select-label>` as its first
 * child; the group takes its accessible name from it.
 *
 * `aria-labelledby` is only published once a label has actually registered - pointing it
 * at an id that does not exist would be worse than having no name at all. A group whose
 * every option is hidden by the search hides itself, heading included.
 */
@Component({
  selector: 'andes-select-group',
  template: `<ng-content />`,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'group',
    'data-slot': 'select-group',
    '[attr.aria-labelledby]': 'labelledBy()',
    '[style.display]': 'hidden() ? "none" : null',
  },
})
export class AndesSelectGroup {
  /** @internal The id an `AndesSelectLabel` inside this group adopts. */
  readonly labelId = `andes-select-group-label-${nextUniqueId++}`;

  private readonly select = inject(AndesSelectState);
  private readonly hasLabel = signal(false);
  private readonly items = signal<readonly AndesSelectItemRef[]>([]);

  protected readonly labelledBy = computed(() =>
    this.hasLabel() ? this.labelId : null,
  );

  protected readonly hidden = computed(() => {
    const items = this.items();
    return (
      items.length > 0 && items.every((item) => this.select.isFilteredOut(item))
    );
  });

  /** @internal Called by `AndesSelectLabel` when it adopts {@link labelId}. */
  registerLabel(): void {
    this.hasLabel.set(true);
  }

  /** @internal Called by `AndesSelectItem`. */
  registerItem(item: AndesSelectItemRef): void {
    this.items.update((items) => [...items, item]);
  }

  /** @internal Called by `AndesSelectItem`. */
  unregisterItem(item: AndesSelectItemRef): void {
    this.items.update((items) => items.filter((entry) => entry !== item));
  }
}
