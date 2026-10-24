import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
  numberAttribute,
  viewChild,
  type TemplateRef,
} from '@angular/core';

import {
  ANDES_NAVIGATION_MENU_CONTENT,
  type AndesNavigationMenuContentRef,
} from './navigation-menu-types';

/**
 * The content that opens under a trigger: links, cards, anything. It renders
 * nowhere by itself; the menu shows it in its shared panel under the bar, or inline
 * below the trigger in the stacked (narrow screen) form.
 *
 * Children are laid out in a grid of `columns` equal columns, which makes a list
 * of one column and a card grid of several.
 *
 * ```html
 * <andes-navigation-menu-content [columns]="2">
 *   <a andesNavigationMenuLink href="/orders">
 *     <span andesNavigationMenuLinkTitle>Orders</span>
 *     <span andesNavigationMenuLinkDescription>Track and fulfil orders.</span>
 *   </a>
 * </andes-navigation-menu-content>
 * ```
 */
@Component({
  selector: 'andes-navigation-menu-content',
  template: `<ng-template #content><ng-content /></ng-template>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ANDES_NAVIGATION_MENU_CONTENT,
      useExisting: forwardRef(() => AndesNavigationMenuContent),
    },
  ],
  host: { 'data-slot': 'navigation-menu-content', hidden: '' },
})
export class AndesNavigationMenuContent implements AndesNavigationMenuContentRef {
  /** Number of equal columns the children are laid out in. */
  readonly columns = input(1, { transform: numberAttribute });
  /** Overrides the panel width (any CSS length). Defaults to `columns` x 15rem. */
  readonly width = input<string | null>(null);

  private readonly templateRef = viewChild<TemplateRef<unknown>>('content');
  readonly template = this.templateRef;
}
