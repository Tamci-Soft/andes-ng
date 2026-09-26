import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  model,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { AndesButton } from '../button/button';
import { ANDES_INPUT_HOST, AndesInputBase } from './input-base';

/**
 * A password field with a show/hide toggle. Everything `andes-input` accepts (size, variant,
 * status, addons, count, clear, forms...) applies here too.
 */
@Component({
  selector: 'andes-input-password',
  imports: [AndesButton],
  templateUrl: './input.html',
  styleUrl: './input.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesInputPassword),
      multi: true,
    },
  ],
  host: ANDES_INPUT_HOST,
})
export class AndesInputPassword extends AndesInputBase {
  /** Whether to render the show/hide toggle at all. */
  readonly visibilityToggle = input(true, { transform: booleanAttribute });
  /** Whether the password is shown as plain text - two-way bindable as `[(visible)]`. */
  readonly visible = model(false);

  // `model()` takes no `transform`, so a bare `visible` attribute arrives as '' - normalise here.
  private readonly isVisible = computed(() => booleanAttribute(this.visible()));

  protected readonly nativeType = computed(() =>
    this.isVisible() ? 'text' : 'password',
  );

  protected override readonly passwordToggle = computed(() =>
    this.visibilityToggle() ? this.isVisible() : null,
  );

  protected override togglePasswordVisibility(): void {
    this.visible.set(!this.isVisible());
  }
}
