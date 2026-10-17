import { Directive, inject, TemplateRef } from '@angular/core';

import { AndesCheckboxValue } from './checkbox-group-state';

/**
 * One entry of `AndesCheckboxGroup`'s `options` input, in its object form. A bare string or
 * number is shorthand for `{ label: String(v), value: v }`.
 */
export interface AndesCheckboxOption<T extends AndesCheckboxValue = string> {
  readonly label: string;
  readonly value: T;
  readonly disabled?: boolean;
  /** Native tooltip for the option (the rendered checkbox's `title` attribute). */
  readonly title?: string;
  /** Extra class(es) on the rendered `<andes-checkbox>`, e.g. to style or size one option. */
  readonly className?: string;
  /** Inline styles on the rendered `<andes-checkbox>`, in any form `[style]` accepts. */
  readonly style?: string | Readonly<Record<string, string | number>>;
}

/** Anything `AndesCheckboxGroup`'s `options` input accepts per entry. */
export type AndesCheckboxOptionInput<T extends AndesCheckboxValue = string> =
  T | AndesCheckboxOption<T>;

/** Template context of `AndesCheckboxOptionLabel`. */
export interface AndesCheckboxOptionLabelContext<
  T extends AndesCheckboxValue = AndesCheckboxValue,
> {
  /** The (normalized) option being rendered. */
  readonly $implicit: AndesCheckboxOption<T>;
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
