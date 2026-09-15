import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
} from '@angular/core';
import clsx from 'clsx';

import { AndesAccordionItemState } from './accordion-item-state';
import { AndesAccordionState } from './accordion-state';

/**
 * One header/panel pair. Provides its own `AndesAccordionItemState` (see accordion-item-state.ts)
 * so the `AndesAccordionTrigger` and `AndesAccordionContent` projected inside it - siblings, not
 * parent/child of each other - can share this item's `value`, effective `disabled` state and
 * cross-linking ids without a `@ContentChild` query.
 */
@Component({
  selector: 'andes-accordion-item',
  templateUrl: './accordion-item.html',
  styleUrl: './accordion-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AndesAccordionItemState],
  host: {
    '[class]': 'classes()',
    '[attr.data-state]': "isOpen() ? 'open' : 'closed'",
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
  },
})
export class AndesAccordionItem {
  private readonly rootState = inject(AndesAccordionState);
  private readonly itemState = inject(AndesAccordionItemState);

  /** Unique identifier for this item within its accordion - what `AndesAccordionState` tracks
   *  open/closed state by. */
  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly isDisabled = computed(
    () => this.disabled() || this.rootState.disabled(),
  );
  protected readonly isOpen = computed(() =>
    this.rootState.isOpen(this.value()),
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-accordion-item',
      this.isOpen() && 'andes-accordion-item--open',
      this.isDisabled() && 'andes-accordion-item--disabled',
    ),
  );

  constructor() {
    effect(() => this.itemState.setValue(this.value()));
    effect(() => this.itemState.setDisabled(this.isDisabled()));
  }
}
