import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
} from '@angular/core';

import { ANDES_COLLAPSIBLE } from './collapsible-types';

/**
 * Toggles the surrounding `<andes-collapsible>`. Use it on whatever element suits the design:
 *
 * - `<button andesCollapsibleTrigger>` - a native button, which already brings focus and
 *   Enter/Space handling;
 * - `<andes-collapsible-trigger>` or any other element (`<div andesCollapsibleTrigger>`,
 *   `<h3 andesCollapsibleTrigger>`) - given `role="button"`, a tab stop and Enter/Space
 *   handling.
 *
 * Do not put it on a component that renders its own button (the trigger would then be a
 * second, nested button): use a native element, or call `toggle()` on the root from the
 * component's `(click)`.
 *
 * Wires `aria-expanded`, `aria-controls` and `data-state`, so an icon inside can rotate with
 * `[data-state='open'] .icon { transform: rotate(180deg) }`.
 */
@Directive({
  selector: 'andes-collapsible-trigger, [andesCollapsibleTrigger]',
  host: {
    'data-slot': 'collapsible-trigger',
    '[attr.type]': 'type',
    '[attr.role]': 'native ? null : "button"',
    '[attr.tabindex]': 'tabIndex()',
    '[attr.disabled]': 'native && isDisabled() ? "" : null',
    '[attr.aria-disabled]': 'native ? null : isDisabled() || null',
    '[attr.aria-expanded]': 'collapsible.isOpen()',
    '[attr.aria-controls]': 'collapsible.contentId',
    '[attr.data-state]': "collapsible.isOpen() ? 'open' : 'closed'",
    '[attr.data-disabled]': "isDisabled() ? '' : null",
    '(click)': 'onClick()',
    '(keydown)': 'onKeydown($event)',
  },
})
export class AndesCollapsibleTrigger {
  protected readonly collapsible = inject(ANDES_COLLAPSIBLE);
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Disables only this trigger; the root's own `disabled` disables every trigger. */
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly native = this.element.tagName === 'BUTTON';
  /** A native button inside a `<form>` would otherwise submit it. */
  protected readonly type = this.native
    ? (this.element.getAttribute('type') ?? 'button')
    : null;

  protected readonly isDisabled = computed(
    () => this.disabled() || this.collapsible.isDisabled(),
  );
  protected readonly tabIndex = computed(() =>
    this.native ? null : this.isDisabled() ? -1 : 0,
  );

  protected onClick(): void {
    if (!this.isDisabled()) {
      this.collapsible.toggle();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.native || this.isDisabled() || event.target !== this.element) {
      return;
    }
    const isLink =
      this.element.tagName === 'A' && this.element.hasAttribute('href');
    // A link already turns Enter into a click.
    if (event.key === ' ' || (event.key === 'Enter' && !isLink)) {
      event.preventDefault();
      this.collapsible.toggle();
    }
  }
}
