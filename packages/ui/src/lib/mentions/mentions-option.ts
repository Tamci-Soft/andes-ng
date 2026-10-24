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

import type { AndesMentionOption } from './mentions-context';
import type { AndesMentions } from './mentions';
import { ANDES_MENTIONS } from './mentions-token';

let nextOptionId = 0;

/**
 * One suggestion row. It registers with the field's list navigation, so arrow keys, the active
 * descendant and scrolling into view work for rows rendered in the overlay.
 *
 * Pressing a row must not take focus from the text field (the caret would be lost), so the
 * default of `mousedown` is cancelled and the pick happens there.
 */
@Directive({
  selector: '[andesMentionsOption]',
  host: {
    class: 'andes-mentions-option',
    role: 'option',
    '[attr.id]': 'itemId',
    '[attr.aria-selected]': 'active() ? "true" : "false"',
    '[attr.aria-disabled]': 'isDisabled() ? "true" : null',
    '[attr.data-active]': 'active() ? "" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    '(mousedown)': 'onMouseDown($event)',
    '(mouseenter)': 'onPointerOver()',
    '(mousemove)': 'onPointerOver()',
  },
})
export class AndesMentionsOption
  implements AndesListNavigationItemRef, OnInit, OnDestroy
{
  /** The suggestion this row stands for. */
  readonly option = input.required<AndesMentionOption>({
    alias: 'andesMentionsOption',
  });

  private readonly mentions = inject(ANDES_MENTIONS) as AndesMentions;
  private readonly navigation = inject(AndesListNavigation);

  readonly element: HTMLElement =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly itemId = `andes-mentions-option-${nextOptionId++}`;

  readonly isDisabled: Signal<boolean> = computed(
    () => !!this.option().disabled,
  );

  protected readonly active = computed(
    () => this.navigation.activeItem() === this,
  );

  ngOnInit(): void {
    this.navigation.register(this);
  }

  ngOnDestroy(): void {
    this.navigation.unregister(this);
  }

  getLabel(): string {
    const option = this.option();
    return option.label ?? option.value;
  }

  focus(): void {
    this.element.focus();
  }

  /** Real focus stays in the text field, so the row scrolls itself into view. */
  setActiveStyles(): void {
    this.element.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- required by the CDK's `Highlightable` interface
  setInactiveStyles(): void {}

  protected onMouseDown(event: MouseEvent): void {
    event.preventDefault();
    if (!this.isDisabled()) {
      this.mentions.pickOption(this.option());
    }
  }

  protected onPointerOver(): void {
    if (this.isDisabled() || this.navigation.activeItem() === this) {
      return;
    }
    this.navigation.setActiveItemSilently(this);
  }
}
