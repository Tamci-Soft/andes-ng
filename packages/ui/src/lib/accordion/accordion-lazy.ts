import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * Marks an `<ng-template>` inside `<andes-accordion-content>` as the panel's lazy body - the
 * Angular way to render the body only on first open. Projected `<ng-content>`
 * can't be lazy: the parent instantiates it whether or not the panel ever opens, so
 * `forceRender` and the root's `destroyOnHidden` only apply to content declared this way.
 *
 * ```html
 * <andes-accordion-content>
 *   <ng-template andesAccordionLazy><expensive-report /></ng-template>
 * </andes-accordion-content>
 * ```
 */
@Directive({
  selector: 'ng-template[andesAccordionLazy]',
})
export class AndesAccordionLazy {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
}
