import {
  computed,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
} from '@angular/core';

import { AndesOverlayPrimitive } from './overlay-primitive';

/**
 * Marks the root element of an overlay's projected content. Applies the ARIA role
 * and the id the trigger points at, and reports the element back to the primitive
 * so consumers can measure or query it.
 *
 * The focus trap brackets the CDK pane rather than this element, so content can
 * safely render siblings (an arrow, a swipe handle) outside it.
 */
@Directive({
  selector: '[andesOverlayContent]',
  exportAs: 'andesOverlayContent',
  host: {
    '[attr.id]': 'overlay.contentId',
    '[attr.role]': 'role()',
    '[attr.aria-modal]': 'ariaModal()',
    '[attr.tabindex]': 'tabIndex()',
    '[attr.data-state]': 'overlay.isOpen() ? "open" : "closed"',
  },
})
export class AndesOverlayContentPrimitive {
  /** The overlay this content belongs to. */
  readonly overlay = inject(AndesOverlayPrimitive);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly role = computed(() => {
    const role = this.overlay.config().role;
    return role === 'none' ? undefined : role;
  });

  protected readonly ariaModal = computed(() =>
    this.overlay.config().ariaModal ? 'true' : undefined,
  );

  protected readonly tabIndex = computed(() =>
    this.overlay.config().autoFocus === 'container' ? '-1' : undefined,
  );

  constructor() {
    this.overlay.registerContent(this.elementRef);
    inject(DestroyRef).onDestroy(() => this.overlay.registerContent(null));
  }
}
