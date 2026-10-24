import { Directive, inject, TemplateRef } from '@angular/core';

/** Context of a custom rate character: `<ng-template andesRateCharacter let-index let-filled="filled">`. */
export interface AndesRateCharacterContext {
  /** The zero-based position of the character. */
  readonly $implicit: number;
  readonly index: number;
  /** How much of this character is filled, from 0 to 1 (0.5 for a half character). */
  readonly fill: number;
  /** Whether this character is the empty or the filled layer being drawn. */
  readonly filled: boolean;
}

/**
 * Replaces the default star with your own markup, drawn once per character (twice per
 * character internally: an empty layer and a clipped filled layer, so partial fill works).
 * Inherit the colour with `currentColor` and size it to `100%` of its box:
 *
 * ```html
 * <andes-rate [(value)]="score">
 *   <ng-template andesRateCharacter let-index>{{ index + 1 }}</ng-template>
 * </andes-rate>
 * ```
 */
@Directive({ selector: 'ng-template[andesRateCharacter]' })
export class AndesRateCharacter {
  readonly templateRef =
    inject<TemplateRef<AndesRateCharacterContext>>(TemplateRef);

  static ngTemplateContextGuard(
    _directive: AndesRateCharacter,
    context: unknown,
  ): context is AndesRateCharacterContext {
    return typeof context === 'object' && context !== null;
  }
}
