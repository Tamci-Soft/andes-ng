import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';

import { AndesAccordionItemState } from './accordion-item-state';
import { AndesAccordionState } from './accordion-state';

/**
 * The collapsible panel for one accordion item. Exposed as a `region` landmark, labelled by its
 * own trigger (`aria-labelledby`) and cross-linked back from the trigger via `aria-controls` -
 * neither reference implementation's fetched docs confirmed this wiring exists automatically,
 * so it's implemented explicitly here rather than assumed (see accordion-collapse.md, section 4).
 *
 * Stays mounted in the DOM at all times and is purely visually collapsed via CSS (see
 * accordion-content.css) rather than toggling `hidden`/`display: none` - `inert` is applied
 * instead while closed, so its content is skipped by Tab and hidden from assistive tech without
 * losing the animated collapse/expand transition.
 */
@Component({
  selector: 'andes-accordion-content',
  templateUrl: './accordion-content.html',
  styleUrl: './accordion-content.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'region',
    '[id]': 'contentId',
    '[attr.aria-labelledby]': 'triggerId',
    '[attr.data-state]': "isOpen() ? 'open' : 'closed'",
    '[attr.inert]': "isOpen() ? null : ''",
  },
})
export class AndesAccordionContent {
  private readonly rootState = inject(AndesAccordionState);
  private readonly itemState = inject(AndesAccordionItemState);

  protected readonly triggerId = this.itemState.triggerId;
  protected readonly contentId = this.itemState.contentId;

  protected readonly isOpen = computed(() =>
    this.rootState.isOpen(this.itemState.value()),
  );
}
