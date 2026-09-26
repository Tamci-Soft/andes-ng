import {
  afterNextRender,
  afterRenderEffect,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  forwardRef,
  inject,
  input,
  model,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import clsx from 'clsx';

export type AndesTextareaSize = 'sm' | 'md' | 'lg';
export type AndesTextareaResize = 'none' | 'vertical' | 'horizontal' | 'both';
export type AndesTextareaStatus = 'error' | 'warning';
export type AndesTextareaVariant =
  'outlined' | 'filled' | 'borderless' | 'underlined';

/** Row bounds for `autoSize`; `minRows` falls back to `rows`, `maxRows` to unbounded. */
export interface AndesTextareaAutoSize {
  minRows?: number;
  maxRows?: number;
}

export interface AndesTextareaCountInfo {
  value: string;
  count: number;
  maxLength: number | undefined;
}

export type AndesTextareaCountFormatter = (
  info: AndesTextareaCountInfo,
) => string;

export interface AndesTextareaFocusOptions extends FocusOptions {
  cursor?: 'start' | 'end' | 'all';
}

export interface AndesTextareaResizeEvent {
  width: number;
  height: number;
}

// `true`/`false`/bare attribute collapse to a boolean via booleanAttribute; an object is the
// `{minRows, maxRows}` form and passes through untouched.
function autoSizeAttribute(
  value: boolean | AndesTextareaAutoSize | string | null | undefined,
): boolean | AndesTextareaAutoSize {
  return typeof value === 'object' && value !== null
    ? value
    : booleanAttribute(value);
}

let nextId = 0;

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
    // this non-interactive host element, and a static `id`/`name` left on the host would
    // duplicate the one on the textarea (so `<label for>` would point at the wrong node).
    '[attr.id]': 'null',
    '[attr.name]': 'null',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
  },
})
export class AndesTextarea implements ControlValueAccessor {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly textareaRef =
    viewChild.required<ElementRef<HTMLTextAreaElement>>('textareaEl');

  readonly value = model('');
  readonly size = input<AndesTextareaSize>('md');
  readonly variant = input<AndesTextareaVariant>('outlined');
  readonly status = input<AndesTextareaStatus | undefined>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly clearable = input(false, { transform: booleanAttribute });
  readonly placeholder = input<string | undefined>(undefined);
  readonly id = input<string | undefined>(undefined);
  readonly name = input<string | undefined>(undefined);
  readonly rows = input(3);
  readonly maxLength = input<number | undefined>(undefined);
  readonly showCount = input(false, { transform: booleanAttribute });
  readonly countFormatter = input<AndesTextareaCountFormatter | undefined>(
    undefined,
  );
  readonly resize = input<AndesTextareaResize>('vertical');
  readonly autoSize = input<
    boolean | AndesTextareaAutoSize,
    boolean | AndesTextareaAutoSize | string | null | undefined
  >(false, { transform: autoSizeAttribute });
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

  /**
   * Fires on Enter (with or without modifiers) - but not for the Enter that confirms an IME
   * composition, which only commits the composed text. The newline is still inserted.
   */
  readonly pressEnter = output<KeyboardEvent>();
  readonly cleared = output<void>();
  /** Fires when the textarea's rendered box changes size (manual drag or `autoSize`). */
  readonly resized = output<AndesTextareaResizeEvent>();

  private readonly cvaDisabled = signal(false);

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  protected readonly countId = `andes-textarea-count-${nextId++}`;

  protected readonly isDisabled = computed(
    () => this.disabled() || this.cvaDisabled(),
  );

  protected readonly isInvalid = computed(
    () => this.ariaInvalid() || this.status() === 'error',
  );

  protected readonly autoSizeEnabled = computed(
    () => this.autoSize() !== false,
  );

  protected readonly effectiveResize = computed<AndesTextareaResize>(() =>
    this.autoSizeEnabled() ? 'none' : this.resize(),
  );

  protected readonly showClear = computed(
    () =>
      this.clearable() &&
      this.value().length > 0 &&
      !this.isDisabled() &&
      !this.readonly(),
  );

  protected readonly wrapperClasses = computed(() =>
    clsx(
      'andes-textarea-wrapper',
      `andes-textarea-wrapper--${this.size()}`,
      `andes-textarea-wrapper--${this.variant()}`,
      `andes-textarea-wrapper--resize-${this.effectiveResize()}`,
      this.isInvalid() && 'andes-textarea-wrapper--invalid',
      !this.isInvalid() &&
        this.status() === 'warning' &&
        'andes-textarea-wrapper--warning',
      this.isDisabled() && 'andes-textarea-wrapper--disabled',
      this.readonly() && 'andes-textarea-wrapper--readonly',
      this.clearable() && 'andes-textarea-wrapper--clearable',
      this.autoSizeEnabled() && 'andes-textarea-wrapper--auto-size',
    ),
  );

  protected readonly currentLength = computed(() => this.value().length);

  protected readonly countExceeded = computed(() => {
    const max = this.maxLength();
    return max != null && this.currentLength() > max;
  });

  protected readonly countText = computed(() => {
    const value = this.value();
    const count = value.length;
    const maxLength = this.maxLength();
    const formatter = this.countFormatter();
    if (formatter) {
      return formatter({ value, count, maxLength });
    }
    return maxLength != null ? `${count}/${maxLength}` : `${count}`;
  });

  protected readonly describedBy = computed(
    () =>
      [this.ariaDescribedby(), this.showCount() ? this.countId : undefined]
        .filter(Boolean)
        .join(' ') || null,
  );

  constructor() {
    // After render (not a plain `effect`), so a value written via writeValue/`[(value)]` has
    // already reached the DOM before its scrollHeight is measured.
    afterRenderEffect(() => {
      this.value();
      this.autoSize();
      this.rows();
      this.size();
      this.adjustAutoSize();
    });

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const element = this.textareaRef().nativeElement;
      let lastWidth = element.offsetWidth;
      let lastHeight = element.offsetHeight;
      const observer = new ResizeObserver(() => {
        const width = element.offsetWidth;
        const height = element.offsetHeight;
        if (width === lastWidth && height === lastHeight) {
          return;
        }
        const widthChanged = width !== lastWidth;
        lastWidth = width;
        lastHeight = height;
        // A narrower/wider box re-wraps the text, so the row count may have changed. Height
        // changes alone are skipped - they are usually this very measurement's own output.
        if (widthChanged) {
          this.adjustAutoSize();
          lastHeight = element.offsetHeight;
        }
        this.resized.emit({ width, height: lastHeight });
      });
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  /** Focuses the textarea, optionally placing the caret at the start/end or selecting all. */
  focus(options?: AndesTextareaFocusOptions): void {
    const element = this.textareaRef().nativeElement;
    element.focus({ preventScroll: options?.preventScroll });
    const length = element.value.length;
    switch (options?.cursor) {
      case 'start':
        element.setSelectionRange(0, 0);
        break;
      case 'end':
        element.setSelectionRange(length, length);
        break;
      case 'all':
        element.select();
        break;
    }
  }

  blur(): void {
    this.textareaRef().nativeElement.blur();
  }

  protected onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.value.set(target.value);
    this.onChange(target.value);
  }

  protected onBlur(): void {
    this.onTouched();
  }

  protected onKeydown(event: KeyboardEvent): void {
    // keyCode 229 covers browsers (Safari) that report the IME-confirming Enter with
    // `isComposing === false`.
    if (event.key === 'Enter' && !event.isComposing && event.keyCode !== 229) {
      this.pressEnter.emit(event);
    }
  }

  protected clear(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.value.set('');
    this.onChange('');
    this.cleared.emit();
    this.textareaRef().nativeElement.focus();
  }

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
    this.cvaDisabled.set(isDisabled);
  }

  private adjustAutoSize(): void {
    const autoSize = this.autoSize();
    const element = this.textareaRef().nativeElement;
    if (autoSize === false) {
      element.style.removeProperty('height');
      element.style.removeProperty('overflow-y');
      return;
    }

    const bounds = autoSize === true ? {} : autoSize;
    const style = getComputedStyle(element);
    const lineHeight = parseFloat(style.lineHeight) || 20;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingBottom = parseFloat(style.paddingBottom) || 0;
    const borderTop = parseFloat(style.borderTopWidth) || 0;
    const borderBottom = parseFloat(style.borderBottomWidth) || 0;
    const boxExtra = paddingTop + paddingBottom + borderTop + borderBottom;

    const maxRows = bounds.maxRows;
    // A `maxRows` below the `rows` fallback would otherwise invert the clamp.
    const minRows = Math.min(
      bounds.minRows ?? this.rows(),
      maxRows ?? Infinity,
    );
    const minHeight = lineHeight * minRows + boxExtra;
    const maxHeight = maxRows ? lineHeight * maxRows + boxExtra : Infinity;

    // Shrink first so scrollHeight reflects the content actually needed, not the previously
    // set height, then grow to fit (clamped between the min/max row bounds). The host's
    // height is pinned meanwhile so the momentary collapse can't shorten the document and
    // clamp the page's scroll position, and the textarea's own scrollTop is restored.
    const host = this.host.nativeElement;
    const pinnedMinHeight = host.style.minHeight;
    host.style.minHeight = `${host.offsetHeight}px`;
    const scrollTop = element.scrollTop;
    element.style.height = 'auto';
    const contentHeight = element.scrollHeight + borderTop + borderBottom;
    const newHeight = Math.min(Math.max(contentHeight, minHeight), maxHeight);
    element.style.height = `${newHeight}px`;
    element.style.overflowY = contentHeight > maxHeight ? 'auto' : 'hidden';
    element.scrollTop = scrollTop;
    host.style.minHeight = pinnedMinHeight;
  }
}
