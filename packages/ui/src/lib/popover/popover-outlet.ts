import { Directive, effect, ElementRef, inject, input } from '@angular/core';
import type { TemplateRef } from '@angular/core';

import { AndesPopoverBase } from './popover-base';

/**
 * Internal: renders a `TemplateRef` input (`title`, `content`, `description`) into
 * its host element through `AndesPopoverBase.attachTemplate`, so the rendered view
 * can outlive a close/open cycle unless `destroyOnHidden` is set. A plain
 * `ngTemplateOutlet` would be destroyed together with the overlay every time.
 */
@Directive({
  selector: '[andesPopoverOutlet]',
})
export class AndesPopoverOutlet {
  readonly template = input.required<TemplateRef<unknown>>({
    alias: 'andesPopoverOutlet',
  });
  /** Cache slot - one per part (`'title'`, `'content'`, ...). */
  readonly key = input.required<string>({ alias: 'andesPopoverOutletKey' });

  private readonly popover = inject(AndesPopoverBase);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect(() => {
      this.popover.attachTemplate(
        this.key(),
        this.template(),
        this.host.nativeElement,
      );
    });
  }
}
