import { InjectionToken, type Signal } from '@angular/core';

import type {
  AndesColumnFilterMatcher,
  AndesFilterPredicate,
} from './table-data';

/** Identifies a row for selection and expansion. */
export type AndesTableRowKey = string | number;

/**
 * What `AndesTable` needs to know about each rendered row-selection control to
 * drive "select all": which row it selects, and whether it may be toggled.
 *
 * Provided by `AndesTableSelection` under this token (rather than queried by class)
 * so `AndesTable` can collect them with a content query without importing the
 * selection file, which itself depends on the table - no circular import.
 */
export interface AndesTableSelectable {
  /**
   * The table this control belongs to. A nested table's controls are also inside
   * the outer table's content, so the outer one ignores controls it does not own.
   */
  readonly owner: unknown;
  readonly resolvedKey: Signal<AndesTableRowKey | undefined>;
  readonly isDisabled: Signal<boolean>;
}

export const ANDES_TABLE_SELECTABLE = new InjectionToken<AndesTableSelectable>(
  'ANDES_TABLE_SELECTABLE',
);

/**
 * What `AndesTable` reads from each `andes-table-filter` to filter rows itself
 * (`AndesTable.filterRows`): the column it filters and its row predicate.
 * A token for the same no-circular-import reason as `ANDES_TABLE_SELECTABLE`.
 */
export interface AndesTableFilterable {
  readonly column: Signal<string>;
  readonly predicate: Signal<
    AndesFilterPredicate<never> | AndesColumnFilterMatcher<never> | undefined
  >;
}

export const ANDES_TABLE_FILTERABLE = new InjectionToken<AndesTableFilterable>(
  'ANDES_TABLE_FILTERABLE',
);

/**
 * CSS length from a number of pixels or any CSS length string. A unitless numeric
 * string (what a static template attribute such as `fixedOffset="48"` yields) is
 * read as pixels too.
 */
export function andesCssLength(
  value: string | number | null | undefined,
): string | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return typeof value === 'number' || /^-?\d+(\.\d+)?$/.test(value)
    ? `${value}px`
    : value;
}

/** Edge a column is pinned to while the table scrolls horizontally. */
export type AndesTableFixed = 'start' | 'end';

/**
 * Viewport width below which a column is hidden: `sm` 576px, `md` 768px,
 * `lg` 992px, `xl` 1200px.
 */
export type AndesTableBreakpoint = 'sm' | 'md' | 'lg' | 'xl';

/** Classes shared by header and data cells for `fixed`, `ellipsis` and `hideBelow`. */
export function andesCellModifiers(
  fixed: AndesTableFixed | undefined,
  ellipsis: boolean,
  hideBelow?: AndesTableBreakpoint,
): (string | false)[] {
  return [
    !!fixed && 'andes-table__fixed',
    fixed === 'start' && 'andes-table__fixed-start',
    fixed === 'end' && 'andes-table__fixed-end',
    ellipsis && 'andes-table__ellipsis',
    !!hideBelow && `andes-table__hide-below-${hideBelow}`,
  ];
}

const ELLIPSIS_TITLE = 'data-andes-ellipsis-title';

/**
 * Shows the full text of a truncated `ellipsis` cell as its native tooltip. Runs on
 * pointer entry, so it only measures the one cell being hovered. A `title` the
 * consumer set is never touched; the one added here is removed again once the
 * text fits.
 */
export function andesSyncEllipsisTitle(element: HTMLElement): void {
  const owned = element.hasAttribute(ELLIPSIS_TITLE);
  if (element.hasAttribute('title') && !owned) {
    return;
  }

  if (element.scrollWidth > element.clientWidth) {
    element.setAttribute('title', (element.textContent ?? '').trim());
    element.setAttribute(ELLIPSIS_TITLE, '');
  } else if (owned) {
    element.removeAttribute('title');
    element.removeAttribute(ELLIPSIS_TITLE);
  }
}

/** Which side of its button a popup panel opened on. */
export type AndesPanelSide = 'below' | 'above';

const PANEL_VIEWPORT_MARGIN = 8;
const PANEL_GAP = 4;

/**
 * Places a fixed-position popup panel under `anchor`, end edges aligned so it
 * opens toward the column it belongs to (mirrored in right-to-left), kept on
 * screen; flips above when it would run off the bottom and there is more room
 * above - a fixed panel cannot be scrolled into view. Writes straight to the
 * element - it is pure layout, and it must be in place before focus moves into
 * the panel.
 */
export function andesPlacePanel(
  panel: HTMLElement,
  anchor: HTMLElement,
): AndesPanelSide {
  const rect = anchor.getBoundingClientRect();
  const viewportWidth = document.documentElement.clientWidth;
  const viewportHeight = document.documentElement.clientHeight;
  const width = panel.offsetWidth;
  const height = panel.offsetHeight;
  const rtl = getComputedStyle(anchor).direction === 'rtl';

  const preferredLeft = rtl ? rect.left : rect.right - width;
  const left = Math.min(
    Math.max(PANEL_VIEWPORT_MARGIN, preferredLeft),
    Math.max(
      PANEL_VIEWPORT_MARGIN,
      viewportWidth - width - PANEL_VIEWPORT_MARGIN,
    ),
  );

  const spaceBelow = viewportHeight - rect.bottom - PANEL_GAP;
  const spaceAbove = rect.top - PANEL_GAP;
  const flip =
    height > spaceBelow - PANEL_VIEWPORT_MARGIN && spaceAbove > spaceBelow;
  const top = flip
    ? Math.max(PANEL_VIEWPORT_MARGIN, rect.top - PANEL_GAP - height)
    : rect.bottom + PANEL_GAP;

  panel.style.top = `${top}px`;
  panel.style.left = `${left}px`;
  return flip ? 'above' : 'below';
}
