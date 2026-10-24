import { Directive, inject, TemplateRef } from '@angular/core';

/**
 * Marks the content of a slide that should only be created once the slide is near the
 * visible ones, so a long carousel does not build (or load) every slide up front. Once
 * created it stays.
 *
 * ```html
 * <andes-carousel-slide>
 *   <ng-template andesCarouselLazy><img src="/big.jpg" alt="" /></ng-template>
 * </andes-carousel-slide>
 * ```
 */
@Directive({ selector: 'ng-template[andesCarouselLazy]' })
export class AndesCarouselLazy {
  readonly templateRef = inject<TemplateRef<unknown>>(TemplateRef);
}
