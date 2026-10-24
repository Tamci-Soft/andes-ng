import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * Marks an `<ng-template>` inside `<andes-collapsible-content>` as its lazy body - rendered on
 * first open (or up front with `forceMount`), and removed again after every close with
 * `unmountOnClose`. Projected `<ng-content>` cannot be lazy: the parent creates it whether or
 * not the region ever opens.
 *
 * ```html
 * <andes-collapsible-content>
 *   <ng-template andesCollapsibleLazy><heavy-report /></ng-template>
 * </andes-collapsible-content>
 * ```
 */
@Directive({
  selector: 'ng-template[andesCollapsibleLazy]',
})
export class AndesCollapsibleLazy {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
}
