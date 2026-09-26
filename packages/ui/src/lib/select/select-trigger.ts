import { AndesOverlayTriggerPrimitive } from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  DestroyRef,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import clsx from 'clsx';

import { AndesSelectState, type AndesSelectTag } from './select-state';

/**
 * The closed-state control: a trigger box holding the selection (a value, or removable
 * tags in `multiple`/`tags` mode), the combobox, and the clear/loading/chevron icons.
 * Project an `<andes-select-value />` into it.
 *
 * The box itself is only the positioning anchor and the click target. The focusable
 * `role="combobox"` element inside it is a `<button>`, or an `<input>` when the select is
 * searchable, and every ARIA attribute lands on that element rather than on this host or
 * the box, neither of which is focusable. Tag remove buttons and the clear button are its
 * siblings, never its children: interactive content nested inside a `<button>` is invalid
 * HTML and unreachable for assistive technology.
 */
@Component({
  selector: 'andes-select-trigger',
  imports: [AndesOverlayTriggerPrimitive, NgTemplateOutlet],
  templateUrl: './select-trigger.html',
  styleUrl: './select-trigger.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AndesSelectTrigger {
  protected readonly select = inject(AndesSelectState);
  private readonly destroyRef = inject(DestroyRef);

  private readonly boxRef = viewChild.required<ElementRef<HTMLElement>>('box');
  private readonly comboboxRef = viewChild<ElementRef<HTMLElement>>('combobox');

  protected readonly classes = computed(() =>
    clsx(
      'andes-select__trigger',
      `andes-select__trigger--${this.select.size()}`,
      this.select.invalid() && 'andes-select__trigger--invalid',
    ),
  );

  /** The user's own `aria-describedby`, plus the selection summary when there is one. */
  protected readonly describedBy = computed(
    () =>
      [
        this.select.ariaDescribedby(),
        this.select.selectionSummary() ? this.select.summaryId : undefined,
      ]
        .filter(Boolean)
        .join(' ') || null,
  );

  /**
   * In single search mode the selected value (or placeholder) shows through the input
   * until the user starts typing; in multiple search mode only the placeholder does, and
   * only while there are no tags.
   */
  protected readonly showSearchGhost = computed(
    () =>
      this.select.searchValue() === '' &&
      (!this.select.isMultiple() || !this.select.hasValue()),
  );

  constructor() {
    effect(() =>
      this.select.registerCombobox(this.comboboxRef()?.nativeElement ?? null),
    );

    // Tags wrapping onto a new row grow the box; an open panel has to follow it rather
    // than stay where the box's bottom edge used to be.
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() =>
        this.select.overlay.updatePosition(),
      );
      observer.observe(this.boxRef().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected tagText(tag: AndesSelectTag): string {
    const max = this.select.maxTagTextLength();
    return max !== undefined && tag.label.length > max
      ? `${tag.label.slice(0, max)}...`
      : tag.label;
  }

  protected tagContext(tag: AndesSelectTag) {
    return { $implicit: tag, onClose: () => this.removeTag(tag) };
  }

  protected onBoxClick(event: MouseEvent): void {
    if (this.select.isDisabled()) {
      return;
    }
    const combobox = this.comboboxRef()?.nativeElement;
    this.select.focus();
    // Clicking into the search input of an open panel places the caret; it must not
    // close the panel under the user's pointer.
    if (
      this.select.searchEnabled() &&
      this.select.isOpen() &&
      event.target === combobox
    ) {
      return;
    }
    this.select.toggle();
  }

  /** Keeps focus in the search input when the box around it is pressed. */
  protected onBoxMousedown(event: MouseEvent): void {
    if (
      this.select.searchEnabled() &&
      event.target !== this.comboboxRef()?.nativeElement
    ) {
      event.preventDefault();
    }
  }

  protected removeTag(tag: AndesSelectTag, event?: Event): void {
    event?.stopPropagation();
    this.select.removeValue(tag.value);
    this.select.focus();
  }

  protected onClear(event: Event): void {
    event.stopPropagation();
    this.select.clear();
    this.select.focus();
  }
}
