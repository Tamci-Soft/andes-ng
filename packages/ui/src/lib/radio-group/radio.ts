import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
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
    // never sees this non-interactive host element, so leaving these here would do nothing,
    // and a static `id` left behind would be duplicated on both elements at once.
    '[attr.id]': 'null',
    '[attr.aria-label]': 'null',
    '[attr.aria-describedby]': 'null',
  },
})
export class AndesRadio {
  /** `null` when the radio is used on its own, outside any `<andes-radio-group>`. */
  private readonly state = inject(AndesRadioGroupState, { optional: true });
  private readonly generatedId = `andes-radio-${++nextRadioId}`;
  private readonly inputRef =
    viewChild.required<ElementRef<HTMLInputElement>>('input');

  /** Compared with `===` against the group's value. Any type is accepted; the native
   *  input's `value` attribute (used for plain HTML form submission) gets `String(value)`.
   *  Required inside a group; optional for a standalone radio. */
  readonly value = input<unknown>(undefined);
  /** Checked state of a standalone radio (one placed outside any `<andes-radio-group>`).
   *  Two-way bindable (`[(checked)]`); a one-way `[checked]="true"` only seeds the initial
   *  state. Selecting the radio sets it to `true` - like a native radio it cannot be
   *  unchecked by the user. Ignored inside a group, where the group's value decides which
   *  item is checked. */
  readonly checked = model(false);
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
  /** Falls back to the browser's own default (`on`) for a standalone radio with no value. */
  protected readonly nativeValue = computed(() => {
    const value = this.value();
    return value === undefined ? 'on' : String(value);
  });
  /** A standalone radio has no name, so it never unchecks (or is unchecked by) another one. */
  protected readonly name = computed(() => this.state?.name() ?? null);
  protected readonly required = computed(() => this.state?.required() ?? false);
  protected readonly isButton = computed(
    () => this.state?.optionType() === 'button',
  );

  protected readonly isChecked = computed(() =>
    this.state ? this.state.value() === this.value() : this.checked(),
  );
  protected readonly isDisabled = computed(
    () => this.disabled() || (this.state?.disabled() ?? false),
  );

  protected readonly classes = computed(() => {
    const state = this.state;
    const isButton = this.isButton();
    return clsx(
      'andes-radio',
      state && `andes-radio--${state.orientation()}`,
      this.isChecked() && 'andes-radio--checked',
      this.isDisabled() && 'andes-radio--disabled',
      state?.invalid() && 'andes-radio--invalid',
      isButton && 'andes-radio--button',
      isButton && state && `andes-radio--${state.buttonStyle()}`,
      isButton && state && `andes-radio--${state.size()}`,
      state?.block() && 'andes-radio--block',
      !isButton &&
        state?.labelPlacement() === 'start' &&
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
    if (!(event.target as HTMLInputElement).checked) {
      return;
    }
    if (this.state) {
      this.state.select(this.value(), event);
    } else {
      this.checked.set(true);
    }
  }
}
