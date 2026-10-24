import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  type WritableSignal,
} from '@angular/core';

import {
  andesReadDateRangeFilter,
  andesReadRangeFilter,
  andesReadTextFilter,
  type AndesFilterValue,
  type AndesTextFilterOperator,
} from './table-data';
import {
  ANDES_TABLE_FILTER_PANEL,
  AndesTableFilter,
  type AndesTableFilterPanelHost,
} from './table-filter';

/*
 * Ready-made bodies for `andes-table-filter`. Each one is projected into the
 * filter and edits the filter's draft directly, so Reset / OK / Escape / click
 * outside behave exactly as for the option list. The fields keep their own text
 * while the user types (a half-typed "1." or "-" is not a number yet) and only
 * pick the draft up again when something else changes it - opening the panel,
 * Reset, or a controlled `filters` update.
 */

/** Keeps a panel's field texts and the filter's draft in step. */
function syncWithDraft(
  filter: AndesTableFilter,
  fields: readonly WritableSignal<string>[],
  encode: (texts: readonly string[]) => readonly AndesFilterValue[],
  decode: (values: readonly AndesFilterValue[]) => readonly string[],
): (index: number, text: string) => void {
  effect(() => {
    const draft = filter.draft();
    untracked(() => {
      const texts = fields.map((field) => field());
      if (!sameValues(encode(texts), draft)) {
        decode(draft).forEach((text, index) => fields[index].set(text));
      }
    });
  });

  return (index, text) => {
    fields[index].set(text);
    filter.setDraft(encode(fields.map((field) => field())));
  };
}

function sameValues(
  a: readonly AndesFilterValue[],
  b: readonly AndesFilterValue[],
): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function inputText(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement).value;
}

/** Labels of the text filter's operators. */
export type AndesTextFilterOperatorLabels = Readonly<
  Record<AndesTextFilterOperator, string>
>;

const DEFAULT_OPERATOR_LABELS: AndesTextFilterOperatorLabels = {
  contains: 'Contains',
  equals: 'Equals',
  startsWith: 'Starts with',
  endsWith: 'Ends with',
  notContains: 'Does not contain',
};

/**
 * Text search filter body: an operator (contains, equals, starts with...) and a
 * query. Writes `[operator, text]` to the column's filter, or nothing while the
 * query is empty. Match rows with `andesTextFilter(row => row.name)`; a server
 * reads the same state with `andesReadTextFilter`. Enter applies.
 *
 * ```html
 * <andes-table-filter column="client" label="Filter client">
 *   <andes-table-text-filter placeholder="Client name" />
 * </andes-table-filter>
 * ```
 */
@Component({
  selector: 'andes-table-text-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: ANDES_TABLE_FILTER_PANEL, useExisting: AndesTableTextFilter },
  ],
  host: { class: 'andes-table-filter-panel' },
  styleUrl: './table-filter-panels.css',
  template: `
    @if (operators().length > 1) {
      <span class="andes-table-filter-panel__field">
        <select
          class="andes-table-filter-panel__control andes-table-filter-panel__select"
          [attr.aria-label]="operatorLabel()"
          (change)="onOperator($event)"
        >
          @for (operator of operators(); track operator) {
            <option
              [value]="operator"
              [selected]="operator === currentOperator()"
            >
              {{ operatorLabels()[operator] }}
            </option>
          }
        </select>
        <span
          class="andes-table-filter-panel__chevron"
          aria-hidden="true"
        ></span>
      </span>
    }
    <span class="andes-table-filter-panel__field">
      <input
        type="text"
        class="andes-table-filter-panel__control"
        autocomplete="off"
        [placeholder]="placeholder()"
        [attr.aria-label]="placeholder()"
        [value]="text()"
        (input)="write(1, inputText($event))"
        (keydown.enter)="filter.confirm()"
      />
    </span>
  `,
})
export class AndesTableTextFilter {
  protected readonly filter = inject(AndesTableFilter);

  /** Operators offered, in order; the first is the default. One hides the picker. */
  readonly operators = input<readonly AndesTextFilterOperator[]>([
    'contains',
    'equals',
    'startsWith',
  ]);

  /** Visible names of the operators. */
  readonly operatorLabels = input<AndesTextFilterOperatorLabels>(
    DEFAULT_OPERATOR_LABELS,
  );

  /** Accessible name of the operator picker. */
  readonly operatorLabel = input('Condition');

  /** Placeholder and accessible name of the query field. */
  readonly placeholder = input('Search');

  private readonly operator = signal('');
  protected readonly text = signal('');

  protected readonly currentOperator = computed(
    () => this.operator() || this.operators()[0] || 'contains',
  );

  protected readonly write = syncWithDraft(
    this.filter,
    [this.operator, this.text],
    ([operator, text]) =>
      text.trim()
        ? [operator || this.operators()[0] || 'contains', text.trim()]
        : [],
    (values) => {
      const state = andesReadTextFilter(values);
      return [state?.operator ?? this.operator(), state?.text ?? ''];
    },
  );

  protected readonly inputText = inputText;

  protected onOperator(event: Event): void {
    this.write(0, inputText(event));
  }
}

/**
 * Number range filter body: a minimum and a maximum, either left open. Writes
 * `[min, max]` (`null` for an open end), or nothing when both are empty.
 * Match rows with `andesRangeFilter(row => row.total)`; a server reads the same
 * state with `andesReadRangeFilter`. OK stays disabled while a field is not a
 * number or the minimum exceeds the maximum.
 */
@Component({
  selector: 'andes-table-range-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    { provide: ANDES_TABLE_FILTER_PANEL, useExisting: AndesTableRangeFilter },
  ],
  host: {
    class: 'andes-table-filter-panel andes-table-filter-panel--pair',
  },
  styleUrl: './table-filter-panels.css',
  template: `
    <label class="andes-table-filter-panel__label">
      <span class="andes-table-filter-panel__caption">{{ minLabel() }}</span>
      <span
        class="andes-table-filter-panel__field"
        [class.andes-table-filter-panel__field--error]="minError()"
      >
        <input
          type="text"
          inputmode="decimal"
          class="andes-table-filter-panel__control"
          autocomplete="off"
          [placeholder]="minPlaceholder()"
          [attr.aria-invalid]="minError() || null"
          [value]="min()"
          (input)="write(0, inputText($event))"
          (keydown.enter)="filter.confirm()"
        />
      </span>
    </label>
    <label class="andes-table-filter-panel__label">
      <span class="andes-table-filter-panel__caption">{{ maxLabel() }}</span>
      <span
        class="andes-table-filter-panel__field"
        [class.andes-table-filter-panel__field--error]="maxError()"
      >
        <input
          type="text"
          inputmode="decimal"
          class="andes-table-filter-panel__control"
          autocomplete="off"
          [placeholder]="maxPlaceholder()"
          [attr.aria-invalid]="maxError() || null"
          [value]="max()"
          (input)="write(1, inputText($event))"
          (keydown.enter)="filter.confirm()"
        />
      </span>
    </label>
  `,
})
export class AndesTableRangeFilter implements AndesTableFilterPanelHost {
  protected readonly filter = inject(AndesTableFilter);

  readonly minLabel = input('Min');
  readonly maxLabel = input('Max');
  readonly minPlaceholder = input('');
  readonly maxPlaceholder = input('');

  protected readonly min = signal('');
  protected readonly max = signal('');

  protected readonly write = syncWithDraft(
    this.filter,
    [this.min, this.max],
    ([min, max]) => {
      // A field that is not a number yet counts as open; OK stays disabled.
      const low = finiteOrNull(parseNumber(min));
      const high = finiteOrNull(parseNumber(max));
      return low === null && high === null ? [] : [low, high];
    },
    (values) => {
      const range = andesReadRangeFilter(values);
      return [
        range?.min === null || range?.min === undefined
          ? ''
          : String(range.min),
        range?.max === null || range?.max === undefined
          ? ''
          : String(range.max),
      ];
    },
  );

  protected readonly inputText = inputText;

  private readonly bounds = computed(() => ({
    low: parseNumber(this.min()),
    high: parseNumber(this.max()),
  }));

  private readonly reversed = computed(() => {
    const { low, high } = this.bounds();
    return typeof low === 'number' && typeof high === 'number' && low > high;
  });

  protected readonly minError = computed(
    () => Number.isNaN(this.bounds().low) || this.reversed(),
  );
  protected readonly maxError = computed(
    () => Number.isNaN(this.bounds().high) || this.reversed(),
  );

  readonly invalid = computed(() => this.minError() || this.maxError());
}

function finiteOrNull(value: number | undefined): number | null {
  return value === undefined || Number.isNaN(value) ? null : value;
}

/**
 * A number from a field's text: `undefined` when empty, `NaN` when it is not a
 * number. Accepts a comma as the decimal separator.
 */
function parseNumber(text: string): number | undefined {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }
  const normalized = /^-?\d+,\d+$/.test(trimmed)
    ? trimmed.replace(',', '.')
    : trimmed;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}

/**
 * Date range filter body: a first and a last day, either left open, picked with
 * the browser's date fields. Writes `[from, to]` as `YYYY-MM-DD` (`null` for an
 * open end), or nothing when both are empty. Match rows with
 * `andesDateRangeFilter(row => row.issued)`; a server reads the same state with
 * `andesReadDateRangeFilter`. Both days are inclusive.
 */
@Component({
  selector: 'andes-table-date-range-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: ANDES_TABLE_FILTER_PANEL,
      useExisting: AndesTableDateRangeFilter,
    },
  ],
  host: {
    class: 'andes-table-filter-panel andes-table-filter-panel--pair',
  },
  styleUrl: './table-filter-panels.css',
  template: `
    <label class="andes-table-filter-panel__label">
      <span class="andes-table-filter-panel__caption">{{ fromLabel() }}</span>
      <span
        class="andes-table-filter-panel__field"
        [class.andes-table-filter-panel__field--error]="invalid()"
      >
        <input
          type="date"
          class="andes-table-filter-panel__control"
          [attr.max]="to() || null"
          [attr.aria-invalid]="invalid() || null"
          [value]="from()"
          (input)="write(0, inputText($event))"
          (keydown.enter)="filter.confirm()"
        />
      </span>
    </label>
    <label class="andes-table-filter-panel__label">
      <span class="andes-table-filter-panel__caption">{{ toLabel() }}</span>
      <span
        class="andes-table-filter-panel__field"
        [class.andes-table-filter-panel__field--error]="invalid()"
      >
        <input
          type="date"
          class="andes-table-filter-panel__control"
          [attr.min]="from() || null"
          [attr.aria-invalid]="invalid() || null"
          [value]="to()"
          (input)="write(1, inputText($event))"
          (keydown.enter)="filter.confirm()"
        />
      </span>
    </label>
  `,
})
export class AndesTableDateRangeFilter implements AndesTableFilterPanelHost {
  protected readonly filter = inject(AndesTableFilter);

  readonly fromLabel = input('From');
  readonly toLabel = input('To');

  protected readonly from = signal('');
  protected readonly to = signal('');

  protected readonly write = syncWithDraft(
    this.filter,
    [this.from, this.to],
    ([from, to]) => (from || to ? [from || null, to || null] : []),
    (values) => {
      const range = andesReadDateRangeFilter(values);
      return [range?.min ?? '', range?.max ?? ''];
    },
  );

  protected readonly inputText = inputText;

  readonly invalid = computed(() => {
    const from = this.from();
    const to = this.to();
    return !!from && !!to && from > to;
  });
}
