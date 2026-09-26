import { computed, Injectable, type Signal, signal } from '@angular/core';

import type { AndesAccordionCollapsible } from './accordion-state';

let nextItemId = 0;

/** How a trigger is wired, after resolving the item's and the root's `collapsible` together
 *  with `disabled` and `showArrow`: `full` is the default whole-row toggle. */
export type AndesAccordionTriggerMode = 'full' | AndesAccordionCollapsible;

/** The signals `AndesAccordionItem` hands to its state - see `AndesAccordionHost` in
 *  accordion-state.ts for why these are connected rather than mirrored via `effect()`. */
export interface AndesAccordionItemHost {
  readonly value: Signal<string>;
  /** Already combines the item's own `disabled`, the root's `disabled` and an effective
   *  `collapsible="disabled"` - see `AndesAccordionItem.isDisabled`. */
  readonly disabled: Signal<boolean>;
  readonly mode: Signal<AndesAccordionTriggerMode>;
  readonly showArrow: Signal<boolean>;
  readonly forceRender: Signal<boolean>;
}

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
  /** The header text's id - names the icon-only button in `collapsible="icon"` mode. */
  readonly labelId = `andes-accordion-label-${this.id}`;

  private readonly host = signal<AndesAccordionItemHost | null>(null);

  readonly value = computed(() => this.host()?.value() ?? '');
  readonly disabled = computed(() => this.host()?.disabled() ?? false);
  readonly mode = computed<AndesAccordionTriggerMode>(
    () => this.host()?.mode() ?? 'full',
  );
  readonly showArrow = computed(() => this.host()?.showArrow() ?? true);
  readonly forceRender = computed(() => this.host()?.forceRender() ?? false);

  connect(host: AndesAccordionItemHost): void {
    this.host.set(host);
  }
}
