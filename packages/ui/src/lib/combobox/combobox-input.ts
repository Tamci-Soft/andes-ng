import {
  AndesListNavigationKeys,
  AndesOverlayPrimitive,
  AndesOverlayTriggerPrimitive,
} from '@andes-ng/primitives';
import {
  afterNextRender,
  Directive,
  effect,
  ElementRef,
  inject,
  Renderer2,
} from '@angular/core';

import type { AndesCombobox } from './combobox';
import { ANDES_COMBOBOX } from './combobox-token';

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
 * Everything else - `role="combobox"`, filtering on input, Enter/Escape, backfill, the
 * size/variant/status styling hooks, and never moving real focus off this element - lives
 * here. `AndesCombobox` renders one of these itself in its `[options]` mode.
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
    '[attr.aria-invalid]': 'combobox.invalid() || null',
    '[attr.aria-label]': 'combobox.ariaLabel() ?? null',
    '[attr.aria-labelledby]': 'combobox.ariaLabelledby() ?? null',
    '[attr.data-size]': 'combobox.size()',
    '[attr.data-variant]': 'combobox.variant()',
    '[attr.data-status]': 'combobox.status() ?? null',
    '[attr.data-suffix]': 'combobox.suffixCount() || null',
    '[value]': 'combobox.displayText()',
    '[disabled]': 'combobox.isDisabled()',
    '[readOnly]': 'combobox.readOnly()',
    '(input)': 'onInput($event)',
    '(keydown)': 'onKeydown($event)',
    '(focus)': 'onFocus()',
    '(blur)': 'onBlur()',
  },
})
export class AndesComboboxInput<T = string> {
  protected readonly combobox = inject(ANDES_COMBOBOX) as AndesCombobox<T>;
  private readonly overlay = inject(AndesOverlayPrimitive);
  private readonly renderer = inject(Renderer2);
  private readonly element: HTMLInputElement =
    inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;

  constructor() {
    // Set imperatively, and only once the root's input is actually given, rather than as
    // [attr.*] host bindings: a binding would evaluate to null while the input is unset
    // and strip the plain `placeholder="..."`/`maxlength` a compound-mode consumer
    // already wrote on this very element.
    effect(() => {
      const placeholder = this.combobox.placeholder();
      if (placeholder !== undefined) {
        this.renderer.setAttribute(this.element, 'placeholder', placeholder);
      }
    });
    effect(() => {
      const maxLength = this.combobox.maxLength();
      if (maxLength !== undefined) {
        this.renderer.setAttribute(
          this.element,
          'maxlength',
          String(maxLength),
        );
      }
    });

    afterNextRender(() => {
      if (this.combobox.autoFocus() && !this.combobox.isDisabled()) {
        this.element.focus();
      }
    });
  }

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
          return;
        }
        // AndesListNavigationKeys is a host directive, so its keydown listener has
        // already moved the highlight by the time this one runs.
        this.combobox.backfillActiveItem();
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
          this.combobox.dismiss();
        }
    }
  }
}
