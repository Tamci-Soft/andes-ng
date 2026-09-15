import {
  AndesListNavigationKeys,
  AndesOverlayPrimitive,
  AndesOverlayTriggerPrimitive,
} from '@andes-ng/primitives';
import { Directive, inject } from '@angular/core';

import { AndesCombobox } from './combobox';

/**
 * The editable text field of a Combobox. Composes two shared primitives via
 * `hostDirectives` rather than re-implementing either:
 *
 * - `AndesOverlayTriggerPrimitive` registers this element as the popup's positioning
 *   anchor and keeps `aria-expanded`/`aria-controls`/`aria-haspopup` in sync.
 * - `AndesListNavigationKeys` forwards arrow-key/Home/End navigation to the shared
 *   `AndesListNavigation` service and publishes its result as `aria-activedescendant` -
 *   this is precisely the element that primitive's own doc comment names for Combobox:
 *   "the `<input>` itself, which keeps focus the whole time."
 *
 * Everything else - `role="combobox"`, filtering on input, Enter/Escape, and never moving
 * real focus off this element - lives here.
 *
 * ```html
 * <input andesComboboxInput placeholder="Search fruit..." />
 * ```
 */
@Directive({
  selector: 'input[andesComboboxInput]',
  hostDirectives: [AndesOverlayTriggerPrimitive, AndesListNavigationKeys],
  host: {
    class: 'andes-combobox-input',
    role: 'combobox',
    autocomplete: 'off',
    autocapitalize: 'off',
    spellcheck: 'false',
    '[attr.aria-autocomplete]': '"list"',
    '[attr.aria-invalid]': 'combobox.ariaInvalid() || null',
    '[attr.aria-label]': 'combobox.ariaLabel() ?? null',
    '[attr.aria-labelledby]': 'combobox.ariaLabelledby() ?? null',
    '[value]': 'combobox.query()',
    '[disabled]': 'combobox.isDisabled()',
    '[readOnly]': 'combobox.readOnly()',
    '(input)': 'onInput($event)',
    '(keydown)': 'onKeydown($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
  },
})
export class AndesComboboxInput<T = string> {
  protected readonly combobox = inject(AndesCombobox) as AndesCombobox<T>;
  private readonly overlay = inject(AndesOverlayPrimitive);

  protected onInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.combobox.setQuery(value);
    if (!this.combobox.isDisabled() && !this.combobox.readOnly()) {
      this.combobox.open();
    }
  }

  protected onFocus(): void {
    if (!this.combobox.isDisabled() && !this.combobox.readOnly()) {
      this.combobox.open();
    }
  }

  protected onBlur(): void {
    this.combobox.notifyBlur();
  }

  protected onKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        // Otherwise handled by AndesListNavigationKeys once the list has items to move
        // through; while closed there is nothing to navigate yet, so open instead.
        if (!this.overlay.isOpen()) {
          event.preventDefault();
          this.combobox.open();
        }
        return;
      case 'Enter':
        if (this.combobox.selectActiveItem()) {
          event.preventDefault();
        }
        return;
      case 'Escape':
        if (this.overlay.isOpen()) {
          event.preventDefault();
          event.stopPropagation();
          this.combobox.close();
        }
    }
  }
}
