import { Directive, effect, inject, ViewContainerRef } from '@angular/core';

import { ANDES_SPACE } from './space-context';

/**
 * Marks a direct child of `<andes-space>` as one of its items. Only needed for `split`: the
 * space uses the marked children to know where a separator goes, and each item renders the
 * separator that follows it as a real sibling element, so the last item never gets one.
 *
 * ```html
 * <andes-space split="|">
 *   <a andesSpaceItem href="/a">Edit</a>
 *   <a andesSpaceItem href="/b">Archive</a>
 * </andes-space>
 * ```
 *
 * Items hidden with `@if` are simply absent, so the separators always sit between what is shown.
 */
@Directive({
  selector: '[andesSpaceItem]',
  host: { 'data-slot': 'space-item' },
})
export class AndesSpaceItem {
  private readonly space = inject(ANDES_SPACE, { optional: true });
  private readonly container = inject(ViewContainerRef);

  constructor() {
    effect(() => {
      const separator = this.space?.separatorAfter(this) ?? null;
      this.container.clear();
      if (separator) {
        this.container.createEmbeddedView(
          separator.template,
          separator.context,
        );
      }
    });
  }
}
