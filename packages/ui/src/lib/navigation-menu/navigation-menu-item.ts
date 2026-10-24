import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  ElementRef,
  forwardRef,
  inject,
  input,
  type OnInit,
  signal,
} from '@angular/core';

import { AndesNavigationMenuContent } from './navigation-menu-content';
import {
  ANDES_NAVIGATION_MENU,
  ANDES_NAVIGATION_MENU_ITEM,
  type AndesNavigationMenuItemRef,
} from './navigation-menu-types';

let nextItemId = 0;

/**
 * One top-level entry of the bar. Put either a link (`a[andesNavigationMenuLink]`) or
 * a trigger (`button[andesNavigationMenuTrigger]`) followed by an
 * `andes-navigation-menu-content` inside it.
 *
 * In the stacked form the content opens inline under the trigger.
 */
@Component({
  selector: 'andes-navigation-menu-item',
  imports: [NgTemplateOutlet],
  template: `
    <ng-content />
    @if (menu.mobile() && content(); as panel) {
      <div
        class="andes-nav-menu__inline"
        [attr.data-state]="isOpen() ? 'open' : 'closed'"
        [attr.inert]="isOpen() ? null : ''"
      >
        <div class="andes-nav-menu__inline-body">
          <div
            class="andes-nav-menu__content"
            role="group"
            [id]="menu.panelId(key())"
            [attr.aria-labelledby]="triggerId()"
            [style.--andes-nav-menu-columns]="panel.columns()"
            (keydown)="menu.panelKeydown($event)"
          >
            <ng-container [ngTemplateOutlet]="panel.template() ?? null" />
          </div>
        </div>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ANDES_NAVIGATION_MENU_ITEM,
      useExisting: forwardRef(() => AndesNavigationMenuItem),
    },
  ],
  host: {
    class: 'andes-nav-menu__item',
    'data-slot': 'navigation-menu-item',
    role: 'listitem',
  },
})
export class AndesNavigationMenuItem
  implements AndesNavigationMenuItemRef, OnInit
{
  protected readonly menu = inject(ANDES_NAVIGATION_MENU);
  private readonly destroyRef = inject(DestroyRef);
  readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Identifies the item in the menu's `value`. Auto-generated if omitted. */
  readonly value = input<string | undefined>(undefined);
  /** Stops the item's trigger from opening its content. */
  readonly disabled = input(false, { transform: booleanAttribute });

  private readonly autoValue = `item-${nextItemId++}`;
  readonly key = computed(() => this.value() ?? this.autoValue);

  private readonly contentChildRef = contentChild(AndesNavigationMenuContent);
  readonly content = computed(() => this.contentChildRef() ?? null);

  private readonly triggerElement = signal<HTMLElement | null>(null);
  readonly trigger = this.triggerElement.asReadonly();

  protected readonly isOpen = computed(() => this.menu.value() === this.key());
  protected readonly triggerId = computed(
    () => this.triggerElement()?.id || null,
  );

  ngOnInit(): void {
    this.menu.registerItem(this);
    this.destroyRef.onDestroy(() => this.menu.unregisterItem(this));
  }

  setTrigger(element: HTMLElement | null): void {
    this.triggerElement.set(element);
  }
}
