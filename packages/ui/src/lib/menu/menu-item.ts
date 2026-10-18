import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { AndesMenuRow, AndesMenuRowBase } from './menu-row';

/**
 * A leaf entry of an `andes-menu`. The default content is the label; a
 * `[slot=icon]` element supplies the icon and a `[slot=extra]` element the trailing
 * content (a badge, a shortcut hint).
 *
 * ```html
 * <andes-menu-item key="inbox">
 *   <svg slot="icon">…</svg>
 *   Inbox
 *   <andes-badge slot="extra">4</andes-badge>
 * </andes-menu-item>
 * ```
 *
 * With `href` the row is a real anchor (`target` / `rel` work as usual), so links
 * open in new tabs and are announced as links. To keep client-side routing, listen to
 * the menu's `itemClick` and call `event.event.preventDefault()` before navigating
 * with the router.
 */
@Component({
  selector: 'andes-menu-item',
  imports: [NgTemplateOutlet, AndesMenuRow],
  templateUrl: './menu-item.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-menu__node',
    'data-slot': 'menu-item',
    '[attr.role]': 'hostRole()',
    '[attr.data-danger]': 'danger() ? "" : null',
  },
})
export class AndesMenuItem extends AndesMenuRowBase {
  /** Marks a destructive action: red text and red hover tint. */
  readonly danger = input(false, { transform: booleanAttribute });
  /** Renders the row as a link to this URL. */
  readonly href = input<string | undefined>(undefined);
  /** The link's `target`, with `href`. */
  readonly target = input<string | undefined>(undefined);
  /** The link's `rel`, with `href`. */
  readonly rel = input<string | undefined>(undefined);

  protected readonly hostRole = computed(() =>
    this.menu.navigation() ? 'listitem' : 'none',
  );

  protected override rowKind(): 'item' {
    return 'item';
  }

  constructor() {
    super();
  }

  protected override isLink(): boolean {
    return !!this.href();
  }

  onClick(event: MouseEvent): void {
    if (this.disabled()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.menu.activate(this.entry, event);
  }

  onPointerEnter(event: PointerEvent): void {
    if (event.pointerType !== 'touch') {
      this.menu.rowPointerEntered(this.entry);
    }
    if (
      this.menu.collapsed() &&
      !this.inPopup() &&
      event.pointerType !== 'touch'
    ) {
      this.menu.showTooltip(this.entry, false);
    }
  }

  onPointerLeave(): void {
    this.menu.hideTooltip();
  }
}
