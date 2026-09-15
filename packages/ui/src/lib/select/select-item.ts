import { AndesListNavigationItem } from '@andes-ng/primitives';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  viewChild,
  type AfterViewInit,
  type OnDestroy,
} from '@angular/core';

import { AndesSelectState, type AndesSelectItemRef } from './select-state';

/**
 * One selectable option.
 *
 * The `role="option"` element is the inner element rather than this host: it is the one
 * that carries the roving `tabindex` and receives real DOM focus while the panel is open,
 * and ARIA on a non-focusable host element would never reach a screen reader.
 */
@Component({
  selector: 'andes-select-item',
  imports: [AndesListNavigationItem],
  templateUrl: './select-item.html',
  styleUrl: './select-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesSelectItem
  implements AndesSelectItemRef, AfterViewInit, OnDestroy
{
  /** The value this option selects. */
  readonly value = input.required<unknown>();
  /** Whether the option can be selected or navigated to. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * Text used for typeahead and for the trigger's label. Defaults to the option's own
   * text, which is usually right; set it when the visible text is split across elements
   * or decorated with icons.
   */
  readonly label = input<string | undefined>(undefined);

  private readonly select = inject(AndesSelectState);
  private readonly optionRef =
    viewChild.required<ElementRef<HTMLElement>>('option');

  /** @internal The `role="option"` element, shared with the list-navigation primitive. */
  get optionElement(): HTMLElement {
    return this.optionRef().nativeElement;
  }

  protected readonly selected = computed(() => this.select.isSelected(this));

  /**
   * Registration waits for the view: the option element and its projected text only
   * exist afterwards, and both the parent's registry and the label cache need them.
   */
  ngAfterViewInit(): void {
    this.select.registerItem(this);
  }

  ngOnDestroy(): void {
    this.select.unregisterItem(this);
  }

  getLabel(): string {
    return this.label() ?? (this.optionElement.textContent ?? '').trim();
  }

  protected onClick(): void {
    if (this.disabled()) {
      return;
    }
    this.select.selectItem(this);
  }
}
