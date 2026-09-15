import { Injectable, signal } from '@angular/core';

export type AndesAccordionType = 'single' | 'multiple';

/**
 * DI-scoped shared state for one `AndesAccordion` instance and its `AndesAccordionItem`
 * descendants (and, through them, the `AndesAccordionTrigger`/`AndesAccordionContent` pair each
 * item hosts).
 *
 * `AndesAccordion` provides a fresh instance of this service in its own `providers: [...]`
 * array (see accordion.ts); every `AndesAccordionItem` projected into it injects that same
 * instance via the normal element-injector hierarchy - Angular's equivalent of React Context.
 * No `@ContentChildren` query or manual parent/child registration is needed, and each accordion
 * on the page gets its own isolated instance automatically. Per-item state (its own `value`,
 * `disabled` flag and generated ids) lives one level down, in `AndesAccordionItemState`
 * (provided by each `AndesAccordionItem`), which the item's own trigger/content inject
 * alongside this root state.
 */
@Injectable()
export class AndesAccordionState {
  private readonly _type = signal<AndesAccordionType>('single');
  private readonly _disabled = signal(false);
  private readonly _openValues = signal<ReadonlySet<string>>(new Set());

  readonly type = this._type.asReadonly();
  readonly disabled = this._disabled.asReadonly();
  readonly openValues = this._openValues.asReadonly();

  setType(type: AndesAccordionType): void {
    this._type.set(type);
  }

  setDisabled(disabled: boolean): void {
    this._disabled.set(disabled);
  }

  isOpen(value: string): boolean {
    return this._openValues().has(value);
  }

  /** Called by an `AndesAccordionTrigger` when the user activates it.
   *
   * `single` mode: opening an item replaces whatever was open (there is never more than one
   * value in the set); activating the already-open item closes it, so the set can also become
   * empty - matching the array-of-open-values model both reference libraries settled on, where
   * "collapsible single mode" is just the default behavior rather than a separate flag.
   * `multiple` mode: toggles the one item without touching any others. */
  toggle(value: string): void {
    const current = this._openValues();
    const isOpen = current.has(value);

    if (this._type() === 'single') {
      this._openValues.set(isOpen ? new Set() : new Set([value]));
      return;
    }

    const next = new Set(current);
    if (isOpen) {
      next.delete(value);
    } else {
      next.add(value);
    }
    this._openValues.set(next);
  }
}
