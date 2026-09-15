import {
  AndesListNavigation,
  type AndesListNavigationItemRef,
} from '@andes-ng/primitives';
import {
  booleanAttribute,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  OnDestroy,
  OnInit,
  Renderer2,
  type Signal,
} from '@angular/core';

import { AndesCombobox } from './combobox';
import {
  ANDES_COMBOBOX_SELECTED_ICON,
  createAndesComboboxIcon,
} from './combobox-icons';

let nextItemId = 0;

/**
 * One suggestion inside `andesComboboxContent`.
 *
 * Implements `AndesListNavigationItemRef` directly - registering and unregistering with
 * the shared `AndesListNavigation` service exactly as `AndesListNavigationItem` does -
 * rather than composing that directive, because `AndesListNavigation` intentionally "owns
 * no selection state, sets no role/aria-selected... a component that activates manually
 * handles Enter/Space itself" (see its doc comment). Selection is exactly the part this
 * directive adds: `role="option"`, `aria-selected`, the trailing check on the chosen
 * suggestion, and pointer-driven commit.
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
    '[attr.data-selected]': 'isSelected() ? "" : null',
    '[attr.data-disabled]': 'disabled() ? "" : null',
    '(mousedown)': 'onMouseDown($event)',
    '(mouseenter)': 'onPointerOver()',
    '(mousemove)': 'onPointerOver()',
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
  private readonly renderer = inject(Renderer2);

  readonly element: HTMLElement =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  readonly itemId: string =
    this.element.id || `andes-combobox-item-${nextItemId++}`;

  protected readonly active = computed(
    () => this.navigation.activeItem() === this,
  );

  /** Whether this suggestion is the committed value, per the root's `compareWith`. */
  protected readonly isSelected = computed(() =>
    this.combobox.isSelected(this.value()),
  );

  protected readonly selected = computed(() =>
    this.isSelected() ? 'true' : 'false',
  );

  /** The slot the check lives in; always laid out, so labels line up across every row. */
  private indicator: HTMLElement | null = null;
  private check: SVGElement | null = null;

  constructor() {
    // A directive has no template to hang `@if (isSelected())` off, so the check is added
    // and removed here instead - see createAndesComboboxIcon for why these parts stay
    // directives. The effect's first run is what creates the slot, since only by then is
    // the label the consumer projected in place for it to sit after.
    effect(() => {
      const selected = this.isSelected();
      const indicator = (this.indicator ??= this.createIndicator());

      if (selected === (this.check !== null)) {
        return;
      }
      if (selected) {
        this.check = createAndesComboboxIcon(
          this.renderer,
          ANDES_COMBOBOX_SELECTED_ICON,
          'andes-combobox-item__check',
        );
        this.renderer.appendChild(indicator, this.check);
      } else {
        this.renderer.removeChild(indicator, this.check);
        this.check = null;
      }
    });
  }

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

  /**
   * Follows the pointer with the same "active item" the arrow keys move, so hovering a
   * suggestion highlights it and Enter commits whatever the mouse is over - the behaviour
   * every other listbox-shaped component here gets for free from `:hover` plus real focus.
   * This list cannot: focus never leaves the `<input>`, so the highlight is *only* ever
   * `aria-activedescendant`, and nothing but this moves it.
   *
   * `setActiveItemSilently` rather than `focusItem` because the pointer is already on the
   * row - scrolling it "into view" underneath a stationary mouse would yank the list.
   *
   * `mousemove` as well as `mouseenter`: once an arrow key has moved the highlight off a
   * row the pointer never left, `mouseenter` will not fire for that row again, so the next
   * twitch of the mouse has to be what takes the highlight back.
   */
  protected onPointerOver(): void {
    if (this.disabled() || this.navigation.activeItem() === this) {
      return;
    }
    this.navigation.setActiveItemSilently(this);
  }

  private createIndicator(): HTMLElement {
    const indicator: HTMLElement = this.renderer.createElement('span');
    this.renderer.addClass(indicator, 'andes-combobox-item__indicator');
    this.renderer.setAttribute(indicator, 'aria-hidden', 'true');
    this.renderer.appendChild(this.element, indicator);
    return indicator;
  }
}
