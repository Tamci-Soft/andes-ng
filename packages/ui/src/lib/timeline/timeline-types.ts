import { InjectionToken, Signal, TemplateRef } from '@angular/core';

/**
 * Which side of the axis the entries sit on, in the reading direction:
 * `start` keeps the axis at the inline-start edge with content after it, `end` is the mirror
 * image, and `alternate` swaps sides from one entry to the next. Entries that carry a `label`
 * or `time` always use the two-sided layout so the label can sit opposite its content.
 */
export type AndesTimelineMode = 'start' | 'end' | 'alternate';

/** `outlined` draws a hollow ring, `filled` a solid dot. */
export type AndesTimelineVariant = 'outlined' | 'filled';

export type AndesTimelineDensity = 'default' | 'compact';

/** Which side of the axis a single entry's content sits on. */
export type AndesTimelineSide = 'start' | 'end';

/** The named colours, backed by theme tokens. */
export type AndesTimelineSeverity =
  'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

/** A named colour or any CSS colour (`#7c3aed`, `rgb(...)`, `var(--brand)`). */
// `string & {}` keeps the named literals in editor autocompletion.
export type AndesTimelineColor = AndesTimelineSeverity | (string & {});

/** Text or a template. */
export type AndesTimelineContent = string | TemplateRef<unknown>;

/** Hidden-text strings and the pending default. */
export interface AndesTimelineLabels {
  /** Announced for the trailing pending entry when no text is given. */
  pending?: string;
}

export const ANDES_TIMELINE_DEFAULT_LABELS: Required<AndesTimelineLabels> = {
  pending: 'Loading',
};

/** `outer layout`: how many columns the entries use. */
export type AndesTimelineLayout = 'start' | 'end' | 'split';

/** Read-only view of the parent `andes-timeline`, injected by every entry. */
export interface AndesTimelineContext {
  readonly mode: Signal<AndesTimelineMode>;
  readonly layout: Signal<AndesTimelineLayout>;
  readonly reverse: Signal<boolean>;
  readonly variant: Signal<AndesTimelineVariant>;
  readonly density: Signal<AndesTimelineDensity>;
  readonly locale: Signal<string | undefined>;
  readonly timeFormat: Signal<Intl.DateTimeFormatOptions>;
  /** Number of entries, including the pending one. */
  readonly total: Signal<number>;
  indexOf(item: unknown): number;
}

export const ANDES_TIMELINE = new InjectionToken<AndesTimelineContext>(
  'ANDES_TIMELINE',
);
