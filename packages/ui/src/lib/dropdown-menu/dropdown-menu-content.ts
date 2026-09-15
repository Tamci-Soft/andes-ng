import { AndesOverlayContentPrimitive } from '@andes-ng/primitives';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
} from '@angular/core';

/**
 * The menu's popup surface. Everything inside it - items, groups, separators - is
 * only ever instantiated while the menu is open, since the whole subtree is
 * rendered lazily into a CDK overlay by `AndesDropdownMenu`.
 *
 * `role="menu"` and `data-state` come from the composed `AndesOverlayContentPrimitive`.
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
  },
})
export class AndesDropdownMenuContent {}
