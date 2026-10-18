/** Pure helpers for the anchor's scroll tracking, kept free of the DOM so they can be tested. */

export interface AndesAnchorSection {
  href: string;
  /** Distance from the top of the scroll container to the section's top edge. */
  top: number;
}

/**
 * The section being read: the last one whose top edge has reached the threshold line. Sections
 * are ranked by position, not by order in the list, so links may be declared in any order.
 * At the end of the scroll range the lowest section is chosen instead.
 */
export function andesAnchorActiveHref(
  sections: readonly AndesAnchorSection[],
  threshold: number,
  atScrollEnd = false,
): string | undefined {
  let best: AndesAnchorSection | undefined;
  for (const section of sections) {
    if (section.top <= threshold && (!best || section.top > best.top)) {
      best = section;
    }
  }
  if (atScrollEnd) {
    // The last sections may be too short to ever reach the line; at the very end of the
    // scroll range the last one wins so every link can be reached by scrolling.
    for (const section of sections) {
      if (!best || section.top > best.top) {
        best = section;
      }
    }
  }
  return best?.href;
}

/** The element id a link points at, or `undefined` when it does not point inside this page. */
export function andesAnchorTargetId(
  href: string,
  currentUrl: string,
): string | undefined {
  const hashIndex = href.indexOf('#');
  if (hashIndex < 0 || hashIndex === href.length - 1) {
    return undefined;
  }
  if (hashIndex > 0) {
    try {
      const target = new URL(href, currentUrl);
      const current = new URL(currentUrl);
      if (
        target.origin !== current.origin ||
        target.pathname !== current.pathname
      ) {
        return undefined;
      }
    } catch {
      return undefined;
    }
  }
  const raw = href.slice(hashIndex + 1);
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
