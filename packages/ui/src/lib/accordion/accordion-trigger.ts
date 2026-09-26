import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  TemplateRef,
} from '@angular/core';

import { AndesAccordionItemState } from './accordion-item-state';
import {
  type AndesAccordionExpandIconContext,
  AndesAccordionState,
} from './accordion-state';

/**
 * The clickable header for one accordion item. Renders a native `<h3>` wrapping a native
 * `<button>` - the same structural choice shadcn's Base UI-backed implementation makes
 * (`Accordion.Header` wrapping `Accordion.Trigger`) - so the trigger is a real, natively
 * focusable and activatable control (Enter/Space for free), and `aria-expanded`/`aria-controls`
 * are wired explicitly onto it rather than assumed.
 *
 * Which part of the header is the button depends on the item's resolved `collapsible` mode:
 * the whole row by default (the button's `::after` is stretched over the row so its padding is
 * clickable too), just the text for `header`, or just the icon for `icon`. The `extra` slot
 * always sits outside both the heading and the button.
 *
 * Not a roving-tabindex control: every trigger stays in the natural tab order. Arrow-key focus
 * movement between triggers is opt-in on the root (`arrowNavigation`) - see accordion.ts.
 */
@Component({
  selector: 'andes-accordion-trigger',
  imports: [NgTemplateOutlet],
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

  /** Content rendered at the end of the header row (Ant Design's `extra`), outside the toggle
   *  button. Content projected with the `andesAccordionExtra` attribute lands in the same spot. */
  readonly extra = input<string | TemplateRef<unknown> | undefined>(undefined);

  protected readonly triggerId = this.itemState.triggerId;
  protected readonly contentId = this.itemState.contentId;
  protected readonly labelId = this.itemState.labelId;

  protected readonly isOpen = computed(() =>
    this.rootState.isOpen(this.itemState.value()),
  );
  protected readonly dataState = computed(() =>
    this.isOpen() ? 'open' : 'closed',
  );
  /** Already combines the item's own `disabled`, the root's and `collapsible="disabled"` - see
   *  `AndesAccordionItem.mode`. */
  protected readonly isDisabled = this.itemState.disabled;
  protected readonly mode = this.itemState.mode;
  protected readonly showArrow = this.itemState.showArrow;
  protected readonly size = this.rootState.size;
  protected readonly variant = this.rootState.variant;
  protected readonly iconPosition = this.rootState.expandIconPosition;
  protected readonly expandIcon = this.rootState.expandIcon;

  protected readonly iconContext = computed<AndesAccordionExpandIconContext>(
    () => ({
      $implicit: this.isOpen(),
      isActive: this.isOpen(),
      disabled: this.isDisabled(),
      value: this.itemState.value(),
    }),
  );

  protected isTemplate(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef;
  }

  protected onClick(): void {
    if (this.isDisabled()) {
      return;
    }
    this.rootState.toggle(this.itemState.value());
  }
}
