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
  viewChild,
} from '@angular/core';

import { AndesTable } from './table';
import {
  ANDES_TABLE_SELECTABLE,
  type AndesTableRowKey,
  type AndesTableSelectable,
} from './table-context';
import { AndesTableRow } from './table-row';

/** A custom entry of the "select all" menu. */
export interface AndesTableSelectionItem {
  readonly key: string;
  readonly text: string;
  /**
   * Runs when the entry is chosen, with the keys of the rendered rows whose
   * selection can change. Write the new selection to `selectedKeys` yourself.
   */
  readonly select: (changeableKeys: readonly AndesTableRowKey[]) => void;
}

/**
 * Built-in "select all" menu entries: select the rendered rows, invert them, or
 * clear the whole selection.
 */
export type AndesTableSelectionPreset = 'all' | 'invert' | 'none';

/** Texts of the built-in menu entries. */
export interface AndesTableSelectionLabels {
  readonly all: string;
  readonly invert: string;
  readonly none: string;
}

const VIEWPORT_MARGIN = 8;
const MENU_GAP = 4;

let nextMenuId = 0;

/**
 * Row selection control: a native checkbox, or a radio when the table's
 * `selectionType` is `radio`. Place it in the row's first cell; it selects the
 * row whose `rowKey` it sits in.
 *
 * ```html
 * <tr andesTableRow [rowKey]="row.id">
 *   <td andesTableCell><andes-table-selection [label]="'Select ' + row.name" /></td>
 *   ...
 * ```
 *
 * State lives in `AndesTable.selectedKeys`. Shift-click extends a checkbox
 * selection over the range from the previously clicked row. A `disabled` control
 * is also skipped by "select all".
 */
@Component({
  selector: 'andes-table-selection',
  styleUrl: './table-controls.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: ANDES_TABLE_SELECTABLE, useExisting: AndesTableSelection },
  ],
  host: { class: 'andes-table-control' },
  template: `<input
    class="andes-table-control__input"
    [type]="table.selectionType()"
    [attr.name]="
      table.selectionType() === 'radio' ? table.radioGroupName : null
    "
    [checked]="checked()"
    [indeterminate]="indeterminate()"
    [disabled]="isDisabled()"
    [attr.aria-label]="label()"
    (click)="onClick($event)"
  />`,
})
export class AndesTableSelection implements AndesTableSelectable {
  protected readonly table = inject(AndesTable);
  readonly owner = this.table;
  private readonly row = inject(AndesTableRow, { optional: true });

  /** Key of the row this control selects. Defaults to the enclosing row's `rowKey`. */
  readonly rowKey = input<AndesTableRowKey | undefined>(undefined);

  /** Prevent toggling this row; "select all" leaves it as it is. */
  readonly disabled = input(false, { transform: booleanAttribute });

  /**
   * Accessible name. Include something that identifies the row - e.g.
   * `Select INV-001` - so a screen-reader user hears which row it selects.
   */
  readonly label = input('Select row');

  readonly resolvedKey = computed(() => this.rowKey() ?? this.row?.rowKey());

  readonly isDisabled = computed(
    () => this.disabled() || this.resolvedKey() === undefined,
  );

  protected readonly checked = computed(() => {
    const key = this.resolvedKey();
    return key !== undefined && this.table.isSelected(key);
  });

  /** A tree parent with only some of its descendants selected. */
  protected readonly indeterminate = computed(() => {
    const key = this.resolvedKey();
    return key !== undefined && this.table.isPartiallySelected(key);
  });

  protected onClick(event: MouseEvent): void {
    const key = this.resolvedKey();
    if (key === undefined) {
      return;
    }

    this.table.toggleSelected(key, event.shiftKey);

    // The table's state is the source of truth; if a controlling parent rejected
    // the change the bound value never moved, so resync the native control.
    const input = event.target as HTMLInputElement;
    input.checked = this.checked();
    input.indeterminate = this.indeterminate();
  }
}

/**
 * "Select all" control for the selection column's header.
 * Checked when every rendered, enabled row is selected; indeterminate when only
 * some are. Toggling it selects or clears exactly those rows.
 *
 * `selections` adds a menu button next to it with more ways to select: the
 * built-in `'all'`, `'invert'` and `'none'` entries and any custom ones, e.g.
 * "Select odd rows".
 *
 * With radio selection there is nothing to select all, so it renders only its
 * `label` as visually hidden text, keeping the header cell named. Leave it out
 * entirely to hide the "select all" control.
 */
@Component({
  selector: 'andes-table-select-all',
  styleUrl: './table-controls.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'andes-table-control',
    '(keydown)': 'onKeydown($event)',
    '(document:pointerdown)': 'onDocumentPointerDown($event)',
  },
  template: `@if (table.selectionType() === 'checkbox') {
      <input
        class="andes-table-control__input"
        type="checkbox"
        [checked]="table.selectAllState() === 'all'"
        [indeterminate]="table.selectAllState() === 'some'"
        [disabled]="disabled() || !table.hasSelectableRows()"
        [attr.aria-label]="resolvedLabel()"
        (click)="onClick($event)"
      />
      @if (menuItems().length > 0) {
        <button
          #menuTrigger
          type="button"
          class="andes-table-control__menu-trigger"
          aria-haspopup="menu"
          [attr.aria-expanded]="menuOpen()"
          [attr.aria-controls]="menuOpen() ? menuId : null"
          [attr.aria-label]="menuLabel()"
          [disabled]="disabled() || !table.hasSelectableRows()"
          (click)="toggleMenu()"
        >
          <span class="andes-table-control__caret" aria-hidden="true"></span>
        </button>
        @if (menuOpen()) {
          <div
            #menu
            class="andes-table-control__menu"
            animate.enter="andes-table-control__menu--enter"
            animate.leave="andes-table-control__menu--leave"
            popover="manual"
            role="menu"
            [id]="menuId"
            [attr.aria-label]="menuLabel()"
          >
            @for (item of menuItems(); track item.key) {
              <button
                type="button"
                role="menuitem"
                tabindex="-1"
                class="andes-table-control__menu-item"
                (click)="choose(item)"
              >
                {{ item.text }}
              </button>
            }
          </div>
        }
      }
    } @else {
      <span class="andes-table-control__sr-only">{{ resolvedLabel() }}</span>
    }`,
})
export class AndesTableSelectAll {
  protected readonly table = inject(AndesTable);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** Accessible name. Defaults to "Select all rows" (checkbox) or "Selection" (radio). */
  readonly label = input<string | undefined>(undefined);

  /** Disable the "select all" checkbox (and its menu). */
  readonly disabled = input(false, { transform: booleanAttribute });

  /** Entries of the selection menu; empty hides the menu button. */
  readonly selections = input<
    readonly (AndesTableSelectionPreset | AndesTableSelectionItem)[]
  >([]);

  /** Texts of the built-in menu entries. */
  readonly selectionLabels = input<AndesTableSelectionLabels>({
    all: 'Select current page',
    invert: 'Invert current page',
    none: 'Clear selection',
  });

  /** Accessible name of the menu button and menu. */
  readonly menuLabel = input('Selection options');

  protected readonly menuId = `andes-table-selection-menu-${nextMenuId++}`;
  protected readonly menuOpen = signal(false);

  private readonly menuTrigger =
    viewChild<ElementRef<HTMLButtonElement>>('menuTrigger');
  private readonly menu = viewChild<ElementRef<HTMLElement>>('menu');

  protected readonly resolvedLabel = computed(
    () =>
      this.label() ??
      (this.table.selectionType() === 'radio'
        ? 'Selection'
        : 'Select all rows'),
  );

  protected readonly menuItems = computed<readonly AndesTableSelectionItem[]>(
    () => {
      const labels = this.selectionLabels();
      return this.selections().map((entry) => {
        if (typeof entry !== 'string') {
          return entry;
        }
        const select: Record<AndesTableSelectionPreset, () => void> = {
          all: () => this.table.selectAll(),
          invert: () => this.table.invertSelection(),
          none: () => this.table.clearSelection(),
        };
        return { key: entry, text: labels[entry], select: select[entry] };
      });
    },
  );

  constructor() {
    effect((onCleanup) => {
      if (!this.menuOpen()) {
        return;
      }
      const reposition = () => this.updatePosition();
      window.addEventListener('scroll', reposition, true);
      window.addEventListener('resize', reposition);
      onCleanup(() => {
        window.removeEventListener('scroll', reposition, true);
        window.removeEventListener('resize', reposition);
      });
    });
  }

  protected onClick(event: MouseEvent): void {
    this.table.toggleAllSelected();

    const input = event.target as HTMLInputElement;
    const state = this.table.selectAllState();
    input.checked = state === 'all';
    input.indeterminate = state === 'some';
  }

  protected toggleMenu(): void {
    if (this.menuOpen()) {
      this.closeMenu(false);
      return;
    }
    this.menuOpen.set(true);
    afterNextRender(
      () => {
        const menu = this.menu()?.nativeElement;
        if (!menu) {
          return;
        }
        if (typeof menu.showPopover === 'function') {
          menu.showPopover();
        }
        this.updatePosition();
        this.menuButtons()[0]?.focus();
      },
      { injector: this.injector },
    );
  }

  protected choose(item: AndesTableSelectionItem): void {
    item.select(this.table.enabledKeys());
    this.closeMenu(true);
  }

  protected onKeydown(event: KeyboardEvent): void {
    // Keys inside the header control must never reach a sortable header.
    event.stopPropagation();
    if (!this.menuOpen()) {
      return;
    }

    const buttons = this.menuButtons();
    const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let next: number | undefined;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        this.closeMenu(true);
        return;
      case 'Tab':
        this.closeMenu(false);
        return;
      case 'ArrowDown':
        next = (index + 1) % buttons.length;
        break;
      case 'ArrowUp':
        next = (index - 1 + buttons.length) % buttons.length;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = buttons.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    buttons[next]?.focus();
  }

  protected onDocumentPointerDown(event: Event): void {
    if (
      this.menuOpen() &&
      event.target instanceof Node &&
      !this.host.nativeElement.contains(event.target)
    ) {
      this.closeMenu(false);
    }
  }

  private menuButtons(): HTMLButtonElement[] {
    return Array.from(
      this.menu()?.nativeElement.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]',
      ) ?? [],
    );
  }

  private closeMenu(restoreFocus: boolean): void {
    this.menuOpen.set(false);
    if (restoreFocus) {
      this.menuTrigger()?.nativeElement.focus();
    }
  }

  private updatePosition(): void {
    const menu = this.menu()?.nativeElement;
    const trigger = this.menuTrigger()?.nativeElement;
    if (!menu || !trigger) {
      return;
    }

    const anchor = trigger.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, anchor.left),
      Math.max(
        VIEWPORT_MARGIN,
        viewportWidth - menu.offsetWidth - VIEWPORT_MARGIN,
      ),
    );
    menu.style.top = `${anchor.bottom + MENU_GAP}px`;
    menu.style.left = `${left}px`;
  }
}
