import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  OnDestroy,
} from '@angular/core';

import { AndesList, AndesListEntry } from './list';

/**
 * One row of an `andes-list`. Content goes in the default slot; the `andes-list-item-meta`
 * and `andes-list-item-actions` parts and a `[slot=extra]` element (shown beside the text of
 * a vertical list, typically an image) are placed for you.
 *
 * A `value` makes the row selectable in a selectable list.
 */
@Component({
  selector: 'andes-list-item',
  imports: [NgTemplateOutlet],
  templateUrl: './list-item.html',
  styleUrl: './list-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'list-item',
    class: 'andes-list-item',
    '[attr.role]': 'role()',
    '[attr.tabindex]': 'tabindex()',
    '[attr.aria-selected]': 'ariaSelected()',
    '[attr.aria-disabled]': 'disabled() ? "true" : null',
    '[attr.data-state]': 'selected() ? "selected" : null',
    '[attr.data-layout]': 'list?.itemLayout() ?? "horizontal"',
    '[class.andes-list-item--interactive]': 'interactive()',
    '[class.andes-list-item--disabled]': 'disabled()',
    '[class.andes-list-item--grid]': 'list?.isGrid() ?? false',
    '[style.block-size.px]': 'virtualSize()',
    '(click)': 'onClick($event)',
    '(focus)': 'onFocus()',
  },
})
export class AndesListItem implements AndesListEntry, OnDestroy {
  protected readonly list = inject<AndesList | null>(AndesList, {
    optional: true,
  });
  readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  /** Identity of the row for selection. */
  readonly value = input<unknown>(undefined);
  readonly disabled = input(false, { transform: booleanAttribute });

  protected readonly vertical = computed(
    () => this.list?.itemLayout() === 'vertical',
  );
  protected readonly interactive = computed(
    () =>
      !!this.list &&
      (this.list.clickable() || this.list.selectable() !== 'none'),
  );
  protected readonly selected = computed(
    () => !!this.list?.isSelected(this.value()),
  );
  protected readonly role = computed(() => this.list?.itemRole() ?? null);
  protected readonly ariaSelected = computed(() =>
    this.list && this.list.selectable() !== 'none'
      ? String(this.selected())
      : null,
  );
  protected readonly tabindex = computed(() => {
    if (!this.interactive() || this.disabled()) {
      return null;
    }
    return this.list?.isTabStop(this.entry) ? 0 : -1;
  });
  protected readonly virtualSize = computed(() =>
    this.list?.virtualScroll() && this.list.dataSource()
      ? this.list.itemSize()
      : null,
  );

  // The list reads the row through functions, so it always sees the current inputs.
  private readonly entry: AndesListEntry = {
    element: this.element,
    value: () => this.value(),
    disabled: () => this.disabled(),
  };

  constructor() {
    this.list?.registerItem(this.entry);
  }

  ngOnDestroy(): void {
    this.list?.unregisterItem(this.entry);
  }

  protected onFocus(): void {
    if (this.interactive()) {
      this.list?.setTabStop(this.entry);
    }
  }

  protected onClick(event: MouseEvent): void {
    if (!this.interactive()) {
      return;
    }
    // A click on a button, link or field inside the row belongs to that control.
    const target = event.target as HTMLElement | null;
    const control = target?.closest(
      'a[href], button, input, select, textarea, label, [role="button"], [contenteditable="true"]',
    );
    if (control && control !== this.element && this.element.contains(control)) {
      return;
    }
    this.list?.activate(this.entry);
  }
}
