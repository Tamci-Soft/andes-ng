import { Injectable, signal } from '@angular/core';

let nextItemId = 0;

/**
 * DI-scoped shared state for one `AndesAccordionItem` and the `AndesAccordionTrigger`/
 * `AndesAccordionContent` pair projected into it.
 *
 * `AndesAccordionItem` provides a fresh instance in its own `providers: [...]` array (see
 * accordion-item.ts). The trigger and content live as siblings inside the item's projected
 * content, so neither can pass the item's `value`/`disabled` or the generated ids to the other
 * via `@Input()` - injecting this shared, item-scoped instance is how they stay in sync without
 * a `@ContentChild` query in either direction. It sits one DI level below `AndesAccordionState`
 * (the root-level state shared by every item in the accordion).
 */
@Injectable()
export class AndesAccordionItemState {
  private readonly id = ++nextItemId;

  /** Cross-links `AndesAccordionTrigger`'s `aria-controls` with `AndesAccordionContent`'s
   *  `id`, and `AndesAccordionContent`'s `aria-labelledby` back to the trigger's `id`. */
  readonly triggerId = `andes-accordion-trigger-${this.id}`;
  readonly contentId = `andes-accordion-content-${this.id}`;

  private readonly _value = signal('');
  private readonly _disabled = signal(false);

  readonly value = this._value.asReadonly();
  /** Already combines this item's own `disabled` input with the accordion root's - see
   *  `AndesAccordionItem.isDisabled`. */
  readonly disabled = this._disabled.asReadonly();

  setValue(value: string): void {
    this._value.set(value);
  }

  setDisabled(disabled: boolean): void {
    this._disabled.set(disabled);
  }
}
