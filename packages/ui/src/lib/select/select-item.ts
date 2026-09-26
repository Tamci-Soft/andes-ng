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

import { AndesSelectGroup } from './select-group';
import { AndesSelectState, type AndesSelectItemRef } from './select-state';

/**
 * One selectable option.
 *
 * The `role="option"` element is the inner element rather than this host: in
 * roving-tabindex mode it is the one that carries the `tabindex` and receives real DOM
 * focus, in active-descendant mode it is the one `aria-activedescendant` points at, and
 * ARIA on a non-focusable host element would never reach a screen reader.
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
  /** Whether the option can be selected. Disabled options stay reachable, but are skipped by the arrow keys. */
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * Text used for typeahead, search filtering and the trigger's label. Defaults to the
   * option's own text, which is usually right; set it when the visible text is split
   * across elements or decorated with icons.
   */
  readonly label = input<string | undefined>(undefined);
  /** Arbitrary data handed to the select's `filterOption` and `optionFilterProp`. */
  readonly data = input<unknown>(undefined);
  /** @internal Marks an option the select renders itself for a `tags`-mode value. */
  readonly custom = input(false, { transform: booleanAttribute });

  protected readonly select = inject(AndesSelectState);
  private readonly group = inject(AndesSelectGroup, { optional: true });
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly optionRef =
    viewChild.required<ElementRef<HTMLElement>>('option');

  /** @internal The `role="option"` element, shared with the list-navigation primitive. */
  get optionElement(): HTMLElement {
    return this.optionRef().nativeElement;
  }

  protected readonly selected = computed(() => this.select.isSelected(this));
  protected readonly filteredOut = computed(() =>
    this.select.isFilteredOut(this),
  );
  /** Unselectable because the select's `maxCount` has been reached. */
  protected readonly blocked = computed(() => this.select.isBlocked(this));
  protected readonly unavailable = computed(
    () => this.disabled() || this.blocked(),
  );
  /** Skipped by the arrow keys: unavailable, or hidden by the search. */
  protected readonly skipped = computed(
    () => this.unavailable() || this.filteredOut(),
  );

  constructor() {
    this.group?.registerItem(this);
  }

  /**
   * Registration waits for the view: the option element and its projected text only
   * exist afterwards, and both the parent's registry and the label cache need them.
   */
  ngAfterViewInit(): void {
    this.select.registerItem(this);
  }

  ngOnDestroy(): void {
    this.select.unregisterItem(this);
    this.group?.unregisterItem(this);
  }

  getLabel(): string {
    // The host rather than the option element: the host exists from construction, so
    // the search filter can ask for a label before this item's own view has rendered.
    return this.label() ?? (this.host.nativeElement.textContent ?? '').trim();
  }

  protected onClick(): void {
    if (this.unavailable()) {
      return;
    }
    this.select.selectItem(this);
  }

  /** Keeps focus in the search input while an option is pressed. */
  protected onMousedown(event: MouseEvent): void {
    if (this.select.searchEnabled()) {
      event.preventDefault();
    }
  }
}
