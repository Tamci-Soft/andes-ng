import { AndesOverlayTriggerPrimitive } from '@andes-ng/primitives';
import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  DestroyRef,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import clsx from 'clsx';

import { AndesSelectState, type AndesSelectTag } from './select-state';

/** Room kept free for the search input when tags are fitted to one row, in px. */
const RESPONSIVE_SEARCH_RESERVE = 20;

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
  host: {
    '(document:click)': 'onDocumentClick($event)',
  },
})
export class AndesSelectTrigger {
  protected readonly select = inject(AndesSelectState);
  private readonly destroyRef = inject(DestroyRef);

  private readonly boxRef = viewChild.required<ElementRef<HTMLElement>>('box');
  private readonly comboboxRef = viewChild<ElementRef<HTMLElement>>('combobox');
  private readonly selectionRef =
    viewChild.required<ElementRef<HTMLElement>>('selection');
  private readonly measureRef = viewChild<ElementRef<HTMLElement>>('measure');

  /** Whether tags are fitted to a single row (`maxTagCount="responsive"`). */
  protected readonly responsive = computed(
    () => this.select.responsiveTags() && this.select.isMultiple(),
  );

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
    // than stay where the box's bottom edge used to be. The same observer re-fits
    // responsive tags when the box is resized.
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const observer = new ResizeObserver(() => {
        this.select.repositionPanel();
        this.fitTags();
      });
      observer.observe(this.boxRef().nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });

    // Re-fit once the measuring row has rendered a changed set of tags.
    afterRenderEffect(() => {
      this.select.tags();
      this.select.searchEnabled();
      if (!this.responsive()) {
        untracked(() => this.select.setResponsiveTagCount(null));
        return;
      }
      this.measureRef();
      untracked(() => this.fitTags());
    });
  }

  /**
   * Counts how many tags fit on the selection row next to the `+ N ...` tag (and the
   * search input), from the widths in the measuring row. At least one tag stays visible;
   * it shrinks and ellipsises when even that one is too wide. A row that has not been
   * laid out (zero width) leaves every tag visible.
   */
  private fitTags(): void {
    const measure = this.measureRef()?.nativeElement;
    const selection = this.selectionRef().nativeElement;
    if (!this.responsive() || !measure || selection.clientWidth === 0) {
      return;
    }

    const widths = Array.from(
      measure.querySelectorAll<HTMLElement>('[data-measure="tag"]'),
      (element) => element.offsetWidth,
    );
    const rest =
      measure.querySelector<HTMLElement>('[data-measure="rest"]')
        ?.offsetWidth ?? 0;
    const gap = parseFloat(getComputedStyle(selection).columnGap) || 0;
    const reserve = this.select.searchEnabled()
      ? RESPONSIVE_SEARCH_RESERVE + gap
      : 0;
    const available = selection.clientWidth - reserve;

    const total = widths.reduce(
      (sum, width, index) => sum + width + (index > 0 ? gap : 0),
      0,
    );
    if (total <= available) {
      this.select.setResponsiveTagCount(widths.length);
      return;
    }

    let used = rest;
    let count = 0;
    for (const width of widths) {
      if (used + gap + width > available) {
        break;
      }
      used += gap + width;
      count++;
    }
    this.select.setResponsiveTagCount(
      Math.max(count, Math.min(1, widths.length)),
    );
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

  /**
   * A click on a `<label>` naming the combobox only focuses it, as it does a native
   * `<select>`. Left alone, the browser would re-dispatch that click onto the combobox,
   * where {@link onBoxClick} opens the panel. Clicks inside the box, or on a link or
   * control inside the label, are not the label's own and pass through untouched.
   */
  protected onDocumentClick(event: MouseEvent): void {
    const combobox = this.comboboxRef()?.nativeElement;
    const target = event.target instanceof Element ? event.target : null;
    const label = target?.closest('label');
    if (
      !combobox ||
      !target ||
      !label ||
      label.control !== combobox ||
      event.defaultPrevented ||
      this.boxRef().nativeElement.contains(target)
    ) {
      return;
    }
    const interactive = target.closest(
      'a[href], button, input, select, textarea',
    );
    if (interactive && label.contains(interactive)) {
      return;
    }
    event.preventDefault();
    if (!this.select.isDisabled()) {
      this.select.focus();
    }
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
