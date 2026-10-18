/** Attribute marking the element that owns a navigation scope (the root list or a popup list). */
export const MENU_LIST_SELECTOR = '[data-andes-menu-list]';
/** Attribute on every focusable row. */
export const MENU_ROW_SELECTOR = '[data-andes-menu-row]';

/**
 * The rows keyboard navigation can land on, in DOM order.
 *
 * `list` is the scope the rows must belong to (a row inside a nested popup belongs
 * to that popup's list, not to this one); `container` narrows where to look and
 * defaults to the list. Disabled rows and rows inside a collapsed (`inert`) inline
 * submenu are skipped.
 *
 * @internal
 */
export function navigableRows(
  list: Element | null,
  container: Element | null = list,
): HTMLElement[] {
  if (!list || !container) {
    return [];
  }
  return Array.from(
    container.querySelectorAll<HTMLElement>(MENU_ROW_SELECTOR),
  ).filter(
    (row) =>
      row.closest(MENU_LIST_SELECTOR) === list &&
      row.getAttribute('aria-disabled') !== 'true' &&
      !row.closest('[inert]'),
  );
}

/** Direction of an element, honouring the nearest `dir` attribute before computed style. */
export function isRtlElement(element: Element): boolean {
  const dir = element.closest('[dir]')?.getAttribute('dir');
  if (dir === 'rtl') {
    return true;
  }
  if (dir === 'ltr') {
    return false;
  }
  const view = element.ownerDocument.defaultView;
  return view?.getComputedStyle(element).direction === 'rtl';
}
