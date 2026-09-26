import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import clsx from 'clsx';

import {
  AndesAccordionItemState,
  type AndesAccordionTriggerMode,
} from './accordion-item-state';
import {
  type AndesAccordionCollapsible,
  AndesAccordionState,
} from './accordion-state';

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
    '[attr.data-variant]': 'rootState.variant()',
  },
})
export class AndesAccordionItem {
  protected readonly rootState = inject(AndesAccordionState);
  private readonly itemState = inject(AndesAccordionItemState);

  /** Unique identifier for this item within its accordion - what the root's `activeKey`
   *  tracks open/closed state by (Ant Design's panel `key`). */
  readonly value = input.required<string>();
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Overrides the root's `collapsible` for this item only. */
  readonly collapsible = input<AndesAccordionCollapsible | undefined>(
    undefined,
  );
  /** Hides this item's expand icon. Ant Design forbids `collapsible="icon"` without an arrow;
   *  here that combination falls back to `header` so the panel stays operable. */
  readonly showArrow = input(true, { transform: booleanAttribute });
  /** Renders a lazy (`ng-template[andesAccordionLazy]`) panel body up front, before the first
   *  open. Has no effect on eagerly projected content, which is always rendered. */
  readonly forceRender = input(false, { transform: booleanAttribute });

  protected readonly mode = computed<AndesAccordionTriggerMode>(() => {
    const collapsible = this.collapsible() ?? this.rootState.collapsible();
    if (
      this.disabled() ||
      this.rootState.disabled() ||
      collapsible === 'disabled'
    ) {
      return 'disabled';
    }
    if (collapsible === 'icon' && !this.showArrow()) {
      return 'header';
    }
    return collapsible ?? 'full';
  });

  protected readonly isDisabled = computed(() => this.mode() === 'disabled');
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
    this.itemState.connect({
      value: this.value,
      disabled: this.isDisabled,
      mode: this.mode,
      showArrow: this.showArrow,
      forceRender: this.forceRender,
    });
  }
}
