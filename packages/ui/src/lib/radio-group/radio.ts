import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  viewChild,
} from '@angular/core';
import clsx from 'clsx';

import { AndesRadioGroupState } from './radio-group-state';

let nextRadioId = 0;

@Component({
  selector: 'andes-radio',
  templateUrl: './radio.html',
  styleUrl: './radio.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'classes()',
    '[attr.data-checked]': 'isChecked() ? "" : null',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
    // Forwarded to the real native radio input in the template instead - a screen reader
    // never sees this non-interactive host element, so leaving these here would do nothing.
    '[attr.aria-label]': 'null',
    '[attr.aria-describedby]': 'null',
  },
})
export class AndesRadio {
  private readonly state = inject(AndesRadioGroupState);
  private readonly generatedId = `andes-radio-${++nextRadioId}`;
  private readonly inputRef =
    viewChild.required<ElementRef<HTMLInputElement>>('input');

  /** Compared with `===` against the group's value. Any type is accepted; the native
   *  input's `value` attribute (used for plain HTML form submission) gets `String(value)`. */
  readonly value = input.required<unknown>();
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly id = input<string | undefined>(undefined);
  /** Focus this item's native input once it first renders. */
  readonly autoFocus = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaDescribedby = input<string | undefined>(undefined, {
    alias: 'aria-describedby',
  });

  protected readonly inputId = computed(() => this.id() ?? this.generatedId);
  protected readonly nativeValue = computed(() => String(this.value()));
  protected readonly name = this.state.name;
  protected readonly required = this.state.required;
  protected readonly isButton = computed(
    () => this.state.optionType() === 'button',
  );

  protected readonly isChecked = computed(
    () => this.state.value() === this.value(),
  );
  protected readonly isDisabled = computed(
    () => this.disabled() || this.state.disabled(),
  );

  protected readonly classes = computed(() => {
    const isButton = this.isButton();
    return clsx(
      'andes-radio',
      `andes-radio--${this.state.orientation()}`,
      this.isChecked() && 'andes-radio--checked',
      this.isDisabled() && 'andes-radio--disabled',
      isButton && 'andes-radio--button',
      isButton && `andes-radio--${this.state.buttonStyle()}`,
      isButton && `andes-radio--${this.state.size()}`,
      this.state.block() && 'andes-radio--block',
      !isButton &&
        this.state.labelPlacement() === 'start' &&
        'andes-radio--label-start',
    );
  });

  constructor() {
    afterNextRender(() => {
      if (this.autoFocus()) {
        this.focus();
      }
    });
  }

  focus(options?: FocusOptions): void {
    this.inputRef().nativeElement.focus(options);
  }

  blur(): void {
    this.inputRef().nativeElement.blur();
  }

  protected onChange(event: Event): void {
    if ((event.target as HTMLInputElement).checked) {
      this.state.select(this.value(), event);
    }
  }
}
