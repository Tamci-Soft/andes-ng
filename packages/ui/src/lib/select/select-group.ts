import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';

let nextUniqueId = 0;

/**
 * Groups related options under a heading. Project an `<andes-select-label>` as its first
 * child; the group takes its accessible name from it.
 *
 * `aria-labelledby` is only published once a label has actually registered - pointing it
 * at an id that does not exist would be worse than having no name at all.
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
  },
})
export class AndesSelectGroup {
  /** @internal The id an `AndesSelectLabel` inside this group adopts. */
  readonly labelId = `andes-select-group-label-${nextUniqueId++}`;

  private readonly hasLabel = signal(false);

  protected readonly labelledBy = computed(() =>
    this.hasLabel() ? this.labelId : null,
  );

  /** @internal Called by `AndesSelectLabel` when it adopts {@link labelId}. */
  registerLabel(): void {
    this.hasLabel.set(true);
  }
}
