import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  signal,
  type TemplateRef,
  viewChild,
} from '@angular/core';

import { AndesButton } from '../button/button';
import { AndesTable } from './table';
import type { AndesFilterValue } from './table-data';

/** One choice in a column filter menu. */
export interface AndesTableFilterOption {
  readonly text: string;
  readonly value: AndesFilterValue;
}

/**
 * Context handed to a custom filter panel template. Values are a *draft* until
 * `confirm()` writes them to the table.
 */
export interface AndesTableFilterPanelContext {
  /** Draft selection, same as `selected`. */
  readonly $implicit: readonly AndesFilterValue[];
  readonly selected: readonly AndesFilterValue[];
  /** Replace the draft selection. */
  readonly setSelected: (values: readonly AndesFilterValue[]) => void;
  /** Apply the draft to the table and close. */
  readonly confirm: () => void;
  /** Clear this column's filter and close. */
  readonly clear: () => void;
  /** Close; applies the draft only when `applyOnClose` is on. */
  readonly close: () => void;
}

const VIEWPORT_MARGIN = 8;
const PANEL_GAP = 4;

let nextFilterId = 0;

/**
 * Column filter menu. Put it inside the column's `<th andesTableHead>`; it
 * renders a filter button that opens a panel of checkboxes (radios with
 * `multiple="false"`), optionally searchable, with Reset / OK actions. Or pass a `panel` template for fully custom filter UI.
 *
 * ```html
 * <th andesTableHead sortKey="status">
 *   Status
 *   <andes-table-filter column="status" label="Filter status" [options]="statusOptions" />
 * </th>
 * ```
 *
 * The chosen values land in `AndesTable.filters[column]`; derive the visible rows
 * with `andesFilterRows`. Clicks and keys inside the filter never reach the
 * header, so filtering does not also toggle the column's sort.
 *
 * The panel is a non-modal `role="dialog"` shown in the top layer (Popover API),
 * so the table's scroll container cannot clip it. Escape or clicking outside
 * closes it; focus moves into it on open and back to the button on Escape/OK.
 */
@Component({
  selector: 'andes-table-filter',
  imports: [AndesButton, NgTemplateOutlet],
  templateUrl: './table-filter.html',
  styleUrl: './table-filter.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-table-filter',
    '(click)': '$event.stopPropagation()',
    '(keydown)': 'onKeydown($event)',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
})
export class AndesTableFilter {
  private readonly table = inject(AndesTable);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Column id this filter writes to in `AndesTable.filters`. */
  readonly column = input.required<string>();

  /** Choices offered in the default panel. */
  readonly options = input<readonly AndesTableFilterOption[]>([]);

  /** Allow several values at once (checkboxes) or just one (radios). */
  readonly multiple = input(true, { transform: booleanAttribute });

  /** Show a search box that narrows the options by text. */
  readonly searchable = input(false, { transform: booleanAttribute });

  /**
   * Apply the draft when the panel is dismissed without OK - Escape or a click
   * outside.
   */
  readonly applyOnClose = input(true, { transform: booleanAttribute });

  /** Custom panel content replacing the option list. */
  readonly panel = input<TemplateRef<AndesTableFilterPanelContext> | undefined>(
    undefined,
  );

  /** Accessible name of the button and panel, e.g. "Filter status". */
  readonly label = input('Filter');

  readonly confirmText = input('OK');
  readonly resetText = input('Reset');
  readonly searchPlaceholder = input('Search');
  readonly noMatchText = input('No matches');

  protected readonly id = `andes-table-filter-${nextFilterId++}`;

  protected readonly open = signal(false);
  protected readonly draft = signal<readonly AndesFilterValue[]>([]);
  protected readonly query = signal('');

  private readonly trigger =
    viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panelElement = viewChild<ElementRef<HTMLElement>>('panelEl');

  /** Whether this column currently has a filter applied. */
  readonly active = computed(
    () => this.table.filterValueFor(this.column()).length > 0,
  );

  protected readonly visibleOptions = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    const options = this.options();
    return query
      ? options.filter((option) =>
          option.text.toLocaleLowerCase().includes(query),
        )
      : options;
  });

  protected readonly panelContext = computed<AndesTableFilterPanelContext>(
    () => ({
      $implicit: this.draft(),
      selected: this.draft(),
      setSelected: (values) => this.draft.set([...values]),
      confirm: () => this.confirm(),
      clear: () => {
        this.draft.set([]);
        this.confirm();
      },
      close: () => this.close(this.applyOnClose(), true),
    }),
  );

  constructor() {
    // Keep the panel attached to its button while anything scrolls or resizes.
    effect((onCleanup) => {
      if (!this.open()) {
        return;
      }

      const reposition = (event: Event) => {
        const panel = this.panelElement()?.nativeElement;
        if (
          panel &&
          event.target instanceof Node &&
          panel.contains(event.target)
        ) {
          return;
        }
        this.updatePosition();
      };

      window.addEventListener('scroll', reposition, true);
      window.addEventListener('resize', reposition);
      onCleanup(() => {
        window.removeEventListener('scroll', reposition, true);
        window.removeEventListener('resize', reposition);
      });
    });
  }

  protected isChecked(value: AndesFilterValue): boolean {
    return this.draft().includes(value);
  }

  protected toggleOption(value: AndesFilterValue): void {
    if (!this.multiple()) {
      this.draft.set([value]);
      return;
    }

    const draft = this.draft();
    this.draft.set(
      draft.includes(value)
        ? draft.filter((item) => item !== value)
        : [...draft, value],
    );
  }

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected toggle(): void {
    if (this.open()) {
      this.close(this.applyOnClose(), false);
    } else {
      this.openPanel();
    }
  }

  protected reset(): void {
    this.draft.set([]);
  }

  protected confirm(): void {
    this.close(true, true);
  }

  protected onKeydown(event: KeyboardEvent): void {
    // Nothing typed in the filter may reach the header's Enter/Space sort handler.
    event.stopPropagation();

    if (event.key === 'Escape' && this.open()) {
      event.preventDefault();
      this.close(this.applyOnClose(), true);
    }
  }

  protected onDocumentPointerDown(event: Event): void {
    if (
      this.open() &&
      event.target instanceof Node &&
      !this.host.nativeElement.contains(event.target)
    ) {
      this.close(this.applyOnClose(), false);
    }
  }

  private openPanel(): void {
    this.draft.set([...this.table.filterValueFor(this.column())]);
    this.query.set('');
    this.open.set(true);

    afterNextRender(
      () => {
        const panel = this.panelElement()?.nativeElement;
        if (!panel) {
          return;
        }
        // Top layer: escapes the table's overflow clipping and any stacking context.
        if (typeof panel.showPopover === 'function') {
          panel.showPopover();
        }
        this.updatePosition();
        panel
          .querySelector<HTMLElement>(
            'input:not([disabled]), button:not([disabled]), [tabindex]',
          )
          ?.focus();
      },
      { injector: this.injector },
    );
  }

  private close(apply: boolean, restoreFocus: boolean): void {
    if (!this.open()) {
      return;
    }
    if (apply) {
      this.table.setFilter(this.column(), this.draft());
    }
    this.open.set(false);
    if (restoreFocus) {
      this.trigger().nativeElement.focus();
    }
  }

  private updatePosition(): void {
    const panel = this.panelElement()?.nativeElement;
    if (!panel) {
      return;
    }

    const anchor = this.trigger().nativeElement.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const width = panel.offsetWidth;
    // Align the panel's end edge with the button's, so it opens toward the column
    // it filters, then keep it on screen.
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, anchor.right - width),
      Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN),
    );

    // Written straight to the element: it is pure layout, and it must be in place
    // before focus moves into the panel in the same frame.
    panel.style.top = `${anchor.bottom + PANEL_GAP}px`;
    panel.style.left = `${left}px`;
  }
}
