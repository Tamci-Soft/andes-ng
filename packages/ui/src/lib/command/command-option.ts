import {
  AndesListNavigation,
  type AndesListNavigationItemRef,
} from '@andes-ng/primitives';
import {
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  type OnDestroy,
  type OnInit,
  type Signal,
} from '@angular/core';

import type { AndesCommand } from './command';
import { andesCommandAriaShortcut } from './command-keys';
import { ANDES_COMMAND } from './command-token';
import type { AndesCommandItem } from './command-types';

let nextOptionId = 0;

/**
 * One row of the list. It registers with the command's list navigation, so arrow keys, Home and
 * End, the active descendant and scrolling into view work for every row.
 *
 * A press on a row must not take focus from the search box, so the default of `mousedown` is
 * cancelled; the selection itself happens on `click`.
 */
@Directive({
  selector: '[andesCommandOption]',
  host: {
    class: 'andes-command__item',
    role: 'option',
    '[attr.id]': 'itemId',
    '[attr.aria-selected]': 'active() ? "true" : "false"',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.aria-keyshortcuts]': 'shortcut()',
    '[attr.data-active]': 'active() ? "" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '[attr.data-value]': 'item().value',
    '(mousedown)': '$event.preventDefault()',
    '(click)': 'onClick()',
    '(mousemove)': 'onPointerOver()',
    '(mouseenter)': 'onPointerOver()',
  },
})
export class AndesCommandOption
  implements AndesListNavigationItemRef, OnInit, OnDestroy
{
  /** The item this row stands for. */
  readonly item = input.required<AndesCommandItem>({
    alias: 'andesCommandOption',
  });

  private readonly command = inject(ANDES_COMMAND) as AndesCommand;
  private readonly navigation = inject(AndesListNavigation);

  readonly element: HTMLElement =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly itemId = `andes-command-item-${nextOptionId++}`;

  readonly isDisabled: Signal<boolean> = computed(() => !!this.item().disabled);

  protected readonly active = computed(
    () => this.navigation.activeItem() === this,
  );

  protected readonly shortcut = computed(() =>
    andesCommandAriaShortcut(this.item().shortcut),
  );

  ngOnInit(): void {
    this.navigation.register(this);
  }

  ngOnDestroy(): void {
    this.navigation.unregister(this);
  }

  getLabel(): string {
    const item = this.item();
    return item.label ?? item.value;
  }

  focus(): void {
    this.element.focus();
  }

  /**
   * Real focus stays in the search box, so the row scrolls itself into view. The first row of a
   * group reveals the group's heading too, or it would sit hidden just above the viewport.
   */
  setActiveStyles(): void {
    const group = this.element.closest('[role="group"]');
    const heading = group?.firstElementChild;
    if (heading && group?.querySelector('[role="option"]') === this.element) {
      (heading as HTMLElement).scrollIntoView?.({ block: 'nearest' });
    }
    this.element.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- required by the CDK's `Highlightable` interface
  setInactiveStyles(): void {}

  protected onClick(): void {
    if (!this.isDisabled()) {
      this.command.selectItem(this.item());
    }
  }

  protected onPointerOver(): void {
    if (this.isDisabled() || this.navigation.activeItem() === this) {
      return;
    }
    this.navigation.setActiveItemSilently(this);
  }
}
