import {
  AndesListNavigation,
  andesOverlayPreset,
  AndesOverlayPrimitive,
  provideAndesOverlay,
} from '@andes-ng/primitives';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NG_VALUE_ACCESSOR, type ControlValueAccessor } from '@angular/forms';

import { AndesSelectContent } from './select-content';
import {
  AndesSelectState,
  type AndesSelectCompareWith,
  type AndesSelectDisplayWith,
  type AndesSelectItemRef,
  type AndesSelectSize,
} from './select-state';

/**
 * Single-select listbox: a trigger showing the current selection, and an overlay panel of
 * options navigated with the arrow keys, `Home`/`End` and typeahead.
 *
 * It owns one `AndesOverlayPrimitive` (panel rendering, positioning, dismissal and focus
 * restoration) and one `AndesListNavigation` (roving tabindex and typeahead), and provides
 * both to its own compound parts, which is how `AndesSelectTrigger`, `AndesSelectContent`
 * and `AndesSelectItem` find the same instances without any manual wiring.
 *
 * ```html
 * <andes-select [formControl]="region" placeholder="Pick a region" aria-label="Region">
 *   <andes-select-trigger>
 *     <andes-select-value />
 *   </andes-select-trigger>
 *   <andes-select-content>
 *     <andes-select-item value="us-east">US East</andes-select-item>
 *     <andes-select-item value="eu-west">EU West</andes-select-item>
 *   </andes-select-content>
 * </andes-select>
 * ```
 *
 * Multi-select is deliberately not implemented: the value is always a single value or
 * `null`, and `aria-multiselectable` is never set.
 */
@Component({
  selector: 'andes-select',
  templateUrl: './select.html',
  styleUrl: './select.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    provideAndesOverlay(),
    AndesListNavigation,
    { provide: AndesSelectState, useExisting: forwardRef(() => AndesSelect) },
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AndesSelect),
      multi: true,
    },
  ],
  host: {
    // Forwarded to the real trigger button (and, for the label, to the listbox panel)
    // instead: a screen reader never sees this non-interactive host element, so leaving
    // these here would do nothing.
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.aria-describedby]': 'null',
    '[attr.aria-invalid]': 'null',
    '[attr.data-state]': 'isOpen() ? "open" : "closed"',
    '[attr.data-disabled]': 'isDisabled() ? "" : null',
  },
})
export class AndesSelect
  extends AndesSelectState
  implements ControlValueAccessor
{
  readonly overlay = inject(AndesOverlayPrimitive);
  readonly navigation = inject(AndesListNavigation);

  /**
   * The selected value. Supports `[(value)]`, and coexists with `[formControl]`.
   * Read {@link selectedValue} for the current selection whatever set it.
   */
  readonly value = input<unknown>(undefined);
  /** Text shown while nothing is selected. */
  readonly placeholder = input('');
  /** Disables the control. A form control's own disabled state is honoured too. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /** Marks the field required; surfaces as `aria-required` on the trigger. */
  readonly required = input(false, { transform: booleanAttribute });
  /** Control height. */
  readonly size = input<AndesSelectSize>('md');
  /** Whether typing characters moves the active option while the panel is open. */
  readonly typeahead = input(true, { transform: booleanAttribute });
  /** Compares an option's value with the selected value. Defaults to strict equality. */
  readonly compareWith = input<AndesSelectCompareWith>((a, b) => a === b);
  /** Renders a value that no option carries. Defaults to `String(value)`. */
  readonly displayWith = input<AndesSelectDisplayWith | undefined>(undefined);

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

  /** Emits the new value when the user picks an option. */
  readonly valueChange = output<unknown>();
  /** Emits when the panel opens or closes. */
  readonly openChange = output<boolean>();

  private readonly content = contentChild(AndesSelectContent, {
    descendants: true,
  });

  private readonly _value = signal<unknown>(null);
  private readonly _items = signal<readonly AndesSelectItemRef[]>([]);
  private readonly _formDisabled = signal(false);

  /**
   * Labels of every option that has ever registered, keyed by value, so the trigger keeps
   * showing a sensible label after the option list itself changes - options arriving
   * asynchronously, or a filtered list that no longer contains the selected value.
   */
  private readonly labelCache = new Map<unknown, string>();
  private readonly labelCacheVersion = signal(0);

  private onChange: (value: unknown) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  /** The current selection, whether it came from the input, a form or the user. */
  readonly selectedValue = this._value.asReadonly();
  readonly isOpen = this.overlay.isOpen;

  readonly hasValue = computed(() => {
    const value = this._value();
    return value !== null && value !== undefined && value !== '';
  });

  readonly invalid = this.ariaInvalid;

  readonly isDisabled = computed(() => this.disabled() || this._formDisabled());

  /** The registered option carrying the selected value, while the panel is open. */
  private readonly selectedItem = computed(() => {
    if (!this.hasValue()) {
      return null;
    }
    const value = this._value();
    const compare = this.compareWith();
    return this._items().find((item) => compare(item.value(), value)) ?? null;
  });

  /**
   * Trigger text for the selected value, resolved in order: the option currently
   * carrying it, the label cached from the last time one did, the `displayWith`
   * function, and finally the value itself stringified.
   */
  readonly displayLabel = computed<string | null>(() => {
    if (!this.hasValue()) {
      return null;
    }
    const value = this._value();

    const rendered = this.selectedItem()?.getLabel();
    if (rendered) {
      return rendered;
    }

    const cached = this.cachedLabel(value);
    if (cached) {
      return cached;
    }

    const displayWith = this.displayWith();
    return displayWith ? displayWith(value) : String(value);
  });

  constructor() {
    super();

    this.overlay.configure({
      // `menu` is the closest preset: anchored to the trigger, click-opened, dismissed
      // by Escape and outside-click, no backdrop and no scroll lock. Only the listbox
      // role and the focus handling differ, and both are overridden here - focus is
      // moved to a specific option by `activateSelectedOption`, not to the first
      // tabbable element, so `autoFocus` must stay out of the way.
      ...andesOverlayPreset('menu'),
      role: 'listbox',
      autoFocus: 'none',
      positioning: {
        kind: 'anchored',
        side: 'bottom',
        align: 'start',
        sideOffset: 4,
        matchAnchorWidth: true,
      },
    });

    this.navigation.configure({
      orientation: 'vertical',
      focusMode: 'roving-tabindex',
      homeAndEnd: true,
      skipDisabled: true,
      // A native `<select>` stops at the first and last option rather than cycling, and
      // a listbox is the one WAI-ARIA pattern where wrapping is not the convention.
      wrap: false,
    });

    effect(() => this.navigation.typeahead.set(this.typeahead()));

    effect(() => {
      const value = this.value();
      if (value !== undefined) {
        this._value.set(value);
      }
    });

    effect(() => {
      if (this.isDisabled() && this.overlay.isOpen()) {
        this.overlay.close('imperative');
      }
    });

    this.overlay.opened
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.openChange.emit(true));

    this.overlay.closed.pipe(takeUntilDestroyed()).subscribe(() => {
      this.navigation.clearActive();
      this.navigation.cancelTypeahead();
      this.openChange.emit(false);
      this.onTouched();
    });

    this.overlay.keydownEvents
      .pipe(takeUntilDestroyed())
      .subscribe((event) => this.onPanelKeydown(event));
  }

  /** Moves focus to the trigger. */
  focus(): void {
    this.overlay.anchor()?.focus();
  }

  override open(): void {
    if (this.isDisabled() || this.overlay.isOpen()) {
      return;
    }

    const content = this.content();
    if (!content) {
      throw new Error(
        'AndesSelect: no <andes-select-content> was found. A select needs one to render its options into.',
      );
    }

    this.overlay.open(content.panelTemplate());
    this.activateSelectedOption();
  }

  override close(): void {
    this.overlay.close('imperative');
  }

  override toggle(): void {
    if (this.overlay.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  override registerItem(item: AndesSelectItemRef): void {
    this._items.update((items) => [...items, item]);
    this.cacheLabel(item);
  }

  override unregisterItem(item: AndesSelectItemRef): void {
    this._items.update((items) => items.filter((entry) => entry !== item));
  }

  override isSelected(item: AndesSelectItemRef): boolean {
    if (!this.hasValue()) {
      return false;
    }
    return this.compareWith()(item.value(), this._value());
  }

  override selectItem(item: AndesSelectItemRef): void {
    if (this.isDisabled() || item.disabled()) {
      return;
    }

    const value = item.value();
    this.cacheLabel(item);
    this._value.set(value);
    this.onChange(value);
    this.onTouched();
    this.valueChange.emit(value);
    this.close();
  }

  override markAsTouched(): void {
    this.onTouched();
  }

  /**
   * Keys on the closed trigger. Every key handled here is `preventDefault`ed, which is
   * also how {@link onPanelKeydown} knows to ignore the very same event: the overlay's
   * document-level key dispatcher starts listening during this handler, so the keystroke
   * that opened the panel can be delivered to it a second time.
   */
  override onTriggerKeydown(event: KeyboardEvent): void {
    if (this.isDisabled() || this.overlay.isOpen()) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.open();
        return;
      case 'Home':
        event.preventDefault();
        this.open();
        this.navigation.focusFirst();
        return;
      case 'End':
        event.preventDefault();
        this.open();
        this.navigation.focusLast();
        return;
      default:
        break;
    }

    // Typing a character on a closed native `<select>` opens it on the first match, so
    // do the same: open, then hand the keystroke to the typeahead.
    if (this.typeahead() && isPrintableCharacter(event)) {
      event.preventDefault();
      this.open();
      this.navigation.onKeydown(event);
    }
  }

  writeValue(value: unknown): void {
    this._value.set(value ?? null);
  }

  registerOnChange(fn: (value: unknown) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this._formDisabled.set(isDisabled);
  }

  /**
   * Keys reaching the open panel. Arrow keys, `Home`/`End` and typeahead go to the list
   * navigation primitive; `Enter`/`Space` commit the active option; `Tab` closes without
   * selecting. `Escape` is left to the overlay primitive, which closes and restores focus.
   */
  private onPanelKeydown(event: KeyboardEvent): void {
    if (!this.overlay.isOpen() || event.defaultPrevented) {
      return;
    }

    switch (event.key) {
      case 'Escape':
        return;
      case 'Enter':
        event.preventDefault();
        this.commitActiveOption();
        return;
      case ' ':
        // Space extends a typeahead query in progress and only otherwise selects.
        if (this.navigation.isTyping()) {
          break;
        }
        event.preventDefault();
        this.commitActiveOption();
        return;
      case 'Tab':
        // Closing returns focus to the trigger, from where a second Tab leaves the
        // field. Letting Tab through instead would move focus off an option that is
        // about to be destroyed.
        event.preventDefault();
        this.close();
        return;
      default:
        break;
    }

    this.navigation.onKeydown(event);
  }

  private commitActiveOption(): void {
    const active = this.navigation.activeItem();
    const item = active
      ? this._items().find((entry) => entry.optionElement === active.element)
      : undefined;

    if (item && !item.disabled()) {
      this.selectItem(item);
      return;
    }
    this.close();
  }

  /**
   * Makes the selected option active - and, in `roving-tabindex` mode, focused - so the
   * panel opens with the current selection under the keyboard cursor. Falls back to the
   * first enabled option when nothing is selected yet.
   */
  private activateSelectedOption(): void {
    const selected = this.selectedItem();
    const target = selected
      ? this.navigation
          .items()
          .find((item) => item.element === selected.optionElement)
      : undefined;

    if (target) {
      this.navigation.focusItem(target);
      return;
    }
    this.navigation.focusFirst();
  }

  private cacheLabel(item: AndesSelectItemRef): void {
    const label = item.getLabel();
    if (!label) {
      return;
    }
    this.labelCache.set(item.value(), label);
    this.labelCacheVersion.update((version) => version + 1);
  }

  private cachedLabel(value: unknown): string | undefined {
    // Read so the lookup re-runs when the cache grows; the cache itself is a plain Map
    // because it is keyed by arbitrary values and matched with `compareWith`.
    this.labelCacheVersion();

    const compare = this.compareWith();
    for (const [cachedValue, label] of this.labelCache) {
      if (compare(cachedValue, value)) {
        return label;
      }
    }
    return undefined;
  }
}

function isPrintableCharacter(event: KeyboardEvent): boolean {
  return (
    event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey
  );
}
