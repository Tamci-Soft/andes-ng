import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  forwardRef,
  input,
  linkedSignal,
  model,
  numberAttribute,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import clsx from 'clsx';

import type {
  AndesInputSize,
  AndesInputStatus,
  AndesInputVariant,
} from './input-base';

export type AndesInputOtpFormatter = (value: string) => string;

const DEFAULT_MASK_CHARACTER = '•';

// A bare `mask` attribute arrives as '' - read it as `true`, like booleanAttribute, while still
// letting a non-empty string through as the character to mask with.
function maskAttribute(value: boolean | string | null | undefined) {
  if (value === '' || value === 'true') {
    return true;
  }
  if (value === 'false' || value == null) {
    return false;
  }
  return value;
}

function splitIntoCells(value: string, length: number): string[] {
  const characters = Array.from(value);
  return Array.from({ length }, (_, index) => characters[index] ?? '');
}

/**
 * A one-time-code field split into `length` single-character cells - Ant Design's `Input.OTP`.
 * Typing advances to the next cell, pasting (or an SMS autofill landing in one cell) spreads
 * the code across the cells, Backspace in an empty cell steps back and clears the previous one.
 *
 * Unlike Ant (whose `onChange` fires only once every cell is filled), the bound value and the
 * form control track every edit - so `required`/`minlength` validators see partial input - and
 * `(complete)` is the "all cells filled" signal.
 */
@Component({
  selector: 'andes-input-otp',
  templateUrl: './input-otp.html',
  styleUrl: './input-otp.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesInputOtp),
      multi: true,
    },
  ],
  host: {
    // Forwarded to the real group/cells in the template instead (same rationale as AndesInput).
    '[attr.id]': 'null',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
  },
})
export class AndesInputOtp implements ControlValueAccessor {
  private readonly cellInputs = viewChildren<
    HTMLInputElement,
    ElementRef<HTMLInputElement>
  >('cell', { read: ElementRef });

  readonly value = model('');
  readonly length = input(6, { transform: numberAttribute });
  /** `true` masks every filled cell with "•"; a string masks with that character instead. */
  readonly mask = input<boolean | string, boolean | string | null>(false, {
    transform: maskAttribute,
  });
  /** Applied to typed/pasted text before it lands in the cells - may also filter characters out. */
  readonly formatter = input<AndesInputOtpFormatter | undefined>(undefined);
  /** Drawn between every pair of cells (decorative, hidden from assistive technology). */
  readonly separator = input<string | undefined>(undefined);
  readonly size = input<AndesInputSize>('md');
  readonly variant = input<AndesInputVariant>('outlined');
  readonly status = input<AndesInputStatus | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly autocomplete = input('one-time-code');
  readonly inputMode = input<string>('text');
  readonly id = input<string | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });
  readonly ariaDescribedby = input<string | undefined>(undefined, {
    alias: 'aria-describedby',
  });
  readonly ariaInvalid = input(false, {
    alias: 'aria-invalid',
    transform: booleanAttribute,
  });

  /** Emits the full code whenever an edit leaves every cell filled. */
  readonly complete = output<string>();

  private readonly disabledByForm = signal(false);

  /**
   * The per-cell source of truth. It re-derives from `value` only when `value` is changed from
   * outside (binding, form control, `length`) - a user clearing a middle cell leaves a hole here
   * rather than shifting every later character one cell to the left.
   */
  protected readonly cells = linkedSignal<
    { value: string; length: number },
    string[]
  >({
    source: () => ({ value: this.value(), length: this.length() }),
    computation: (source, previous) =>
      previous &&
      previous.value.length === source.length &&
      previous.value.join('') === source.value
        ? previous.value
        : splitIntoCells(source.value, source.length),
  });

  protected readonly isDisabled = computed(
    () => this.disabled() || this.disabledByForm(),
  );

  protected readonly isInvalid = computed(
    () => this.ariaInvalid() || this.status() === 'error',
  );

  protected readonly maskCharacter = computed(() => {
    const mask = this.mask();
    if (mask === false) {
      return null;
    }
    return mask === true ? DEFAULT_MASK_CHARACTER : Array.from(mask)[0];
  });

  protected readonly classes = computed(() =>
    clsx(
      'andes-input-otp',
      `andes-input-otp--${this.size()}`,
      `andes-input-otp--${this.variant()}`,
      this.isInvalid() && 'andes-input-otp--invalid',
      this.status() === 'warning' &&
        !this.isInvalid() &&
        'andes-input-otp--warning',
      this.isDisabled() && 'andes-input-otp--disabled',
    ),
  );

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onChange: (value: string) => void = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private onTouched: () => void = () => {};

  writeValue(value: string | null | undefined): void {
    this.value.set(value == null ? '' : String(value));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
  }

  /** Focuses the first empty cell (or the last cell once the code is complete). */
  focus(options?: FocusOptions): void {
    const firstEmpty = this.cells().findIndex((cell) => !cell);
    this.focusCell(firstEmpty === -1 ? this.length() - 1 : firstEmpty, options);
  }

  protected display(index: number): string {
    const cell = this.cells()[index];
    return cell ? (this.maskCharacter() ?? cell) : '';
  }

  protected cellLabel(index: number): string {
    return `Character ${index + 1} of ${this.length()}`;
  }

  protected onCellFocus(event: FocusEvent): void {
    // Selecting the cell's content means the next keystroke replaces it instead of appending.
    (event.target as HTMLInputElement).select();
  }

  protected onCellInput(index: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    const previous = this.display(index);
    let typed = target.value;
    // The cell already showed a character and the caret sat beside it rather than selecting it:
    // strip the old character off whichever side it is on, keep only what was just typed.
    if (previous && typed.length > previous.length) {
      if (typed.startsWith(previous)) {
        typed = typed.slice(previous.length);
      } else if (typed.endsWith(previous)) {
        typed = typed.slice(0, -previous.length);
      }
    }
    if (typed === '') {
      this.setCells(index, ['']);
      target.value = '';
      return;
    }
    this.insert(index, typed);
    // The binding only writes when the display value *changes*; a rejected or repeated character
    // would otherwise be left sitting in the DOM.
    target.value = this.display(index);
  }

  protected onPaste(index: number, event: ClipboardEvent): void {
    event.preventDefault();
    const text = event.clipboardData?.getData('text') ?? '';
    this.insert(index, text.trim());
  }

  protected onCellKeydown(index: number, event: KeyboardEvent): void {
    switch (event.key) {
      case 'Backspace':
        event.preventDefault();
        if (this.cells()[index]) {
          this.setCells(index, ['']);
        } else if (index > 0) {
          this.setCells(index - 1, ['']);
          this.focusCell(index - 1);
        }
        break;
      case 'Delete':
        event.preventDefault();
        this.setCells(index, ['']);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.focusCell(index - 1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.focusCell(index + 1);
        break;
      case 'Home':
        event.preventDefault();
        this.focusCell(0);
        break;
      case 'End':
        event.preventDefault();
        this.focusCell(this.length() - 1);
        break;
    }
  }

  protected onFocusOut(event: FocusEvent, group: HTMLElement): void {
    // Moving between cells is not "leaving the field" - only mark touched when focus exits it.
    if (!group.contains(event.relatedTarget as Node | null)) {
      this.onTouched();
    }
  }

  /** Writes `text` into consecutive cells starting at `index`, then focuses the next cell. */
  private insert(index: number, text: string): void {
    const formatter = this.formatter();
    const characters = Array.from(formatter ? formatter(text) : text).slice(
      0,
      this.length() - index,
    );
    if (characters.length === 0) {
      return;
    }
    this.setCells(index, characters);
    this.focusCell(index + characters.length);
  }

  private setCells(index: number, characters: string[]): void {
    const next = [...this.cells()];
    next.splice(index, characters.length, ...characters);
    this.cells.set(next);
    this.syncCellElements(index, characters.length);
    const value = next.join('');
    this.value.set(value);
    this.onChange(value);
    if (next.every(Boolean)) {
      this.complete.emit(value);
    }
  }

  // The `[value]` binding alone is not enough: it only writes when the bound value differs from
  // what it last rendered, and two edits landing before the next change detection (a fast
  // type-then-Backspace) can leave it "unchanged" while the DOM still shows the old character.
  private syncCellElements(index: number, count: number): void {
    const cells = this.cellInputs();
    for (let i = index; i < index + count; i++) {
      const element = cells[i]?.nativeElement;
      if (element) {
        element.value = this.display(i);
      }
    }
  }

  private focusCell(index: number, options?: FocusOptions): void {
    const cells = this.cellInputs();
    const clamped = Math.min(Math.max(index, 0), cells.length - 1);
    cells[clamped]?.nativeElement.focus(options);
  }
}
