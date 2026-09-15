import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * Marks an `<ng-template>` as a tooltip's rich content:
 *
 * ```html
 * <andes-tooltip>
 *   <button andesTooltipTrigger>Delete</button>
 *   <ng-template andesTooltipContent>
 *     Permanently delete <strong>{{ project.name }}</strong>
 *   </ng-template>
 * </andes-tooltip>
 * ```
 *
 * `AndesTooltip` reads {@link templateRef} and renders it inside its own
 * overlay wrapper, which is what actually carries `andesOverlayContent`'s
 * `id`/`role="tooltip"` - the id the trigger's `aria-describedby` points at.
 * The wrapper markup has to stay under `AndesTooltip`'s control so that id
 * and styling can never drift from what the trigger claims to describe.
 *
 * Optional: a plain-text tooltip only needs `<andes-tooltip content="...">`
 * and no `AndesTooltipContent` at all.
 */
@Directive({
  selector: 'ng-template[andesTooltipContent]',
})
export class AndesTooltipContent {
  readonly templateRef = inject(TemplateRef);
}
