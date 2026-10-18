import { AndesListNavigation } from '@andes-ng/primitives';
import { Directive, ElementRef, inject } from '@angular/core';

import type { AndesMentions } from './mentions';
import { ANDES_MENTIONS } from './mentions-token';

/** Keys that move the caret, after which the mention under it has to be looked at again. */
const CARET_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
]);

/**
 * The text field of a mentions control: a `<textarea>` or an `<input>`. It carries the combobox
 * semantics (`role="combobox"` with `aria-activedescendant` pointing into the suggestion list,
 * while real focus never leaves the field) and the keyboard handling that is only active while
 * the suggestions are open, so a closed list never swallows an arrow key or an Enter.
 */
@Directive({
  selector: 'textarea[andesMentionsField], input[andesMentionsField]',
  host: {
    class: 'andes-mentions__control',
    'data-slot': 'mentions',
    role: 'combobox',
    autocomplete: 'off',
    'aria-haspopup': 'listbox',
    'aria-autocomplete': 'list',
    '[attr.aria-expanded]': 'mentions.isOpen() ? "true" : "false"',
    '[attr.aria-controls]': 'mentions.isOpen() ? mentions.panelId() : null',
    '[attr.aria-activedescendant]': 'mentions.activeDescendantId()',
    '[attr.aria-label]': 'mentions.ariaLabel() ?? null',
    '[attr.aria-labelledby]': 'mentions.ariaLabelledby() ?? null',
    '[attr.aria-describedby]': 'mentions.describedBy()',
    '[attr.aria-invalid]': 'mentions.isInvalid() || null',
    '[attr.data-size]': 'mentions.size()',
    '[attr.id]': 'mentions.id() ?? null',
    '[attr.name]': 'mentions.name() ?? null',
    '[attr.placeholder]': 'mentions.placeholder() ?? null',
    '[attr.maxlength]': 'mentions.maxLength() ?? null',
    '[attr.rows]': 'mentions.rowsAttribute()',
    '[disabled]': 'mentions.isDisabled()',
    '[readOnly]': 'mentions.readonly()',
    '[required]': 'mentions.required()',
    '[value]': 'mentions.value()',
    '(input)': 'mentions.onInput($event)',
    '(keydown)': 'onKeydown($event)',
    '(keyup)': 'onKeyup($event)',
    '(click)': 'mentions.refreshContext()',
    '(scroll)': 'mentions.onFieldScroll()',
    '(focus)': 'mentions.onFocus($event)',
    '(blur)': 'mentions.onBlur($event)',
    '(compositionstart)': 'mentions.onCompositionStart()',
    '(compositionend)': 'mentions.onCompositionEnd()',
  },
})
export class AndesMentionsField {
  protected readonly mentions = inject(ANDES_MENTIONS) as AndesMentions;
  private readonly navigation = inject(AndesListNavigation);

  /** The native element this directive sits on. */
  readonly element: HTMLTextAreaElement | HTMLInputElement =
    inject<ElementRef<HTMLTextAreaElement | HTMLInputElement>>(ElementRef)
      .nativeElement;

  // `Event`, not `KeyboardEvent`: with two possible host elements the compiler types these
  // listeners' `$event` as a plain `Event`.
  protected onKeydown(event: Event): void {
    const key = event as KeyboardEvent;
    if (!this.mentions.isOpen() || key.isComposing || key.keyCode === 229) {
      return;
    }
    switch (key.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        // With nothing to move through (still loading, say) the caret moves as usual.
        if (this.navigation.items().length > 0) {
          key.preventDefault();
          this.navigation.onKeydown(key);
        }
        return;
      case 'Enter':
      case 'Tab':
        if (key.shiftKey || key.ctrlKey || key.altKey || key.metaKey) {
          return;
        }
        if (this.mentions.pickActive()) {
          key.preventDefault();
        }
        return;
      case 'Escape':
        // Closes the suggestions only: an Escape that also reached a surrounding dialog
        // would close that too.
        key.preventDefault();
        key.stopPropagation();
        this.mentions.dismiss();
    }
  }

  protected onKeyup(event: Event): void {
    if (CARET_KEYS.has((event as KeyboardEvent).key)) {
      this.mentions.refreshContext();
    }
  }
}
