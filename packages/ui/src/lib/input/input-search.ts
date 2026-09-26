import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  output,
} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { AndesButton } from '../button/button';
import { ANDES_INPUT_HOST, AndesInputBase } from './input-base';

export type AndesInputSearchSource = 'input' | 'clear';

/** Payload of `(searched)` - Ant Design's `onSearch(value, event, { source })`. */
export interface AndesInputSearchEvent {
  value: string;
  source: AndesInputSearchSource;
  event?: Event;
}

// A bare `enterButton` attribute arrives as '' - read it as `true`, like booleanAttribute,
// while still letting a non-empty string through as the button's label.
function enterButtonAttribute(value: boolean | string | null | undefined) {
  if (value === '' || value === 'true') {
    return true;
  }
  if (value === 'false' || value == null) {
    return false;
  }
  return value;
}

/**
 * A search field with an attached search button - Ant Design's `Input.Search`. Everything
 * `andes-input` accepts (size, variant, status, addons, count, clear, forms...) applies here too.
 */
@Component({
  selector: 'andes-input-search',
  imports: [AndesButton],
  templateUrl: './input.html',
  styleUrl: './input.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesInputSearch),
      multi: true,
    },
  ],
  host: ANDES_INPUT_HOST,
})
export class AndesInputSearch extends AndesInputBase {
  /**
   * `false` (default): a neutral icon button. `true`: a primary icon button. A string: a primary
   * button with that text as its label.
   */
  readonly enterButton = input<boolean | string, boolean | string | null>(
    false,
    { transform: enterButtonAttribute },
  );
  /** Shows a spinner on the button and suppresses `(searched)` until it clears. */
  readonly loading = input(false, { transform: booleanAttribute });

  /**
   * Enter in the field, a button click, or the clear button (with `source: 'clear'`) - Ant
   * Design's `onSearch`. Not named `search`: that is a native DOM event of `type="search"`
   * inputs, and an output shadowing it would fire for both.
   */
  readonly searched = output<AndesInputSearchEvent>();

  protected readonly nativeType = computed(() => 'search');

  protected override readonly variantClass = 'andes-input-wrapper--search';

  protected override readonly searchButton = computed(() => {
    const enterButton = this.enterButton();
    return {
      label: typeof enterButton === 'string' ? enterButton : undefined,
      primary: enterButton !== false,
      loading: this.loading(),
    };
  });

  protected override onSearchClick(event: Event): void {
    this.emitSearch('input', event);
  }

  protected override onEnter(event: KeyboardEvent): void {
    this.emitSearch('input', event);
  }

  protected override afterClear(): void {
    this.emitSearch('clear');
  }

  private emitSearch(source: AndesInputSearchSource, event?: Event): void {
    if (this.loading() || this.isDisabled()) {
      return;
    }
    this.searched.emit({ value: this.value(), source, event });
  }
}
