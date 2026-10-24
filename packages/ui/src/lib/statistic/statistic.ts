import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  TemplateRef,
} from '@angular/core';

import { AndesStatisticValue, formatStatisticValue } from './statistic-format';

/** Text or a template. */
export type AndesStatisticContent = string | TemplateRef<unknown>;

export type AndesStatisticSize = 'small' | 'default' | 'large';

/** Direction of change. Colouring depends on which direction is `favorable`. */
export type AndesStatisticTrend = 'up' | 'down';

/** Custom formatting; the result is shown as is. */
export type AndesStatisticFormatter = (
  value: Exclude<AndesStatisticValue, null | undefined>,
) => string;

export interface AndesStatisticLabels {
  /** Hidden text while `loading`. */
  loading?: string;
  /** Hidden text for an upward trend. */
  up?: string;
  /** Hidden text for a downward trend. */
  down?: string;
}

export const ANDES_STATISTIC_DEFAULT_LABELS: Required<AndesStatisticLabels> = {
  loading: 'Loading',
  up: 'Increase',
  down: 'Decrease',
};

/**
 * A headline figure with a title: totals, KPIs, balances.
 *
 * Numbers are formatted with `Intl.NumberFormat`, so grouping, decimals, currency and compact
 * notation follow the locale. Style it through CSS custom properties, set on the element or any
 * ancestor: `--andes-statistic-title-color`, `--andes-statistic-title-size`,
 * `--andes-statistic-value-color`, `--andes-statistic-value-size`,
 * `--andes-statistic-value-line-height`, `--andes-statistic-value-weight`,
 * `--andes-statistic-value-font-family`, `--andes-statistic-decimal-size`,
 * `--andes-statistic-affix-size`.
 *
 * Content placed inside the element renders under the figure, e.g. a comparison line.
 *
 * @example
 * <andes-statistic
 *   title="Revenue"
 *   [value]="1284500.5"
 *   [precision]="2"
 *   [formatOptions]="{ style: 'currency', currency: 'PEN' }"
 *   trend="up"
 * />
 */
@Component({
  selector: 'andes-statistic',
  imports: [NgTemplateOutlet],
  templateUrl: './statistic.html',
  styleUrl: './statistic.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'statistic',
    '[attr.data-size]': 'size()',
    '[attr.data-trend]': 'trend() ?? null',
    '[attr.data-tone]': 'tone()',
    '[attr.data-loading]': 'loading() ? "" : null',
    '[class.andes-statistic--up]': 'trend() === "up"',
    '[class.andes-statistic--down]': 'trend() === "down"',
    '[class.andes-statistic--good]': 'tone() === "good"',
    '[class.andes-statistic--bad]': 'tone() === "bad"',
    '[attr.aria-label]': 'null',
    '[attr.title]': 'null',
  },
})
export class AndesStatistic {
  readonly title = input<AndesStatisticContent | undefined>(undefined);
  /** A number, or a numeric string. Anything else is shown unchanged. */
  readonly value = input<AndesStatisticValue>(undefined);
  /** Exact number of fraction digits. */
  readonly precision = input<number | undefined>(undefined);
  readonly prefix = input<AndesStatisticContent | undefined>(undefined);
  readonly suffix = input<AndesStatisticContent | undefined>(undefined);
  readonly size = input<AndesStatisticSize>('default');
  /** BCP 47 tag; defaults to the runtime locale. */
  readonly locale = input<string | undefined>(undefined);
  /** `Intl.NumberFormat` options such as `{ style: 'currency', currency: 'USD' }`. */
  readonly formatOptions = input<Intl.NumberFormatOptions | undefined>(
    undefined,
  );
  /** Thousands separators. */
  readonly grouping = input(true, { transform: booleanAttribute });
  /** Overrides the locale's thousands separator. */
  readonly groupSeparator = input<string | undefined>(undefined);
  /** Overrides the locale's decimal separator. */
  readonly decimalSeparator = input<string | undefined>(undefined);
  /** Replaces all built-in formatting. */
  readonly formatter = input<AndesStatisticFormatter | undefined>(undefined);
  /** Shown when `value` is empty. */
  readonly placeholder = input('—');
  /** Swaps the figure for a placeholder bar and marks the block busy. */
  readonly loading = input(false, { transform: booleanAttribute });
  /** Arrow and colour for the direction of change. */
  readonly trend = input<AndesStatisticTrend | null | undefined>(undefined);
  /** Which direction is good news. A falling cost is `favorable="down"`. */
  readonly favorable = input<AndesStatisticTrend>('up');
  readonly trendIcon = input(true, { transform: booleanAttribute });
  readonly labels = input<AndesStatisticLabels | undefined>(undefined);
  /** Names the figure for assistive tech when no `title` is shown. */
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });

  protected readonly resolvedLabels = computed(() => ({
    ...ANDES_STATISTIC_DEFAULT_LABELS,
    ...this.labels(),
  }));

  protected readonly tone = computed<'good' | 'bad' | null>(() => {
    const trend = this.trend();
    if (!trend) {
      return null;
    }
    return trend === this.favorable() ? 'good' : 'bad';
  });

  protected readonly titleTemplate = computed(() => asTemplate(this.title()));
  protected readonly titleText = computed(() => asText(this.title()));
  protected readonly hasTitle = computed(() => !!this.title());
  protected readonly hasName = computed(
    () => !!this.title() || !!this.ariaLabel(),
  );
  protected readonly prefixTemplate = computed(() => asTemplate(this.prefix()));
  protected readonly prefixText = computed(() => asText(this.prefix()));
  protected readonly suffixTemplate = computed(() => asTemplate(this.suffix()));
  protected readonly suffixText = computed(() => asText(this.suffix()));

  protected readonly parts = computed(() => {
    const value = this.value();
    const formatter = this.formatter();
    if (formatter && value !== null && value !== undefined && value !== '') {
      return {
        integer: formatter(value),
        decimal: '',
        tail: '',
        numeric: false,
      };
    }
    return formatStatisticValue(value, {
      locale: this.locale(),
      precision: this.precision(),
      format: this.formatOptions(),
      grouping: this.grouping(),
      groupSeparator: this.groupSeparator(),
      decimalSeparator: this.decimalSeparator(),
      placeholder: this.placeholder(),
    });
  });
}

function asTemplate(
  content: AndesStatisticContent | undefined,
): TemplateRef<unknown> | null {
  return content instanceof TemplateRef ? content : null;
}

function asText(content: AndesStatisticContent | undefined): string {
  return typeof content === 'string' ? content : '';
}
