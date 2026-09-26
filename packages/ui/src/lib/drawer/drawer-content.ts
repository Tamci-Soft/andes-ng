import { DestroyRef, Directive, inject, TemplateRef } from '@angular/core';

import { AndesDrawer } from './drawer';

/**
 * Marks an `<ng-template>` as the drawer's lazily rendered body content, the
 * Angular counterpart of Ant Design rendering `Drawer` children only once opened.
 *
 * The content is created on first open and, by default, kept alive between opens
 * so its state (form values, scroll position of inner widgets…) survives; set
 * `destroyOnHidden` on the drawer to destroy it on every close instead. Content
 * projected *without* this template is created with your own view and so is
 * always rendered and kept alive.
 *
 * ```html
 * <andes-drawer destroyOnHidden>
 *   <ng-template andesDrawerContent>
 *     <app-expensive-form />
 *   </ng-template>
 * </andes-drawer>
 * ```
 */
@Directive({
  selector: 'ng-template[andesDrawerContent]',
})
export class AndesDrawerContent {
  constructor() {
    const drawer = inject(AndesDrawer);
    drawer.registerLazyContent(inject(TemplateRef));
    inject(DestroyRef).onDestroy(() => drawer.registerLazyContent(null));
  }
}
