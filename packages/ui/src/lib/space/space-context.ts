import { InjectionToken, TemplateRef } from '@angular/core';

/** What an `andesSpaceItem` renders after itself: the space's wrapper template plus its context. */
export interface AndesSpaceSeparator {
  readonly template: TemplateRef<unknown>;
  readonly context: unknown;
}

/**
 * The slice of `AndesSpace` an item needs. A token (rather than importing the component) keeps
 * the item and the space from importing each other.
 */
export interface AndesSpaceContext {
  /** The separator that follows `item`, or null for the last item or when no `split` is set. */
  separatorAfter(item: object): AndesSpaceSeparator | null;
}

export const ANDES_SPACE = new InjectionToken<AndesSpaceContext>('ANDES_SPACE');
