import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
} from '@angular/core';

import { ANDES_COLLAPSIBLE, AndesCollapsibleApi } from './collapsible-types';

let nextCollapsibleId = 0;

/**
 * A region that expands and collapses. The root owns the `open` state; any number of
 * `andesCollapsibleTrigger`s toggle it and one `<andes-collapsible-content>` shows it.
 *
 * ```html
 * <andes-collapsible [(open)]="open">
 *   <button andesCollapsibleTrigger>Details</button>
 *   <andes-collapsible-content>...</andes-collapsible-content>
 * </andes-collapsible>
 * ```
 *
 * Works uncontrolled too: `open` is a `model()`, so without a binding it keeps its own state,
 * and `[open]="true"` seeds it expanded.
 */
@Component({
  selector: 'andes-collapsible',
  exportAs: 'andesCollapsible',
  template: `<ng-content />`,
  styleUrl: './collapsible.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ANDES_COLLAPSIBLE,
      useExisting: AndesCollapsible,
    },
  ],
  host: {
    'data-slot': 'collapsible',
    '[attr.data-state]': "isOpen() ? 'open' : 'closed'",
    '[attr.data-disabled]': "isDisabled() ? '' : null",
  },
})
export class AndesCollapsible implements AndesCollapsibleApi {
  /** Whether the content is expanded. Two-way bindable: `[(open)]`; `(openChange)` fires when a
   *  trigger or a method changes it. */
  readonly open = model(false);
  /** Blocks the triggers and `toggle()`. The `open` model can still be set programmatically. */
  readonly disabled = input(false, { transform: booleanAttribute });

  readonly contentId = `andes-collapsible-content-${++nextCollapsibleId}`;

  readonly isOpen = computed(() => this.open());
  readonly isDisabled = computed(() => this.disabled());

  /** Flips `open` unless the collapsible is disabled. */
  toggle(): void {
    if (!this.isDisabled()) {
      this.open.update((open) => !open);
    }
  }

  /** Expands the content (no-op when disabled). */
  expand(): void {
    if (!this.isDisabled()) {
      this.open.set(true);
    }
  }

  /** Collapses the content (no-op when disabled). */
  collapse(): void {
    if (!this.isDisabled()) {
      this.open.set(false);
    }
  }
}
