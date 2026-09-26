import {
  AndesListNavigationItem,
  AndesOverlayTriggerPrimitive,
} from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  inject,
  ViewEncapsulation,
} from '@angular/core';

import { AndesDropdownMenuRoot } from './dropdown-menu-root';
import { AndesDropdownMenuSub } from './dropdown-menu-sub';
import { AndesDropdownMenuLevel } from './dropdown-menu-types';

/**
 * The item that opens a submenu. It is an item of the *parent* panel (it takes part
 * in that panel's arrow-key navigation and typeahead) and the anchor of the
 * submenu's panel.
 *
 * `aria-haspopup="menu"`, `aria-expanded`, `aria-controls` and `data-state` come from
 * the composed `AndesOverlayTriggerPrimitive`. The trailing chevron is the root's
 * `expandIcon` template when set.
 *
 * See the class-level comment on `AndesDropdownMenuContent` for why this needs
 * `encapsulation: ViewEncapsulation.None`.
 */
@Component({
  selector: 'andes-dropdown-menu-sub-trigger',
  imports: [NgTemplateOutlet],
  hostDirectives: [
    AndesOverlayTriggerPrimitive,
    {
      directive: AndesListNavigationItem,
      inputs: ['disabled', 'typeaheadLabel'],
    },
  ],
  template: `
    <ng-content select="[slot=icon-start]" />
    <ng-content />
    <span class="andes-dropdown-menu__expand-icon" aria-hidden="true">
      @if (root.expandIcon(); as icon) {
        <ng-container
          *ngTemplateOutlet="icon; context: { $implicit: sub.isOpen() }"
        />
      } @else {
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="m9 18 6-6-6-6" />
        </svg>
      }
    </span>
  `,
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    role: 'menuitem',
    class: 'andes-dropdown-menu__item andes-dropdown-menu__sub-trigger',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeydown($event)',
    '(pointerenter)': 'onPointerEnter($event)',
    '(pointerleave)': 'onPointerLeave($event)',
  },
})
export class AndesDropdownMenuSubTrigger {
  protected readonly root = inject(AndesDropdownMenuRoot);
  protected readonly sub = inject(AndesDropdownMenuSub);
  private readonly level = inject(AndesDropdownMenuLevel);
  private readonly navItem = inject(AndesListNavigationItem);
  private readonly document = inject(DOCUMENT);

  protected readonly isDisabled = this.navItem.disabled;

  constructor() {
    this.sub.registerTrigger({
      element: this.navItem.element,
      itemId: this.navItem.itemId,
      isDisabled: this.navItem.disabled,
    });
  }

  protected onClick(): void {
    if (this.isDisabled()) {
      return;
    }
    if (this.root.triggerSubMenuAction() === 'click' && this.sub.isOpen()) {
      this.sub.close(false);
    } else {
      this.sub.open(false);
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled()) {
      return;
    }
    const rtl =
      this.document.defaultView?.getComputedStyle(this.navItem.element)
        .direction === 'rtl';
    const opensKey = rtl ? 'ArrowLeft' : 'ArrowRight';
    if (event.key === opensKey || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.sub.open(true);
    }
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType === 'touch' || this.isDisabled()) {
      return;
    }
    const sibling = this.level.openChild();
    if (sibling && sibling !== this.sub) {
      sibling.scheduleClose();
    }
    this.sub.cancelClose();
    if (this.root.triggerSubMenuAction() === 'hover') {
      this.sub.scheduleOpen();
    }
  }

  protected onPointerLeave(event: PointerEvent): void {
    if (event.pointerType !== 'touch') {
      this.sub.cancelOpen();
    }
  }
}
