import type { TemplateRef } from '@angular/core';

/** A value of one option. Compared strictly, so `1` and `'1'` are different options. */
export type AndesCascaderValue = string | number;

/** The values from the first level down to one option. */
export type AndesCascaderPath = readonly AndesCascaderValue[];

/**
 * One option. With the default {@link AndesCascaderFieldNames} the fields below are read;
 * any other shape works when `fieldNames` says where to find them. Extra fields are kept and
 * handed back untouched in `selectedOptions`.
 */
export interface AndesCascaderOption {
  value?: AndesCascaderValue;
  label?: string;
  /** The next level. Leave it out on an option whose children load on demand. */
  children?: AndesCascaderOption[];
  disabled?: boolean;
  /** `true` marks an option that has no children even though `loadData` is set. */
  isLeaf?: boolean;
  [key: string]: unknown;
}

/** The fields of an option that hold its value, label, children, disabled and leaf flags. */
export interface AndesCascaderFieldNames {
  value?: string;
  label?: string;
  children?: string;
  disabled?: string;
  isLeaf?: string;
}

export type AndesCascaderSize = 'sm' | 'md' | 'lg';
export type AndesCascaderVariant =
  'outlined' | 'filled' | 'borderless' | 'underlined';
/** `error` also sets `aria-invalid`; `warning` is purely visual. */
export type AndesCascaderStatus = 'error' | 'warning';
/** Where the panel opens relative to the field: above or below, aligned to one edge. */
export type AndesCascaderPlacement =
  'bottomLeft' | 'bottomRight' | 'topLeft' | 'topRight';
/** What opens the next column: a click on the option, or the pointer resting on it. */
export type AndesCascaderExpandTrigger = 'click' | 'hover';
/**
 * With `multiple`, which paths the value holds when a whole branch is checked: `child` lists
 * every checked leaf, `parent` lists the branch itself instead of its leaves.
 */
export type AndesCascaderCheckedStrategy = 'child' | 'parent';

/** Settings of `showSearch`. `showSearch` itself can also simply be `true`. */
export interface AndesCascaderSearch {
  /**
   * Decides whether a path matches the text typed. Receives the text and the options from the
   * first level down to the candidate. Default: any label in the path contains the text,
   * ignoring case.
   */
  filter?: (inputValue: string, path: AndesCascaderOption[]) => boolean;
  /** Orders the matching paths, as `Array.prototype.sort` would. Default: tree order. */
  sort?: (
    a: AndesCascaderOption[],
    b: AndesCascaderOption[],
    inputValue: string,
  ) => number;
  /** Most results shown; `false` for all of them. Default `50`. */
  limit?: number | false;
}

/** What `selectionChange` carries. */
export interface AndesCascaderChange {
  /**
   * One path of values, or with `multiple` a list of them. Empty when the selection was
   * cleared.
   */
  value: AndesCascaderValue[] | AndesCascaderValue[][];
  /** The option objects matching `value`, in the same shape. */
  selectedOptions: AndesCascaderOption[] | AndesCascaderOption[][];
}

/** Context of the `displayRender` template (single path, or one tag with `multiple`). */
export interface AndesCascaderDisplayContext {
  /** The labels from the first level down; same as `labels`. */
  $implicit: string[];
  labels: string[];
  selectedOptions: AndesCascaderOption[];
}

/** Context of the `optionTemplate`. */
export interface AndesCascaderOptionContext {
  $implicit: AndesCascaderOption;
  label: string;
}

/** What `loadData` receives: the options from the first level down to the one expanding. */
export type AndesCascaderLoadData = (
  selectedOptions: AndesCascaderOption[],
) => void | Promise<void>;

/** Every visible or spoken string, so the cascader can be translated. */
export interface AndesCascaderLabels {
  clear: string;
  /** `{label}` is the tag's text. */
  remove: string;
  /** Shown in the panel while `loading` and there is nothing to show yet. */
  loading: string;
  /** `{count}` more tags than `maxTagCount`. */
  moreTags: string;
  /** Spoken after a search: `{count}` results. */
  results: string;
  /** Name of a column of options, `{level}` from 1. */
  level: string;
}

export const ANDES_CASCADER_DEFAULT_LABELS: AndesCascaderLabels = {
  clear: 'Clear',
  remove: 'Remove {label}',
  loading: 'Loading',
  moreTags: '+ {count} ...',
  results: '{count} results',
  level: 'Level {level}',
};

export type AndesCascaderNotFound = string | TemplateRef<unknown> | null;
