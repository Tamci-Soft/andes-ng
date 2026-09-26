import {
  AndesListNavigation,
  AndesOverlayContentPrimitive,
  AndesOverlayPrimitive,
} from '@andes-ng/primitives';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  DOCUMENT,
  forwardRef,
  inject,
  ViewEncapsulation,
} from '@angular/core';

import { AndesDropdownMenuRoot } from './dropdown-menu-root';
import { AndesDropdownMenuSub } from './dropdown-menu-sub';
import { AndesDropdownMenuLevel } from './dropdown-menu-types';

/**
 * A submenu's popup panel. Styled exactly like the root panel, and like it only
 * rendered while open.
 *
 * It provides its own `AndesListNavigation`, so the items inside it form their own
 * arrow-key/typeahead list, separate from the parent panel's - and it provides the
 * submenu as the `AndesDropdownMenuLevel` for them, so their `keyPath` includes the
 * submenu's key and a nested submenu inside it is tracked as the submenu's child.
 *
 * Keys (the topmost open overlay gets them): ArrowUp/Down/Home/End/typeahead navigate,
 * ArrowLeft (ArrowRight in RTL) and Escape close just this submenu and return focus to
 * its trigger item, Tab closes the whole menu.
 */
@Component({
  selector: 'andes-dropdown-menu-sub-content',
  hostDirectives: [AndesOverlayContentPrimitive],
  template: `<ng-content />`,
  styleUrl: './dropdown-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    AndesListNavigation,
    {
      provide: AndesDropdownMenuLevel,
      useExisting: forwardRef(() => AndesDropdownMenuSub),
    },
  ],
  host: {
    class: 'andes-dropdown-menu__content andes-dropdown-menu__sub-content',
    '[attr.aria-labelledby]': 'sub.triggerId()',
    '(pointerenter)': 'onPointerEnter()',
    '(pointerleave)': 'root.pointerLeft()',
  },
})
export class AndesDropdownMenuSubContent {
  protected readonly root = inject(AndesDropdownMenuRoot);
  protected readonly sub = inject(AndesDropdownMenuSub);
  private readonly navigation = inject(AndesListNavigation);
  private readonly document = inject(DOCUMENT);

  constructor() {
    const overlay = inject(AndesOverlayPrimitive);

    this.navigation.configure({
      orientation: 'vertical',
      focusMode: 'roving-tabindex',
      wrap: true,
    });

    overlay.keydownEvents.pipe(takeUntilDestroyed()).subscribe((event) => {
      const element = overlay.contentElement();
      const rtl =
        !!element &&
        this.document.defaultView?.getComputedStyle(element).direction ===
          'rtl';
      const closesKey = rtl ? 'ArrowRight' : 'ArrowLeft';
      if (event.key === 'Escape' || event.key === closesKey) {
        event.preventDefault();
        this.sub.close(true);
        return;
      }
      this.navigation.onKeydown(event);
    });

    overlay.closed
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.navigation.clearActive());

    this.navigation.tabOut
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.root.hide('tab-out'));

    this.sub.registerContent({
      focusFirst: () => this.navigation.focusFirst(),
    });
    inject(DestroyRef).onDestroy(() => this.sub.registerContent(null));
  }

  protected onPointerEnter(): void {
    this.root.pointerEntered();
    this.sub.cancelClose();
  }
}
