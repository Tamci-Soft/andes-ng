import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import { AndesAccordionItemState } from './accordion-item-state';
import { AndesAccordionState } from './accordion-state';

/**
 * The clickable header for one accordion item. Renders a native `<h3>` wrapping a native
 * `<button>` - the same structural choice shadcn's Base UI-backed implementation makes
 * (`Accordion.Header` wrapping `Accordion.Trigger`) - so the trigger is a real, natively
 * focusable and activatable control, and `aria-expanded`/`aria-controls` are wired explicitly
 * onto it rather than assumed.
 *
 * Deliberately **not** a roving-tabindex/arrow-key-navigable control: per the research this
 * component is built from (Base UI's own docs), that pattern was intentionally removed from
 * Accordion specifically, unlike Tabs, which still uses it. This trigger is just a normal
 * focusable button - Tab/Shift+Tab move between an accordion's triggers exactly like they would
 * between any other list of buttons.
 */
@Component({
  selector: 'andes-accordion-trigger',
  templateUrl: './accordion-trigger.html',
  styleUrl: './accordion-trigger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-accordion-trigger',
  },
})
export class AndesAccordionTrigger {
  private readonly rootState = inject(AndesAccordionState);
  private readonly itemState = inject(AndesAccordionItemState);

  protected readonly triggerId = this.itemState.triggerId;
  protected readonly contentId = this.itemState.contentId;

  protected readonly isOpen = computed(() =>
    this.rootState.isOpen(this.itemState.value()),
  );
  /** Already combines the item's own `disabled` input with the accordion root's - see
   *  `AndesAccordionItem.isDisabled`. */
  protected readonly isDisabled = this.itemState.disabled;

  protected onClick(): void {
    if (this.isDisabled()) {
      return;
    }
    this.rootState.toggle(this.itemState.value());
  }
}
