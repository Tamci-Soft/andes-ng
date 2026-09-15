import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { AndesTabs } from './tabs';

/**
 * The `role="tabpanel"` shown when its `value` matches the parent `AndesTabs`'s active tab.
 *
 * Inactive panels stay mounted but carry the native `hidden` attribute rather than being
 * merely visually hidden with CSS - `hidden` removes them from the accessibility tree (and
 * from hit-testing/tab order) the same way fully unmounting them would, while preserving
 * their component state across tab switches.
 */
@Component({
  selector: 'andes-tabs-content',
  template: `<ng-content />`,
  styleUrl: './tabs-content.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'tabpanel',
    tabindex: '0',
    '[id]': 'panelId()',
    '[attr.aria-labelledby]': 'tabId()',
    '[hidden]': '!isActive()',
  },
})
export class AndesTabsContent {
  private readonly tabs = inject(AndesTabs);

  /** Matches the `AndesTabsTrigger` whose panel this is. */
  readonly value = input.required<string>();

  protected readonly isActive = computed(
    () => this.tabs.activeValue() === this.value(),
  );
  protected readonly panelId = computed(() => this.tabs.panelId(this.value()));
  protected readonly tabId = computed(() =>
    this.tabs.triggerElementId(this.value()),
  );
}
