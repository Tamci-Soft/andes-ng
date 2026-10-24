import { AndesOverlayTriggerPrimitive } from '@andes-ng/primitives';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  type OnDestroy,
  type OnInit,
  ViewEncapsulation,
} from '@angular/core';

import { AndesMenubar } from './menubar';
import { AndesMenubarMenu } from './menubar-menu';
import type { AndesMenubarTriggerRef } from './menubar-types';

let nextTriggerId = 0;

/**
 * The top-level entry of a menu in the bar: the "File" in File / Edit / View.
 *
 * A `menuitem` that opens its menu's panel. `aria-haspopup`, `aria-expanded`,
 * `aria-controls` and `data-state` come from the composed `AndesOverlayTriggerPrimitive`.
 *
 * - Click toggles the menu, leaving focus on the trigger.
 * - ArrowDown, Enter and Space open it on the first item, ArrowUp on the last; with the
 *   menu already open they step into it.
 * - Left/Right, Home and End (handled by the bar) move between triggers, carrying an
 *   open menu along.
 * - While another menu of the bar is open, pointing at this trigger switches to its menu.
 *
 * All triggers of a bar share one tab stop (roving `tabindex`).
 */
@Component({
  selector: 'andes-menubar-trigger',
  hostDirectives: [AndesOverlayTriggerPrimitive],
  template: '<ng-content />',
  styleUrl: './menubar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'andes-menubar__trigger',
    role: 'menuitem',
    '[attr.id]': 'id',
    '[attr.tabindex]': 'tabIndex()',
    '[attr.aria-disabled]': 'isDisabled() || null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '(click)': 'onClick()',
    '(keydown)': 'onKeydown($event)',
    '(pointerenter)': 'onPointerEnter($event)',
    '(focus)': 'bar.setFocused(this)',
  },
})
export class AndesMenubarTrigger
  implements AndesMenubarTriggerRef, OnInit, OnDestroy
{
  protected readonly bar = inject(AndesMenubar);
  readonly menu = inject(AndesMenubarMenu);
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** The element id: its own when it has one, else generated, for the panel's `aria-labelledby`. */
  protected readonly id =
    this.element.id || `andes-menubar-trigger-${nextTriggerId++}`;

  readonly isDisabled = computed(() => this.menu.isDisabled());
  protected readonly tabIndex = computed(() =>
    this.bar.rovingTarget() === this ? 0 : -1,
  );

  constructor() {
    this.menu.registerTrigger(this);
  }

  ngOnInit(): void {
    this.bar.registerTrigger(this);
  }

  ngOnDestroy(): void {
    this.bar.unregisterTrigger(this);
  }

  focus(): void {
    this.element.focus();
  }

  protected onClick(): void {
    if (this.isDisabled()) {
      return;
    }
    // Not every browser focuses a clicked non-button element.
    this.focus();
    if (this.menu.isOpen()) {
      this.menu.hide('trigger');
    } else {
      this.menu.show({ focus: 'none', source: 'trigger' });
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.isDisabled() || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    switch (event.key) {
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (this.menu.isOpen()) {
          this.menu.focusFirstItem();
        } else {
          this.menu.show({ focus: 'first', source: 'keyboard' });
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (this.menu.isOpen()) {
          this.menu.focusLastItem();
        } else {
          this.menu.show({ focus: 'last', source: 'keyboard' });
        }
        break;
      case 'Tab':
        // The panel has no focus trap, so it would stay open once focus moves on.
        if (this.menu.isOpen()) {
          this.menu.hide('tab-out', { restoreFocus: false });
        }
        break;
      default:
        break;
    }
  }

  protected onPointerEnter(event: PointerEvent): void {
    if (event.pointerType !== 'touch') {
      this.bar.triggerPointerEntered(this);
    }
  }
}
