import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  model,
  numberAttribute,
  TemplateRef,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { AndesButton } from '../button/button';
import {
  ANDES_INPUT_HOST,
  AndesInputBase,
  AndesInputVisibilityIconContext,
} from './input-base';

export type { AndesInputVisibilityIconContext } from './input-base';

/**
 * A password field with a show/hide toggle. Everything `andes-input` accepts (size, variant,
 * status, addons, count, clear, forms...) applies here too.
 */
@Component({
  selector: 'andes-input-password',
  imports: [AndesButton, NgTemplateOutlet],
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
  /**
   * Whether the password is shown as plain text - two-way bindable as `[(visible)]`; listen to
   * `(visibleChange)` to react to the toggle.
   */
  readonly visible = model(false);
  /**
   * Replaces the toggle's eye icons. The template gets whether the password is currently
   * visible: `<ng-template let-visible>`.
   */
  readonly visibilityIcon = input<
    TemplateRef<AndesInputVisibilityIconContext> | undefined
  >(undefined);
  /** The toggle's `tabindex`; `-1` keeps it out of the Tab order (it stays clickable). */
  readonly visibilityToggleTabIndex = input(0, { transform: numberAttribute });

  // `model()` takes no `transform`, so a bare `visible` attribute arrives as '' - normalise here.
  private readonly isVisible = computed(() => booleanAttribute(this.visible()));

  protected readonly nativeType = computed(() =>
    this.isVisible() ? 'text' : 'password',
  );

  protected override readonly passwordToggle = computed(() =>
    this.visibilityToggle() ? this.isVisible() : null,
  );

  protected override readonly passwordToggleIcon = this.visibilityIcon;

  protected override readonly passwordToggleTabIndex =
    this.visibilityToggleTabIndex;

  protected override togglePasswordVisibility(): void {
    this.visible.set(!this.isVisible());
  }
}
