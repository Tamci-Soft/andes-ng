import { AndesOverlayTriggerPrimitive } from '@andes-ng/primitives';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import clsx from 'clsx';

import { AndesSelectState } from './select-state';

/**
 * The closed-state control: a real `<button role="combobox">` that opens the panel and
 * shows the current selection. Project an `<andes-select-value />` into it.
 *
 * Every ARIA attribute lands on that inner button rather than on this host element,
 * which is not focusable and therefore invisible to assistive technology.
 */
@Component({
  selector: 'andes-select-trigger',
  imports: [AndesOverlayTriggerPrimitive],
  templateUrl: './select-trigger.html',
  styleUrl: './select-trigger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesSelectTrigger {
  protected readonly select = inject(AndesSelectState);

  protected readonly classes = computed(() =>
    clsx(
      'andes-select__trigger',
      `andes-select__trigger--${this.select.size()}`,
      this.select.invalid() && 'andes-select__trigger--invalid',
    ),
  );

  protected onClick(): void {
    this.select.toggle();
  }
}
