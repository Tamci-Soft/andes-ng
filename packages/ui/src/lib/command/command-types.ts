import type { TemplateRef } from '@angular/core';

/** One thing the palette can run, or open as a nested page. */
export interface AndesCommandItem<D = unknown> {
  /** Unique within its page. Identifies the item and is the active-item value. */
  readonly value: string;
  /** What is shown, and what the search matches. Defaults to `value`. */
  readonly label?: string;
  /** A second, muted line of text after the label. Matched by the search too. */
  readonly description?: string;
  /** Extra words the search matches that are not shown ("theme" for "Appearance"). */
  readonly keywords?: readonly string[];
  /** A leading glyph: a short text (an emoji, a symbol) or a template for an icon. */
  readonly icon?: string | TemplateRef<unknown>;
  /**
   * The keyboard shortcut shown at the end of the row: `'Mod+K'` (`Mod` is Command on Apple
   * platforms and Control elsewhere) or the keys as an array. Display only.
   */
  readonly shortcut?: string | readonly string[];
  /** Shown but not selectable, and skipped by the arrow keys. */
  readonly disabled?: boolean;
  /** Entries of a nested page. Selecting the item opens that page instead of running. */
  readonly children?: readonly AndesCommandEntry[];
  /** Placeholder of the search box on the nested page. */
  readonly placeholder?: string;
  /** Runs when the item is selected (before `itemSelected` is emitted). */
  readonly action?: (item: AndesCommandItem<D>) => void;
  /** Anything a custom item template wants to render. */
  readonly data?: D;
}

/** Items under a heading. Hidden while none of its items matches the search. */
export interface AndesCommandGroup {
  readonly heading: string;
  readonly items: readonly AndesCommandItem[];
  /** Stable identity, when two groups share a heading. */
  readonly key?: string;
}

/** A thin line between entries. Hidden while a search is narrowing the list. */
export interface AndesCommandSeparator {
  readonly separator: true;
  readonly key?: string;
}

export type AndesCommandEntry =
  AndesCommandItem | AndesCommandGroup | AndesCommandSeparator;

/**
 * Scores an item against the search. `0` hides it, anything above ranks it (higher first).
 * Replaces the built-in fuzzy scoring.
 */
export type AndesCommandFilter = (
  item: AndesCommandItem,
  search: string,
) => number;

/** Emitted when an item is selected. */
export interface AndesCommandSelectEvent<D = unknown> {
  readonly item: AndesCommandItem<D>;
  /** The nested pages that were open, outermost first. */
  readonly pages: readonly AndesCommandItem[];
}

/** Template context for a custom item. */
export interface AndesCommandItemContext {
  $implicit: AndesCommandItem;
  /** What is in the search box. */
  search: string;
  /** The label cut into matched and unmatched slices. */
  segments: readonly { text: string; match: boolean }[];
  /** Whether this is the active item. */
  active: boolean;
}

export function andesCommandIsGroup(
  entry: AndesCommandEntry,
): entry is AndesCommandGroup {
  return 'items' in entry;
}

export function andesCommandIsSeparator(
  entry: AndesCommandEntry,
): entry is AndesCommandSeparator {
  return 'separator' in entry;
}
