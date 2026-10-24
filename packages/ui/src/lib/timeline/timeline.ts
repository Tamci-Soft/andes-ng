import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  forwardRef,
  input,
  TemplateRef,
} from '@angular/core';

import { AndesTimelineItem } from './timeline-item';
import {
  ANDES_TIMELINE,
  ANDES_TIMELINE_DEFAULT_LABELS,
  AndesTimelineContent,
  AndesTimelineContext,
  AndesTimelineDensity,
  AndesTimelineLabels,
  AndesTimelineLayout,
  AndesTimelineMode,
  AndesTimelineVariant,
} from './timeline-types';

const DEFAULT_TIME_FORMAT: Intl.DateTimeFormatOptions = {
  dateStyle: 'medium',
  timeStyle: 'short',
};

/**
 * A vertical record of events along an axis: activity feeds, order history, audit trails.
 *
 * Compose it with `andes-timeline-item` children. `mode` picks the side the entries sit on
 * (`alternate` swaps sides, and logical layout means it mirrors itself under right-to-left).
 * Entries with a `label` or `time` put it opposite their content. `pending` appends a trailing
 * entry with a spinner for work that is still going on.
 *
 * @example
 * <andes-timeline mode="alternate" pending="Awaiting carrier">
 *   <andes-timeline-item [time]="placedAt" color="success">Order placed</andes-timeline-item>
 *   <andes-timeline-item [time]="paidAt">Payment captured</andes-timeline-item>
 * </andes-timeline>
 */
@Component({
  selector: 'andes-timeline',
  imports: [NgTemplateOutlet, AndesTimelineItem],
  templateUrl: './timeline.html',
  styleUrl: './timeline.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: ANDES_TIMELINE, useExisting: forwardRef(() => AndesTimeline) },
  ],
  host: {
    'data-slot': 'timeline',
    '[attr.data-mode]': 'mode()',
    '[attr.data-layout]': 'layout()',
    '[attr.data-variant]': 'variant()',
    '[attr.data-density]': 'density()',
    '[attr.data-reverse]': 'reverse() ? "" : null',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
  },
})
export class AndesTimeline implements AndesTimelineContext {
  readonly mode = input<AndesTimelineMode>('start');
  /** Newest-first display. Document order, and so reading order, is unchanged. */
  readonly reverse = input(false, { transform: booleanAttribute });
  readonly variant = input<AndesTimelineVariant>('outlined');
  readonly density = input<AndesTimelineDensity>('default');
  /**
   * Adds a trailing entry for work in progress. Text shows as the entry's content, a template is
   * rendered as is, and `true` shows an animated ellipsis. Falsy values add nothing.
   */
  readonly pending = input<boolean | AndesTimelineContent | null | undefined>(
    false,
  );
  /** Replaces the pending entry's spinner. */
  readonly pendingDot = input<TemplateRef<unknown> | undefined>(undefined);
  /** BCP 47 tag for formatting `time` values; defaults to the runtime locale. */
  readonly locale = input<string | undefined>(undefined);
  /** `Intl.DateTimeFormat` options for entries that show `time` without a `label`. */
  readonly timeFormat = input<Intl.DateTimeFormatOptions>(DEFAULT_TIME_FORMAT);
  readonly labels = input<AndesTimelineLabels | undefined>(undefined);
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });
  readonly ariaLabelledby = input<string | undefined>(undefined, {
    alias: 'aria-labelledby',
  });

  private readonly items = contentChildren(AndesTimelineItem);

  protected readonly resolvedLabels = computed(() => ({
    ...ANDES_TIMELINE_DEFAULT_LABELS,
    ...this.labels(),
  }));

  protected readonly hasPending = computed(() => {
    const pending = this.pending();
    return (
      pending !== false &&
      pending !== null &&
      pending !== undefined &&
      pending !== ''
    );
  });
  protected readonly pendingTemplate = computed(() => {
    const pending = this.pending();
    return pending instanceof TemplateRef ? pending : null;
  });
  protected readonly pendingText = computed(() => {
    const pending = this.pending();
    return typeof pending === 'string' ? pending : '';
  });

  readonly total = computed(
    () => this.items().length + (this.hasPending() ? 1 : 0),
  );

  /** One column when entries share a side; three once anything alternates or has a label. */
  readonly layout = computed<AndesTimelineLayout>(() => {
    const mode = this.mode();
    if (mode === 'alternate') {
      return 'split';
    }
    return this.items().some((item) => item.hasOpposite()) ? 'split' : mode;
  });

  indexOf(item: unknown): number {
    return this.items().indexOf(item as AndesTimelineItem);
  }
}
