import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  forwardRef,
  signal,
  viewChild,
  input,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import clsx from 'clsx';

export type AndesTextareaSize = 'sm' | 'md' | 'lg';
export type AndesTextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';

@Component({
  selector: 'andes-textarea',
  imports: [],
  templateUrl: './textarea.html',
  styleUrl: './textarea.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesTextarea),
      multi: true,
    },
  ],
  host: {
    // Forwarded to the real textarea in the template instead - a screen reader never sees
    // this non-interactive host element, so leaving these here would do nothing.
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
  },
})
export class AndesTextarea implements ControlValueAccessor {
  private readonly textareaRef =
    viewChild.required<ElementRef<HTMLTextAreaElement>>('textareaEl');

  readonly size = input<AndesTextareaSize>('md');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly placeholder = input<string | undefined>(undefined);
  readonly id = input<string | undefined>(undefined);
  readonly name = input<string | undefined>(undefined);
  readonly rows = input(3);
  readonly maxLength = input<number | undefined>(undefined);
  readonly showCount = input(false, { transform: booleanAttribute });
  readonly resize = input<AndesTextareaResize>('vertical');
  readonly autoSize = input(false, { transform: booleanAttribute });
  readonly autoSizeMinRows = input<number | undefined>(undefined);
  readonly autoSizeMaxRows = input<number | undefined>(undefined);
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

  protected readonly value = signal('');
  private readonly cvaDisabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected readonly isDisabled = computed(
    () => this.disabled() || this.cvaDisabled(),
  );

  protected readonly effectiveResize = computed<AndesTextareaResize>(() =>
    this.autoSize() ? 'none' : this.resize(),
  );

  protected readonly classes = computed(() =>
    clsx(
      'andes-textarea',
      `andes-textarea--${this.size()}`,
      `andes-textarea--resize-${this.effectiveResize()}`,
      this.ariaInvalid() && 'andes-textarea--invalid',
    ),
  );

  protected readonly currentLength = computed(() => this.value().length);

  constructor() {
    // Re-measure whenever anything that affects the rendered height changes: the value
    // (typed or set programmatically via writeValue), or the auto-size configuration itself.
    effect(() => {
      this.value();
      this.autoSize();
      this.autoSizeMinRows();
      this.autoSizeMaxRows();
      this.rows();
      this.adjustAutoSize();
    });
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.value.set(target.value);
    this.onChange(target.value);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }

  private adjustAutoSize(): void {
    if (!this.autoSize()) {
      return;
    }

    const element = this.textareaRef().nativeElement;
    const style = getComputedStyle(element);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    const borderBottom = parseFloat(style.borderBottomWidth) || 0;
    const boxExtra = paddingTop + paddingBottom + borderTop + borderBottom;

    const minRows = this.autoSizeMinRows() ?? this.rows();
    const maxRows = this.autoSizeMaxRows();
    const minHeight = lineHeight * minRows + boxExtra;
    const maxHeight = maxRows ? lineHeight * maxRows + boxExtra : Infinity;

    // Shrink first so scrollHeight reflects the content actually needed, not the previously
    // set height, then grow to fit (clamped between the min/max row bounds).
    element.style.height = 'auto';
    const contentHeight = element.scrollHeight + borderTop + borderBottom;
    const newHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);
    element.style.height = `${newHeight}px`;
    element.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
  }
}
