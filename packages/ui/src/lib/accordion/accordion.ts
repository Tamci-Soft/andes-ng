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

import { AndesAccordionState, AndesAccordionType } from './accordion-state';

export type { AndesAccordionType } from './accordion-state';

/**
 * Root of the accordion compound component. Provides `AndesAccordionState`, shared via DI by
 * every projected `AndesAccordionItem` - see accordion-state.ts for why this pattern (rather
 * than `@ContentChildren`) is used, matching `AndesRadioGroup`/`AndesRadioGroupState`.
 *
 * Deliberately does **not** implement roving-tabindex/arrow-key navigation between item
 * triggers, unlike a Tabs-style component. Base UI's own docs (the primitive backing shadcn's
 * Accordion) call this out explicitly: `loopFocus`/`orientation` were "deprecated following the
 * APG guidance update to remove roving focus" - it's a deliberate, current-generation
 * accessibility decision specific to Accordion, not an oversight. Each trigger stays a normal
 * focusable `<button>` in the natural tab order.
 */
@Component({
  selector: 'andes-accordion',
  templateUrl: './accordion.html',
  styleUrl: './accordion.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AndesAccordionState],
  host: {
    '[class]': 'classes()',
    '[attr.data-disabled]': 'disabled() ? "" : null',
  },
})
export class AndesAccordion {
  private readonly state = inject(AndesAccordionState);

  /** Whether one (`'single'`) or several (`'multiple'`) panels can be open at once - matching
   *  shadcn's own historical `type` prop name for this behavior. */
  readonly type = input<AndesAccordionType>('single');
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly classes = computed(() =>
    clsx('andes-accordion', this.disabled() && 'andes-accordion--disabled'),
  );

  constructor() {
    effect(() => this.state.setType(this.type()));
    effect(() => this.state.setDisabled(this.disabled()));
  }
}
