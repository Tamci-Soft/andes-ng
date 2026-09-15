import {
  AndesListNavigation,
  type AndesListNavigationItemRef,
} from '@andes-ng/primitives';
import {
  booleanAttribute,
  computed,
  Directive,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  type Signal,
} from '@angular/core';

import { AndesCombobox } from './combobox';

let nextItemId = 0;

/**
 * One suggestion inside `andesComboboxContent`.
 *
 * Implements `AndesListNavigationItemRef` directly - registering and unregistering with
 * the shared `AndesListNavigation` service exactly as `AndesListNavigationItem` does -
 * rather than composing that directive, because `AndesListNavigation` intentionally "owns
 * no selection state, sets no role/aria-selected... a component that activates manually
 * handles Enter/Space itself" (see its doc comment). Selection is exactly the part this
 * directive adds: `role="option"`, `aria-selected` and pointer-driven commit.
 *
 * Selecting on `mousedown` rather than `click`, with `preventDefault()`, is deliberate: it
 * stops the browser from ever shifting focus to this element, so the `<input>` never blurs
 * and the accessibility contract - focus never leaves the input while navigating or
 * choosing a suggestion - holds for mouse users too, not only keyboard ones.
 *
 * ```html
 * <div andesComboboxItem [value]="fruit" [disabled]="fruit.outOfStock">{{ fruit.name }}</div>
 * ```
 */
@Directive({
  selector: '[andesComboboxItem]',
  host: {
    class: 'andes-combobox-item',
    role: 'option',
    '[attr.id]': 'itemId',
    '[attr.aria-selected]': 'selected()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-active]': 'active() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(mousedown)': 'onMouseDown($event)',
  },
})
export class AndesComboboxItem<T = string>
  implements AndesListNavigationItemRef, OnInit, OnDestroy
{
  /** The value this suggestion represents, passed to `selectValue`/`valueChange`. */
  readonly value = input.required<T>();

  /** Excludes this suggestion from keyboard navigation and pointer selection. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** `AndesListNavigationItemRef`'s contract; a plain alias for {@link disabled}. */
  readonly isDisabled: Signal<boolean> = this.disabled;

  private readonly combobox = inject(AndesCombobox) as AndesCombobox<T>;
  private readonly navigation = inject(AndesListNavigation);

  readonly element: HTMLElement =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly itemId: string =
    this.element.id || `andes-combobox-item-${nextItemId++}`;

  protected readonly active = computed(
    () => this.navigation.activeItem() === this,
  );

  protected readonly selected = computed(() =>
    this.combobox.isSelected(this.value()) ? 'true' : 'false',
  );

  ngOnInit(): void {
    this.navigation.register(this);
  }

  ngOnDestroy(): void {
    this.navigation.unregister(this);
  }

  getLabel(): string {
    return this.combobox.itemToStringValue()(this.value());
  }

  /** Never called: `AndesListNavigation` only invokes this in `'roving-tabindex'` mode. */
  focus(): void {
    this.element.focus();
  }

  setActiveStyles(): void {
    this.element.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function -- required by the CDK's `Highlightable` interface
  setInactiveStyles(): void {}

  protected onMouseDown(event: MouseEvent): void {
    // Keeps real focus on the <input> - see the class doc comment.
    event.preventDefault();
    if (this.disabled()) {
      return;
    }
    this.combobox.selectValue(this.value());
  }
}
