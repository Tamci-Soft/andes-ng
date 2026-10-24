import { isPlatformBrowser } from '@angular/common';
import {
  Directive,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  PLATFORM_ID,
} from '@angular/core';

import { AndesWatermarkOverlay } from './watermark-overlay';
import { AndesWatermarkService } from './watermark.service';

/**
 * Paints the watermark of the nearest-published `andes-watermark` onto an element that renders
 * outside it, such as a dialog or drawer panel (overlays are attached to the page body).
 *
 * ```html
 * <div andesWatermarkInherit>Dialog content</div>
 * ```
 */
@Directive({ selector: '[andesWatermarkInherit]' })
export class AndesWatermarkInherit {
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly service = inject(AndesWatermarkService);
  private overlay: AndesWatermarkOverlay | null = null;

  constructor() {
    const browser = isPlatformBrowser(inject(PLATFORM_ID));

    effect(() => {
      const paint = this.service.active();
      if (!browser) {
        return;
      }
      if (!paint) {
        this.overlay?.destroy();
        this.overlay = null;
        return;
      }
      const el = this.element;
      const view = el.ownerDocument.defaultView;
      // The overlay is absolutely positioned against this element.
      const position = view?.getComputedStyle(el).position;
      if (!position || position === 'static') {
        el.style.position = 'relative';
      }
      this.overlay ??= new AndesWatermarkOverlay(el, el.ownerDocument);
      this.overlay.paint(paint);
    });

    inject(DestroyRef).onDestroy(() => this.overlay?.destroy());
  }
}
