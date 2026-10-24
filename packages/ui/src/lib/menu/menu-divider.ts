import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  type OnInit,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';

import { ANDES_MENU, ANDES_MENU_LEVEL } from './menu-types';

/**
 * A separator line between entries. In a horizontal bar it is a vertical rule.
 */
@Component({
  selector: 'andes-menu-divider',
  imports: [NgTemplateOutlet],
  template: `
    <ng-template #view>
      <div
        class="andes-menu__divider"
        role="separator"
        [attr.aria-orientation]="vertical() ? 'vertical' : null"
        [attr.data-dashed]="dashed() ? '' : null"
      ></div>
    </ng-template>
    @if (!overflowed()) {
      <ng-container [ngTemplateOutlet]="view" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-menu__node',
    'data-slot': 'menu-divider',
    role: 'none',
    '[attr.data-overflowed]': 'overflowed() ? "" : null',
  },
})
export class AndesMenuDivider implements OnInit {
  private readonly menu = inject(ANDES_MENU);
  private readonly level = inject(ANDES_MENU_LEVEL);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Draws the line dashed. */
  readonly dashed = input(false, { transform: booleanAttribute });

  readonly overflowed = signal(false);
  private readonly view = viewChild<TemplateRef<unknown>>('view');

  protected readonly vertical = computed(
    () =>
      this.menu.mode() === 'horizontal' &&
      this.level.isRoot &&
      !this.overflowed(),
  );

  ngOnInit(): void {
    if (this.level.isRoot) {
      const unit = {
        host: this.host,
        overflowed: this.overflowed,
        view: computed(() => this.view()),
        divider: true,
      };
      this.menu.registerUnit(unit);
      this.destroyRef.onDestroy(() => this.menu.unregisterUnit(unit));
    }
  }
}
