import {
  computed,
  Directive,
  ElementRef,
  inject,
  type OnDestroy,
  type OnInit,
} from '@angular/core';

import {
  ANDES_NAVIGATION_MENU,
  ANDES_NAVIGATION_MENU_ITEM,
} from './navigation-menu-types';

let nextTriggerId = 0;

/**
 * Turns a `<button>` into the trigger of its item's content: it carries
 * `aria-expanded` and `aria-controls`, opens on hover intent, click and the Down /
 * Enter / Space keys, and shows a chevron.
 *
 * ```html
 * <andes-navigation-menu-item>
 *   <button type="button" andesNavigationMenuTrigger>Products</button>
 *   <andes-navigation-menu-content>…</andes-navigation-menu-content>
 * </andes-navigation-menu-item>
 * ```
 */
@Directive({
  selector: '[andesNavigationMenuTrigger]',
  host: {
    class: 'andes-nav-menu__trigger',
    'data-andes-nav-menu-focusable': '',
    '[attr.aria-expanded]': 'open()',
    '[attr.aria-controls]': 'open() ? menu.panelId(item.key()) : null',
    '[attr.data-state]': 'open() ? "open" : "closed"',
    '[attr.aria-disabled]': 'item.disabled() ? "true" : null',
    '(click)': 'menu.triggerClicked(item, $event)',
    '(keydown)': 'menu.barKeydown($event, item)',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
  },
})
export class AndesNavigationMenuTrigger implements OnInit, OnDestroy {
  protected readonly menu = inject(ANDES_NAVIGATION_MENU);
  protected readonly item = inject(ANDES_NAVIGATION_MENU_ITEM);
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  protected readonly open = computed(() => this.menu.isOpen(this.item));

  ngOnInit(): void {
    // The consumer's own id wins; the panel's `aria-labelledby` needs one either way.
    if (!this.element.id) {
      this.element.id = `andes-nav-menu-trigger-${nextTriggerId++}`;
    }
    this.item.setTrigger(this.element);
  }

  ngOnDestroy(): void {
    this.item.setTrigger(null);
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType !== 'touch' && !this.item.disabled()) {
      this.menu.triggerPointerEntered(this.item);
    }
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (event.pointerType !== 'touch') {
      this.menu.triggerPointerLeft();
    }
  }
}
