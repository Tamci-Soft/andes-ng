import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  TemplateRef,
} from '@angular/core';
import clsx from 'clsx';

import { AndesBadgeColor, resolveBadgeColor } from './badge';

/** Which top corner the ribbon hangs from - logical, so it flips under `dir="rtl"`. */
export type AndesBadgeRibbonPlacement = 'start' | 'end';

/**
 * A ribbon badge: a banner hanging off a top corner of the wrapped block (a card, an
 * image), overhanging its edge with a folded-back corner. Wraps its projected content.
 */
@Component({
  selector: 'andes-badge-ribbon',
  imports: [NgTemplateOutlet],
  templateUrl: './badge-ribbon.html',
  styleUrl: './badge-ribbon.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesBadgeRibbon {
  /** Ribbon content - a string or a `TemplateRef`. */
  readonly text = input<string | TemplateRef<unknown> | undefined>(undefined);
  /** A preset name or any CSS color (auto-contrast text). Defaults to `primary`. */
  readonly color = input<AndesBadgeColor>('primary');
  readonly placement = input<AndesBadgeRibbonPlacement>('end');

  protected readonly textTemplate = computed(() => {
    const text = this.text();
    return text instanceof TemplateRef ? text : null;
  });

  protected readonly textString = computed(() => {
    const text = this.text();
    return typeof text === 'string' ? text : null;
  });

  private readonly resolvedColor = computed(() =>
    resolveBadgeColor(this.color() || 'primary'),
  );

  protected readonly customColor = computed(() => this.resolvedColor().custom);

  protected readonly classes = computed(() =>
    clsx(
      'andes-ribbon',
      `andes-ribbon--${this.placement()}`,
      this.customColor()
        ? 'andes-ribbon--custom'
        : `andes-ribbon--${this.resolvedColor().preset}`,
    ),
  );
}
