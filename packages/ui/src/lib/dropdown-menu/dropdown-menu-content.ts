import { AndesOverlayContentPrimitive } from '@andes-ng/primitives';
import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * The menu's popup surface. Everything inside it - items, groups, separators - is
 * only ever instantiated while the menu is open, since the whole subtree is
 * rendered lazily into a CDK overlay by `AndesDropdownMenu`.
 *
 * `role="menu"` and `data-state` come from the composed `AndesOverlayContentPrimitive`.
 */
@Component({
  selector: 'andes-dropdown-menu-content',
  hostDirectives: [AndesOverlayContentPrimitive],
  template: `<ng-content />`,
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-dropdown-menu__content',
  },
})
export class AndesDropdownMenuContent {}
