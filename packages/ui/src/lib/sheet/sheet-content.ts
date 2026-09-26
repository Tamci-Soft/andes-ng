import { DestroyRef, Directive, inject, TemplateRef } from '@angular/core';

import { AndesSheet } from './sheet';

/**
 * Marks an `<ng-template>` as the sheet's lazily rendered body content, the
 * Angular counterpart of Ant Design rendering `Drawer` children only once opened.
 *
 * The content is created on first open and, by default, kept alive between opens
 * so its state (form values, scroll position of inner widgets…) survives; set
 * `destroyOnHidden` on the sheet to destroy it on every close instead. Content
 * projected *without* this template is created with your own view and so is
 * always rendered and kept alive.
 *
 * ```html
 * <andes-sheet destroyOnHidden>
 *   <ng-template andesSheetContent>
 *     <app-expensive-form />
 *   </ng-template>
 * </andes-sheet>
 * ```
 */
@Directive({
  selector: 'ng-template[andesSheetContent]',
})
export class AndesSheetContent {
  constructor() {
    const sheet = inject(AndesSheet);
    sheet.registerLazyContent(inject(TemplateRef));
    inject(DestroyRef).onDestroy(() => sheet.registerLazyContent(null));
  }
}
