/**
 * Elements the Tab key can land on. `tabindex="-1"` is excluded by the filter below rather
 * than the selector, so a positive or zero tabindex on any element still counts.
 */
const TABBABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  'audio[controls]',
  'video[controls]',
  '[tabindex]',
  '[contenteditable]:not([contenteditable="false"])',
].join(', ');

function isTabbable(element: HTMLElement): boolean {
  if (element.tabIndex < 0 || element.hasAttribute('disabled')) {
    return false;
  }
  if (element.closest('[inert], [hidden]')) {
    return false;
  }
  const style = element.ownerDocument.defaultView?.getComputedStyle(element);
  return style?.visibility !== 'hidden' && style?.display !== 'none';
}

/** The tabbable elements inside `root`, in DOM order. */
export function andesHoverCardTabbables(root: ParentNode): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(TABBABLE_SELECTOR),
  ).filter(isTabbable);
}

/**
 * The tabbable element that follows `reference` in document order, skipping everything inside
 * `exclude` (the card, which is portalled to the end of the document and would otherwise be
 * found first). Used to hand focus on to where Tab would have gone from the trigger.
 */
export function andesHoverCardNextTabbable(
  reference: HTMLElement,
  exclude: HTMLElement | null,
): HTMLElement | null {
  const document = reference.ownerDocument;
  return (
    andesHoverCardTabbables(document).find(
      (candidate) =>
        !reference.contains(candidate) &&
        !exclude?.contains(candidate) &&
        !!(reference.compareDocumentPosition(candidate) & 4),
    ) ?? null
  );
}
