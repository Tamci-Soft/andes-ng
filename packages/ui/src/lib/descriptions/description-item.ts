import { NgTemplateOutlet } from '@angular/common';
import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  TemplateRef,
  viewChild,
} from '@angular/core';

import {
  AndesDescriptionsContent,
  AndesDescriptionsSpan,
} from './descriptions-types';

/**
 * One label/value pair of an `andes-descriptions`. The element itself renders nothing: its
 * label and content are handed to the parent, which places them in a list or a table.
 */
@Component({
  selector: 'andes-description-item',
  imports: [NgTemplateOutlet],
  templateUrl: './description-item.html',
  styleUrl: './description-item.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    'data-slot': 'description-item',
  },
})
export class AndesDescriptionItem {
  /** The term: text or a template. */
  readonly label = input<AndesDescriptionsContent | undefined>(undefined);
  /** Columns the item covers, or `'filled'` for the rest of its row. */
  readonly span = input<AndesDescriptionsSpan, unknown>(1, {
    transform: (value: unknown): AndesDescriptionsSpan => {
      if (value === 'filled') {
        return 'filled';
      }
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
    },
  });
  /** Single-line truncation for this item; unset follows the parent. */
  readonly ellipsis = input<boolean | undefined, unknown>(undefined, {
    transform: (value: unknown) =>
      value === undefined || value === null
        ? undefined
        : booleanAttribute(value),
  });

  /** Rendered by the parent, wherever this item lands. */
  readonly labelTemplateRef =
    viewChild.required<TemplateRef<unknown>>('labelTemplate');
  readonly contentTemplateRef =
    viewChild.required<TemplateRef<unknown>>('contentTemplate');

  protected readonly labelAsTemplate = computed(() => {
    const label = this.label();
    return label instanceof TemplateRef ? label : null;
  });
  protected readonly labelText = computed(() => {
    const label = this.label();
    return typeof label === 'string' ? label : '';
  });
}
