import { Directive, inject, TemplateRef } from '@angular/core';

import type { AndesSliderMark } from './slider';

/** Template context for a custom tooltip: `<ng-template andesSliderTooltip let-value let-index="index">`. */
export interface AndesSliderTooltipContext {
  /** The thumb's current value. */
  readonly $implicit: number;
  readonly index: number;
  /** The default text: `tooltipFormatter`/`valueFormatter` output, or the bare value. */
  readonly label: string;
}

/** Template context for a custom mark label: `<ng-template andesSliderMark let-mark let-active="active">`. */
export interface AndesSliderMarkContext {
  readonly $implicit: AndesSliderMark;
  readonly value: number;
  readonly label: string | undefined;
  /** Whether the mark sits inside the filled (included) part of the track. */
  readonly active: boolean;
}

/**
 * Replaces the text inside every thumb's tooltip bubble. A template rather than a formatter
 * function because Ant Design's `tooltip.formatter` returns a ReactNode, i.e. rich content;
 * `aria-valuetext` still comes from `valueFormatter`, since a template has no text to read.
 */
@Directive({ selector: 'ng-template[andesSliderTooltip]' })
export class AndesSliderTooltipTemplate {
  readonly templateRef =
    inject<TemplateRef<AndesSliderTooltipContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _directive: AndesSliderTooltipTemplate,
    context: unknown,
  ): context is AndesSliderTooltipContext {
    return typeof context === 'object' && context !== null;
  }
}

/**
 * Replaces every mark label. When present it renders for every mark, labelled or not, so
 * bare numeric marks (`[0, 50, 100]`) can get template-driven labels too.
 */
@Directive({ selector: 'ng-template[andesSliderMark]' })
export class AndesSliderMarkTemplate {
  readonly templateRef =
    inject<TemplateRef<AndesSliderMarkContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _directive: AndesSliderMarkTemplate,
    context: unknown,
  ): context is AndesSliderMarkContext {
    return typeof context === 'object' && context !== null;
  }
}
