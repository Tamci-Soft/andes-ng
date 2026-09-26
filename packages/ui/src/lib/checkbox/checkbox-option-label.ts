import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * One entry of `AndesCheckboxGroup`'s `options` input, in its object form. A bare `string` is
 * shorthand for `{ label: s, value: s }`.
 */
export interface AndesCheckboxOption {
  readonly label: string;
  readonly value: string;
  readonly disabled?: boolean;
  /** Native tooltip for the option (the rendered checkbox's `title` attribute). */
  readonly title?: string;
}

/** Template context of `AndesCheckboxOptionLabel`. */
export interface AndesCheckboxOptionLabelContext {
  /** The (normalized) option being rendered. */
  readonly $implicit: AndesCheckboxOption;
  readonly index: number;
}

/**
 * Custom label for every checkbox an `AndesCheckboxGroup` renders from its `options` input.
 *
 * ```html
 * <andes-checkbox-group [options]="plans">
 *   <ng-template andesCheckboxOptionLabel let-option>
 *     <strong>{{ option.label }}</strong>
 *   </ng-template>
 * </andes-checkbox-group>
 * ```
 *
 * A structural `<ng-template>` rather than a render-function input: it is Angular's idiomatic
 * slot for per-item markup, and the static context guard below types `let-option`.
 */
@Directive({
  selector: 'ng-template[andesCheckboxOptionLabel]',
})
export class AndesCheckboxOptionLabel {
  readonly template =
    inject<TemplateRef<AndesCheckboxOptionLabelContext>>(TemplateRef);

  /** Only consulted by the template type checker - it is what types `let-option`. */
  static ngTemplateContextGuard(
    _directive: AndesCheckboxOptionLabel,
    context: unknown,
  ): context is AndesCheckboxOptionLabelContext {
    return typeof context === 'object' && context !== null;
  }
}
