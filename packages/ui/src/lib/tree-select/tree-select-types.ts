import type { TemplateRef } from '@angular/core';

import type { AndesTreeKey, AndesTreeNode } from '../tree/tree-types';

export type AndesTreeSelectSize = 'sm' | 'md' | 'lg';
export type AndesTreeSelectVariant =
  'outlined' | 'filled' | 'borderless' | 'underlined';
export type AndesTreeSelectStatus = 'error' | 'warning';
/** The panel always opens above or below the field, never beside it. */
export type AndesTreeSelectPlacement =
  'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
/** Where the search box sits: inside the field, or at the top of the panel. */
export type AndesTreeSelectSearchPlacement = 'panel' | 'trigger';

/** A single key, or a list of keys in a multiple or checkable select, or nothing. */
export type AndesTreeSelectValue = AndesTreeKey | AndesTreeKey[] | null;

/** One selected node, as shown in the field. */
export interface AndesTreeSelectOption {
  key: AndesTreeKey;
  title: string;
  /** The node object; `undefined` for a key whose node is not in `nodes` (yet). */
  node: AndesTreeNode | undefined;
}

/** What `maxTagPlaceholder` is given when a function: the tags that are not shown. */
export type AndesTreeSelectMaxTagPlaceholder =
  | ((omitted: AndesTreeSelectOption[]) => string)
  | TemplateRef<{ $implicit: AndesTreeSelectOption[] }>;

/** Texts the select shows or announces; pass only the ones to translate. */
export interface AndesTreeSelectLabels {
  /** Shown in the panel when there are no nodes, or none match the search. */
  empty: string;
  /** Shown in the panel while `loading` is on and there are no nodes yet. */
  loading: string;
  /** Placeholder of the search box. */
  searchPlaceholder: string;
  /** Accessible name of the search box. */
  searchLabel: string;
  /** Accessible name of the clear button. */
  clear: string;
  /** Accessible name of a tag's remove button. */
  remove: (title: string) => string;
  /** Text of the tag that stands for the tags hidden by `maxTagCount`. */
  more: (count: number) => string;
}
