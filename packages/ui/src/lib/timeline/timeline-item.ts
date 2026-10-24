import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  TemplateRef,
} from '@angular/core';

import {
  ANDES_TIMELINE,
  AndesTimelineColor,
  AndesTimelineContent,
  AndesTimelineSeverity,
  AndesTimelineSide,
} from './timeline-types';

const SEVERITIES: readonly AndesTimelineSeverity[] = [
  'primary',
  'success',
  'warning',
  'danger',
  'info',
  'neutral',
];

/**
 * One entry of an `andes-timeline`. The default content is the entry's body; `label` and `time`
 * fill the opposite side of the axis.
 */
@Component({
  selector: 'andes-timeline-item',
  imports: [NgTemplateOutlet],
  templateUrl: './timeline-item.html',
  styleUrl: './timeline-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'listitem',
    'data-slot': 'timeline-item',
    '[attr.data-layout]': 'timeline.layout()',
    '[attr.data-side]': 'side()',
    '[attr.data-variant]': 'timeline.variant()',
    '[attr.data-density]': 'timeline.density()',
    '[attr.data-color]': 'namedColor()',
    '[attr.data-last]': 'isLast() ? "" : null',
    '[attr.data-pending]': 'pending() ? "" : null',
    '[attr.data-custom-dot]': 'dot() ? "" : null',
    '[style.--_andes-timeline-color]': 'customColor()',
  },
})
export class AndesTimelineItem {
  protected readonly timeline = inject(ANDES_TIMELINE);

  /** A named colour or any CSS colour for the dot. Defaults to `primary`. */
  readonly color = input<AndesTimelineColor | undefined>(undefined);
  /** Replaces the dot (an icon, an avatar, a status glyph). */
  readonly dot = input<TemplateRef<unknown> | undefined>(undefined);
  /** Text or template on the opposite side of the axis, usually a date or an author. */
  readonly label = input<AndesTimelineContent | undefined>(undefined);
  /**
   * The moment the entry happened. Rendered inside a `<time datetime>` element on the label
   * side; without a `label` it is formatted with the timeline's `locale` and `timeFormat`.
   */
  readonly time = input<Date | string | number | undefined>(undefined);
  /** Forces the content side in the two-sided layout. */
  readonly position = input<AndesTimelineSide | undefined>(undefined);
  /** Visually hidden text naming what the dot means, e.g. "Error". */
  readonly dotLabel = input<string | undefined>(undefined);
  /** Shows a spinner instead of the dot. The timeline's `pending` input uses this too. */
  readonly pending = input(false, { transform: booleanAttribute });

  protected readonly index = computed(() => {
    const index = this.timeline.indexOf(this);
    // The trailing pending entry is rendered by the timeline itself, outside its content.
    return index === -1 ? this.timeline.total() - 1 : index;
  });

  protected readonly isLast = computed(() =>
    this.timeline.reverse()
      ? this.index() === 0
      : this.index() === this.timeline.total() - 1,
  );

  /** The side of the axis the content sits on. */
  readonly side = computed<AndesTimelineSide>(() => {
    const layout = this.timeline.layout();
    if (layout !== 'split') {
      return layout === 'start' ? 'end' : 'start';
    }
    const explicit = this.position();
    if (explicit) {
      return explicit;
    }
    const mode = this.timeline.mode();
    if (mode === 'start') {
      return 'end';
    }
    if (mode === 'end') {
      return 'start';
    }
    const total = this.timeline.total();
    const visual = this.timeline.reverse()
      ? total - 1 - this.index()
      : this.index();
    return visual % 2 === 0 ? 'end' : 'start';
  });

  /** Whether the entry needs the opposite column. */
  readonly hasOpposite = computed(
    () => this.label() !== undefined || this.time() !== undefined,
  );

  protected readonly namedColor = computed(() => {
    const color = this.color() ?? 'primary';
    return (SEVERITIES as readonly string[]).includes(color) ? color : null;
  });

  protected readonly customColor = computed(() => {
    const color = this.color() ?? 'primary';
    return (SEVERITIES as readonly string[]).includes(color) ? null : color;
  });

  protected readonly labelTemplate = computed(() => {
    const label = this.label();
    return label instanceof TemplateRef ? label : null;
  });

  protected readonly labelText = computed(() => {
    const label = this.label();
    if (typeof label === 'string') {
      return label;
    }
    return label === undefined && this.parsedTime() ? this.formattedTime() : '';
  });

  private readonly parsedTime = computed<Date | null>(() => {
    const time = this.time();
    if (time === undefined) {
      return null;
    }
    const date = time instanceof Date ? time : new Date(time);
    return Number.isNaN(date.getTime()) ? null : date;
  });

  /** Machine-readable value for `<time datetime>`. */
  protected readonly isoTime = computed(() => {
    const date = this.parsedTime();
    const time = this.time();
    if (date) {
      return date.toISOString();
    }
    return typeof time === 'string' ? time : null;
  });

  private readonly formattedTime = computed(() => {
    const date = this.parsedTime();
    if (!date) {
      return '';
    }
    try {
      return new Intl.DateTimeFormat(
        this.timeline.locale(),
        this.timeline.timeFormat(),
      ).format(date);
    } catch {
      return date.toISOString();
    }
  });
}
