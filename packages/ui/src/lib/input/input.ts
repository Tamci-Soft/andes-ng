import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { AndesButton } from '../button/button';
import { ANDES_INPUT_HOST, AndesInputBase } from './input-base';

export type {
  AndesInputCountFormatter,
  AndesInputCountInfo,
  AndesInputFocusOptions,
  AndesInputSize,
  AndesInputStatus,
  AndesInputVariant,
} from './input-base';

export type AndesInputType =
  'text' | 'email' | 'password' | 'number' | 'search' | 'tel' | 'url';

@Component({
  selector: 'andes-input',
  // AndesButton is only drawn by the Search variant, but all three variants compile the same
  // template, so each one has to be able to resolve it.
  imports: [AndesButton],
  templateUrl: './input.html',
  styleUrl: './input.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesInput),
      multi: true,
    },
  ],
  host: ANDES_INPUT_HOST,
})
export class AndesInput extends AndesInputBase {
  readonly type = input<AndesInputType>('text');

  protected readonly nativeType = computed(() => this.type());
}
