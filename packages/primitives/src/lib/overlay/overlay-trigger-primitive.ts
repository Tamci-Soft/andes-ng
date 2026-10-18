import { computed, Directive, ElementRef, inject, input } from '@angular/core';

import { AndesOverlayPrimitive } from './overlay-primitive';

/**
 * How a trigger advertises its overlay to assistive tech.
 *
 * - `expanded` — `aria-haspopup` + `aria-expanded` + `aria-controls`. Correct for
 *   Dialog, Drawer, Popover and Dropdown Menu, where the trigger opens something
 *   the user then interacts with.
 * - `described-by` — `aria-describedby` pointing at the overlay. Correct for
 *   Tooltip: the overlay describes the trigger, it is not a thing you open.
 * - `none` — the consumer wires its own ARIA.
 */
export type AndesOverlayAriaAttachment = 'expanded' | 'described-by' | 'none';

/**
 * Marks an element as an overlay's trigger. Registers it as the positioning anchor
 * and as the element focus returns to on close, and keeps its ARIA state in sync.
 *
 * It intentionally does *not* bind a click handler: whether the overlay opens on
 * click, hover, focus or context menu is the consuming component's decision (and
 * differs across Dialog, Popover, Tooltip and Dropdown Menu). Call
 * `trigger.overlay.toggle(template)` from wherever that decision is made.
 */
@Directive({
  selector: '[andesOverlayTrigger]',
  exportAs: 'andesOverlayTrigger',
  host: {
    '[attr.aria-haspopup]': 'ariaHasPopup()',
    '[attr.aria-expanded]': 'ariaExpanded()',
    '[attr.aria-controls]': 'ariaControls()',
    '[attr.aria-describedby]': 'ariaDescribedBy()',
    '[attr.data-state]': 'overlay.isOpen() ? "open" : "closed"',
  },
})
export class AndesOverlayTriggerPrimitive {
  /** The overlay this trigger belongs to. */
  readonly overlay = inject(AndesOverlayPrimitive);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Which ARIA relationship to expose. Defaults to `expanded`. */
  readonly ariaAttachment = input<AndesOverlayAriaAttachment>('expanded');

  protected readonly ariaHasPopup = computed(() => {
    if (this.ariaAttachment() !== 'expanded') {
      return undefined;
    }
    const role = this.overlay.config().role;
    switch (role) {
      // `aria-haspopup="alertdialog"` is not a valid token; `dialog` is.
      case 'alertdialog':
        return 'dialog';
      case 'dialog':
      case 'menu':
      case 'listbox':
        return role;
      default:
        return undefined;
    }
  });

  protected readonly ariaExpanded = computed(() =>
    this.ariaAttachment() === 'expanded'
      ? String(this.overlay.isOpen())
      : undefined,
  );

  protected readonly ariaControls = computed(() =>
    this.ariaAttachment() === 'expanded' && this.overlay.isOpen()
      ? this.overlay.contentId
      : undefined,
  );

  protected readonly ariaDescribedBy = computed(() =>
    this.ariaAttachment() === 'described-by' && this.overlay.isOpen()
      ? this.overlay.contentId
      : undefined,
  );

  constructor() {
    this.overlay.registerAnchor(this.elementRef);
  }
}
