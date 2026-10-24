import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

import {
  ANDES_TOGGLE_GROUP,
  AndesToggleSize,
  AndesToggleVariant,
} from './toggle-types';

export type {
  AndesToggleGroupOrientation,
  AndesToggleGroupType,
  AndesToggleSize,
  AndesToggleVariant,
} from './toggle-types';

function noop(): void {
  /* replaced by registerOnChange/registerOnTouched */
}

/**
 * A button that stays pressed: renders `<button aria-pressed>` and flips `pressed` on click.
 *
 * Standalone it is a boolean control (`[(pressed)]`, `[formControl]`, `[(ngModel)]`). Inside an
 * `<andes-toggle-group>` its state comes from the group's `value` instead, matched by this
 * toggle's `value`, and the group supplies `variant`, `size` and `disabled` unless set here.
 *
 * Icon-only toggles need an `aria-label`.
 */
@Component({
  selector: 'andes-toggle',
  templateUrl: './toggle.html',
  styleUrl: './toggle.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesToggle),
      multi: true,
    },
  ],
  host: {
    'data-slot': 'toggle',
    '[attr.data-state]': "isPressed() ? 'on' : 'off'",
    '[attr.data-variant]': 'resolvedVariant()',
    '[attr.data-size]': 'resolvedSize()',
    '[attr.data-disabled]': "isDisabled() ? '' : null",
    // Forwarded to the inner button; the host itself stays out of the accessibility tree.
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
  },
})
export class AndesToggle<T = unknown> implements ControlValueAccessor {
  protected readonly group = inject(ANDES_TOGGLE_GROUP, { optional: true });
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Pressed state when used on its own. Ignored inside a group (the group's value rules). */
  readonly pressed = model(false);
  /** Identifies this toggle inside a group's `value`. */
  readonly value = input<T | undefined>(undefined);
  readonly variant = input<AndesToggleVariant | undefined>(undefined);
  readonly size = input<AndesToggleSize | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Native tooltip (`title`). */
  readonly tooltip = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });
  readonly ariaDescribedby = input<string | undefined>(undefined, {
    alias: 'aria-describedby',
  });

  private readonly cvaDisabled = signal(false);
  private onChange: (pressed: boolean) => void = noop;
  private onTouched: () => void = noop;

  protected readonly resolvedVariant = computed(
    () => this.variant() ?? this.group?.variant() ?? 'default',
  );
  protected readonly resolvedSize = computed(
    () => this.size() ?? this.group?.size() ?? 'md',
  );
  readonly isDisabled = computed(
    () =>
      this.disabled() ||
      this.cvaDisabled() ||
      (this.group?.isDisabled() ?? false),
  );
  readonly isPressed = computed(() =>
    this.group ? this.group.isPressed(this.value()) : this.pressed(),
  );
  protected readonly tabIndex = computed(() =>
    !this.group || this.group.tabbable() === this ? 0 : -1,
  );

  /** Moves focus to the button. */
  focus(options?: FocusOptions): void {
    this.button?.focus(options);
  }

  get button(): HTMLButtonElement | null {
    return this.element.nativeElement.querySelector('button');
  }

  protected onClick(): void {
    if (this.isDisabled()) {
      return;
    }
    if (this.group) {
      this.group.toggle(this.value());
      return;
    }
    const next = !this.pressed();
    this.pressed.set(next);
    this.onChange(next);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  writeValue(pressed: boolean | null): void {
    this.pressed.set(!!pressed);
  }

  registerOnChange(fn: (pressed: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }
}
