import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  Directive,
  effect,
  ElementRef,
  inject,
  InjectionToken,
  Injector,
  input,
  type OnInit,
  output,
  signal,
  type Signal,
  type TemplateRef,
  untracked,
  viewChild,
} from '@angular/core';

import { AndesButton } from '../button/button';
import { AndesTable } from './table';
import {
  ANDES_TABLE_FILTERABLE,
  andesPlacePanel,
  type AndesPanelSide,
  type AndesTableFilterable,
} from './table-context';
import type {
  AndesColumnFilterMatcher,
  AndesFilterPredicate,
  AndesFilterValue,
} from './table-data';

/**
 * One choice in a column filter menu. `children` nests further choices: shown as a
 * labelled group in `menu` mode, or as a checkable tree in `tree` mode.
 */
export interface AndesTableFilterOption {
  readonly text: string;
  readonly value: AndesFilterValue;
  readonly children?: readonly AndesTableFilterOption[];
}

/** How the default panel lays out nested options (Ant Design's `filterMode`). */
export type AndesTableFilterMode = 'menu' | 'tree';

/**
 * Custom match for the filter's search box (Ant Design's `filterSearch` function):
 * whether `option` stays visible for the typed `query`.
 */
export type AndesTableFilterSearchFn = (
  query: string,
  option: AndesTableFilterOption,
) => boolean;

/**
 * A filter body projected into `andes-table-filter` in place of its option
 * list - the ready-made text, range and date panels, or any element marked
 * `andesTableFilterPanel`. It reads and writes the filter's draft through the
 * injected `AndesTableFilter`; the filter keeps the Reset / OK footer.
 */
export interface AndesTableFilterPanelHost {
  /** While true, OK is disabled - e.g. a range whose minimum exceeds its maximum. */
  readonly invalid?: Signal<boolean>;
}

export const ANDES_TABLE_FILTER_PANEL =
  new InjectionToken<AndesTableFilterPanelHost>('ANDES_TABLE_FILTER_PANEL');

/**
 * Marks projected content as the body of an `andes-table-filter` panel. Inside,
 * inject `AndesTableFilter` to read `draft()` and call `setDraft`, `confirm`,
 * `reset` or `close`.
 *
 * ```html
 * <andes-table-filter column="tags" label="Filter tags">
 *   <my-tag-picker andesTableFilterPanel />
 * </andes-table-filter>
 * ```
 */
@Directive({
  selector: '[andesTableFilterPanel]',
  providers: [
    { provide: ANDES_TABLE_FILTER_PANEL, useExisting: AndesTableFilterPanel },
  ],
})
export class AndesTableFilterPanel implements AndesTableFilterPanelHost {}

/** Options for `confirm` in a custom panel. */
export interface AndesTableFilterConfirmOptions {
  /** Close the panel after applying. Default `true`. */
  readonly closeDropdown?: boolean;
}

/** Options for `clear` in a custom panel. */
export interface AndesTableFilterClearOptions {
  /** Apply the cleared filter to the table straight away. Default `true`. */
  readonly confirm?: boolean;
  /** Close the panel. Default `true`. */
  readonly closeDropdown?: boolean;
}

/**
 * Context handed to a custom filter panel template (Ant Design's `filterDropdown`).
 * Values are a *draft* until `confirm()` writes them to the table.
 */
export interface AndesTableFilterPanelContext {
  /** Draft selection, same as `selected`. */
  readonly $implicit: readonly AndesFilterValue[];
  readonly selected: readonly AndesFilterValue[];
  /** Replace the draft selection. */
  readonly setSelected: (values: readonly AndesFilterValue[]) => void;
  /** Apply the draft to the table and, unless told otherwise, close. */
  readonly confirm: (options?: AndesTableFilterConfirmOptions) => void;
  /** Empty the draft and, unless told otherwise, apply that and close. */
  readonly clear: (options?: AndesTableFilterClearOptions) => void;
  /** Put the draft back to what Reset restores, without applying or closing. */
  readonly reset: () => void;
  /** Close; applies the draft only when `applyOnClose` is on. */
  readonly close: () => void;
  /** The filter's `options`, for panels that render them their own way. */
  readonly options: readonly AndesTableFilterOption[];
}

/** Context handed to a custom trigger icon template (Ant Design's `filterIcon`). */
export interface AndesTableFilterIconContext {
  /** Whether the column is currently filtered. */
  readonly $implicit: boolean;
  readonly filtered: boolean;
}

let nextFilterId = 0;

function searchTransform(
  value: boolean | AndesTableFilterSearchFn | string | null | undefined,
): boolean | AndesTableFilterSearchFn {
  return typeof value === 'function' ? value : booleanAttribute(value);
}

/** Every value in `option`'s subtree, its own included. */
function subtreeValues(option: AndesTableFilterOption): AndesFilterValue[] {
  return [option.value, ...(option.children ?? []).flatMap(subtreeValues)];
}

function sameValues(
  a: readonly AndesFilterValue[],
  b: readonly AndesFilterValue[],
): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const set = new Set(a);
  return b.every((value) => set.has(value));
}

/**
 * Column filter menu. Put it inside the column's `<th andesTableHead>`; it
 * renders a filter button that opens a panel of checkboxes (radios with
 * `multiple="false"`), optionally searchable and optionally nested, with
 * Reset / OK actions. Or pass a `panel` template for fully custom filter UI.
 *
 * ```html
 * <th andesTableHead sortKey="status">
 *   Status
 *   <andes-table-filter column="status" label="Filter status" [options]="statusOptions" />
 * </th>
 * ```
 *
 * The chosen values land in `AndesTable.filters[column]`. Derive the visible rows
 * with `andesFilterRows`, or give the filter a `predicate` and use
 * `AndesTable.filterRows`. Clicks and keys inside the filter never reach the
 * header, so filtering does not also toggle the column's sort.
 *
 * Ant Design's column filter props map onto inputs as follows: `filters` ->
 * `options`, `filterMultiple` -> `multiple`, `filterSearch` -> `searchable`
 * (`true` or a match function), `filterMode` -> `mode`, `filteredValue` /
 * `defaultFilteredValue` -> the inputs of the same name,
 * `filterResetToDefaultFilteredValue` -> `resetToDefault`, `filterOnClose` ->
 * `applyOnClose`, `filterDropdown` -> `panel`, `filterIcon` -> `icon`, `onFilter`
 * -> `predicate`, `onFilterDropdownOpenChange` -> `(openChange)`.
 *
 * The panel is a non-modal `role="dialog"` shown in the top layer (Popover API),
 * so the table's scroll container cannot clip it; it opens below the button, or
 * above when there is more room there. Escape, clicking outside or tabbing away
 * closes it; focus moves into it on open and back to the button on Escape/OK.
 * Enter on an option or the search box applies; Arrow Up/Down move between
 * checkbox options and Arrow Right/Left expand/collapse a tree node.
 *
 * Other kinds of filter:
 * - project a ready-made panel - `andes-table-text-filter`,
 *   `andes-table-range-filter`, `andes-table-date-range-filter` - or your own
 *   element marked `andesTableFilterPanel`; it replaces the option list and
 *   keeps the Reset / OK footer;
 * - pass a `panel` template for a fully custom panel, footer included.
 *
 * Any other projected content replaces the default funnel icon of the button.
 * The filter is exported as `andesTableFilter`, so a custom icon can follow
 * `active()`.
 */
@Component({
  selector: 'andes-table-filter',
  imports: [AndesButton, NgTemplateOutlet],
  exportAs: 'andesTableFilter',
  templateUrl: './table-filter.html',
  styleUrl: './table-filter.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: ANDES_TABLE_FILTERABLE, useExisting: AndesTableFilter },
  ],
  host: {
    class: 'andes-table-filter',
    '(click)': '$event.stopPropagation()',
    // A header that can be dragged to reorder must not start dragging from here.
    '(mousedown)': '$event.stopPropagation()',
    '(touchstart)': '$event.stopPropagation()',
    '(keydown)': 'onKeydown($event)',
    '(focusout)': 'onFocusOut($event)',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
})
export class AndesTableFilter implements AndesTableFilterable, OnInit {
  private readonly table = inject(AndesTable);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Column id this filter writes to in `AndesTable.filters`. */
  readonly column = input.required<string>();

  /** Choices offered in the default panel. */
  readonly options = input<readonly AndesTableFilterOption[]>([]);

  /** Allow several values at once (checkboxes) or just one (radios). */
  readonly multiple = input(true, { transform: booleanAttribute });

  /**
   * Layout of nested `options`: `menu` shows parents as group labels, `tree` as
   * checkable, collapsible nodes - checking a parent checks its whole subtree, and
   * a "select all" box heads the list.
   */
  readonly mode = input<AndesTableFilterMode>('menu');

  /**
   * Show a search box that narrows the options: `true` matches the option text
   * case-insensitively, or pass a function for a custom match.
   */
  readonly searchable = input<
    boolean | AndesTableFilterSearchFn,
    boolean | AndesTableFilterSearchFn | string | null | undefined
  >(false, { transform: searchTransform });

  /**
   * Apply the draft when the panel is dismissed without OK - Escape, a click
   * outside or tabbing away.
   */
  readonly applyOnClose = input(true, { transform: booleanAttribute });

  /**
   * Controlled filter value. While it is defined (`null` meaning "no filter") it
   * is the column's filter: the table follows it, and OK only reports the choice
   * through `(filterChange)` / the table's `(tableChange)` - update this input to
   * accept it. Leave it `undefined` for an uncontrolled filter.
   */
  readonly filteredValue = input<
    readonly AndesFilterValue[] | null | undefined
  >(undefined);

  /** Initial filter of an uncontrolled column, applied when the table has none for it. */
  readonly defaultFilteredValue = input<readonly AndesFilterValue[]>([]);

  /** Reset returns the draft to `defaultFilteredValue` instead of emptying it. */
  readonly resetToDefault = input(false, { transform: booleanAttribute });

  /**
   * How a row is tested against this column's filter (Ant Design's `onFilter`):
   * a per-value predicate (values OR-ed), or a matcher that sees all of the
   * column's values at once - `andesTextFilter`, `andesRangeFilter`,
   * `andesDateRangeFilter`. Collected by `AndesTable.filterRows`.
   */
  readonly predicate = input<
    AndesFilterPredicate<never> | AndesColumnFilterMatcher<never> | undefined
  >(undefined);

  /** Custom panel content replacing the default one. */
  readonly panel = input<TemplateRef<AndesTableFilterPanelContext> | undefined>(
    undefined,
  );

  /** Custom trigger icon replacing the funnel. */
  readonly icon = input<TemplateRef<AndesTableFilterIconContext> | undefined>(
    undefined,
  );

  /** Accessible name of the button and panel, e.g. "Filter status". */
  readonly label = input('Filter');

  readonly confirmText = input('OK');
  readonly resetText = input('Reset');
  readonly searchPlaceholder = input('Search in filters');
  readonly noMatchText = input('No matches');
  readonly selectAllText = input('Select all items');

  /** The values applied with OK (or by dismissing, per `applyOnClose`). */
  readonly filterChange = output<readonly AndesFilterValue[]>();

  /** The panel opened (`true`) or closed (`false`). */
  readonly openChange = output<boolean>();

  protected readonly id = `andes-table-filter-${nextFilterId++}`;

  protected readonly open = signal(false);
  private readonly draftState = signal<readonly AndesFilterValue[]>([]);

  /** Whether the panel is showing. */
  readonly isOpen = this.open.asReadonly();

  /**
   * Values picked in the open panel and not applied yet. `confirm()` writes them
   * to `AndesTable.filters`.
   */
  readonly draft = this.draftState.asReadonly();

  /** Projected filter body replacing the option list, if any. */
  protected readonly projectedPanel = contentChild(ANDES_TABLE_FILTER_PANEL);

  /** OK is unavailable while a projected panel reports invalid input. */
  protected readonly invalid = computed(
    () => this.projectedPanel()?.invalid?.() ?? false,
  );

  /** Which side of the button the panel opened on, for its entry motion. */
  protected readonly side = signal<AndesPanelSide>('below');
  protected readonly query = signal('');
  /** Tree nodes the user collapsed; every node starts expanded. */
  private readonly collapsed = signal<ReadonlySet<AndesFilterValue>>(new Set());

  private readonly trigger =
    viewChild.required<ElementRef<HTMLButtonElement>>('trigger');
  private readonly panelElement = viewChild<ElementRef<HTMLElement>>('panelEl');

  private readonly controlled = computed(
    () => this.filteredValue() !== undefined,
  );

  /** Values currently applied to this column. */
  private readonly applied = computed<readonly AndesFilterValue[]>(() =>
    this.controlled()
      ? (this.filteredValue() ?? [])
      : this.table.filterValueFor(this.column()),
  );

  /** Whether this column currently has a filter applied. */
  readonly active = computed(() => this.applied().length > 0);

  protected readonly iconContext = computed<AndesTableFilterIconContext>(
    () => ({ $implicit: this.active(), filtered: this.active() }),
  );

  protected readonly isTree = computed(() => this.mode() === 'tree');

  protected readonly searchEnabled = computed(() => !!this.searchable());

  /** The options left after the search, keeping the parents of any match. */
  protected readonly visibleOptions = computed(() => {
    const query = this.query().trim();
    const options = this.options();
    if (!query) {
      return options;
    }

    const search = this.searchable();
    const lower = query.toLocaleLowerCase();
    const matches =
      typeof search === 'function'
        ? (option: AndesTableFilterOption) => search(query, option)
        : (option: AndesTableFilterOption) =>
            option.text.toLocaleLowerCase().includes(lower);

    const prune = (
      list: readonly AndesTableFilterOption[],
    ): AndesTableFilterOption[] =>
      list.flatMap((option) => {
        if (!option.children?.length) {
          return matches(option) ? [option] : [];
        }
        // A matching parent keeps its whole subtree; otherwise only matching children.
        const children = matches(option)
          ? option.children
          : prune(option.children);
        return children.length ? [{ ...option, children }] : [];
      });

    return prune(options);
  });

  private readonly allValues = computed(() =>
    this.options().flatMap(subtreeValues),
  );

  protected readonly resetValues = computed<readonly AndesFilterValue[]>(() =>
    this.resetToDefault() ? this.defaultFilteredValue() : [],
  );

  /** Reset has nothing to do when the draft already is what it would reset to. */
  protected readonly resetDisabled = computed(() =>
    sameValues(this.draft(), this.resetValues()),
  );

  protected readonly selectAllState = computed<'all' | 'some' | 'none'>(() => {
    const draft = new Set(this.draft());
    const all = this.allValues();
    const count = all.filter((value) => draft.has(value)).length;
    if (count === 0) {
      return 'none';
    }
    return count === all.length ? 'all' : 'some';
  });

  protected readonly panelContext = computed<AndesTableFilterPanelContext>(
    () => ({
      $implicit: this.draft(),
      selected: this.draft(),
      setSelected: (values) => this.setDraft(values),
      confirm: (options) => this.confirm(options?.closeDropdown ?? true),
      clear: (options) => {
        this.draftState.set([]);
        if (options?.confirm ?? true) {
          this.apply([]);
        }
        if (options?.closeDropdown ?? true) {
          this.dismiss(false, true);
        }
      },
      reset: () => this.reset(),
      close: () => this.close(),
      options: this.options(),
    }),
  );

  constructor() {
    // A controlled value is the column's filter: keep the table in step with it.
    effect(() => {
      const value = this.filteredValue();
      if (value !== undefined) {
        untracked(() => this.table.syncFilter(this.column(), value ?? []));
      }
    });

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

  ngOnInit(): void {
    const initial = this.defaultFilteredValue();
    if (
      !this.controlled() &&
      initial.length > 0 &&
      this.table.filters()?.[this.column()] === undefined
    ) {
      this.table.syncFilter(this.column(), initial);
    }
  }

  // Option state

  protected isChecked(option: AndesTableFilterOption): boolean {
    const draft = this.draft();
    // In a multi-select tree a parent is checked exactly when its whole subtree is.
    if (this.isTree() && this.multiple() && option.children?.length) {
      return option.children.every((child) => this.isChecked(child));
    }
    return draft.includes(option.value);
  }

  protected isIndeterminate(option: AndesTableFilterOption): boolean {
    if (!this.isTree() || !this.multiple() || !option.children?.length) {
      return false;
    }
    if (this.isChecked(option)) {
      return false;
    }
    const draft = new Set(this.draft());
    return subtreeValues(option).some((value) => draft.has(value));
  }

  protected toggleOption(option: AndesTableFilterOption): void {
    if (!this.multiple()) {
      this.draftState.set([option.value]);
      return;
    }

    if (!this.isTree()) {
      const draft = this.draft();
      this.draftState.set(
        draft.includes(option.value)
          ? draft.filter((item) => item !== option.value)
          : [...draft, option.value],
      );
      return;
    }

    // Tree: (un)check the whole subtree, then re-derive every parent from its
    // children - the same "conduction" as Ant Design's tree filter.
    const subtree = new Set(subtreeValues(option));
    const draft = new Set(this.draft());
    const check = !this.isChecked(option);
    for (const value of subtree) {
      if (check) {
        draft.add(value);
      } else {
        draft.delete(value);
      }
    }
    this.draftState.set(this.conduct(draft));
  }

  protected toggleAll(): void {
    this.draftState.set(
      this.selectAllState() === 'all' ? [] : this.allValues(),
    );
  }

  protected isExpanded(option: AndesTableFilterOption): boolean {
    // While searching every match stays visible.
    return !!this.query().trim() || !this.collapsed().has(option.value);
  }

  protected toggleExpanded(option: AndesTableFilterOption, expand?: boolean) {
    const collapsed = new Set(this.collapsed());
    const next = expand ?? collapsed.has(option.value);
    if (next) {
      collapsed.delete(option.value);
    } else {
      collapsed.add(option.value);
    }
    this.collapsed.set(collapsed);
  }

  protected nodeId(option: AndesTableFilterOption): string {
    return `${this.id}-node-${String(option.value).replace(/[^\w-]/g, '_')}`;
  }

  /** Adds each parent whose children are all checked and drops the rest. */
  private conduct(draft: Set<AndesFilterValue>): AndesFilterValue[] {
    const visit = (option: AndesTableFilterOption): boolean => {
      if (!option.children?.length) {
        return draft.has(option.value);
      }
      const results = option.children.map(visit);
      const all = results.every(Boolean);
      if (all) {
        draft.add(option.value);
      } else {
        draft.delete(option.value);
      }
      return all;
    };
    this.options().forEach(visit);
    return [...draft];
  }

  // Panel

  protected onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  protected toggle(): void {
    if (this.open()) {
      this.dismiss(this.applyOnClose() && !this.invalid(), false);
    } else {
      this.openPanel();
    }
  }

  /** Replaces the draft; nothing reaches the table until `confirm()`. */
  setDraft(values: readonly AndesFilterValue[]): void {
    this.draftState.set([...values]);
  }

  /**
   * Puts the draft back to what Reset restores - empty, or `defaultFilteredValue`
   * with `resetToDefault` - without applying or closing.
   */
  reset(): void {
    this.draftState.set([...this.resetValues()]);
  }

  /**
   * Applies the draft to the table and, unless `closeDropdown` is false, closes
   * and returns focus to the button. Does nothing while the projected panel
   * reports invalid input.
   */
  confirm(closeDropdown = true): void {
    if (this.invalid()) {
      return;
    }
    if (closeDropdown) {
      this.dismiss(true, true);
    } else {
      this.apply(this.draft());
    }
  }

  /** Resets the draft, applies it and closes. */
  clear(): void {
    this.reset();
    this.dismiss(true, true);
  }

  /** Closes the panel, applying the draft only when `applyOnClose` is on. */
  close(): void {
    this.dismiss(this.applyOnClose() && !this.invalid(), true);
  }

  /** Opens the panel, starting the draft from the applied values. */
  show(): void {
    if (!this.open()) {
      this.openPanel();
    }
  }

  protected onKeydown(event: KeyboardEvent): void {
    // Nothing typed in the filter may reach the header's Enter/Space sort handler.
    event.stopPropagation();

    if (!this.open()) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
    } else if (
      event.key === 'Enter' &&
      this.isDefaultPanelField(event.target)
    ) {
      // Enter on an option or the search box applies, like submitting a form. Buttons
      // keep their own Enter, and a custom panel decides for itself.
      event.preventDefault();
      this.confirm();
    } else if (this.isDefaultPanelField(event.target)) {
      this.onOptionKey(event);
    }
  }

  protected onFocusOut(event: FocusEvent): void {
    // A keyboard user tabbing out of the panel leaves it, just like a click outside.
    // Only a known destination counts: `relatedTarget` is null when the window itself
    // loses focus, which should not dismiss anything.
    const next = event.relatedTarget;
    if (
      this.open() &&
      next instanceof Node &&
      !this.host.nativeElement.contains(next)
    ) {
      this.dismiss(this.applyOnClose() && !this.invalid(), false);
    }
  }

  protected onDocumentPointerDown(event: Event): void {
    if (
      this.open() &&
      event.target instanceof Node &&
      !this.host.nativeElement.contains(event.target)
    ) {
      this.dismiss(this.applyOnClose() && !this.invalid(), false);
    }
  }

  /** Arrow keys on checkbox options; radios keep their native arrow behavior. */
  private onOptionKey(event: KeyboardEvent): void {
    const target = event.target as HTMLInputElement;
    if (target.type !== 'checkbox') {
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const inputs = Array.from(
        this.panelElement()?.nativeElement.querySelectorAll<HTMLInputElement>(
          'input[type="checkbox"]',
        ) ?? [],
      );
      const next =
        inputs[inputs.indexOf(target) + (event.key === 'ArrowDown' ? 1 : -1)];
      if (next) {
        event.preventDefault();
        next.focus();
      }
      return;
    }

    const value = target.getAttribute('data-node');
    if (
      this.isTree() &&
      value !== null &&
      (event.key === 'ArrowRight' || event.key === 'ArrowLeft')
    ) {
      const option = this.findOption(value);
      if (option?.children?.length) {
        event.preventDefault();
        const rtl = getComputedStyle(target).direction === 'rtl';
        this.toggleExpanded(option, (event.key === 'ArrowRight') !== rtl);
      }
    }
  }

  private findOption(id: string): AndesTableFilterOption | undefined {
    const search = (
      list: readonly AndesTableFilterOption[],
    ): AndesTableFilterOption | undefined => {
      for (const option of list) {
        if (this.nodeId(option) === id) {
          return option;
        }
        const found = search(option.children ?? []);
        if (found) {
          return found;
        }
      }
      return undefined;
    };
    return search(this.options());
  }

  private isDefaultPanelField(target: EventTarget | null): boolean {
    return (
      !this.panel() &&
      !this.projectedPanel() &&
      target instanceof HTMLInputElement &&
      !!this.panelElement()?.nativeElement.contains(target)
    );
  }

  private openPanel(): void {
    this.draftState.set([...this.applied()]);
    this.query.set('');
    this.open.set(true);
    this.openChange.emit(true);

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

  /** Reports `values` as the column's new filter, writing it unless controlled. */
  private apply(values: readonly AndesFilterValue[]): void {
    if (sameValues(values, this.applied())) {
      return;
    }
    const next = [...values];
    this.filterChange.emit(next);
    if (this.controlled()) {
      this.table.notifyFilterChange(this.column(), next);
    } else {
      this.table.setFilter(this.column(), next);
    }
  }

  private dismiss(apply: boolean, restoreFocus: boolean): void {
    if (!this.open()) {
      return;
    }
    if (apply) {
      this.apply(this.draft());
    }
    this.open.set(false);
    this.openChange.emit(false);
    if (restoreFocus) {
      this.trigger().nativeElement.focus();
    }
  }

  private updatePosition(): void {
    const panel = this.panelElement()?.nativeElement;
    if (panel) {
      this.side.set(andesPlacePanel(panel, this.trigger().nativeElement));
    }
  }
}
