import { AndesOverlayTriggerPrimitive } from '@andes-ng/primitives';
import { afterNextRender, Directive, ElementRef, inject } from '@angular/core';

import { AndesDropdownMenu } from './dropdown-menu';

/** Matches the elements a browser will actually move focus to. */
const FOCUSABLE_SELECTOR =
  'button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Marks an element as a dropdown menu's trigger. Apply it to whatever should open
 * the menu - a plain `<button>`, an `AndesButton`, an icon button, or (for
 * `trigger="contextMenu"`) the region a right-click should work in. It renders nothing
 * of its own; which interactions open the menu is the root's `trigger` input.
 *
 * `aria-haspopup`/`aria-expanded`/`aria-controls` and `data-state` come for free
 * from the composed `AndesOverlayTriggerPrimitive`; `aria-disabled`/`data-disabled`
 * reflect the root's `disabled`.
 *
 * ```html
 * <button type="button" andesDropdownMenuTrigger>Options</button>
 * ```
 */
@Directive({
  selector: '[andesDropdownMenuTrigger]',
  hostDirectives: [AndesOverlayTriggerPrimitive],
  host: {
    // The overlay anchors the panel to THIS element's border box. When the trigger is
    // a wrapper component whose own host element has no `display` of its own -
    // `<andes-button>` is the common case, since `.andes-button` lives on the real
    // `<button>` inside its template - that box is the inline line-box (18px tall for
    // a 40px-tall button), not the control the user sees. The panel then opens
    // *over* the bottom of its own trigger instead of the preset's 4px below it.
    // `inline-flex` makes the trigger's box wrap exactly what it renders, which is
    // what the positioning already assumes; it is a no-op on a plain `<button>`,
    // which is inline-flex-shaped already, and a consumer's own `[style.display]`
    // still wins over a static host style.
    style: 'display: inline-flex',
    '[attr.aria-disabled]': 'menu.isDisabled() || null',
    '[attr.data-disabled]': 'menu.isDisabled() ? "" : null',
    '(click)': 'menu.onTriggerClick()',
    '(keydown)': 'menu.onTriggerKeydown($event)',
    '(pointerenter)': 'menu.onTriggerPointerEnter($event)',
    '(pointerleave)': 'menu.onTriggerPointerLeave($event)',
    '(contextmenu)': 'menu.onTriggerContextMenu($event)',
  },
})
export class AndesDropdownMenuTrigger {
  protected readonly menu = inject(AndesDropdownMenu);

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    this.menu.registerTrigger(host, host);

    // `AndesOverlayTriggerPrimitive` registers *this* host as both the positioning
    // anchor and the element focus returns to on close. That is right for
    // `<button andesDropdownMenuTrigger>`, but the directive is just as legitimately
    // put on a wrapper component - `<andes-button andesDropdownMenuTrigger>` - whose
    // host is a non-focusable custom element with the real `<button>` inside its
    // template. `focus()` on such a host silently no-ops, so closing the menu would
    // strand focus on `<body>`. Re-anchor to the inner focusable element once the
    // wrapper has rendered. Only for custom elements: a plain `<div>` context-menu
    // region that happens to contain a button should keep its own box.
    afterNextRender(() => {
      if (host.tabIndex >= 0 || !host.tagName.includes('-')) {
        return;
      }
      const focusable = host.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (focusable) {
        this.menu.registerTrigger(host, focusable);
      }
    });
  }
}
