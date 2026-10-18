import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChildren,
  DestroyRef,
  ElementRef,
  inject,
  input,
  signal,
  TemplateRef,
} from '@angular/core';

import { AndesDescriptionItem } from './description-item';
import {
  AndesDescriptionsCell,
  AndesDescriptionsColumns,
  AndesDescriptionsContent,
  AndesDescriptionsLayout,
  AndesDescriptionsSize,
  layoutDescriptionRows,
  resolveDescriptionsColumns,
} from './descriptions-types';

let nextId = 0;

/**
 * A read-only grid of label/value pairs: record details, order headers, settings summaries.
 *
 * Without `bordered` it is a description list (`dl`, `dt`, `dd`); with it, a real `table` whose
 * label cells are `th`. `column` is a number or a map of container-width breakpoints (`xs`
 * 0px, `sm` 576, `md` 768, `lg` 992, `xl` 1200, `xxl` 1600) measured on the element itself, so
 * it adapts inside a narrow card on a wide screen.
 *
 * Style it through custom properties: `--andes-descriptions-title-color`,
 * `--andes-descriptions-label-color`, `--andes-descriptions-label-weight`,
 * `--andes-descriptions-label-background` (bordered), `--andes-descriptions-label-width`,
 * `--andes-descriptions-content-color`, `--andes-descriptions-border-color`.
 *
 * @example
 * <andes-descriptions title="Order 4012" bordered [column]="{ xs: 1, md: 2, xl: 3 }">
 *   <andes-description-item label="Customer">Lucia Paredes</andes-description-item>
 *   <andes-description-item label="Notes" span="filled">Leave at reception</andes-description-item>
 * </andes-descriptions>
 */
@Component({
  selector: 'andes-descriptions',
  imports: [NgTemplateOutlet],
  templateUrl: './descriptions.html',
  styleUrl: './descriptions.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'descriptions',
    '[attr.data-bordered]': 'bordered() ? "" : null',
    '[attr.data-layout]': 'layout()',
    '[attr.data-size]': 'size()',
    '[attr.data-colon]':
      'colon() && !bordered() && layout() === "horizontal" ? "" : null',
    '[style.--_andes-descriptions-columns]': 'columns()',
    '[attr.aria-label]': 'null',
    '[attr.aria-labelledby]': 'null',
    '[attr.title]': 'null',
  },
})
export class AndesDescriptions {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly title = input<AndesDescriptionsContent | undefined>(undefined);
  readonly extra = input<AndesDescriptionsContent | undefined>(undefined);
  /** A table with a border and shaded label cells. */
  readonly bordered = input(false, { transform: booleanAttribute });
  readonly layout = input<AndesDescriptionsLayout>('horizontal');
  /** Columns per row: a number, or a map keyed by container-width breakpoint. */
  readonly column = input<number | AndesDescriptionsColumns>(3);
  readonly size = input<AndesDescriptionsSize>('default');
  /** Colon after labels; applies to the plain, horizontal form. */
  readonly colon = input(true, { transform: booleanAttribute });
  /** Truncate long values to one line instead of wrapping. */
  readonly ellipsis = input(false, { transform: booleanAttribute });
  readonly ariaLabel = input<string | undefined>(undefined, {
    alias: 'aria-label',
  });

  private readonly items = contentChildren(AndesDescriptionItem);
  private readonly width = signal<number | null>(null);
  protected readonly uid = `andes-descriptions-${nextId++}`;
  protected readonly titleId = `${this.uid}-title`;

  readonly columns = computed(() =>
    resolveDescriptionsColumns(this.column(), this.width()),
  );

  protected readonly rows = computed(() =>
    layoutDescriptionRows(
      this.items().map((item) => item.span()),
      this.columns(),
    ),
  );

  protected readonly cells = computed(() => this.rows().flat());
  protected readonly columnIndexes = computed(() =>
    Array.from({ length: this.columns() }, (_, index) => index),
  );

  protected readonly hasTitle = computed(() => !!this.title());
  protected readonly titleTemplate = computed(() => asTemplate(this.title()));
  protected readonly titleText = computed(() => asText(this.title()));
  protected readonly extraTemplate = computed(() => asTemplate(this.extra()));
  protected readonly extraText = computed(() => asText(this.extra()));

  constructor() {
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') {
        return;
      }
      const element = this.host.nativeElement;
      const measure = () =>
        this.width.set(element.getBoundingClientRect().width);
      measure();
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected item(cell: AndesDescriptionsCell): AndesDescriptionItem {
    return this.items()[cell.index];
  }

  protected isEllipsis(cell: AndesDescriptionsCell): boolean {
    return this.item(cell).ellipsis() ?? this.ellipsis();
  }
}

function asTemplate(
  content: AndesDescriptionsContent | undefined,
): TemplateRef<unknown> | null {
  return content instanceof TemplateRef ? content : null;
}

function asText(content: AndesDescriptionsContent | undefined): string {
  return typeof content === 'string' ? content : '';
}
