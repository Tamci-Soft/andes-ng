import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * Marks an `<ng-template>` as the content of a hover card:
 *
 * ```html
 * <andes-hover-card>
 *   <a andesHoverCardTrigger href="/u/ana">@ana</a>
 *   <ng-template andesHoverCardContent>
 *     <strong>Ana Torres</strong>
 *     <p>Finance lead</p>
 *   </ng-template>
 * </andes-hover-card>
 * ```
 *
 * The template is rendered only while the card is open, inside the card's own surface (which
 * carries the id the trigger's `aria-describedby` points at), so the surface, its arrow and its
 * hover bridge always come from one place.
 */
@Directive({
  selector: 'ng-template[andesHoverCardContent]',
})
export class AndesHoverCardContent {
  readonly templateRef = inject(TemplateRef);
}
