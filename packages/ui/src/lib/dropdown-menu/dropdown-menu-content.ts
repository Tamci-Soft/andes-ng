import { AndesOverlayContentPrimitive } from '@andes-ng/primitives';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  ViewEncapsulation,
} from '@angular/core';

import { AndesDropdownMenuRoot } from './dropdown-menu-root';

/**
 * The menu's popup surface. Everything inside it - items, groups, separators - is
 * only ever instantiated while the menu is open, since the whole subtree is
 * rendered lazily into a CDK overlay by `AndesDropdownMenu`.
 *
 * `role="menu"` and `data-state` come from the composed `AndesOverlayContentPrimitive`.
 * Pointer enter/leave feed the root's hover-trigger timing, so moving from the trigger
 * into the panel (or into a submenu's panel) does not count as leaving the menu.
 *
 * `dropdown-menu.css`'s selectors are plain BEM classes (`.andes-dropdown-menu__*`)
 * applied via each sub-component's `host: { class: ... }`, not inside any component's
 * own template. Angular's default (Emulated) view encapsulation only rewrites a
 * stylesheet's selectors to require ITS OWN component's `_ngcontent-*` attribute, which
 * is stamped on nodes rendered BY that component's template - never on the component's
 * own host element (that one gets `_nghost-*` instead). So a class living only in
 * `host: { class: ... }` can never match its own emulated stylesheet, the same
 * class of bug Breadcrumb hit (see the comment there) via a different mechanism -
 * projected content instead of a host-only class. Fix: opt every `@Component` that
 * owns `dropdown-menu.css` out of scoping via `encapsulation: ViewEncapsulation.None`,
 * so its plain class selectors match by class name globally. Safe here because every
 * class in `dropdown-menu.css` is namespaced `andes-dropdown-menu__*` and unique to
 * this component in the workspace.
 */
@Component({
  selector: 'andes-dropdown-menu-content',
  hostDirectives: [AndesOverlayContentPrimitive],
  template: `<ng-content />`,
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'andes-dropdown-menu__content',
    '[attr.data-side]': 'placement()?.side',
    '[attr.data-align]': 'placement()?.align',
    '(pointerenter)': 'root.pointerEntered()',
    '(pointerleave)': 'root.pointerLeft()',
  },
})
export class AndesDropdownMenuContent {
  protected readonly root = inject(AndesDropdownMenuRoot);
  private readonly overlay = inject(AndesOverlayContentPrimitive).overlay;

  /**
   * The requested side/alignment, so the entry motion can grow out of the trigger
   * instead of always from the top edge. It is the configured placement, not the
   * resolved one: a collision flip still grows from the requested edge.
   */
  protected readonly placement = computed(() => {
    const { positioning } = this.overlay.config();
    return positioning.kind === 'anchored'
      ? {
          side: positioning.side ?? 'bottom',
          align: positioning.align ?? 'center',
        }
      : null;
  });
}
