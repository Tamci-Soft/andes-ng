import { AndesListNavigation, provideAndesOverlay } from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  output,
  TemplateRef,
  ViewEncapsulation,
} from '@angular/core';

import {
  AndesButton,
  type AndesButtonSize,
  type AndesButtonVariant,
} from '../button/button';
import { AndesDropdownMenu } from './dropdown-menu';
import { AndesDropdownMenuContent } from './dropdown-menu-content';
import { AndesDropdownMenuItems } from './dropdown-menu-items';
import { AndesDropdownMenuRoot } from './dropdown-menu-root';
import { AndesDropdownMenuTrigger } from './dropdown-menu-trigger';
import {
  AndesDropdownMenuLevel,
  type AndesDropdownMenuPlacement,
} from './dropdown-menu-types';

const CARET_SIZES: Readonly<Record<AndesButtonSize, AndesButtonSize>> = {
  xs: 'icon-xs',
  sm: 'icon-sm',
  md: 'icon',
  lg: 'icon-lg',
  'icon-xs': 'icon-xs',
  'icon-sm': 'icon-sm',
  icon: 'icon',
  'icon-lg': 'icon-lg',
};

/**
 * A split button: a main action plus an attached caret that opens a dropdown menu.
 *
 * ```html
 * <andes-dropdown-button (buttonClick)="save()" (itemClick)="run($event.key)">
 *   Save
 *   <andes-dropdown-menu-content>
 *     <andes-dropdown-menu-item key="save-as">Save as…</andes-dropdown-menu-item>
 *   </andes-dropdown-menu-content>
 * </andes-dropdown-button>
 * ```
 *
 * It *is* an `AndesDropdownMenu` (it extends it and provides itself under the same
 * tokens), so every menu input and output - `items`, `trigger`, `placement`, `arrow`,
 * `[(open)]`, `(itemClick)`, `selectable`… - works unchanged. Being the menu root
 * itself, rather than wrapping an `<andes-dropdown-menu>`, is what lets the projected
 * `<andes-dropdown-menu-content>` resolve the menu through DI: content projected
 * through a wrapper keeps the injector of where it was *declared*, which would be
 * outside the wrapped menu.
 *
 * The caret is a real `AndesButton` with `andesDropdownMenuTrigger`, so it gets the
 * trigger's ARIA and keyboard handling; its accessible name is `menuLabel`.
 */
@Component({
  selector: 'andes-dropdown-button',
  imports: [
    NgTemplateOutlet,
    AndesButton,
    AndesDropdownMenuContent,
    AndesDropdownMenuItems,
    AndesDropdownMenuTrigger,
  ],
  template: `
    <andes-button
      class="andes-dropdown-button__main"
      [variant]="variant()"
      [size]="size()"
      [disabled]="isDisabled()"
      [loading]="loading()"
      (click)="onMainClick($event)"
    >
      <ng-content />
    </andes-button>
    <andes-button
      andesDropdownMenuTrigger
      class="andes-dropdown-button__caret"
      [variant]="variant()"
      [size]="caretSize()"
      [disabled]="isDisabled()"
      [aria-label]="menuLabel()"
    >
      @if (icon(); as caretIcon) {
        <ng-container *ngTemplateOutlet="caretIcon" />
      } @else {
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      }
    </andes-button>
    <ng-template #contentTemplate>
      @if (items(); as menuItems) {
        <andes-dropdown-menu-content>
          <andes-dropdown-menu-items [items]="menuItems" />
        </andes-dropdown-menu-content>
      } @else {
        <ng-content select="andes-dropdown-menu-content" />
      }
      @if (arrowEnabled()) {
        <span class="andes-dropdown-menu__arrow" aria-hidden="true"></span>
      }
    </ng-template>
  `,
  styleUrl: './dropdown-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  providers: [
    provideAndesOverlay(),
    AndesListNavigation,
    {
      provide: AndesDropdownMenu,
      useExisting: forwardRef(() => AndesDropdownButton),
    },
    {
      provide: AndesDropdownMenuRoot,
      useExisting: forwardRef(() => AndesDropdownButton),
    },
    {
      provide: AndesDropdownMenuLevel,
      useExisting: forwardRef(() => AndesDropdownButton),
    },
  ],
  host: {
    class: 'andes-dropdown-button',
    '[attr.data-variant]': 'variant()',
  },
})
export class AndesDropdownButton extends AndesDropdownMenu {
  /** Visual variant of both halves. Default `'outline'`. */
  readonly variant = input<AndesButtonVariant>('outline');
  /** Size of both halves. Default `'md'`. */
  readonly size = input<AndesButtonSize>('md');
  /** Shows the main button's loading state (the caret stays usable). */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Replaces the caret's chevron. */
  readonly icon = input<TemplateRef<unknown> | undefined>(undefined);
  /** Accessible name of the icon-only caret button. Default `'More actions'`. */
  readonly menuLabel = input('More actions');
  /** Where the panel opens. Default `'bottomRight'`, aligned under the caret. */
  override readonly placement =
    input<AndesDropdownMenuPlacement>('bottomRight');

  /** Emits when the main (left) button is clicked. */
  readonly buttonClick = output<MouseEvent>();

  protected readonly caretSize = computed(() => CARET_SIZES[this.size()]);

  protected onMainClick(event: MouseEvent): void {
    if (!this.isDisabled()) {
      this.buttonClick.emit(event);
    }
  }
}
