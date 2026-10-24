import { InjectionToken, Signal, TemplateRef } from '@angular/core';

/** Where the steps run: along the inline axis or stacked down the block axis. */
export type AndesStepsOrientation = 'horizontal' | 'vertical';

/** Control size. `small` shrinks the marker from 32px to 24px. */
export type AndesStepsSize = 'default' | 'small';

/**
 * Visual treatment.
 * - `default`: numbered markers joined by a line.
 * - `dot`: small dots instead of markers, title underneath.
 * - `navigation`: tabs-like row of titles with a chevron between them and an underline on the
 *   current one.
 * - `inline`: compact segmented bars with the title below each, for tight spaces.
 */
export type AndesStepsVariant = 'default' | 'dot' | 'navigation' | 'inline';

/** Where the title sits relative to the marker (horizontal orientation only). */
export type AndesStepsLabelPlacement = 'horizontal' | 'vertical';

/** State of one step. `wait` = upcoming, `process` = in progress, `finish` = done. */
export type AndesStepStatus = 'wait' | 'process' | 'finish' | 'error';

/** Title, subtitle and description accept plain text or a template. */
export type AndesStepContent = string | TemplateRef<unknown>;

/** Context handed to a step's custom `icon` template. */
export interface AndesStepIconContext {
  $implicit: AndesStepStatus;
  status: AndesStepStatus;
  /** Zero-based position of the step. */
  index: number;
  /** Whether this is the step `current` points at. */
  current: boolean;
}

/**
 * User-facing strings. Every entry is optional; `stepOf` is a template with `{index}`, `{count}`
 * and `{title}` placeholders used for the polite announcement when `current` changes.
 */
export interface AndesStepsLabels {
  wait?: string;
  process?: string;
  finish?: string;
  error?: string;
  stepOf?: string;
}

export const ANDES_STEPS_DEFAULT_LABELS: Required<AndesStepsLabels> = {
  wait: 'Upcoming',
  process: 'In progress',
  finish: 'Completed',
  error: 'Error',
  stepOf: 'Step {index} of {count}: {title}',
};

/** Read-only view of the parent `andes-steps`, injected by every `andes-step`. */
export interface AndesStepsContext {
  readonly current: Signal<number>;
  /** Orientation actually in use (after the responsive collapse). */
  readonly layoutOrientation: Signal<AndesStepsOrientation>;
  readonly variant: Signal<AndesStepsVariant>;
  readonly size: Signal<AndesStepsSize>;
  readonly layoutLabelPlacement: Signal<AndesStepsLabelPlacement>;
  readonly clickable: Signal<boolean>;
  readonly status: Signal<AndesStepStatus>;
  readonly percent: Signal<number | undefined>;
  readonly resolvedLabels: Signal<Required<AndesStepsLabels>>;
  readonly count: Signal<number>;
  indexOf(step: unknown): number;
  select(index: number): void;
  moveFocus(step: unknown, key: 'next' | 'previous' | 'first' | 'last'): void;
}

export const ANDES_STEPS = new InjectionToken<AndesStepsContext>('ANDES_STEPS');
